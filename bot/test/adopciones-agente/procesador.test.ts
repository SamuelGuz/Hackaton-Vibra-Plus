// Enrutamiento al agente externo, idempotencia ante reintentos del buzón y sesiones en el Kv de master.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Persona } from '@huellitas/shared/tipos'
import { crearProcesadorExterno } from '../../src/adopciones-agente/index'
import { textosAgente } from '../../src/adopciones-agente/textos'
import { crearBuzonMemoria } from '../../src/wa/buzon'
import { enviarSalientes, procesadorCrudo, trabajarEntrantes, type Procesador } from '../../src/wa/trabajador'
import type { InboundMessage } from '../../src/wa/tipos'
import { ANDREA, CAROLINA, crudo, entrante, excelente, montar, silenciarConsola, TEL, type Montaje } from './ayudas'

let t: Montaje
let consola: ReturnType<typeof silenciarConsola>

/** El flujo interno de master, reemplazado por uno que anota quién lo llamó */
function baseFalsa() {
  const llamadas: { id: string; medio?: { ruta: string; mime: string } }[] = []
  const base: Procesador = {
    async procesar(e, medio) {
      llamadas.push({ id: e.id, ...(medio && { medio }) })
      return { registros: [], respuestas: [{ id: `${e.id}:interno`, telefono: e.telefono, cuerpo: 'respuesta del flujo interno' }] }
    },
  }
  return { base, llamadas }
}

beforeEach(async () => {
  t = await montar()
  consola = silenciarConsola()
})
afterEach(() => vi.restoreAllMocks())

describe('crearProcesadorExterno: a quién atiende cada número', () => {
  it('alguien del equipo sigue por el flujo interno (base), con su medio, sin tocar Gemini', async () => {
    const { base, llamadas } = baseFalsa()
    const p = crearProcesadorExterno({ base, deps: t.deps, ctx: t.ctx })
    const e = entrante('hola', ANDREA.telefono, 'wamid.E1')
    const r = await p.procesar(e, { ruta: 'archivos/a.ogg', mime: 'audio/ogg' })
    expect(llamadas).toEqual([{ id: 'wamid.E1', medio: { ruta: 'archivos/a.ogg', mime: 'audio/ogg' } }])
    expect(r.respuestas).toEqual([{ id: 'wamid.E1:interno', telefono: ANDREA.telefono, cuerpo: 'respuesta del flujo interno' }])
    expect(t.llm.llamadas).toHaveLength(0)
    expect(t.rag.consultas).toEqual([])
  })

  it('un número que no está en el equipo lo atiende el agente: sin registros y con una RespuestaNueva idempotente', async () => {
    const { base, llamadas } = baseFalsa()
    const p = crearProcesadorExterno({ base, deps: t.deps, ctx: t.ctx })
    t.llm.responder(crudo({ respuesta: 'Mira, te cuento la historia de Toby 🐶' }))
    const r = await p.procesar(entrante('hola, quiero adoptar', TEL, 'wamid.X1'))
    expect(llamadas).toEqual([])
    expect(r.registros).toEqual([])
    expect(r.respuestas).toEqual([{ id: 'wamid.X1:r1', telefono: TEL, cuerpo: 'Mira, te cuento la historia de Toby 🐶' }])
    expect(t.wa.textos).toEqual([])
  })

  it('una persona inactiva (activo: false) se trata como una desconocida', async () => {
    const baja: Persona = { ...ANDREA, id: 'p-baja', telefono: '573009998888', activo: false }
    await t.repo.crearPersona(baja)
    const { base, llamadas } = baseFalsa()
    const p = crearProcesadorExterno({ base, deps: t.deps, ctx: t.ctx })
    t.llm.responder(crudo())
    const r = await p.procesar(entrante('hola', baja.telefono, 'wamid.B1'))
    expect(llamadas).toEqual([])
    expect(t.llm.llamadas).toHaveLength(1)
    expect(r.respuestas).toHaveLength(1)
  })

  it('una persona sin la marca "activo" cuenta como activa', async () => {
    const sinMarca: Persona = { id: 'p-x', nombre: 'Xiomara', cargo: '', rol: 'cuidador', color: '#000', foto: null, telefono: '573008887777' }
    await t.repo.crearPersona(sinMarca)
    const { base, llamadas } = baseFalsa()
    await crearProcesadorExterno({ base, deps: t.deps, ctx: t.ctx }).procesar(entrante('hola', sinMarca.telefono, 'wamid.S1'))
    expect(llamadas).toHaveLength(1)
    expect(t.llm.llamadas).toHaveLength(0)
  })

  it('si no se puede consultar el equipo, el error sube (el buzón reintenta) y no se adivina', async () => {
    const { base, llamadas } = baseFalsa()
    t.repo.personaPorTelefono = async () => {
      throw new Error('base caída')
    }
    const p = crearProcesadorExterno({ base, deps: t.deps, ctx: t.ctx })
    await expect(p.procesar(entrante('hola', TEL, 'wamid.F1'))).rejects.toThrow('base caída')
    expect(llamadas).toEqual([])
    expect(t.llm.llamadas).toHaveLength(0)
  })
})

describe('reintentos del buzón: el mismo mensaje dos veces', () => {
  it('devuelve la misma respuesta, con una sola llamada a Gemini y un solo aviso a las administradoras', async () => {
    t.llm.responder(excelente({ respuesta: 'Qué hermoso hogar' }))
    const e = entrante('Tengo todo listo', TEL, 'wamid.R1')
    const p = crearProcesadorExterno({ base: baseFalsa().base, deps: t.deps, ctx: t.ctx })
    const primera = await p.procesar(e)
    const segunda = await p.procesar(e)
    expect(segunda).toEqual(primera)
    expect(primera.respuestas[0]?.cuerpo).toContain('sábado 31 de octubre')
    expect(t.llm.llamadas).toHaveLength(1)
    expect(t.rag.consultas).toHaveLength(1)
    expect(t.avisos(CAROLINA.telefono)).toHaveLength(1)
  })

  it('tras reiniciar el bot (otros deps, mismo Kv) el reintento tampoco repite nada', async () => {
    t.llm.responder(excelente())
    const e = entrante('listo', TEL, 'wamid.R2')
    const primera = await crearProcesadorExterno({ base: baseFalsa().base, deps: t.deps, ctx: t.ctx }).procesar(e)
    const reiniciado = { ...t.deps } // objeto nuevo: límites y colas en memoria desde cero
    const segunda = await crearProcesadorExterno({ base: baseFalsa().base, deps: reiniciado, ctx: t.ctx }).procesar(e)
    expect(segunda).toEqual(primera)
    expect(t.llm.llamadas).toHaveLength(1)
    expect(t.avisos(CAROLINA.telefono)).toHaveLength(1)
  })

  it('dos copias del mismo mensaje al tiempo se atienden de a una: una sola llamada a Gemini', async () => {
    t.llm.responder(excelente())
    const e = entrante('listo', TEL, 'wamid.R3')
    const [a, b] = await Promise.all([t.escribirEntrante(e), t.escribirEntrante(e)])
    expect(b).toEqual(a)
    expect(t.llm.llamadas).toHaveLength(1)
    expect(t.avisos(CAROLINA.telefono)).toHaveLength(1)
  })

  it('un mensaje que falló (Gemini caído) no se da por atendido: el reintento vuelve a intentarlo', async () => {
    t.llm.responder(new Error('Gemini 503'), crudo({ respuesta: 'Ya volví 🐾' }))
    const e = entrante('hola', TEL, 'wamid.R4')
    const fallo = await t.escribirEntrante(e)
    expect(fallo.map((r) => r.cuerpo)).toEqual([textosAgente.falla])
    const reintento = await t.escribirEntrante(e)
    expect(reintento.map((r) => r.cuerpo)).toEqual(['Ya volví 🐾'])
    expect(t.llm.llamadas).toHaveLength(2)
    expect(reintento[0]?.id).toBe('wamid.R4:r1')
  })

  it('el reintento de un mensaje ya atendido no gasta cupo del límite por teléfono', async () => {
    t.llm.responder(crudo({ respuesta: 'Hola' }))
    const ultimo = entrante('mensaje 29', TEL, 'wamid.L29')
    for (let i = 1; i < 29; i++) await t.escribir(`mensaje ${i}`)
    const primera = await t.escribirEntrante(ultimo)
    // 5 reintentos más: si gastaran cupo, el mensaje 30 (el último permitido) ya estaría limitado
    for (let i = 0; i < 5; i++) expect(await t.escribirEntrante(ultimo)).toEqual(primera)
    const siguiente = await t.escribir('mensaje 30')
    expect(siguiente.map((r) => r.cuerpo)).toEqual(['Hola'])
    expect(t.llm.llamadas).toHaveLength(30)
  })

  it('si el servidor cae después de avisar y antes de guardar la sesión, el reintento confirma la visita sin avisar de nuevo', async () => {
    t.llm.responder(excelente({ respuesta: 'Uno' }), excelente({ respuesta: 'Dos' }))
    const e = entrante('listo', TEL, 'wamid.R5')
    const put = t.kv.put.bind(t.kv)
    t.kv.put = async (clave, valor, ttl) => {
      if (clave.startsWith('ext:ses:')) throw new Error('el servidor se cayó')
      return put(clave, valor, ttl)
    }
    const caida = await t.escribirEntrante(e)
    expect(caida.map((r) => r.cuerpo)).toEqual([textosAgente.falla])
    expect(t.avisos(CAROLINA.telefono)).toHaveLength(1)

    t.kv.put = put
    const reintento = await t.escribirEntrante(e)
    expect(t.avisos(CAROLINA.telefono)).toHaveLength(1) // el aviso no se repitió
    expect(reintento[0]?.cuerpo).toContain('Dos')
    expect(reintento[0]?.cuerpo).toContain('sábado 31 de octubre') // y la visita sí se le confirma
  })
})

describe('las sesiones viven en el Kv, no en el proceso', () => {
  it('otro proceso (nuevos deps y procesador, mismo Kv) continúa la conversación donde iba', async () => {
    t.llm.responder(
      crudo({ respuesta: 'Primera', tipo: 'casa', permiso: 'no_aplica', suitability: 60, risk: 20, nombre: 'Ana' }),
      crudo({ respuesta: 'Segunda', presupuesto: 'si', tiempo: 'suficiente', suitability: 80, risk: 20 }),
    )
    const antes = crearProcesadorExterno({ base: baseFalsa().base, deps: t.deps, ctx: t.ctx })
    await antes.procesar(entrante('Vivo en casa propia, me llamo Ana', TEL))

    const despues = crearProcesadorExterno({ base: baseFalsa().base, deps: { ...t.deps }, ctx: t.ctx })
    const r = await despues.procesar(entrante('Tengo para el veterinario y casi todo el día', TEL))

    // Historial, foco y lo que se fue sabiendo de la persona sobrevivieron
    expect(t.llamada(1).mensajes.map((m) => m.texto)).toEqual(['Vivo en casa propia, me llamo Ana', 'Primera', 'Tengo para el veterinario y casi todo el día'])
    expect(t.llamada(1).sistema).toMatch(/PERRITO EN FOCO[^\n]*Toby/)
    expect(r.respuestas[0]?.cuerpo).toContain('sábado 31 de octubre')
    const aviso = t.avisos(CAROLINA.telefono)
    expect(aviso).toHaveLength(1)
    expect(aviso[0]).toContain('Nombre: Ana')
    expect(aviso[0]).toContain('(Score 80%)')
  })

  it('la sesión se guarda como JSON en el Kv con vencimiento de 6 h', async () => {
    t.llm.responder(crudo())
    await t.escribir('hola')
    const guardado = await t.kv.get('ext:ses:wa:573115550000')
    expect(JSON.parse(guardado ?? 'null')).toMatchObject({ clave: 'wa:573115550000', turnos: 1, perroFoco: '5' })
    t.avanzar(6 * 3_600_000 + 1_000)
    expect(await t.kv.get('ext:ses:wa:573115550000')).toBeNull()
  })

  it('un turno fallido no deja nada en la sesión guardada', async () => {
    t.llm.responder(new Error('Gemini 503'))
    await t.escribir('hola')
    expect(await t.kv.get('ext:ses:wa:573115550000')).toBeNull()
  })

  it('una sesión dañada en el Kv no tumba la charla: se empieza de cero', async () => {
    await t.kv.put('ext:ses:wa:573115550000', '{"historial": "roto', 3600)
    t.llm.responder(crudo({ respuesta: 'Hola de nuevo' }))
    const r = await t.escribir('hola')
    expect(r.map((x) => x.cuerpo)).toEqual(['Hola de nuevo'])
    expect(t.llamada(0).mensajes).toHaveLength(1)
  })
})

describe('con el trabajador y el buzón de master', () => {
  function pipeline() {
    const buzon = crearBuzonMemoria()
    const procesador = crearProcesadorExterno({ base: procesadorCrudo(), deps: t.deps, ctx: t.ctx })
    const mensaje = (id: string, from: string, texto: string): InboundMessage => ({ id, from, tipo: 'texto', texto, timestamp: Math.floor(t.reloj.ms / 1000) })
    const enviados: { telefono: string; cuerpo: string }[] = []
    return {
      buzon,
      mensaje,
      enviados,
      trabajar: () => trabajarEntrantes({ buzon, ahora: t.deps.ahora, procesador }),
      despachar: () =>
        enviarSalientes({
          buzon,
          ahora: t.deps.ahora,
          maximo: 10,
          enviar: async (r) => {
            enviados.push({ telefono: r.telefono, cuerpo: r.cuerpo })
          },
        }),
    }
  }

  it('el desconocido recibe su respuesta por la cola de salida y no queda ningún registro en la bitácora', async () => {
    const p = pipeline()
    t.llm.responder(crudo({ respuesta: 'Mira, te cuento la historia de Toby 🐶' }))
    await p.buzon.guardarEntrantes([p.mensaje('wamid.P1', TEL, 'hola, quiero adoptar')], t.deps.ahora())
    await p.trabajar()
    expect(await p.buzon.registros()).toEqual([])
    expect(await p.despachar()).toBe(1)
    expect(p.enviados).toEqual([{ telefono: TEL, cuerpo: 'Mira, te cuento la historia de Toby 🐶' }])
    expect(await p.despachar()).toBe(0) // ya enviado: no se manda dos veces
  })

  it('si Gemini cae, la persona recibe el mensaje cálido y su texto NO termina como nota cruda del equipo', async () => {
    const p = pipeline()
    t.llm.responder(new Error('Gemini 503'))
    await p.buzon.guardarEntrantes([p.mensaje('wamid.P2', TEL, 'hola')], t.deps.ahora())
    await p.trabajar()
    expect(await p.buzon.registros()).toEqual([])
    await p.despachar()
    expect(p.enviados).toEqual([{ telefono: TEL, cuerpo: textosAgente.falla }])
    expect(consola.error).toHaveBeenCalled()
  })

  it('alguien del equipo sigue el camino de siempre: su nota se guarda y no pasa por el agente', async () => {
    const p = pipeline()
    await p.buzon.guardarEntrantes([p.mensaje('wamid.P3', ANDREA.telefono, 'Toby comió bien')], t.deps.ahora())
    await p.trabajar()
    expect(await p.buzon.registros()).toHaveLength(1)
    expect(t.llm.llamadas).toHaveLength(0)
    await p.despachar()
    expect(p.enviados).toEqual([])
  })
})

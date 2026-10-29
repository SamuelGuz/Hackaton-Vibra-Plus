// Comprobantes de donación que manda alguien de afuera (caso real del 29 oct: el bot respondió
// "solo puedo leer texto o nota de voz"). Ahora: se lee, se le avisa a la administración con la foto y
// dos botones; "Sí me llegó" lo registra como ingreso y "No me llegó" lo anula.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { atenderInteresadoExterno } from '../../src/adopciones-agente/index.js'
import { atender } from '../../src/conversacion/atender.js'
import type { Entrada, Usuario } from '../../src/tipos.js'
import { CAROLINA, LUIS } from '../fakes.js'
import { crudo, enviadosSinAviso, montar, silenciarConsola, TEL } from './ayudas.js'

const MARIA: Usuario = { id: 4, nombre: 'María', rol: 'adopciones', telefono: '573000000004' }
const foto = (texto?: string): Entrada => ({ tipo: 'imagen', mediaId: 'img-cpb', mime: 'image/jpeg', ...(texto ? { texto } : {}) })
const boton = (id: string): Entrada => ({ tipo: 'boton', id, titulo: '' })

/** Lo que Gemini lee de la captura real de Nequi */
const NEQUI = { es_comprobante: true, monto: 1000, fecha: '28 de octubre de 2026 a las 11:17 p. m.', referencia: 'S17273100', medio: 'Nequi', descripcion: 'Envío de plata' }

let t: ReturnType<typeof montar>
beforeEach(async () => {
  t = montar()
  t.repo.usuarios.push(MARIA)
  t.repo.datos.personas.push({ id: '4', nombre: 'María', cargo: '', rol: 'adopciones', color: '#000', foto: null })
  for (const u of [LUIS, CAROLINA, MARIA]) await t.repo.guardarEstado(u.id, { paso: 'menu' })
  silenciarConsola()
})
afterEach(() => vi.restoreAllMocks())

const mandar = (e: Entrada) => atenderInteresadoExterno(t.deps, TEL, e, t.ctx)
const a = (tel: string) => enviadosSinAviso(t.wa.enviados).filter((x) => x.telefono === tel).map((x) => x.salida)

describe('llega un comprobante de alguien de afuera', () => {
  it('si falla el aviso a administración no afirma que lo entregó ni que la donación llegó', async () => {
    t.llm.responder(NEQUI)
    const enviar = t.wa.enviar.bind(t.wa)
    t.wa.enviar = async (tel, salida) => {
      if (tel === CAROLINA.telefono) throw new Error('fuera de ventana')
      return enviar(tel, salida)
    }
    await mandar(foto())
    const respuesta = a(TEL).map(s => s.texto).join(' ')
    expect(respuesta).not.toMatch(/ya le avis[eé]|se la pas[eé]/i)
    expect(respuesta).toMatch(/pendiente|no pude/i)
    expect(t.repo.registros[0].estadoActual).toBe('por_confirmar')
  })
  it('se lee, se le agradece con el valor y la administración recibe la foto con "¿Te llegó?"', async () => {
    t.llm.responder(NEQUI)
    await mandar(foto())
    expect(a(TEL).map((s) => s.texto).join('\n')).toMatch(/gracias.*\$1\.000/is)
    const aCarolina = a(CAROLINA.telefono)
    expect(aCarolina[0]).toMatchObject({ tipo: 'imagen', mime: 'image/jpeg' })
    const pregunta = aCarolina[1]
    expect(pregunta.tipo).toBe('botones')
    expect(pregunta.texto).toContain('*$1.000*')
    expect(pregunta.texto).toContain('Nequi')
    expect(pregunta.texto).toContain('S17273100')
    expect(pregunta.texto).toContain('+573115550000')
    expect(pregunta.texto).toMatch(/¿Te llegó/)
    expect(pregunta.tipo === 'botones' && pregunta.botones.map((b) => b.id)).toEqual(['cpb:si:1', 'cpb:no:1'])
    // A adopciones y a cuidadores no les llega: la plata la ve la administración
    expect(a(MARIA.telefono)).toEqual([])
    expect(a(LUIS.telefono)).toEqual([])
    // Queda por confirmar, sin persona del equipo, con la foto
    expect(t.repo.registros[0]).toMatchObject({
      usuarioId: null,
      estadoActual: 'por_confirmar',
      tipoEntrada: 'imagen',
      acciones: [{ tipo: 'movimiento', movimiento: { tipo: 'ingreso', monto: 1000, categoria: 'donacion', abonoDeuda: false } }],
    })
    expect(t.repo.registros[0].mediaUrl).toMatch(/^\/archivos\//)
  })

  it('"Sí, me llegó" lo registra como donación y dice cuánto queda en caja', async () => {
    t.llm.responder(NEQUI)
    await mandar(foto())
    await atender(t.deps, CAROLINA, boton('cpb:si:1'))
    expect(t.repo.registros[0].estadoActual).toBe('confirmado')
    expect(t.repo.datos.movimientos).toHaveLength(1)
    expect(a(CAROLINA.telefono).at(-1)!.texto).toMatch(/registr.*\$1\.000/is)
    expect(a(CAROLINA.telefono).at(-1)!.texto).toContain('En caja quedan')
  })

  it('"No me llegó" no registra nada', async () => {
    t.llm.responder(NEQUI)
    await mandar(foto())
    await atender(t.deps, CAROLINA, boton('cpb:no:1'))
    expect(t.repo.registros[0].estadoActual).toBe('anulado')
    expect(t.repo.datos.movimientos).toHaveLength(0)
    expect(a(CAROLINA.telefono).at(-1)!.texto).toMatch(/no (lo|la) registr/i)
  })

  it('tocar otra vez (o que otra administradora ya decidió) no lo cambia', async () => {
    t.llm.responder(NEQUI)
    await mandar(foto())
    await atender(t.deps, CAROLINA, boton('cpb:si:1'))
    await atender(t.deps, CAROLINA, boton('cpb:no:1'))
    expect(t.repo.registros[0].estadoActual).toBe('confirmado')
    expect(a(CAROLINA.telefono).at(-1)!.texto).toMatch(/ya/i)
  })

  it('quien no es de administración no puede confirmarlo', async () => {
    t.llm.responder(NEQUI)
    await mandar(foto())
    await atender(t.deps, LUIS, boton('cpb:si:1'))
    expect(t.repo.registros[0].estadoActual).toBe('por_confirmar')
    expect(a(LUIS.telefono).at(-1)!.texto).toMatch(/administra/i)
  })

  it('una foto que no es comprobante no le llega a nadie del equipo y se le dice a la persona qué puede mandar', async () => {
    t.llm.responder({ es_comprobante: false, descripcion: 'Un perro en un patio' })
    await mandar(foto())
    expect(a(CAROLINA.telefono)).toEqual([])
    expect(t.repo.registros).toHaveLength(0)
    expect(a(TEL).map((s) => s.texto).join('\n')).toMatch(/foto/i)
  })

  it('una foto con una pregunta que no habla de pagos va directo a la IA como pregunta', async () => {
    t.llm.responder(crudo({ respuesta: '¡Qué lindo patio! 😍' }))
    await mandar(foto('Así es mi patio, ¿puedo adoptar a Toby?'))
    expect(t.llm.llamadas).toHaveLength(1)
    expect(a(TEL).map((s) => s.texto)).toContain('¡Qué lindo patio! 😍')
  })

  it('si Gemini no puede leerla, igual le llega la foto a la administración para revisarla a mano', async () => {
    t.llm.responder(new Error('Gemini caído'))
    await mandar(foto('les mandé la donación'))
    expect(a(CAROLINA.telefono)[0].tipo).toBe('imagen')
    expect(a(CAROLINA.telefono)[1].texto).toMatch(/no (la )?pude leer/i)
    expect(t.repo.registros).toHaveLength(0)
    expect(a(TEL).map((s) => s.texto).join('\n')).toMatch(/gracias/i)
  })

  it('un comprobante sin valor legible se pasa a la administración para registrarlo en el panel', async () => {
    t.llm.responder({ ...NEQUI, monto: 0 })
    await mandar(foto())
    expect(a(CAROLINA.telefono)[1].texto).toMatch(/no alcancé a leer el valor/i)
    expect(t.repo.registros).toHaveLength(0)
  })
})

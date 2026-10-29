// Las capturas de producción del 29 oct, repetidas de punta a punta con el bot nuevo.
// Samuel es de administración; una persona de afuera escribe "Hola", adopta, dona y manda el comprobante de Nequi.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { atenderInteresadoExterno } from '../src/adopciones-agente/index.js'
import { atender } from '../src/conversacion/atender.js'
import type { Entrada, Salida, Usuario } from '../src/tipos.js'
import { crudo, montar, silenciarConsola } from './adopciones-agente/ayudas.js'

const SAMUEL: Usuario = { id: 7, nombre: 'Samuel', rol: 'admin', telefono: '573143179745' }
const INTERESADO = '573175274709'
const WEB = 'https://huellitasrefugio.lat'
const boton = (id: string): Entrada => ({ tipo: 'boton', id, titulo: '' })
const texto = (t: string): Entrada => ({ tipo: 'texto', texto: t })

let t: ReturnType<typeof montar>
beforeEach(async () => {
  t = montar()
  t.ctx.sitioWeb = WEB
  t.ctx.donaciones = { nequi: '3001234567', titular: 'Fundación Huellitas', telefono: '3009876543' }
  t.repo.usuarios.push(SAMUEL)
  t.repo.datos.personas.push({ id: '7', nombre: 'Samuel', cargo: '', rol: 'admin', color: '#000', foto: null })
  await t.repo.guardarEstado(SAMUEL.id, { paso: 'menu' })
  silenciarConsola()
})
afterEach(() => vi.restoreAllMocks())

const afuera = (e: Entrada | string) => atenderInteresadoExterno(t.deps, INTERESADO, typeof e === 'string' ? texto(e) : e, t.ctx)
const samuel = (e: Entrada | string) => atender(t.deps, SAMUEL, typeof e === 'string' ? texto(e) : e)
const a = (tel: string): Salida[] => t.wa.enviados.filter((x) => x.telefono === tel).map((x) => x.salida)

describe('las capturas del 29 de octubre, con el bot nuevo', () => {
  it('"Hola" → menú con la web; adopta a Toby en 4 toques y su nombre; a Samuel le llega el aviso con el nombre, sin "Doña"', async () => {
    await afuera('Hola')
    expect(a(INTERESADO)[0].texto).toContain(WEB)
    for (const id of ['ext:adoptar', 'ext:a:5', 'ext:q:5', 'ext:f:v:propia', 'ext:f:t:mucho', 'ext:f:p:si']) await afuera(boton(id))
    await afuera('Laura')
    expect(a(INTERESADO).at(-1)!.texto).toMatch(/Gracias, Laura.*visita/s)
    // Antes: 7 preguntas de la IA. Ahora: ninguna llamada a la IA en todo el camino
    expect(t.llm.llamadas).toHaveLength(0)
    const aviso = a(SAMUEL.telefono)[0].texto
    expect(aviso).toMatch(/^🐾 Samuel, hay un interesado muy bueno para Toby/)
    expect(aviso).not.toContain('Doña')
    expect(aviso).toContain('👤 Nombre: Laura')
  })

  it('Samuel pregunta "como se llama la persona? O no sabemos?" y el bot le responde con lo que sabe', async () => {
    for (const id of ['ext:q:5', 'ext:f:v:propia', 'ext:f:t:mucho', 'ext:f:p:si']) await afuera(boton(id))
    await afuera('Laura')
    t.ia.responder({ transcripcion: 'Gracias, como se llama la persona? O no sabemos?', acciones: [], respuesta: 'Se llama Laura 😊 Quiere conocer a Toby el sábado a las 10.' })
    await samuel('Gracias, como se llama la persona? O no sabemos?')
    expect(t.ia.llamadas.at(-1)!.extra).toContain('Laura')
    const r = a(SAMUEL.telefono).at(-1)!
    expect(r.texto).toContain('Se llama Laura')
    expect(r.texto).not.toContain('No te entendí')
  })

  it('el comprobante de Nequi de $1.000: se lee, Samuel toca "Sí, me llegó" y queda registrado', async () => {
    t.llm.responder({ es_comprobante: true, monto: 1000, fecha: '28 de octubre de 2026 a las 11:17 p. m.', referencia: 'S17273100', medio: 'Nequi', descripcion: 'Envío' })
    await afuera({ tipo: 'imagen', mediaId: 'img-nequi', mime: 'image/jpeg' })
    expect(a(INTERESADO).at(-1)!.texto).toMatch(/gracias por tu donación de \$1\.000/i)
    expect(a(SAMUEL.telefono).map((s) => s.tipo)).toEqual(['imagen', 'botones'])
    await samuel(boton('cpb:si:1'))
    expect(t.repo.datos.movimientos.map((m) => [m.tipo, m.monto, m.categoria])).toEqual([['ingreso', 1000, 'donacion']])
  })

  it('"Quiero adoptar un perrito" escrito de entrada: la IA conversa, sin repetir la web, y "menú" muestra las opciones', async () => {
    t.llm.responder(crudo({ respuesta: '¡Qué alegría! Te cuento de Toby 🐶', intencion: 'adoptar' }))
    await afuera('Quiero adoptar un perrito')
    await afuera('15 horas')
    expect(a(INTERESADO).filter((s) => s.texto.includes(WEB))).toHaveLength(1)
    await afuera('menú')
    expect(a(INTERESADO).at(-1)!.tipo).toBe('botones')
  })

  it('"Donar" muestra los datos y el teléfono de donaciones de una', async () => {
    await afuera(boton('ext:donar'))
    const m = a(INTERESADO).at(-1)!.texto
    expect(m).toContain('3001234567')
    expect(m).toContain('3009876543')
  })
})

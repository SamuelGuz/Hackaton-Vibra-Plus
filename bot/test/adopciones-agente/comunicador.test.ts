import { describe, expect, it, vi } from 'vitest'
import { atenderInteresadoExterno } from '../../src/adopciones-agente/whatsapp.js'
import { crudo, montar, TEL, texto } from './ayudas.js'
import { fragmentarRespuesta, textoPublico } from '../../src/adopciones-agente/comunicador.js'

describe('entrega pública', () => {
  it('no envía un bloque sin límites ni agrupa dos preguntas en un mensaje', () => {
    expect(() => fragmentarRespuesta('a'.repeat(1500))).toThrow()
    const bloques = fragmentarRespuesta('¿Cómo es tu hogar? ¿Tienes permiso? Podemos revisarlo juntos')
    expect(bloques.every(b => (b.match(/\?/g) ?? []).length <= 1)).toBe(true)
  })
  it('muestra los animales restantes cuando piden ver otros', async () => {
    const t = montar()
    const p = t.rag.perritos[0]
    t.rag.perritos = ['Mateo', 'Bruno', 'Canela', 'Pecas', 'Toby'].map((nombre, i) => ({ ...p, id: String(i + 1), nombre, datosDemo: true }))
    await atenderInteresadoExterno(t.deps, TEL, texto('estoy interesado en animalitos'), t.ctx)
    await atenderInteresadoExterno(t.deps, TEL, texto('muéstrame otros perritos'), t.ctx)
    const imagenes = t.wa.enviados.filter(e => e.salida.tipo === 'imagen')
    expect(imagenes).toHaveLength(2)
    expect(imagenes[0].salida.texto).toContain('Canela')
    expect(imagenes[1].salida.texto).toContain('Pecas')
    expect(imagenes[1].salida.texto).not.toContain('Mateo')
  })
  it('si falla el dibujante conserva los nombres en una alternativa de texto', async () => {
    const t = montar()
    t.deps.dibujar = async () => { throw new Error('sin navegador') }
    await atenderInteresadoExterno(t.deps, TEL, texto('quiero adoptar'), t.ctx)
    expect(t.wa.enviados.map(e => e.salida.texto).join(' ')).toContain('Toby')
  })
  it('conserva cifras, URLs y abreviaturas al separar frases', () => {
    const original = 'Son $20.000 COP. Dosis registrada de 3.5 ml. Visita https://refugio.test/mi__animal?q=a_b. El equipo confirma los detalles. ¿Quieres conocerlo?'
    expect(fragmentarRespuesta(original).join(' ')).toBe(original)
    expect(textoPublico('Visita https://refugio.test/mi__animal?q=a_b')).toContain('mi__animal?q=a_b')
  })
  it('reanuda el envío fallido sin repetir los anteriores ni consultar otra vez', async () => {
    const t = montar()
    t.ctx.sitioWeb = 'https://refugio.test'
    t.llm.responder(crudo({ respuesta: 'Puedes conocer a Toby. ¿Quieres saber más?' }))
    const original = t.wa.enviar.bind(t.wa)
    let llamadas = 0
    t.wa.enviar = async (tel, s) => { if (++llamadas === 2) throw new Error('transporte'); await original(tel, s) }
    const enviar = () => atenderInteresadoExterno(t.deps, TEL, texto('cuéntame de Toby'), t.ctx, { mensajeId: 'm1' })
    await expect(enviar()).rejects.toThrow('transporte')
    await enviar()
    await enviar()
    expect(t.llm.llamadas).toHaveLength(1)
    expect(t.wa.enviados).toHaveLength(2)
  })

  it('pide typing y pausa antes de cada envío', async () => {
    const t = montar()
    t.ctx.sitioWeb = 'https://refugio.test'
    t.ctx.pausaHumana = vi.fn(async () => {})
    t.wa.escribiendo = vi.fn(async () => {})
    t.llm.responder(crudo({ respuesta: 'Puedes conocer a Toby. ¿Quieres saber más?' }))
    await atenderInteresadoExterno(t.deps, TEL, texto('cuéntame de Toby'), t.ctx, { mensajeId: 'm2' })
    expect(t.wa.escribiendo).toHaveBeenCalledTimes(t.wa.enviados.length)
    expect(t.ctx.pausaHumana).toHaveBeenCalledTimes(t.wa.enviados.length)
  })

  it('identifica honestamente al asistente sin gastar el modelo', async () => {
    const t = montar()
    await atenderInteresadoExterno(t.deps, TEL, texto('¿Eres una IA?'), t.ctx)
    expect(t.llm.llamadas).toHaveLength(0)
    expect(t.wa.enviados[0].salida.texto).toMatch(/inteligencia artificial/i)
  })

  it('escala solicitudes humanas sin llamar al modelo', async () => {
    const t = montar()
    await atenderInteresadoExterno(t.deps, TEL, texto('quiero hablar con una persona'), t.ctx)
    expect(t.llm.llamadas).toHaveLength(0)
    expect(t.wa.enviados.some(e => /equipo/i.test(e.salida.texto))).toBe(true)
  })
  it('una solicitud humana por audio se deriva antes de proponer visitas', async () => {
    const t = montar()
    t.llm.responder(crudo({ transcripcion: 'quiero hablar con una persona', respuesta: 'Podemos seguir con la adopción', suitability: 100, risk: 0, permiso: 'no_aplica', presupuesto: 'si', tiempo: 'suficiente' }))
    await atenderInteresadoExterno(t.deps, TEL, { tipo: 'audio', mediaId: 'audio-humano', mime: 'audio/ogg' }, t.ctx)
    const enviados = t.wa.enviados.map(e => e.salida.texto).join(' ')
    expect(enviados).toMatch(/atenci[oó]n humana/i)
    expect(enviados).not.toMatch(/visita propuesta|idoneidad/i)
  })
})

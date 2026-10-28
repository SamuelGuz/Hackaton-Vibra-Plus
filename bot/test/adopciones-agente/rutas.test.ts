import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { montarRutasAgente } from '../../src/adopciones-agente/index.js'
import { textosAgente } from '../../src/adopciones-agente/textos.js'
import { CAROLINA } from '../fakes.js'
import { crudo, excelente, montar, silenciarConsola } from './ayudas.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

let t: ReturnType<typeof montar>
let app: Hono<any>

beforeEach(() => {
  t = montar()
  silenciarConsola()
  app = new Hono()
  montarRutasAgente(app, t.deps, t.ctx)
})
afterEach(() => vi.restoreAllMocks())

function llamar(cuerpo: unknown, ip = '1.2.3.4') {
  return app.request('/api/publico/agente-voz', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  })
}
const avisos = () => t.wa.enviados.filter((e) => e.telefono === CAROLINA.telefono).map((e) => (e.salida.tipo === 'texto' ? e.salida.texto : ''))

describe('POST /api/publico/agente-voz', () => {
  it('con texto devuelve sesión, transcripción, respuesta, guion de voz, perritos y acción', async () => {
    t.llm.responder(
      crudo({
        transcripcion: 'quiero un perrito tranquilo',
        respuesta: 'Mira, te cuento la historia de Toby 🐶',
        guion_voz: 'Mira, te cuento la historia de Toby.',
      }),
    )
    const r = await llamar({ texto: 'quiero un perrito tranquilo' })
    expect(r.status).toBe(200)
    const j = await r.json()
    expect(Object.keys(j).sort()).toEqual(['accion', 'guionVoz', 'perritos', 'respuesta', 'sesionId', 'transcripcion'])
    expect(j.sesionId).toMatch(UUID)
    expect(j.transcripcion).toBe('quiero un perrito tranquilo')
    expect(j.respuesta).toBe('Mira, te cuento la historia de Toby 🐶')
    expect(j.guionVoz).toBe('Mira, te cuento la historia de Toby.')
    expect(j.perritos).toEqual([{ id: '5', nombre: 'Toby', especie: 'perro', edadTexto: '3 años', foto: null }])
    expect(j.accion).toBe('ninguna')
    expect(t.wa.enviados).toEqual([])
  })

  it('no expone puntajes ni datos internos', async () => {
    t.llm.responder(excelente())
    const j = await (await llamar({ texto: 'hola' })).json()
    expect(JSON.stringify(j)).not.toMatch(/suitability|risk|score|evaluacion/i)
  })

  it('con el mismo sesionId sigue la conversación', async () => {
    t.llm.responder(crudo({ respuesta: 'Uno' }), crudo({ respuesta: 'Dos' }))
    const a = await (await llamar({ texto: 'hola' })).json()
    const b = await (await llamar({ texto: 'vivo en casa', sesionId: a.sesionId })).json()
    expect(b.sesionId).toBe(a.sesionId)
    expect(t.llm.llamadas[1].mensajes).toEqual([
      { rol: 'user', texto: 'hola' },
      { rol: 'model', texto: 'Uno' },
      { rol: 'user', texto: 'vivo en casa' },
    ])
  })

  it('sin sesionId cada llamada es una conversación nueva', async () => {
    t.llm.responder(crudo())
    const a = await (await llamar({ texto: 'hola' })).json()
    const b = await (await llamar({ texto: 'hola' })).json()
    expect(a.sesionId).not.toBe(b.sesionId)
    expect(t.llm.llamadas[1].mensajes).toHaveLength(1)
  })

  it('con audio lo decodifica y se lo pasa a Gemini sin los parámetros del mime', async () => {
    t.llm.responder(crudo({ transcripcion: 'busco una gatita' }))
    const audio = Buffer.from('bytes-de-audio')
    const r = await llamar({ audioBase64: audio.toString('base64'), mime: 'audio/webm;codecs=opus' })
    expect(r.status).toBe(200)
    expect((await r.json()).transcripcion).toBe('busco una gatita')
    expect(t.llm.llamadas[0].media).toEqual({ datos: audio, mime: 'audio/webm' })
  })

  it('acepta el audio como data URL y asume webm si no dicen el tipo', async () => {
    t.llm.responder(crudo())
    const audio = Buffer.from('xyz')
    await llamar({ audioBase64: `data:audio/webm;base64,${audio.toString('base64')}` })
    expect(t.llm.llamadas[0].media).toEqual({ datos: audio, mime: 'audio/webm' })
  })

  it('perroId deja al perrito en foco desde el primer turno; uno desconocido se ignora', async () => {
    t.llm.responder(crudo({ perrito_id_foco: null, perritos_mencionados: [] }))
    await llamar({ texto: 'hola', perroId: '12' })
    expect(t.llm.llamadas[0].sistema).toMatch(/PERRITO EN FOCO[^\n]*Luna/)
    await llamar({ texto: 'hola', perroId: '999' })
    expect(t.llm.llamadas[1].sistema).not.toMatch(/PERRITO EN FOCO/)
  })

  it('perritos trae los que se mencionaron (válidos y máximo 3), o el que está en foco', async () => {
    t.llm.responder(
      crudo({ perritos_mencionados: ['12', '999', '5'], perrito_id_foco: '5' }),
      crudo({ perritos_mencionados: [], perrito_id_foco: '1' }),
    )
    const a = await (await llamar({ texto: 'hola' })).json()
    expect(a.perritos.map((p: { id: string }) => p.id)).toEqual(['12', '5'])
    const b = await (await llamar({ texto: 'hola' })).json()
    expect(b.perritos.map((p: { id: string }) => p.id)).toEqual(['1'])
  })

  describe('acciones', () => {
    it('agenda visita: accion visita_agendada, aviso a las administradoras sin teléfono de contacto', async () => {
      t.llm.responder(excelente({ nombre: 'Ana', respuesta: 'Qué hermoso hogar' }))
      const j = await (await llamar({ texto: 'listo' })).json()
      expect(j.accion).toBe('visita_agendada')
      expect(j.respuesta).toContain('Qué hermoso hogar')
      expect(j.respuesta).toContain('sábado 31 de octubre')
      expect(j.respuesta).toContain('+573001112233')
      expect(j.guionVoz).toContain('sábado 31 de octubre')
      expect(j.guionVoz).not.toMatch(/\p{Extended_Pictographic}/u)
      expect(avisos()).toEqual([
        'Doña Carolina, filtré a un adoptante excelente para Toby (Score 82%). Viene el sábado a las 10 AM\n' +
          'Fecha: sábado 31 de octubre, 10:00 a. m.\n' +
          'Contacto: llamada web (sin teléfono)\n' +
          'Nombre: Ana\n' +
          'Resumen: casa (no arrienda) · presupuesto veterinario: sí · tiempo disponible: suficiente\n' +
          'Riesgo: 15/100',
      ])
    })

    it('no repite la visita en la misma sesión', async () => {
      t.llm.responder(excelente(), excelente({ respuesta: 'Otra cosa' }))
      const a = await (await llamar({ texto: 'listo' })).json()
      const b = await (await llamar({ texto: 'otra', sesionId: a.sesionId })).json()
      expect(b.accion).toBe('ninguna')
      expect(b.respuesta).toBe('Otra cosa')
      expect(avisos()).toHaveLength(1)
    })

    it('padrinazgo: accion padrinazgo y la oferta de $20.000 COP, también en el guion de voz', async () => {
      t.llm.responder(crudo({ intencion: 'no_puede_adoptar', conexion_emocional: true, respuesta: 'Te entiendo 💛' }))
      const j = await (await llamar({ texto: 'no puedo adoptar' })).json()
      expect(j.accion).toBe('padrinazgo')
      expect(j.respuesta).toContain('$20.000 COP')
      expect(j.guionVoz).toContain('20.000')
      expect(j.guionVoz).toMatch(/padrino/i)
      expect(j.guionVoz).not.toMatch(/\p{Extended_Pictographic}/u)
    })
  })

  describe('errores', () => {
    it('400 si no viene ni texto ni audio', async () => {
      for (const cuerpo of [{}, { texto: '   ' }, { texto: 5 }, { audioBase64: '' }, { sesionId: '12345678-1234-1234-1234-123456789012' }]) {
        const r = await llamar(cuerpo)
        expect(r.status).toBe(400)
        expect(typeof (await r.json()).error).toBe('string')
      }
      expect(t.llm.llamadas).toHaveLength(0)
    })

    it('400 con JSON inválido o un cuerpo que no es un objeto', async () => {
      expect((await llamar('{no es json')).status).toBe(400)
      expect((await llamar('[1,2]')).status).toBe(400)
      expect((await llamar('null')).status).toBe(400)
    })

    it('400 si el texto es demasiado largo', async () => {
      const r = await llamar({ texto: 'a'.repeat(1001) })
      expect(r.status).toBe(400)
      expect(t.llm.llamadas).toHaveLength(0)
    })

    it('400 si el audio pesa más de 2 MB o el tipo no es audio', async () => {
      const grande = Buffer.alloc(2_100_000).toString('base64')
      expect((await llamar({ audioBase64: grande, mime: 'audio/webm' })).status).toBe(400)
      expect((await llamar({ audioBase64: 'AAAA', mime: 'text/html' })).status).toBe(400)
      expect(t.llm.llamadas).toHaveLength(0)
    })

    it('400 si el sesionId no tiene forma válida', async () => {
      expect((await llamar({ texto: 'hola', sesionId: '../../etc/passwd' })).status).toBe(400)
      expect((await llamar({ texto: 'hola', sesionId: 7 })).status).toBe(400)
    })

    it('429 al pasar de 20 peticiones en 10 minutos desde la misma IP; otra IP sigue', async () => {
      t.llm.responder(crudo())
      for (let i = 0; i < 20; i++) expect((await llamar({ texto: 'hola' }, '9.9.9.9')).status).toBe(200)
      const r = await llamar({ texto: 'hola' }, '9.9.9.9')
      expect(r.status).toBe(429)
      expect(typeof (await r.json()).error).toBe('string')
      expect(t.llm.llamadas).toHaveLength(20)
      expect((await llamar({ texto: 'hola' }, '8.8.8.8')).status).toBe(200)
    })

    it('502 con un mensaje amable si Gemini falla', async () => {
      t.llm.responder(new Error('Gemini 503'))
      const r = await llamar({ texto: 'hola' })
      expect(r.status).toBe(502)
      expect(await r.json()).toEqual({ error: textosAgente.fallaWeb })
    })
  })
})

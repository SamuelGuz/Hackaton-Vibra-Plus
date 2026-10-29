import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { atenderInteresadoExterno } from '../../src/adopciones-agente/index.js'
import { textosAgente } from '../../src/adopciones-agente/textos.js'
import type { Entrada, Usuario } from '../../src/tipos.js'
import { AHORA, CAROLINA } from '../fakes.js'
import { MATEO, perrito, TOBY } from '../externo/fakes.js'
import { crudo, excelente, montar, silenciarConsola, TEL, texto } from './ayudas.js'

const MARIA: Usuario = { id: 4, nombre: 'María', rol: 'adopciones', telefono: '573000000004' }

let t: ReturnType<typeof montar>
let consola: ReturnType<typeof silenciarConsola>

beforeEach(() => {
  t = montar()
  consola = silenciarConsola()
})
afterEach(() => vi.restoreAllMocks())

const escribir = (msg: string | Entrada, tel = TEL) =>
  atenderInteresadoExterno(t.deps, tel, typeof msg === 'string' ? texto(msg) : msg, t.ctx)

const alTelefono = (tel: string) => t.wa.enviados.filter((e) => e.telefono === tel).map((e) => (e.salida.tipo === 'texto' ? e.salida.texto : ''))

function agregarAdmin(u: Usuario) {
  t.repo.usuarios.push(u)
  t.repo.datos.personas.push({ id: String(u.id), nombre: u.nombre, cargo: '', rol: u.rol, color: '#000', foto: null })
}

const AVISO_CAROLINA =
  'Doña Carolina, filtré a un adoptante excelente para Toby (Score 82%). Le propuse visita el sábado a las 10 AM, por confirmar\n' +
  'Visita propuesta (por confirmar): sábado 31 de octubre, 10:00 a. m.\n' +
  'Contacto: +573115550000\n' +
  'Resumen: casa (no arrienda) · presupuesto veterinario: sí · tiempo disponible: suficiente\n' +
  'Riesgo: 15/100'

describe('conversación por WhatsApp', () => {
  it('responde con la respuesta cálida de Gemini a quien escribió, y nada más', async () => {
    t.llm.responder(crudo({ respuesta: 'Mira, te cuento la historia de Toby... 🐶' }))
    await escribir('Hola, quiero adoptar un perrito')
    expect(t.wa.enviados).toEqual([{ telefono: TEL, salida: { tipo: 'texto', texto: 'Mira, te cuento la historia de Toby... 🐶' } }])
    expect(t.llm.llamadas).toHaveLength(1)
  })

  it('consulta el RAG con lo que dijo la persona y le da a Gemini los perfiles reales', async () => {
    t.llm.responder(crudo())
    await escribir('Busco un perrito tranquilo para un apartamento')
    expect(t.rag.consultas).toEqual(['Busco un perrito tranquilo para un apartamento'])
    const p = t.llm.llamadas[0]
    expect(p.mensajes.at(-1)).toEqual({ rol: 'user', texto: 'Busco un perrito tranquilo para un apartamento' })
    expect(p.sistema).toContain('Toby')
    expect(p.sistema).toContain(TOBY.historia)
    expect(p.sistema).toContain('Mateo')
    expect(p.sistema).toContain('Ya camina solito.')
    expect(p.sistema).toContain('$20.000')
    expect(p.sistema).toContain('573001112233')
    expect(p.esquema).toBeTruthy()
    expect(typeof p.temperatura).toBe('number')
  })

  it('si la historia no está confirmada, no se la da a Gemini como hecho y le pide hablar en general', async () => {
    t.rag.perritos = [perrito({ id: '7', nombre: 'Rocky', historia: 'Fue rescatado de un incendio en 2019.', historiaConfirmada: false })]
    t.llm.responder(crudo({ perrito_id_foco: '7' }))
    await escribir('Cuéntame de Rocky')
    const { sistema } = t.llm.llamadas[0]
    expect(sistema).toContain('Rocky')
    expect(sistema).not.toContain('incendio')
    expect(sistema).toMatch(/NO CONFIRMADA/)
  })

  it('un botón se trata como texto con su título', async () => {
    t.llm.responder(crudo())
    await escribir({ tipo: 'boton', id: 'si', titulo: 'Quiero conocerlo' })
    expect(t.llm.llamadas[0].mensajes.at(-1)).toEqual({ rol: 'user', texto: 'Quiero conocerlo' })
    expect(t.rag.consultas).toEqual(['Quiero conocerlo'])
  })

  describe('audio', () => {
    it('descarga el audio y se lo pasa a Gemini para que lo transcriba', async () => {
      t.llm.responder(crudo({ transcripcion: 'quiero un perrito', respuesta: 'Qué bonito, cuéntame más 🐶' }))
      await escribir({ tipo: 'audio', mediaId: 'aud1', mime: 'audio/ogg; codecs=opus' })
      expect(t.llm.llamadas).toHaveLength(1)
      expect(t.llm.llamadas[0].media).toEqual({ datos: Buffer.from('archivo aud1'), mime: 'audio/ogg' })
      expect(t.rag.consultas).toEqual(['perrito para adoptar'])
      expect(t.wa.enviados).toEqual([{ telefono: TEL, salida: { tipo: 'texto', texto: 'Qué bonito, cuéntame más 🐶' } }])
    })

    it('guarda en el historial lo que se transcribió, no el marcador del audio', async () => {
      t.llm.responder(crudo({ transcripcion: 'vivo en una casa con patio' }), crudo())
      await escribir({ tipo: 'audio', mediaId: 'aud1', mime: 'audio/ogg' })
      await escribir('gracias')
      expect(t.llm.llamadas[1].mensajes.map((m) => m.texto).slice(0, 1)).toEqual(['vivo en una casa con patio'])
    })

    it('si no se puede descargar, pide texto con cariño y no gasta Gemini', async () => {
      t.wa.descargar = async () => {
        throw new Error('Meta 500')
      }
      await escribir({ tipo: 'audio', mediaId: 'aud1', mime: 'audio/ogg' })
      expect(t.llm.llamadas).toHaveLength(0)
      expect(t.wa.enviados).toEqual([{ telefono: TEL, salida: { tipo: 'texto', texto: textosAgente.audioNoLlego } }])
      expect(consola.error).toHaveBeenCalled()
    })

    it('un audio demasiado grande se rechaza amablemente', async () => {
      t.wa.descargar = async () => ({ datos: Buffer.alloc(3_000_000), mime: 'audio/ogg' })
      await escribir({ tipo: 'audio', mediaId: 'aud1', mime: 'audio/ogg' })
      expect(t.llm.llamadas).toHaveLength(0)
      expect(alTelefono(TEL)).toEqual([textosAgente.audioLargo])
    })
  })

  it('imágenes, stickers y demás: pide texto o nota de voz sin gastar Gemini', async () => {
    await escribir({ tipo: 'imagen', mediaId: 'img1', mime: 'image/jpeg' })
    await escribir({ tipo: 'otro' })
    expect(t.llm.llamadas).toHaveLength(0)
    expect(alTelefono(TEL)).toEqual([textosAgente.soloTextoOVoz, textosAgente.soloTextoOVoz])
    expect(textosAgente.soloTextoOVoz).toMatch(/texto/i)
    expect(textosAgente.soloTextoOVoz).toMatch(/nota de voz/i)
  })

  describe('si Gemini falla', () => {
    it('manda un mensaje cálido, no lanza y lo deja en el log', async () => {
      t.llm.responder(new Error('Gemini 503'))
      await expect(escribir('Hola')).resolves.toBeUndefined()
      expect(t.wa.enviados).toEqual([{ telefono: TEL, salida: { tipo: 'texto', texto: textosAgente.falla } }])
      expect(consola.error).toHaveBeenCalled()
    })

    it('una respuesta sin "respuesta" cuenta como falla', async () => {
      t.llm.responder({ intencion: 'adoptar' })
      await escribir('Hola')
      expect(alTelefono(TEL)).toEqual([textosAgente.falla])
    })

    it('el turno fallido no queda en el historial', async () => {
      t.llm.responder(new Error('caído'), crudo())
      await escribir('Hola')
      await escribir('¿Sigues ahí?')
      expect(t.llm.llamadas[1].mensajes).toEqual([{ rol: 'user', texto: '¿Sigues ahí?' }])
    })

    it('tampoco lanza si WhatsApp falla al contestar', async () => {
      t.llm.responder(crudo())
      t.wa.enviar = async () => {
        throw new Error('WhatsApp 131047')
      }
      await expect(escribir('Hola')).resolves.toBeUndefined()
      expect(consola.error).toHaveBeenCalled()
    })

    it('si el RAG falla, la conversación sigue sin perritos inventados', async () => {
      t.rag.buscar = async () => {
        throw new Error('RAG caído')
      }
      t.llm.responder(crudo({ perrito_id_foco: null, respuesta: 'Cuéntame más' }))
      await escribir('Hola')
      expect(alTelefono(TEL)).toEqual(['Cuéntame más'])
      expect(consola.error).toHaveBeenCalled()
    })
  })

  describe('límite por teléfono', () => {
    it('a partir del mensaje 31 en una hora avisa una sola vez y calla', async () => {
      t.llm.responder(crudo())
      for (let i = 0; i < 30; i++) await escribir(`mensaje ${i}`)
      expect(t.llm.llamadas).toHaveLength(30)
      await escribir('mensaje 31')
      await escribir('mensaje 32')
      expect(t.llm.llamadas).toHaveLength(30)
      expect(alTelefono(TEL)).toHaveLength(31)
      expect(alTelefono(TEL).at(-1)).toBe(textosAgente.limite)
    })

    it('otro número no se afecta, y pasada la ventana vuelve a atender', async () => {
      t.llm.responder(crudo())
      for (let i = 0; i < 31; i++) await escribir(`m ${i}`)
      await escribir('hola', '573229990000')
      expect(t.llm.llamadas).toHaveLength(31)
      t.repo.ahora = new Date(AHORA.getTime() + 61 * 60_000)
      await escribir('ya volví')
      expect(t.llm.llamadas).toHaveLength(32)
    })
  })

  describe('memoria de la conversación', () => {
    it('el segundo turno incluye lo hablado antes, tal como lo vio la persona', async () => {
      t.llm.responder(crudo({ respuesta: 'Primera respuesta' }), crudo({ respuesta: 'Segunda respuesta' }))
      await escribir('Hola')
      await escribir('Vivo en apartamento')
      expect(t.llm.llamadas[1].mensajes).toEqual([
        { rol: 'user', texto: 'Hola' },
        { rol: 'model', texto: 'Primera respuesta' },
        { rol: 'user', texto: 'Vivo en apartamento' },
      ])
    })

    it('guarda como máximo los últimos 12 turnos', async () => {
      t.llm.responder(crudo())
      for (let i = 0; i < 15; i++) await escribir(`mensaje ${i}`)
      const mensajes = t.llm.llamadas[14].mensajes
      expect(mensajes).toHaveLength(25)
      expect(mensajes[0]).toEqual({ rol: 'user', texto: 'mensaje 2' })
      expect(mensajes.at(-1)).toEqual({ rol: 'user', texto: 'mensaje 14' })
    })

    it('cada teléfono tiene su propia conversación', async () => {
      t.llm.responder(crudo())
      await escribir('Hola, soy Ana')
      await escribir('Hola, soy Beto', '573229990000')
      expect(t.llm.llamadas[1].mensajes).toEqual([{ rol: 'user', texto: 'Hola, soy Beto' }])
    })

    it('tras 6 horas sin hablar, la sesión empieza de cero', async () => {
      t.llm.responder(crudo())
      await escribir('Hola')
      t.repo.ahora = new Date(AHORA.getTime() + 5 * 3_600_000)
      await escribir('sigo aquí')
      expect(t.llm.llamadas[1].mensajes).toHaveLength(3)
      t.repo.ahora = new Date(AHORA.getTime() + 12 * 3_600_000)
      await escribir('hola otra vez')
      expect(t.llm.llamadas[2].mensajes).toEqual([{ rol: 'user', texto: 'hola otra vez' }])
    })

    it('junta lo que se fue sabiendo en varios turnos y agenda cuando ya está todo', async () => {
      t.llm.responder(
        crudo({ tipo: 'casa', permiso: 'no_aplica', suitability: 60, risk: 20, nombre: 'Ana' }),
        crudo({ presupuesto: 'si', tiempo: 'suficiente', suitability: 80, risk: 20 }),
      )
      await escribir('Vivo en casa propia, me llamo Ana')
      expect(alTelefono(CAROLINA.telefono)).toEqual([])
      await escribir('Tengo para el veterinario y estoy casi todo el día')
      const aviso = alTelefono(CAROLINA.telefono)
      expect(aviso).toHaveLength(1)
      expect(aviso[0]).toContain('(Score 80%)')
      expect(aviso[0]).toContain('Nombre: Ana')
    })

    it('le muestra a Gemini lo que ya sabe y lo que le falta por preguntar', async () => {
      t.llm.responder(crudo({ tipo: 'apartamento', permiso: 'si' }), crudo())
      await escribir('Vivo en apartamento arrendado y el dueño deja mascotas')
      await escribir('ok')
      const { sistema } = t.llm.llamadas[1]
      expect(sistema).toContain('apartamento')
      expect(sistema).toMatch(/Falta saber:[^\n]*presupuesto_veterinario[^\n]*tiempo_disponible/)
      expect(sistema).not.toMatch(/Falta saber:[^\n]*permiso_arriendo/)
    })
  })

  describe('visita y aviso a las administradoras', () => {
    it('con score 74 no se agenda ni se avisa', async () => {
      t.llm.responder(excelente({ suitability: 74, respuesta: 'Qué lindo hogar 🏡' }))
      await escribir('Tengo casa y tiempo')
      expect(alTelefono(TEL)).toEqual(['Qué lindo hogar 🏡'])
      expect(alTelefono(CAROLINA.telefono)).toEqual([])
      expect(t.wa.enviados).toHaveLength(1)
    })

    it('con score 75 agenda el sábado 10 AM, avisa una vez con el texto exacto y lo confirma a la persona', async () => {
      t.llm.responder(excelente({ suitability: 82, respuesta: 'Qué hermoso hogar para Toby 🏡' }))
      await escribir('Tengo casa, plata para el veterinario y tiempo')
      expect(alTelefono(CAROLINA.telefono)).toEqual([AVISO_CAROLINA])
      const resp = alTelefono(TEL)
      expect(resp).toHaveLength(1)
      expect(resp[0]).toContain('Qué hermoso hogar para Toby 🏡')
      expect(resp[0]).toContain('Toby')
      expect(resp[0]).toContain('sábado 31 de octubre')
      expect(resp[0]).toContain('10:00 a. m.')
      expect(resp[0]).toMatch(/decisión[^.]*equipo de la fundación/i)
      expect(resp[0]).not.toMatch(/aprobad|aprobamos|garantiz/i)
      expect(t.wa.enviados).toHaveLength(2)
    })

    it('exactamente en el límite (75) también agenda', async () => {
      t.llm.responder(excelente({ suitability: 75 }))
      await escribir('Todo listo')
      expect(alTelefono(CAROLINA.telefono)[0]).toContain('(Score 75%)')
    })

    it('en el turno siguiente no repite el aviso ni la confirmación', async () => {
      t.llm.responder(excelente({ respuesta: 'Primera' }), excelente({ respuesta: 'Segunda' }), excelente({ respuesta: 'Tercera' }))
      await escribir('uno')
      t.wa.limpiar()
      await escribir('dos')
      await escribir('tres')
      expect(alTelefono(CAROLINA.telefono)).toEqual([])
      expect(alTelefono(TEL)).toEqual(['Segunda', 'Tercera'])
    })

    it('un sábado antes de las 10:00 la visita es ese mismo día', async () => {
      t.repo.ahora = new Date('2026-10-31T08:00:00-05:00')
      t.llm.responder(excelente())
      await escribir('listo')
      expect(alTelefono(CAROLINA.telefono)[0]).toContain('Visita propuesta (por confirmar): sábado 31 de octubre, 10:00 a. m.')
    })

    it('un sábado ya pasadas las 10:00 la visita es el sábado siguiente', async () => {
      t.repo.ahora = new Date('2026-10-31T11:00:00-05:00')
      t.llm.responder(excelente())
      await escribir('listo')
      expect(alTelefono(CAROLINA.telefono)[0]).toContain('Visita propuesta (por confirmar): sábado 7 de noviembre, 10:00 a. m.')
    })

    it.each([
      ['riesgo 41', excelente({ risk: 41 })],
      ['presupuesto veterinario desconocido', excelente({ presupuesto: 'desconocido' })],
      ['presupuesto veterinario "no"', excelente({ presupuesto: 'no' })],
      ['poco tiempo', excelente({ tiempo: 'poco' })],
      ['sin permiso de arriendo', excelente({ tipo: 'apartamento', permiso: 'no' })],
      ['permiso de arriendo sin saber', excelente({ tipo: 'apartamento', permiso: 'desconocido' })],
      ['no puede adoptar', excelente({ intencion: 'no_puede_adoptar' })],
    ])('no agenda si %s aunque el score sea alto', async (_caso, respuesta) => {
      t.llm.responder(respuesta)
      await escribir('hola')
      expect(alTelefono(CAROLINA.telefono)).toEqual([])
      expect(t.wa.enviados.every((e) => e.telefono === TEL)).toBe(true)
      expect(alTelefono(TEL)[0]).not.toContain('sábado')
    })

    it('si la persona dice algo preocupante sobre el bienestar animal no agenda, ni ahora ni después', async () => {
      t.llm.responder(excelente({ alerta_bienestar: true }), excelente())
      await escribir('lo dejaría amarrado todo el día')
      await escribir('es que era una broma, tengo todo listo')
      expect(alTelefono(CAROLINA.telefono)).toEqual([])
      expect(alTelefono(TEL).every((m) => !m.includes('sábado'))).toBe(true)
    })

    it('un id de perrito inventado por Gemini se ignora (no hay foco, no hay visita)', async () => {
      t.llm.responder(excelente({ perrito_id_foco: '999' }), excelente({ perrito_id_foco: '5' }))
      await escribir('listo')
      expect(t.wa.enviados.every((e) => e.telefono === TEL)).toBe(true)
      await escribir('sí, lo de Toby')
      expect(alTelefono(CAROLINA.telefono)[0]).toContain('para Toby')
    })

    it('si el perrito en foco ya no es adoptable, no agenda', async () => {
      t.rag.perritos = [perrito({ id: '5', nombre: 'Toby', adoptable: false })]
      t.llm.responder(excelente())
      await escribir('listo')
      expect(alTelefono(CAROLINA.telefono)).toEqual([])
    })

    it('avisa a cada administradora (roles admin y adopciones), cada una con su nombre, y no al resto del equipo', async () => {
      agregarAdmin(MARIA)
      t.llm.responder(excelente())
      await escribir('listo')
      expect(alTelefono(CAROLINA.telefono)).toEqual([AVISO_CAROLINA])
      expect(alTelefono(MARIA.telefono)).toEqual([AVISO_CAROLINA.replace('Doña Carolina', 'Doña María')])
      const destinos = t.wa.enviados.map((e) => e.telefono).sort()
      expect(destinos).toEqual([CAROLINA.telefono, MARIA.telefono, TEL].sort())
    })

    it('no repite el aviso a un mismo número aunque salga dos veces en el equipo', async () => {
      agregarAdmin({ id: 9, nombre: 'Carolina bis', rol: 'adopciones', telefono: CAROLINA.telefono })
      t.llm.responder(excelente())
      await escribir('listo')
      expect(alTelefono(CAROLINA.telefono)).toHaveLength(1)
    })

    it('si falla el aviso a una administradora, la conversación sigue y las demás reciben el suyo', async () => {
      agregarAdmin(MARIA)
      const original = t.wa.enviar.bind(t.wa)
      t.wa.enviar = async (tel, s) => {
        if (tel === MARIA.telefono) throw new Error('fuera de la ventana de 24 h')
        return original(tel, s)
      }
      t.llm.responder(excelente())
      await escribir('listo')
      expect(alTelefono(CAROLINA.telefono)).toEqual([AVISO_CAROLINA])
      expect(alTelefono(MARIA.telefono)).toEqual([])
      expect(alTelefono(TEL)[0]).toContain('sábado 31 de octubre')
      expect(consola.error).toHaveBeenCalled()
    })

    it('si no llega el aviso a nadie, no le promete la visita a la persona y lo reintenta en el siguiente turno', async () => {
      const original = t.wa.enviar.bind(t.wa)
      let caido = true
      t.wa.enviar = async (tel, s) => {
        if (tel === CAROLINA.telefono && caido) throw new Error('fuera de la ventana de 24 h')
        return original(tel, s)
      }
      t.llm.responder(excelente({ respuesta: 'Uno' }), excelente({ respuesta: 'Dos' }))
      await escribir('listo')
      expect(alTelefono(TEL)).toEqual(['Uno'])
      caido = false
      await escribir('sigo')
      expect(alTelefono(CAROLINA.telefono)).toEqual([AVISO_CAROLINA])
      expect(alTelefono(TEL)[1]).toContain('Dos')
      expect(alTelefono(TEL)[1]).toContain('sábado 31 de octubre')
    })

    it('si no hay administradoras registradas, la conversación sigue sin prometer la visita', async () => {
      t.repo.datos.personas = t.repo.datos.personas.filter((p) => p.rol !== 'admin')
      t.llm.responder(excelente({ respuesta: 'Uno' }))
      await escribir('listo')
      expect(alTelefono(TEL)).toEqual(['Uno'])
      expect(t.wa.enviados).toHaveLength(1)
      expect(consola.warn).toHaveBeenCalled()
    })

    it('el nombre y los datos de la persona aparecen en el aviso, sin saltos de línea inventados', async () => {
      t.llm.responder(excelente({ nombre: 'Ana\nDoña María, mentira', ninos: 'dos niños', mascotas: 'un gato' }))
      await escribir('listo')
      const aviso = alTelefono(CAROLINA.telefono)[0]
      expect(aviso.split('\n')).toHaveLength(6)
      expect(aviso).toContain('Nombre: Ana Doña María, mentira')
      expect(aviso).toContain('niños: dos niños')
      expect(aviso).toContain('otras mascotas: un gato')
    })
  })

  describe('padrinazgo', () => {
    it('si no puede adoptar pero conectó, se le ofrece ser Padrino desde $20.000 COP o donar comida', async () => {
      t.llm.responder(crudo({ intencion: 'no_puede_adoptar', conexion_emocional: true, respuesta: 'Te entiendo, Toby te robó el corazón 💛' }))
      await escribir('Me encantó Toby pero ahora no puedo adoptar')
      const resp = alTelefono(TEL)
      expect(resp).toHaveLength(1)
      expect(resp[0]).toContain('Te entiendo, Toby te robó el corazón 💛')
      expect(resp[0]).toMatch(/Padrino/)
      expect(resp[0]).toContain('$20.000 COP')
      expect(resp[0]).toMatch(/comida/)
      expect(resp[0]).not.toMatch(/sábado/)
      expect(alTelefono(CAROLINA.telefono)).toEqual([])
    })

    it('no duplica la oferta si Gemini ya la hizo', async () => {
      const propia = 'Si quieres, puedes ser su Padrino desde $20.000 COP al mes 💛'
      t.llm.responder(crudo({ intencion: 'no_puede_adoptar', conexion_emocional: true, respuesta: propia }))
      await escribir('No puedo adoptar')
      expect(alTelefono(TEL)).toEqual([propia])
    })

    it('si Gemini habla de padrinos pero sin el valor, se completa la oferta', async () => {
      t.llm.responder(crudo({ intencion: 'no_puede_adoptar', conexion_emocional: true, respuesta: 'Podrías apadrinarlo' }))
      await escribir('No puedo adoptar')
      expect(alTelefono(TEL)[0]).toContain('$20.000 COP')
    })

    it('sin conexión emocional no se insiste', async () => {
      t.llm.responder(crudo({ intencion: 'no_puede_adoptar', conexion_emocional: false, respuesta: 'Gracias por escribir' }))
      await escribir('no puedo, gracias')
      expect(alTelefono(TEL)).toEqual(['Gracias por escribir'])
    })

    it('con score bajo (<40) a partir del tercer turno y conectado, se ofrece una sola vez', async () => {
      t.llm.responder(crudo({ suitability: 30, conexion_emocional: true, respuesta: 'Cuéntame más' }))
      await escribir('uno')
      await escribir('dos')
      expect(alTelefono(TEL)).toEqual(['Cuéntame más', 'Cuéntame más'])
      await escribir('tres')
      expect(alTelefono(TEL)[2]).toContain('$20.000 COP')
      await escribir('cuatro')
      expect(alTelefono(TEL)[3]).toBe('Cuéntame más')
    })

    it('quien pide apadrinar recibe la oferta aunque Gemini no la haya escrito', async () => {
      t.llm.responder(crudo({ intencion: 'apadrinar', respuesta: 'Qué generoso 💛' }))
      await escribir('quiero apadrinar a Toby')
      expect(alTelefono(TEL)[0]).toContain('$20.000 COP')
    })
  })

  it('nunca expone puntajes ni la evaluación en lo que se manda a la persona', async () => {
    t.llm.responder(excelente({ nombre: 'Ana' }))
    await escribir('hola')
    for (const m of alTelefono(TEL)) {
      expect(m).not.toMatch(/score|puntaje|suitability|riesgo/i)
    }
  })

  it('el prompt prohíbe revelar puntajes, prometer adopción o pedir datos sensibles', async () => {
    t.llm.responder(crudo())
    await escribir('hola')
    const { sistema } = t.llm.llamadas[0]
    expect(sistema).toMatch(/NUNCA[^\n]*(puntaje|evaluando)/i)
    expect(sistema).toMatch(/NUNCA[^\n]*(prometas|aprobada)/i)
    expect(sistema).toMatch(/NUNCA[^\n]*(cédula|contraseña)/i)
    expect(sistema).toMatch(/UNA sola pregunta/i)
  })

  it('el perfil completo de cada candidato (necesidades médicas incluidas) llega a Gemini', async () => {
    t.llm.responder(crudo())
    await escribir('hola')
    expect(t.llm.llamadas[0].sistema).toContain(MATEO.necesidadesMedicas[0])
  })
})

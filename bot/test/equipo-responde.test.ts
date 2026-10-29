// El bot le responde todo a quien es del equipo: preguntas, saludos y "gracias", con los datos del refugio.
// Caso real (29 oct): al aviso de una visita, Samuel preguntó "Gracias, como se llama la persona? O no sabemos?"
// y el bot contestó "No te entendí bien 🙈" con el menú.
import { beforeEach, describe, expect, it } from 'vitest'
import { atender } from '../src/conversacion/atender.js'
import type { Entrada, Usuario } from '../src/tipos.js'
import { CAROLINA, crearDeps, LUIS } from './fakes.js'

const texto = (t: string): Entrada => ({ tipo: 'texto', texto: t })
const audio = (id = 'aud1'): Entrada => ({ tipo: 'audio', mediaId: id, mime: 'audio/ogg' })

let t: ReturnType<typeof crearDeps>
const decir = (e: Entrada, u: Usuario = CAROLINA) => atender(t.deps, u, e)

const SOLICITUD = {
  fecha: '2026-10-27T15:51:00.000Z', nombre: 'Laura Gómez', telefono: '573175274709', cedula: '1098765432', direccion: 'Cra 1 # 2-3',
  animalId: '12', familiaDeAcuerdo: true, paraQuien: 'yo' as const, vivienda: 'casa' as const, viviendaConMallas: true,
  dondeVivira: 'dentro_casa' as const, aceptaEsterilizar: true, aceptaVacunar: true, aceptaSeguimiento: true,
  quiereEntregaInmediata: false, preguntoPorCaracter: true, planEmergencia: '', mascotasAnteriores: '', motivo: '',
  montonManual: null, nota: '', llamadaAgendada: null, origen: 'agente' as const, claveOrigen: 'wa:573175274709',
  visitaPropuesta: '2026-10-31T15:00:00.000Z', visitaEstado: 'propuesta' as const, puntajeIdoneidad: 95, puntajeRiesgo: 30,
}

beforeEach(async () => {
  t = crearDeps()
  for (const u of [LUIS, CAROLINA]) await t.repo.guardarEstado(u.id, { paso: 'menu' })
  t.repo.adopcion.push({ ...SOLICITUD, id: '1' })
})

describe('el bot le responde al equipo', () => {
  it('"¿cómo se llama la persona?" se responde con los datos, sin "No te entendí" ni el menú', async () => {
    t.ia.responder({ transcripcion: 'Gracias, como se llama la persona? O no sabemos?', acciones: [], respuesta: 'Se llama Laura 😊 Quiere a Luna y la visita quedó propuesta para el sábado a las 10.' })
    await decir(texto('Gracias, como se llama la persona? O no sabemos?'))
    expect(t.wa.ultimoTexto()).toContain('Se llama Laura')
    expect(t.wa.enviados.map((x) => x.salida.texto).join('\n')).not.toContain('No te entendí')
    expect(t.wa.ultimo().tipo).toBe('botones')
    expect(t.repo.registros).toHaveLength(0)
  })

  it('a la IA le llegan las solicitudes con el nombre de pila y sin teléfono ni cédula', async () => {
    t.ia.responder({ acciones: [], respuesta: 'Se llama Laura.' })
    await decir(texto('como se llama la persona de Luna?'))
    const contexto = t.ia.llamadas[0].extra ?? ''
    expect(contexto).toContain('Laura')
    expect(contexto).toContain('Luna')
    expect(contexto).not.toContain('Gómez')
    expect(contexto).not.toContain('3175274709')
    expect(contexto).not.toContain('1098765432')
  })

  it('a un cuidador no le llegan las solicitudes de adopción (las ve adopciones y administración)', async () => {
    t.ia.responder({ acciones: [], respuesta: 'Eso lo maneja adopciones.' })
    await decir(texto('quién va a adoptar a Luna?'), LUIS)
    expect(t.ia.llamadas[0].extra ?? '').not.toContain('Laura')
  })

  it('"gracias" o un saludo reciben respuesta, no el menú', async () => {
    t.ia.responder({ acciones: [], respuesta: '¡Con mucho gusto, Carolina! 🐾' })
    await decir(texto('mil gracias'))
    expect(t.wa.ultimoTexto()).toContain('Con mucho gusto')
  })

  it('una pregunta junto a algo que hizo: registra y responde en el mismo mensaje', async () => {
    t.ia.responder({
      transcripcion: 'abrí un bulto de perro, cuánta comida queda?',
      acciones: [{ tipo: 'inventario', especie: 'perro', cambio: -1 }],
      respuesta: 'Quedan unos 2 días de comida de perro.',
    })
    await decir(texto('abrí un bulto de perro, cuánta comida queda?'))
    expect(t.repo.registros).toHaveLength(1)
    expect(t.wa.ultimoTexto()).toContain('Quedan unos 2 días')
    expect(t.wa.ultimoTexto()).toContain('¿Está bien?')
  })

  it('en audio también responde', async () => {
    t.ia.responder({ transcripcion: 'cuántas medicinas faltan hoy', acciones: [], respuesta: 'Faltan 2: Mateo a las 8 p. m. y Tobías ya está.' })
    await decir(audio())
    expect(t.wa.ultimoTexto()).toContain('Faltan 2')
  })

  it('si la IA no responde nada útil, sigue el camino de siempre', async () => {
    t.ia.responder({ transcripcion: 'eh', acciones: [], respuesta: '' })
    await decir(texto('eh'))
    expect(t.wa.ultimo().tipo).toBe('lista')
  })
})

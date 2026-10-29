// GET /api/publico/meta-del-dia: lo que ven los vecinos al escanear el QR del afiche. Sin sesión y sin nombres de personas.
import { beforeEach, describe, expect, it } from 'vitest'
import { crearApp } from '../src/app.js'
import { atender } from '../src/conversacion/atender.js'
import type { Entrada } from '../src/tipos.js'
import { CAROLINA, crearDeps, LUIS } from './fakes.js'

const audio = (id = 'aud1'): Entrada => ({ tipo: 'audio', mediaId: id, mime: 'audio/ogg' })
const boton = (id: string): Entrada => ({ tipo: 'boton', id, titulo: '' })

let t: ReturnType<typeof crearDeps>
let app: ReturnType<typeof crearApp>

beforeEach(async () => {
  t = crearDeps()
  for (const u of [LUIS, CAROLINA]) await t.repo.guardarEstado(u.id, { paso: 'menu' })
  app = crearApp({
    deps: t.deps,
    usuarioPorSesion: async () => null,
    eventos: async () => ({ dosis: [], inventario: [], movimientos: [], notas: [] }),
    leerArchivo: async () => null,
    verifyToken: 'v',
    appSecret: 's',
  })
})

const pedir = (ip = '1.1.1.1') => app.request('/api/publico/meta-del-dia', { headers: { 'x-forwarded-for': ip, origin: 'https://tienda.example' } })

describe('GET /api/publico/meta-del-dia', () => {
  it('sin nada confirmado hoy: las metas en cero avance y sin acciones; abierta a cualquier página', async () => {
    const r = await pedir()
    expect(r.status).toBe(200)
    expect(r.headers.get('access-control-allow-origin')).toBe('*')
    expect(await r.json()).toEqual({ metaKg: 25, recaudadoKg: 0, metaPesos: 150_000, recaudadoPesos: 0, ultimasAcciones: [] })
  })

  it('lo que Yesenia confirma por audio aparece en vivo: kilos, plata y curaciones, de lo más nuevo a lo más viejo', async () => {
    t.repo.ahora = new Date('2026-10-27T09:15:00-05:00')
    t.ia.responder({ transcripcion: 'Don Carlos trajo 15 kilos de carne', acciones: [], confianza: 0.95 })
    await atender(t.deps, LUIS, audio())
    t.repo.ahora = new Date('2026-10-27T10:30:00-05:00')
    t.ia.responder({
      transcripcion: 'Le curé la herida a Mateo, ya está sanando, se lo dije a Don Carlos',
      acciones: [{ tipo: 'nota', animalId: '11', texto: 'Le curé la herida; Don Carlos ayudó' }],
      confianza: 0.95,
    })
    await atender(t.deps, LUIS, audio('aud2'))
    t.repo.ahora = new Date('2026-10-27T11:00:00-05:00')
    t.ia.responder({
      transcripcion: 'entraron 110 mil de donación de la señora Marta',
      acciones: [{ tipo: 'movimiento', movimiento: { tipo: 'ingreso', monto: 110_000, categoria: 'donacion', clinicaId: null, abonoDeuda: false, foto: null, nota: 'señora Marta' } }],
      confianza: 0.95,
    })
    await atender(t.deps, CAROLINA, audio('aud3'))
    // La plata espera el "Sí": todavía no cuenta
    expect((await (await pedir()).json()).recaudadoPesos).toBe(0)
    await atender(t.deps, CAROLINA, boton('si:3'))

    const j = await (await pedir()).json()
    expect(j).toMatchObject({ metaKg: 25, recaudadoKg: 15, metaPesos: 150_000, recaudadoPesos: 110_000 })
    expect(j.ultimasAcciones).toEqual([
      { hora: '11:00 AM', texto: 'Llegó un aporte de $110.000' },
      { hora: '10:30 AM', texto: 'Cuidaron a Mateo y anotaron cómo sigue' },
      { hora: '09:15 AM', texto: 'Llegaron 15 kg de carne para los perros' },
    ])
  })

  it('filtro de privacidad: ningún nombre de persona del equipo ni de lo que se dijo', async () => {
    t.ia.responder({
      transcripcion: 'Le di la pastilla a Tobías, me ayudó Andrea',
      acciones: [{ tipo: 'dosis', animalId: '10', tratamientoId: '100', hora: '14:00' }],
      confianza: 0.95,
    })
    await atender(t.deps, LUIS, audio())
    const cuerpo = await (await pedir()).text()
    expect(cuerpo).toContain('Tobías recibió su Fenobarbital')
    for (const nombre of ['Don Luis', 'Luis', 'Andrea', 'Carolina', 'quien']) expect(cuerpo).not.toContain(nombre)
  })

  it('lo que queda por confirmar o se corrigió no sale', async () => {
    t.ia.responder({
      transcripcion: 'le di la pastilla a Tobi creo',
      acciones: [{ tipo: 'dosis', animalId: '10', tratamientoId: '100', hora: '14:00' }],
      confianza: 0.5,
    })
    await atender(t.deps, LUIS, audio())
    expect((await (await pedir()).json()).ultimasAcciones).toEqual([])
  })

  it('las metas salen de la configuración del refugio', async () => {
    t.repo.datos.metaDelDia = { kg: 40, pesos: 300_000 }
    expect(await (await pedir()).json()).toMatchObject({ metaKg: 40, metaPesos: 300_000 })
  })

  it('tiene límite de peticiones por IP', async () => {
    let ultimo = 200
    for (let i = 0; i < 61; i++) ultimo = (await pedir('9.9.9.9')).status
    expect(ultimo).toBe(429)
    expect((await pedir('8.8.8.8')).status).toBe(200)
  })
})

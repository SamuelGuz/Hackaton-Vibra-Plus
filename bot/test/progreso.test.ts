// La página web pública lee la misión, lo que hace Yesenia y las donaciones del bot, y su "Ya doné" le llega a la administración.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearApp } from '../src/app.js'
import { atender } from '../src/conversacion/atender.js'
import type { Entrada } from '../src/tipos.js'
import { CAROLINA, crearDeps, LUIS } from './fakes.js'

let t: ReturnType<typeof crearDeps>
let app: ReturnType<typeof crearApp>
beforeEach(async () => {
  t = crearDeps()
  for (const u of [LUIS, CAROLINA]) await t.repo.guardarEstado(u.id, { paso: 'menu' })
  app = crearApp({
    deps: t.deps, usuarioPorSesion: async () => null,
    eventos: async () => ({ dosis: [], inventario: [], movimientos: [], notas: [] }),
    leerArchivo: async () => null, verifyToken: 'v', appSecret: 's',
  })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

const progreso = async () => (await app.request('/api/publico/progreso', { headers: { 'x-forwarded-for': '1.1.1.1' } })).json()
const donar = (cuerpo: unknown, ip = '2.2.2.2') =>
  app.request('/api/publico/donacion', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(cuerpo) })
const audio: Entrada = { tipo: 'audio', mediaId: 'a1', mime: 'audio/ogg' }

describe('GET /api/publico/progreso', () => {
  it('trae la forma que lee la página, con lo confirmado y sin nombres de personas', async () => {
    t.repo.ahora = new Date('2026-10-27T09:15:00-05:00')
    t.ia.responder({ transcripcion: 'Don Carlos trajo 15 kilos de carne', acciones: [], confianza: 0.95 })
    await atender(t.deps, LUIS, audio)
    t.repo.ahora = new Date('2026-10-27T11:00:00-05:00')
    t.ia.responder({
      transcripcion: 'compré un bulto de concentrado en 95 mil',
      acciones: [{ tipo: 'movimiento', movimiento: { tipo: 'gasto', monto: 95_000, categoria: 'comida', clinicaId: null, abonoDeuda: false, foto: null, nota: 'Tienda de don Pedro' } }],
      confianza: 0.95,
    })
    await atender(t.deps, CAROLINA, audio)
    await atender(t.deps, CAROLINA, { tipo: 'boton', id: 'si:2', titulo: '' })

    const p = await progreso()
    expect(p).toMatchObject({ version: 2, ejemplo: false, metas: [{ id: 'comida', meta: 200_000, recaudado: 0, ejemplo: false }] })
    expect(p.compras).toEqual([
      { fecha: '2026-10-27T11:00:00-05:00', texto: 'Compró comida para los peluditos.', monto: 95_000, tipo: 'bulto' },
      { fecha: '2026-10-27T09:15:00-05:00', texto: 'Recibió 15 kg de carne y recortes para los perros.', tipo: 'carne' },
    ])
    const todo = JSON.stringify(p)
    for (const nombre of ['Carlos', 'Pedro', 'Luis', 'Carolina']) expect(todo).not.toContain(nombre)
  })

  it('abierta a cualquier página (CORS)', async () => {
    const r = await app.request('/api/publico/progreso', { headers: { origin: 'https://huellitasrefugio.lat' } })
    expect(r.headers.get('access-control-allow-origin')).toBe('*')
  })
})

describe('POST /api/publico/donacion ("Ya doné" de la página)', () => {
  it('queda por confirmar y a la administración le llega "¿Te llegó la plata?"; al decir que sí, sube la barra', async () => {
    const r = await donar({ monto: 20_000, apodo: 'Maruja' })
    expect(r.status).toBe(200)
    expect(t.repo.registros[0]).toMatchObject({ usuarioId: null, estadoActual: 'por_confirmar' })
    const aviso = t.wa.enviados.find((x) => x.telefono === CAROLINA.telefono)!.salida
    expect(aviso.texto).toContain('la página web')
    expect(aviso.texto).toContain('*$20.000*')
    expect(aviso.texto).toContain('Maruja')
    expect(aviso.tipo === 'botones' && aviso.botones.map((b) => b.id)).toEqual(['cpb:si:1', 'cpb:no:1'])
    expect(t.wa.enviados.some((x) => x.telefono === LUIS.telefono)).toBe(false)
    // Sin confirmar no cuenta
    expect((await progreso()).metas[0].recaudado).toBe(0)
    await atender(t.deps, CAROLINA, { tipo: 'boton', id: 'cpb:si:1', titulo: '' })
    const p = await progreso()
    expect(p.metas[0].recaudado).toBe(20_000)
    expect(p.donaciones).toEqual([{ fecha: expect.stringMatching(/-05:00$/), monto: 20_000 }])
    expect(JSON.stringify(p)).not.toContain('Maruja')
  })

  it('un monto inválido no avisa a nadie', async () => {
    for (const cuerpo of [{ monto: 500 }, { monto: 'mil' }, {}, null]) expect((await donar(cuerpo)).status).toBe(400)
    expect(t.wa.enviados).toHaveLength(0)
  })

  it('pocos avisos por IP: nadie inunda a la administración', async () => {
    for (let i = 0; i < 5; i++) expect((await donar({ monto: 5_000 }, '9.9.9.9')).status).toBe(200)
    expect((await donar({ monto: 5_000 }, '9.9.9.9')).status).toBe(429)
    expect((await donar({ monto: 5_000 }, '8.8.8.8')).status).toBe(200)
  })
})

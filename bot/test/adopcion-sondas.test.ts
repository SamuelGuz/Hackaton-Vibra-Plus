// Sondas de seguridad del verificador independiente: rutas raras, métodos y roles nunca exponen solicitudes de adopción.
import { beforeEach, describe, expect, it } from 'vitest'
import { crearApp } from '../src/app.js'
import type { Usuario } from '../src/tipos.js'
import { ANDREA, CAROLINA, crearDeps, LUIS } from './fakes.js'

const MARCELA: Usuario = { id: 4, nombre: 'Marcela', rol: 'adopciones', telefono: '573000000004' }
const form = { id: 'f1', nombre: 'Laura', telefono: '3005551234', cedula: '1020304050', direccion: 'Cra 10', animalId: null,
  familiaDeAcuerdo: true, paraQuien: 'yo', vivienda: 'casa', viviendaConMallas: true, dondeVivira: 'dentro_casa',
  aceptaEsterilizar: true, aceptaVacunar: true, aceptaSeguimiento: true, quiereEntregaInmediata: false, preguntoPorCaracter: true,
  planEmergencia: 'x', mascotasAnteriores: 'y', motivo: 'z' }
let t: ReturnType<typeof crearDeps>; let app: ReturnType<typeof crearApp>; const tk: Record<string, string> = {}
beforeEach(async () => {
  t = crearDeps(); t.repo.usuarios.push(MARCELA)
  for (const u of [LUIS, ANDREA, CAROLINA, MARCELA]) tk[u.nombre] = await t.repo.crearSesion(u.id)
  app = crearApp({ deps: t.deps, usuarioPorSesion: async (k) => { const id = t.repo.sesiones.get(k); return id ? t.repo.usuarioPorId(id) : null },
    eventos: async () => ({ dosis: [], inventario: [], movimientos: [], notas: [] }), leerArchivo: async () => null, verifyToken: 'v', appSecret: 's' })
})
const h = (u?: Usuario): Record<string, string> => (u ? { Authorization: `Bearer ${tk[u.nombre]}`, 'content-type': 'application/json' } : { 'content-type': 'application/json' })
const paths = ['/api/adopciones/solicitudes', '/api/adopciones/solicitudes/', '/api/adopciones//solicitudes', '/api/adopciones/%73olicitudes',
  '/API/adopciones/solicitudes', '/api/Adopciones/solicitudes', '/api/adopciones/solicitudes/1', '/api/adopciones/solicitudes?x=1',
  '/api/./adopciones/solicitudes', '/api/x/../adopciones/solicitudes', '/api/adopciones', '/api/adopciones%2Fsolicitudes']
describe('probes', () => {
  it('paths', async () => {
    await app.request('/api/adopciones/solicitudes', { method: 'POST', body: JSON.stringify(form), headers: h(MARCELA) })
    const out: string[] = []
    for (const p of paths) for (const m of ['GET', 'POST', 'OPTIONS', 'HEAD', 'PUT']) for (const u of [undefined, LUIS, ANDREA, CAROLINA]) {
      const r = await app.request(p, { method: m, headers: { ...h(u), Origin: 'http://evil' }, body: m === 'POST' || m === 'PUT' ? JSON.stringify({ nota: 'hack' }) : undefined })
      const b = await r.text()
      if (b.includes('1020304050') || r.status < 300 || b.includes('Laura')) out.push(`${m} ${p} ${u?.rol} ${r.status} ${b.slice(0, 80)}`)
    }
    expect(out.filter((o) => !o.includes(' admin ') && !(o.startsWith('OPTIONS') && o.endsWith('204 ')))).toEqual([])
    for (const p of ['/api/adopciones/solicitudes', '/api/adopciones/solicitudes/1']) for (const m of ['GET', 'POST']) {
      expect((await app.request(p, { method: m, headers: h() })).status).toBe(401)
      expect((await app.request(p, { method: m, headers: h(LUIS), body: m === 'POST' ? '{}' : undefined })).status).toBe(403)
    }
  })
  it('idempotency and invariants', async () => {
    const post = (b: unknown) => app.request('/api/adopciones/solicitudes', { method: 'POST', body: JSON.stringify(b), headers: h(MARCELA) })
    const r1 = await (await post(form)).json(); const r2 = await (await post(form)).json()
    expect([r1, r2]).toEqual([{ id: '1', nueva: true }, { id: '1', nueva: false }])
    const ch = (b: unknown) => app.request('/api/adopciones/solicitudes/1', { method: 'POST', body: JSON.stringify(b), headers: h(MARCELA) })
    expect((await ch({ montonManual: 'rojo', nota: 'n', llamadaAgendada: '2026-11-01T10:00' })).status).toBe(200)
    const snap = JSON.stringify(t.repo.adopcion)
    for (const bad of [{}, { montonManual: 'azul' }, { nota: 5 }, { llamadaAgendada: 'mañana' }, [], null, { nota: 'x', montonManual: 'azul' }]) {
      expect((await ch(bad)).status).toBe(400)
    }
    expect((await post({ ...form, cedula: 7 })).status).toBe(400)
    expect(JSON.stringify(t.repo.adopcion)).toBe(snap)
    await post({ ...form, motivo: 'otro' })
    expect(t.repo.adopcion[0]).toMatchObject({ montonManual: 'rojo', nota: 'n', llamadaAgendada: '2026-11-01T10:00', motivo: 'otro' })
    await ch({ nota: 'n' }); await ch({ nota: 'n' })
    expect(t.repo.adopcion[0].nota).toBe('n')
    expect((await app.request('/api/adopciones/solicitudes/999', { method: 'POST', body: '{"nota":"a"}', headers: h(MARCELA) })).status).toBe(404)
  })
})

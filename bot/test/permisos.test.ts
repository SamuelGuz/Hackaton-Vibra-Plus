// Permisos por rol en el servidor: la plata la ve solo administración; registrarla, todos menos voluntarios
// (igual que por WhatsApp). Los recibos los abre administración o quien los subió.
import { beforeEach, describe, expect, it } from 'vitest'
import { crearApp } from '../src/app.js'
import type { FilasEventos } from '../src/api/hoy.js'
import type { Usuario } from '../src/tipos.js'
import { ANDREA, CAROLINA, crearDeps, LUIS } from './fakes.js'

const SARA: Usuario = { id: 9, nombre: 'Sara', rol: 'voluntario', telefono: '573000000009' }
const UUID = (n: number) => `0b9f5d3e-4c1a-4e2b-9a7f-${String(n).padStart(12, '0')}`
const FOTO = 'data:image/jpeg;base64,/9j/4AAQ'

/** Un movimiento en las filas de la base, para GET /api/eventos */
const FILAS: FilasEventos = {
  dosis: [], inventario: [], notas: [],
  movimientos: [{ id: 7, tipo: 'gasto', monto: 120_000, categoria: 'comida', entidad_id: null, soporte_url: null, concepto: 'bulto', fecha_hora: '2026-10-27T09:00', creado_por: 3 }],
}

let t: ReturnType<typeof crearDeps>
let app: ReturnType<typeof crearApp>
const token: Record<string, string> = {}

beforeEach(async () => {
  t = crearDeps()
  t.repo.usuarios.push(SARA)
  for (const u of [LUIS, ANDREA, CAROLINA, SARA]) token[u.nombre] = await t.repo.crearSesion(u.id)
  app = crearApp({
    deps: t.deps,
    usuarioPorSesion: async (tk) => {
      const id = t.repo.sesiones.get(tk)
      return id ? t.repo.usuarioPorId(id) : null
    },
    eventos: async () => FILAS,
    leerArchivo: async (n) => ({ datos: Buffer.from(`archivo ${n}`), mime: 'image/jpeg' }),
    verifyToken: 'verificar',
    appSecret: 'secreto',
  })
})

const como = (u: Usuario) => ({ Authorization: `Bearer ${token[u.nombre]}`, 'content-type': 'application/json' })
const pedir = (ruta: string, u: Usuario) => app.request(ruta, { headers: como(u) })
const mandar = (ruta: string, cuerpo: unknown, u: Usuario) => app.request(ruta, { method: 'POST', body: JSON.stringify(cuerpo), headers: como(u) })
const gasto = (n: number, foto: string | null = null) => ({
  id: UUID(n), tipo: 'movimiento', movimiento: { tipo: 'gasto', monto: 50_000, categoria: 'comida', clinicaId: null, abonoDeuda: false, foto, nota: '' },
})
const nota = (n: number) => ({ id: UUID(n), tipo: 'nota', animalId: '10', texto: 'comió bien' })
type Hoy = { movimientos: unknown[]; cajaInicial: { monto: number }; clinicas: { nombre: string; deuda: number; limite: number }[]; animales: unknown[]; porConfirmar: { quien: string }[] }

describe('GET /api/hoy', () => {
  it('a la administradora le llega todo: caja, movimientos y deuda', async () => {
    await mandar('/api/eventos', [gasto(1)], CAROLINA)
    const d = (await (await pedir('/api/hoy', CAROLINA)).json()) as Hoy
    expect(d.movimientos).toHaveLength(1)
    expect(d.cajaInicial.monto).toBe(1_000_000)
    expect(d.clinicas[0]).toMatchObject({ deuda: 1_550_000, limite: 2_500_000 })
  })

  it('a un cuidador le llega todo menos la plata: sin movimientos, caja ni deuda', async () => {
    await mandar('/api/eventos', [gasto(1)], CAROLINA)
    const d = (await (await pedir('/api/hoy', LUIS)).json()) as Hoy
    expect(d.movimientos).toEqual([])
    expect(d.cajaInicial.monto).toBe(0)
    expect(d.clinicas).toEqual([{ id: '50', nombre: 'Clínica Veterinaria San Roque', deuda: 0, limite: 0 }])
    expect(d.animales).toHaveLength(3)
  })

  it('los pendientes de plata de otra persona no le llegan; los suyos sí', async () => {
    await t.repo.crearRegistro({ usuarioId: CAROLINA.id, canal: 'whatsapp', tipoEntrada: 'audio', transcripcion: 'gasté 80 mil', estado: 'por_confirmar',
      acciones: [{ tipo: 'movimiento', movimiento: { tipo: 'gasto', monto: 80_000, categoria: 'comida', clinicaId: null, abonoDeuda: false, foto: null, nota: '' } }] })
    await t.repo.crearRegistro({ usuarioId: LUIS.id, canal: 'whatsapp', tipoEntrada: 'audio', transcripcion: 'gasté 10 mil', estado: 'por_confirmar',
      acciones: [{ tipo: 'movimiento', movimiento: { tipo: 'gasto', monto: 10_000, categoria: 'comida', clinicaId: null, abonoDeuda: false, foto: null, nota: '' } }] })
    const d = (await (await pedir('/api/hoy', LUIS)).json()) as Hoy
    expect(d.porConfirmar.map((p) => p.quien)).toEqual([String(LUIS.id)])
    expect(((await (await pedir('/api/hoy', CAROLINA)).json()) as Hoy).porConfirmar).toHaveLength(2)
  })
})

describe('GET /api/eventos', () => {
  it('los movimientos solo le llegan a la administradora', async () => {
    expect(((await (await pedir('/api/eventos', CAROLINA)).json()) as Hoy).movimientos).toHaveLength(1)
    expect(((await (await pedir('/api/eventos', LUIS)).json()) as Hoy).movimientos).toEqual([])
    expect(await (await pedir('/api/eventos?tipo=movimiento', ANDREA)).json()).toEqual({ movimientos: [] })
  })
})

describe('POST /api/eventos', () => {
  it('un cuidador registra un gasto, como por WhatsApp', async () => {
    const r = await mandar('/api/eventos', [gasto(1)], LUIS)
    expect(r.status).toBe(200)
    expect(t.repo.registros).toHaveLength(1)
  })

  it('un voluntario no registra plata (403) y no queda nada guardado', async () => {
    const r = await mandar('/api/eventos', [gasto(1), { id: UUID(2), tipo: 'deuda', clinicaId: '50', monto: 1000, nota: '' }], SARA)
    expect(r.status).toBe(403)
    expect(t.repo.registros).toHaveLength(0)
  })

  it('un voluntario sí registra lo que no es plata, aunque venga en la misma lista', async () => {
    const r = await mandar('/api/eventos', [nota(1), gasto(2)], SARA)
    expect(r.status).toBe(200)
    const cuerpo = (await r.json()) as { guardados: unknown[]; errores: { error: string }[] }
    expect(cuerpo.guardados).toHaveLength(1)
    expect(cuerpo.errores[0].error).toContain('plata')
  })
})

describe('POST /api/eventos/estado', () => {
  it('un voluntario no confirma ni anula registros de plata (403) y quedan igual', async () => {
    const id = await t.repo.crearRegistro({ usuarioId: LUIS.id, canal: 'whatsapp', tipoEntrada: 'audio', transcripcion: '', estado: 'por_confirmar',
      acciones: [{ tipo: 'deuda', clinicaId: '50', monto: 1000, nota: '' }] })
    expect((await mandar('/api/eventos/estado', { ids: [id], estado: 'anulado' }, SARA)).status).toBe(403)
    expect(t.repo.registros[0].estadoActual).toBe('por_confirmar')
    expect((await mandar('/api/eventos/estado', { ids: [id], estado: 'anulado' }, LUIS)).status).toBe(200)
  })

  it('un voluntario sí confirma lo que no es plata', async () => {
    const id = await t.repo.crearRegistro({ usuarioId: LUIS.id, canal: 'whatsapp', tipoEntrada: 'audio', transcripcion: '', estado: 'por_confirmar',
      acciones: [{ tipo: 'nota', animalId: '10', texto: 'comió' }] })
    expect((await mandar('/api/eventos/estado', { ids: [id], estado: 'confirmado' }, SARA)).status).toBe(200)
  })
})

describe('archivos', () => {
  it('un recibo lo abre la administradora y quien lo subió; otra persona del equipo no (403)', async () => {
    await mandar('/api/eventos', [gasto(1, FOTO)], LUIS)
    const a = t.repo.registros[0].acciones[0]
    const ruta = a.tipo === 'movimiento' ? a.movimiento.foto! : ''
    expect(ruta).toMatch(/^\/archivos\//)
    expect((await pedir(ruta, CAROLINA)).status).toBe(200)
    expect((await pedir(ruta, LUIS)).status).toBe(200)
    expect((await pedir(ruta, ANDREA)).status).toBe(403)
    expect((await app.request(ruta)).status).toBe(401)
  })

  it('el audio de una nota lo abre cualquiera del equipo', async () => {
    await t.repo.crearRegistro({ usuarioId: LUIS.id, canal: 'whatsapp', tipoEntrada: 'audio', transcripcion: 'comió', estado: 'por_confirmar',
      mediaUrl: '/archivos/nota.ogg', acciones: [{ tipo: 'nota', animalId: '10', texto: 'comió' }] })
    expect((await pedir('/archivos/nota.ogg', ANDREA)).status).toBe(200)
  })
})

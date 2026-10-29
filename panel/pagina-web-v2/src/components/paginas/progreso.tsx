'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export interface Meta { id: string; titulo: string; detalle: string; meta: number; recaudado: number; estado?: string; ejemplo?: boolean }
export interface Compra { id?: string; fecha: string; texto: string; monto?: number | null; metaId?: string }
export interface Donante { id?: string; fecha?: string; nombrePublico: string; consentimiento: boolean; metaId?: string }
export interface Progreso {
  version?: number
  actualizado: string | null
  periodo?: { tipo: 'semana' | 'mes'; desde: string | null; hasta: string | null }
  ejemplo?: boolean
  metas: Meta[]
  compras: Compra[]
  donantes: Donante[]
}
export type EstadoMeta = 'vacio' | 'en_curso' | 'cumplida'
export type Carga = 'cargando' | 'listo' | 'error'

const CLAVE_CACHE = 'huellitas:progreso:v2'
const DIAS_OBSOLETO = 14

export const pesos = (n: number) => `$${new Intl.NumberFormat('es-CO').format(Math.max(0, Math.round(n)))}`

export function estadoMeta(m: Meta): EstadoMeta {
  if (m.recaudado <= 0) return 'vacio'
  return m.recaudado >= m.meta ? 'cumplida' : 'en_curso'
}
export const porcentaje = (m: Meta) => (m.meta > 0 ? Math.min(100, Math.floor((m.recaudado / m.meta) * 100)) : 0)

export function esObsoleto(p: Progreso): boolean {
  if (!p.actualizado) return false
  const t = Date.parse(p.actualizado)
  return Number.isFinite(t) && Date.now() - t > DIAS_OBSOLETO * 86400000
}

export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(new Date(t))
}

const num = (v: unknown, def = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : def)
const txt = (v: unknown, def = '') => (typeof v === 'string' ? v : def)

/** Accepts the v2 schema and the original {actualizado, metas, compras}. Returns null if unusable. */
export function normalizar(raw: unknown): Progreso | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.metas)) return null
  const metas: Meta[] = r.metas
    .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
    .map(m => ({
      id: txt(m.id), titulo: txt(m.titulo), detalle: txt(m.detalle), meta: num(m.meta), recaudado: num(m.recaudado),
      estado: typeof m.estado === 'string' ? m.estado : undefined,
      ejemplo: typeof m.ejemplo === 'boolean' ? m.ejemplo : undefined,
    }))
    .filter(m => m.id && m.titulo && m.meta > 0)
  const compras: Compra[] = (Array.isArray(r.compras) ? r.compras : [])
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map(c => ({ id: typeof c.id === 'string' ? c.id : undefined, fecha: txt(c.fecha), texto: txt(c.texto), monto: typeof c.monto === 'number' ? c.monto : null, metaId: typeof c.metaId === 'string' ? c.metaId : undefined }))
    .filter(c => c.texto)
    .sort((a, b) => (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0))
  const donantes: Donante[] = (Array.isArray(r.donantes) ? r.donantes : [])
    .filter((d): d is Record<string, unknown> => !!d && typeof d === 'object')
    .map(d => ({ id: typeof d.id === 'string' ? d.id : undefined, fecha: typeof d.fecha === 'string' ? d.fecha : undefined, nombrePublico: txt(d.nombrePublico, 'Alguien') || 'Alguien', consentimiento: d.consentimiento === true, metaId: typeof d.metaId === 'string' ? d.metaId : undefined }))
  const per = r.periodo as Record<string, unknown> | undefined
  return {
    version: typeof r.version === 'number' ? r.version : 1,
    actualizado: typeof r.actualizado === 'string' ? r.actualizado : null,
    periodo: per && (per.tipo === 'mes' || per.tipo === 'semana')
      ? { tipo: per.tipo, desde: typeof per.desde === 'string' ? per.desde : null, hasta: typeof per.hasta === 'string' ? per.hasta : null }
      : undefined,
    ejemplo: typeof r.ejemplo === 'boolean' ? r.ejemplo : undefined,
    metas, compras, donantes,
  }
}

export const esEjemplo = (p: Progreso, m: Meta) => m.ejemplo ?? p.ejemplo ?? true

interface Valor { datos: Progreso | null; carga: Carga; cacheado: boolean; recargar: () => void }
const Ctx = createContext<Valor | null>(null)

function useCarga(activo: boolean): Valor {
  const [datos, setDatos] = useState<Progreso | null>(null)
  const [carga, setCarga] = useState<Carga>('cargando')
  const [cacheado, setCacheado] = useState(false)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!activo) return
    let vivo = true
    setCarga('cargando')
    fetch('/data/progreso.json', { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then(j => {
        const p = normalizar(j)
        if (!p) throw new Error('formato')
        if (!vivo) return
        setDatos(p); setCacheado(false); setCarga('listo')
        try { localStorage.setItem(CLAVE_CACHE, JSON.stringify(p)) } catch { /* sin almacenamiento */ }
      })
      .catch(() => {
        if (!vivo) return
        let previo: Progreso | null = null
        try { const g = localStorage.getItem(CLAVE_CACHE); if (g) previo = normalizar(JSON.parse(g)) } catch { /* ignorar */ }
        setDatos(previo); setCacheado(!!previo); setCarga('error')
      })
    return () => { vivo = false }
  }, [activo, intento])

  const recargar = useCallback(() => setIntento(n => n + 1), [])
  return { datos, carga, cacheado, recargar }
}

/** Provee el progreso una sola vez; si ya hay un proveedor arriba, reutiliza el suyo. */
export function ProgresoProvider({ children }: { children: ReactNode }) {
  const padre = useContext(Ctx)
  const propio = useCarga(!padre)
  return <Ctx.Provider value={padre ?? propio}>{children}</Ctx.Provider>
}

export function useProgreso(): Valor {
  const v = useContext(Ctx)
  if (!v) throw new Error('useProgreso necesita ProgresoProvider')
  return v
}

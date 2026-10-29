'use client'

import { useEffect, useState } from 'react'
import { leerProgreso } from './backend'

export interface Meta { id: string; titulo: string; detalle: string; meta: number; recaudado: number; ejemplo?: boolean }
export type TipoCompra = 'bulto' | 'carne' | 'salud' | 'recibo' | 'entrega' | 'otro'
export interface Compra { fecha: string; texto: string; monto?: number | null; tipo?: TipoCompra }
export interface Donacion { fecha: string; monto: number; nombrePublico?: string | null; consentimiento?: boolean }
export interface Donante { nombrePublico: string; consentimiento?: boolean }
export interface Progreso { actualizado: string | null; ejemplo?: boolean; metas: Meta[]; compras: Compra[]; donantes?: Donante[]; donaciones?: Donacion[] }

// Zero-valued fallback: the bars stay honest when /data/progreso.json cannot be read.
const RESPALDO: Progreso = {
  actualizado: null,
  metas: [
    { id: 'comida', titulo: 'Comida de la semana', detalle: 'Carne, huesos, menudencias y concentrado.', meta: 200000, recaudado: 0, ejemplo: true },
    { id: 'infraestructura', titulo: 'Infraestructura del refugio', detalle: 'Cercas, techos y espacios seguros.', meta: 500000, recaudado: 0, ejemplo: true },
  ],
  compras: [],
  donantes: [],
  donaciones: [],
}

let cache: Promise<Progreso> | null = null
function cargar(): Promise<Progreso> {
  cache ??= leerProgreso()
    .then(d => (d && Array.isArray((d as Progreso).metas) ? (d as Progreso) : RESPALDO))
    .catch(() => RESPALDO)
  return cache
}

export function useProgreso() {
  const [datos, setDatos] = useState<Progreso>(RESPALDO)
  const [cargado, setCargado] = useState(false)
  useEffect(() => {
    let vivo = true
    void cargar().then(d => { if (vivo) { setDatos(d); setCargado(true) } })
    return () => { vivo = false }
  }, [])
  return { datos, cargado }
}

export const pesos = (n: number) => `$${new Intl.NumberFormat('es-CO').format(n)}`

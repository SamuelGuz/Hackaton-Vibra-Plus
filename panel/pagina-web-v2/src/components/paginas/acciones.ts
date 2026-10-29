'use client'

import { createContext, useContext } from 'react'
import type { Meta } from './progreso'
import type { Animal } from './contenido'

export interface Acciones {
  /** Abre el flujo de aporte (monto, consentimiento, pasos, gracias). */
  aportar: (opts?: { monto?: number; metaId?: string; mensual?: boolean }) => void
  compartir: () => void
  detalleMeta: (meta: Meta) => void
  /** `animal` null = preguntas generales de adopcion. */
  adoptar: (animal: Animal | null) => void
  /** Aviso breve tipo popover (role=status), se cierra solo. */
  avisar: (texto: string) => void
}

export const AccionesCtx = createContext<Acciones | null>(null)

/** Fuera de AccionesProvider (por ejemplo el Home) cae a navegacion simple, sin romper. */
const RESPALDO: Acciones = {
  aportar: () => { window.location.assign('/aportar') },
  compartir: () => { window.location.assign('/como-ayudar') },
  detalleMeta: () => { window.location.assign('/aportar') },
  adoptar: () => { window.location.assign('/adoptar') },
  avisar: () => {},
}

export function useAcciones(): Acciones {
  return useContext(AccionesCtx) ?? RESPALDO
}

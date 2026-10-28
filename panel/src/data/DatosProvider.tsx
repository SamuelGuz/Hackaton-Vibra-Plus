// Punto único de acceso a los datos del albergue.
// Hoy sirve los datos demo; en la Fase 5 (persona B) se conecta a Dexie + Google Sheets
// sin que las pantallas tengan que cambiar.
import { createContext, useContext, useState } from 'react'
import { crearDatosDemo } from './demo'
import type { DatosAlbergue } from './tipos'

interface ContextoDatos {
  datos: DatosAlbergue
  /** Aplica un cambio a los datos. Más adelante también lo encola para enviarlo a Sheets. */
  cambiar: (fn: (d: DatosAlbergue) => DatosAlbergue) => void
}

const Contexto = createContext<ContextoDatos | null>(null)

export function DatosProvider({ children }: { children: React.ReactNode }) {
  const [datos, setDatos] = useState<DatosAlbergue>(() => crearDatosDemo())
  return <Contexto.Provider value={{ datos, cambiar: setDatos }}>{children}</Contexto.Provider>
}

export function useDatos(): ContextoDatos {
  const c = useContext(Contexto)
  if (!c) throw new Error('useDatos debe usarse dentro de <DatosProvider>')
  return c
}

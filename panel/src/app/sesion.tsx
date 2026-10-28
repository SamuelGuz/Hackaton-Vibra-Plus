// Quién está usando el celular. Con servidor, es la persona del enlace que mandó el bot.
// En modo demo se elige la cara al entrar y se recuerda en el celular.
import { createContext, useContext, useState } from 'react'
import { useDatos } from '../data/DatosProvider'
import type { Persona } from '../data/tipos'

const CLAVE = 'huellitas.persona'

interface Sesion {
  persona: Persona | null
  entrar: (id: string) => void
  salir: () => void
}

const Contexto = createContext<Sesion | null>(null)

function leer(): string | null {
  try {
    return localStorage.getItem(CLAVE)
  } catch {
    return null
  }
}

function guardar(id: string | null) {
  try {
    if (id) localStorage.setItem(CLAVE, id)
    else localStorage.removeItem(CLAVE)
  } catch {
    // Sin almacenamiento (modo privado): la sesión dura mientras la pestaña esté abierta
  }
}

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const { datos, yo } = useDatos()
  const [elegido, setId] = useState<string | null>(leer)
  const id = yo ?? elegido
  const persona = datos.personas.find((p) => p.id === id) ?? null

  const entrar = (nuevo: string) => {
    guardar(nuevo)
    setId(nuevo)
  }
  const salir = () => {
    guardar(null)
    setId(null)
  }

  return <Contexto.Provider value={{ persona, entrar, salir }}>{children}</Contexto.Provider>
}

export function useSesion(): Sesion {
  const s = useContext(Contexto)
  if (!s) throw new Error('useSesion debe usarse dentro de <SesionProvider>')
  return s
}

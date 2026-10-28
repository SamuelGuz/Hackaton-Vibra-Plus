// Cliente de los endpoints públicos (sin sesión ni Authorization).
import { urlApi } from '../../data/api'
import type { RespuestaAgenteVoz, RespuestaBusqueda, RespuestaPerritos } from './tipos'

/** El servidor respondió con un error o no se pudo llegar a él (estado 0) */
export class ErrorPublico extends Error {
  constructor(
    public estado: number,
    mensaje: string,
  ) {
    super(mensaje)
  }
}

/** Con VITE_API_URL se usa ese servidor; sin ella, el mismo origen de la página */
function ruta(camino: string, params?: Record<string, string>): string {
  const query = params ? `?${new URLSearchParams(params).toString()}` : ''
  return `${urlApi() ?? ''}/api/publico/${camino}${query}`
}

async function leer<T>(respuesta: Response): Promise<T> {
  let cuerpo: unknown = null
  try {
    cuerpo = await respuesta.json()
  } catch {
    // cuerpo vacío o que no es JSON
  }
  if (!respuesta.ok) {
    const mensaje = (cuerpo as { error?: string } | null)?.error
    throw new ErrorPublico(respuesta.status, mensaje ?? `Error ${respuesta.status}`)
  }
  return cuerpo as T
}

async function pedir<T>(url: string, init: RequestInit): Promise<T> {
  let respuesta: Response
  try {
    respuesta = await fetch(url, init)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ErrorPublico(0, 'Sin conexión con Huellitas')
  }
  return leer<T>(respuesta)
}

export function listarPerritos(signal?: AbortSignal, limite = 24): Promise<RespuestaPerritos> {
  return pedir(ruta('rag/perritos', { limite: String(limite) }), { signal })
}

export function buscarPerritos(q: string, signal?: AbortSignal, limite = 12): Promise<RespuestaBusqueda> {
  return pedir(ruta('rag/buscar', { q, limite: String(limite) }), { signal })
}

export function hablarConAgente(
  cuerpo: { texto: string; sesionId?: string; perroId?: string },
  signal?: AbortSignal,
): Promise<RespuestaAgenteVoz> {
  return pedir(ruta('agente-voz'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
    signal,
  })
}

// Límite de peticiones por clave (IP o teléfono) en memoria: las rutas públicas gastan Gemini y correo.

export interface Limitador {
  /** true si la petición pasa; false si esa clave ya gastó su cupo en la ventana */
  permitir(clave: string): boolean
}

export function crearLimitador(maximo: number, ventanaMs: number, ahora: () => number = Date.now): Limitador {
  const golpes = new Map<string, number[]>()
  return {
    permitir(clave) {
      const t = ahora()
      const recientes = (golpes.get(clave) ?? []).filter((x) => t - x < ventanaMs)
      if (recientes.length >= maximo) {
        golpes.set(clave, recientes)
        return false
      }
      recientes.push(t)
      golpes.set(clave, recientes)
      // Evita que el mapa crezca sin fin con IPs que ya no vuelven
      if (golpes.size > 5000) for (const [k, v] of golpes) if (v.every((x) => t - x >= ventanaMs)) golpes.delete(k)
      return true
    },
  }
}

/** IP del cliente detrás de un proxy (Render, Fly, Cloudflare…); 'desconocida' si no hay cabecera */
export function ipDe(cabeceras: { get(n: string): string | null | undefined }): string {
  const cadena = cabeceras.get('x-forwarded-for')
  // El primer elemento suele ser controlable por el cliente. El proxy confiable
  // agrega su dirección al final; usarla evita que cambiar el prefijo salte el límite.
  const ips = cadena?.split(',').map((x) => x.trim()).filter(Boolean)
  return ips?.at(-1) || cabeceras.get('cf-connecting-ip') || 'desconocida'
}

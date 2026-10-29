/** Asignaciones para demostrar la experiencia. Las fotos no verifican identidad ni historia. */
export const CATALOGO_DEMO = [
  { nombre: 'Mateo', clave: 'mateo', fotoRuta: '/api/publico/catalogo/fotos/mateo.png' },
  { nombre: 'Bruno', clave: 'bruno', fotoRuta: '/api/publico/catalogo/fotos/bruno.png' },
  { nombre: 'Canela', clave: 'canela', fotoRuta: '/api/publico/catalogo/fotos/canela.png' },
  { nombre: 'Pecas', clave: 'pecas', fotoRuta: '/api/publico/catalogo/fotos/pecas.png' },
  { nombre: 'Toby', clave: 'toby', fotoRuta: '/api/publico/catalogo/fotos/toby.png' },
] as const

export function fichaDemo(nombre: string) {
  const clave = nombre.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  return CATALOGO_DEMO.find(p => p.clave === clave)
}

/** Solo estas rutas locales pueden salir del API; /archivos exige sesión interna. */
export function fotoPublicaSegura(foto: string | null | undefined): string | null {
  if (!foto) return null
  if (CATALOGO_DEMO.some(p => p.fotoRuta === foto)) return foto
  try {
    const url = new URL(foto)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? foto : null
  } catch { return null }
}

const ENTIDADES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/** Escapa texto para ponerlo en el cuerpo o en un atributo HTML entre comillas. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ENTIDADES[c] ?? c)
}

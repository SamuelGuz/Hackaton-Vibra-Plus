/**
 * Id de usuario de WhatsApp (BSUID): llega en vez del número cuando la persona tiene nombre de usuario
 * y Meta no comparte su teléfono, p. ej. 'CO.159103206567' o 'CO.ENT.123'. Se usa tal cual para responderle.
 */
export function esUsuarioWa(id: string): boolean {
  return /^[A-Z]{2}\.(ENT\.)?\d+$/.test(id)
}

/** Deja solo los dígitos, con el indicativo de Colombia: '300 123 4567' → '573001234567'. Un id de usuario queda igual. */
export function normalizarTelefono(telefono: string): string {
  if (!telefono) return ''
  if (esUsuarioWa(telefono.trim())) return telefono.trim()
  const digitos = telefono.replace(/\D/g, '')
  if (digitos.length === 10 && digitos.startsWith('3')) return `57${digitos}`
  return digitos
}

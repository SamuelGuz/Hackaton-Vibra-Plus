/** Deja solo los dígitos, con el indicativo de Colombia: '300 123 4567' → '573001234567' */
export function normalizarTelefono(telefono: string): string {
  const digitos = telefono.replace(/\D/g, '')
  if (digitos.length === 10 && digitos.startsWith('3')) return `57${digitos}`
  return digitos
}

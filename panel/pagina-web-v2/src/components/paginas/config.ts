/**
 * PENDIENTE: numero de WhatsApp de Yesenia (solo digitos con indicativo, por ejemplo 57300...).
 * Mientras este vacio, todos los botones de WhatsApp quedan deshabilitados y lo explican.
 * No inventar numeros.
 */
export const WHATSAPP_NUMERO: string = ''

export function waUrl(texto: string): string | null {
  if (!WHATSAPP_NUMERO) return null
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`
}

/** Datos de pago confirmados con Yesenia. La UI ofrece copiarlos. */
export const DATOS_PAGO: { etiqueta: string; valor: string | null }[] = [
  { etiqueta: 'Nequi', valor: '3114565817' },
  { etiqueta: 'Titular', valor: 'Yesenia' },
]

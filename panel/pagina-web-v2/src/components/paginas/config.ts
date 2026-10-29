/**
 * WhatsApp de Yesenia: es el mismo número del asistente del refugio ("¿Hablamos?"). Lo que le escriban ahí
 * (avisos de donación, comprobantes, pedir el muro) le llega a ella. Sale de NEXT_PUBLIC_WA_AGENTE al compilar,
 * solo dígitos con indicativo. Si está vacío, los botones de WhatsApp quedan deshabilitados y lo explican.
 */
export const WHATSAPP_NUMERO: string = (process.env.NEXT_PUBLIC_WA_AGENTE ?? '').replace(/\D/g, '')

/** '573001234567' → '+57 300 123 4567' */
export function whatsappBonito(numero: string = WHATSAPP_NUMERO): string {
  const d = numero.replace(/\D/g, '')
  const m = /^57(\d{3})(\d{3})(\d{4})$/.exec(d)
  return m ? `+57 ${m[1]} ${m[2]} ${m[3]}` : `+${d}`
}

export function waUrl(texto: string): string | null {
  if (!WHATSAPP_NUMERO) return null
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`
}

/** Datos de pago confirmados con Yesenia. La UI ofrece copiarlos. */
export const DATOS_PAGO: { etiqueta: string; valor: string | null }[] = [
  { etiqueta: 'Nequi', valor: '3114565817' },
  { etiqueta: 'Titular', valor: 'Yesenia' },
]

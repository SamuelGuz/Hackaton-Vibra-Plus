// Content helpers shared by the story sections, the header and the footer.
// Rule: a value that starts with "PENDIENTE:" is an internal note and is never shown raw.
import { historia } from '../../contenido/historia'

export const POR_CONFIRMAR = 'Por confirmar'

/** Anchor of the donation chapter. Hero CTAs with destino "donar" land here. */
export const ANCLA_AYUDAR = 'ayudar'

export function esPendiente(valor: string): boolean {
  return valor.trimStart().startsWith('PENDIENTE:')
}

/** The value itself, or a discreet placeholder when it is still pending. */
export function mostrar(valor: string, alterno: string = POR_CONFIRMAR): string {
  return esPendiente(valor) ? alterno : valor
}

/** Colombian peso format: 10000 -> "$10.000". */
export function formatoCop(monto: number): string {
  return `$${new Intl.NumberFormat('es-CO').format(monto)}`
}

export function formatoNumero(valor: number): string {
  return new Intl.NumberFormat('es-CO').format(valor)
}

/** wa.me link for the adoption assistant, or null while the number is pending. */
export function enlaceWhatsapp(): string | null {
  const numero = historia.adopcion.whatsapp
  if (esPendiente(numero)) return null
  const digitos = numero.replace(/\D/g, '')
  if (!digitos) return null
  return `https://wa.me/${digitos}?text=${encodeURIComponent('Hola, quiero adoptar.')}`
}

/** Resolves a content CTA destination to an href, or null when it cannot work yet. */
export function hrefDestino(destino: string): string | null {
  if (destino === 'donar' || destino === 'como-ayuda-tu-aporte') return `#${ANCLA_AYUDAR}`
  if (destino === 'whatsapp') return enlaceWhatsapp()
  return `#${destino}`
}

/** Headings longer than ~32 characters get a wider measure so they break in fewer lines. */
export function esTituloLargo(titulo: string): boolean {
  return titulo.length > 32
}

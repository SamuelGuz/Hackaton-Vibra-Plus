/** Aporte mínimo mensual para apadrinar */
export const PADRINO_DESDE_COP = 20000

/** Enlace directo a WhatsApp con el mensaje listo; null si el albergue no tiene número publicado */
export function enlaceWhatsapp(numero: string | null | undefined, nombre: string): string | null {
  const limpio = (numero ?? '').replace(/\D/g, '')
  if (!limpio) return null
  const texto = `Hola Huellitas, quiero conocer a ${nombre}`
  return `https://wa.me/${limpio}?text=${encodeURIComponent(texto)}`
}

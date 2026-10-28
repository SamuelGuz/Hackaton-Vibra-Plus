// Fotos de recibos y facturas: se achican en el celular antes de guardarlas
// (WebP de máximo 1024 px, unos 100 KB) para gastar pocos datos.

const LADO_MAXIMO = 1024

export async function comprimirFoto(archivo: File): Promise<string> {
  const imagen = await createImageBitmap(archivo)
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(imagen.width * escala)
  lienzo.height = Math.round(imagen.height * escala)
  lienzo.getContext('2d')?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height)
  imagen.close()
  return lienzo.toDataURL('image/webp', 0.7)
}

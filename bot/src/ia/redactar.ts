// El plan gratis de Gemini usa los datos para entrenar: antes de mandarle un texto se le quitan
// teléfonos y documentos (Ley 1581). Los montos con puntos de miles ($1.500.000) se dejan.

const DOCUMENTO = /\b(c[ée]dula|c\.?\s?c\.?|documento|nit|ti|pasaporte)\b[^\d\n]{0,24}\d[\d.\s-]{4,18}\d/gi
const TELEFONO = /(\+?57[\s-]?)?\b3\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g
const DIGITOS_LARGOS = /\b\d{8,}\b/g

export function quitarDatosSensibles(texto: string): string {
  return texto
    .replace(DOCUMENTO, (_m, palabra: string) => `${palabra} [documento]`)
    .replace(TELEFONO, '[teléfono]')
    .replace(DIGITOS_LARGOS, '[número]')
}

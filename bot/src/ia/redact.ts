// Antes de cada llamada a Gemini con texto libre: nunca salen teléfonos, cédulas, direcciones ni emails
// (placa viva, Global Constraints). El orden importa: lo más específico primero.

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g

const VIA = '(?:calle|carrera|cra|cr|kr|avenida|av|diagonal|diag|transversal|tv|circular|autopista)'
const DIRECCION = new RegExp(
  `(?<![\\p{L}\\d])${VIA}\\.?\\s*\\d+[a-z]?(?:\\s*(?:bis|sur|norte|este|oeste))?\\s*(?:#|n[o°º]\\.?|nro\\.?)\\s*\\d+[a-z]?\\s*[-–\\s]\\s*\\d+` +
    '(?:\\s*,?\\s*(?:apto|apartamento|casa|torre|int|interior|piso|bloque)\\.?\\s*\\w+)?',
  'giu',
)

// Documento con su etiqueta: "CC 1098765432", "cédula: 1.098.765.432", "NIT 900.123.456-7".
const DOCUMENTO_ETIQUETADO =
  /(?<![\p{L}\d])(?:c\.?\s?c\.?|c[eé]dula(?:\s+de\s+ciudadan[ií]a)?|nit|t\.?\s?i\.?|c\.?\s?e\.?|documento|pasaporte)\s*(?:n[°º]\.?|no\.?|#|:|es)?\s*\d[\d.-]{5,}\d(?![\d])/giu

// Celular: 3XX XXX XXXX con o sin +57/57. Fijo: indicativo 60X y 7 dígitos, o 7 dígitos sueltos con separador.
const CELULAR = /(?<![\d.])(?:\+?57[\s-]?)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}(?![\d])/g
const FIJO = /(?<![\d.])(?:\(?60\d\)?[\s.-]?)\d{3}[\s.-]?\d{4}(?![\d])|(?<![\d.])\d{3}[\s-]\d{4}(?![\d])/g

// Número largo sin etiqueta que ya no es celular: lo más probable es una cédula (9 o 10 dígitos, o
// 1.098.765.432 con puntos). Con puntos y menos de 9 dígitos (12.500.000) es plata y se deja.
const DOCUMENTO_SUELTO = /(?<![\d.])\d{9,10}(?![\d])|(?<![\d.])\d{1,3}(?:\.\d{3}){3}(?![\d.])/g

export function quitarDatosSensibles(texto: string): string {
  return texto
    .replace(EMAIL, '[email]')
    .replace(DIRECCION, '[dir]')
    .replace(DOCUMENTO_ETIQUETADO, '[doc]')
    .replace(CELULAR, '[tel]')
    .replace(FIJO, '[tel]')
    .replace(DOCUMENTO_SUELTO, '[doc]')
}

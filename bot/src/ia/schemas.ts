// Esquemas de respuesta de Gemini (responseSchema): subconjunto de OpenAPI, sin $ref, oneOf ni
// additionalProperties. El `tipo` de acción sigue a TipoAccion de shared/src/vistas.ts.

export interface EsquemaGemini {
  type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean'
  description?: string
  enum?: string[]
  nullable?: boolean
  properties?: Record<string, EsquemaGemini>
  required?: string[]
  items?: EsquemaGemini
}

/** La raíz es un objeto (Gemini responde mejor así): `{ acciones: Accion[] }`. */
export const ESQUEMA_ACCIONES: EsquemaGemini = {
  type: 'object',
  properties: {
    acciones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tipo: {
            type: 'string',
            enum: ['comida', 'dosis', 'observacion', 'avance', 'inventario', 'factura', 'abono', 'donacion', 'nota'],
          },
          animalCodigo: { type: 'string', description: 'Código del animal, p. ej. TOB01' },
          medicamento: { type: 'string' },
          cantidad: { type: 'number' },
          unidad: { type: 'string' },
          monto: { type: 'integer', description: 'Pesos COP, entero' },
          nota: { type: 'string' },
          tiempo: { type: 'string', enum: ['pasado', 'presente', 'futuro'] },
          fraseExacta: { type: 'string', description: 'Lo que dijo la persona, textual' },
          confianza: { type: 'number', description: 'Entre 0 y 1' },
        },
        required: ['tipo', 'tiempo', 'fraseExacta', 'confianza'],
      },
    },
  },
  required: ['acciones'],
}

export const ESQUEMA_COMPROBANTE: EsquemaGemini = {
  type: 'object',
  properties: {
    tipo: { type: 'string', enum: ['factura', 'transferencia', 'otro'] },
    monto: { type: 'integer', nullable: true, description: 'Pesos COP, entero; null si no se lee' },
    fecha: { type: 'string', description: 'YYYY-MM-DD' },
    clinicaId: { type: 'string' },
    concepto: { type: 'string' },
    animalCodigo: { type: 'string' },
    legible: { type: 'boolean' },
  },
  required: ['tipo', 'legible'],
}

export const ESQUEMA_DIARIO: EsquemaGemini = {
  type: 'object',
  properties: {
    texto: { type: 'string' },
    hechosUsados: { type: 'array', items: { type: 'string' }, description: 'Ids de los hechos usados' },
  },
  required: ['texto', 'hechosUsados'],
}

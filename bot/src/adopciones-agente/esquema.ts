// Esquema JSON que Gemini debe devolver en cada turno (snake_case), en el formato de responseSchema
// de la API REST (el mismo de src/ia/schemas.ts). Todo se valida de nuevo en decisiones.ts.
import type { EsquemaGemini } from '../ia/schemas'
import { INTENCIONES, PERMISOS, SI_NO, TIEMPOS, TIPOS_VIVIENDA } from './tipos'

export const ESQUEMA_AGENTE: EsquemaGemini = {
  type: 'object',
  properties: {
    transcripcion: {
      type: 'string',
      description: 'Lo que dijo la persona tal cual. Si fue un audio, transcríbelo palabra por palabra; si fue texto, repítelo',
    },
    respuesta: { type: 'string', description: 'Tu mensaje cálido para WhatsApp o pantalla, con UNA sola pregunta como máximo' },
    guion_voz: {
      type: 'string',
      description: 'Lo mismo que "respuesta" reescrito para decirse en voz alta: sin emojis ni markdown, frases cortas y pausas naturales',
    },
    perrito_id_foco: { type: 'string', nullable: true, description: 'Id (de la lista) del animal del que hablas ahora, o null' },
    perritos_mencionados: { type: 'array', items: { type: 'string' }, description: 'Ids (de la lista) de los animales de los que hablas, máximo 3' },
    intencion: { type: 'string', enum: [...INTENCIONES] },
    conexion_emocional: { type: 'boolean', description: 'true si la persona mostró cariño o se conmovió con un animal' },
    alerta_bienestar: {
      type: 'boolean',
      description: 'true si dijo algo preocupante sobre el bienestar de un animal (maltrato, dejarlo atado o solo, regalarlo, etc.)',
    },
    evaluacion: {
      type: 'object',
      description: 'Lo que sabes de la persona HASTA AHORA (acumulado), con base solo en lo que ella ha contado',
      properties: {
        suitability_score: { type: 'number', description: '0 a 100: qué tan buen hogar parece' },
        risk_score: { type: 'number', description: '0 a 100: señales de riesgo de devolución o maltrato' },
        vivienda: {
          type: 'object',
          properties: {
            tipo: { type: 'string', enum: [...TIPOS_VIVIENDA] },
            permiso_arriendo: { type: 'string', enum: [...PERMISOS], description: 'no_aplica si la vivienda es propia o no arrienda' },
          },
          required: ['tipo', 'permiso_arriendo'],
        },
        presupuesto_veterinario: { type: 'string', enum: [...SI_NO] },
        tiempo_disponible: { type: 'string', enum: [...TIEMPOS] },
        ninos: { type: 'string', description: 'Texto corto (p. ej. "dos niños de 5 y 8 años") o "desconocido"' },
        otras_mascotas: { type: 'string', description: 'Texto corto o "desconocido"' },
        nombre_interesado: { type: 'string', description: 'Su nombre si lo dijo; si no, cadena vacía' },
        datos_faltantes: { type: 'array', items: { type: 'string' } },
      },
      required: [
        'suitability_score',
        'risk_score',
        'vivienda',
        'presupuesto_veterinario',
        'tiempo_disponible',
        'ninos',
        'otras_mascotas',
        'nombre_interesado',
        'datos_faltantes',
      ],
    },
  },
  required: [
    'transcripcion',
    'respuesta',
    'guion_voz',
    'perrito_id_foco',
    'perritos_mencionados',
    'intencion',
    'conexion_emocional',
    'alerta_bienestar',
    'evaluacion',
  ],
}

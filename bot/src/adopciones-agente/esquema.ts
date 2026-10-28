// Esquema JSON que Gemini debe devolver en cada turno (snake_case). Todo se valida de nuevo en decisiones.ts.
import { Type, type Schema } from '@google/genai'
import { INTENCIONES, PERMISOS, SI_NO, TIEMPOS, TIPOS_VIVIENDA } from './tipos.js'

export const ESQUEMA_AGENTE: Schema = {
  type: Type.OBJECT,
  properties: {
    transcripcion: {
      type: Type.STRING,
      description: 'Lo que dijo la persona tal cual. Si fue un audio, transcríbelo palabra por palabra; si fue texto, repítelo',
    },
    respuesta: { type: Type.STRING, description: 'Tu mensaje cálido para WhatsApp o pantalla, con UNA sola pregunta como máximo' },
    guion_voz: {
      type: Type.STRING,
      description: 'Lo mismo que "respuesta" reescrito para decirse en voz alta: sin emojis ni markdown, frases cortas y pausas naturales',
    },
    perrito_id_foco: { type: Type.STRING, nullable: true, description: 'Id (de la lista) del animal del que hablas ahora, o null' },
    perritos_mencionados: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Ids (de la lista) de los animales de los que hablas, máximo 3' },
    intencion: { type: Type.STRING, enum: [...INTENCIONES] },
    conexion_emocional: { type: Type.BOOLEAN, description: 'true si la persona mostró cariño o se conmovió con un animal' },
    alerta_bienestar: {
      type: Type.BOOLEAN,
      description: 'true si dijo algo preocupante sobre el bienestar de un animal (maltrato, dejarlo atado o solo, regalarlo, etc.)',
    },
    evaluacion: {
      type: Type.OBJECT,
      description: 'Lo que sabes de la persona HASTA AHORA (acumulado), con base solo en lo que ella ha contado',
      properties: {
        suitability_score: { type: Type.NUMBER, description: '0 a 100: qué tan buen hogar parece' },
        risk_score: { type: Type.NUMBER, description: '0 a 100: señales de riesgo de devolución o maltrato' },
        vivienda: {
          type: Type.OBJECT,
          properties: {
            tipo: { type: Type.STRING, enum: [...TIPOS_VIVIENDA] },
            permiso_arriendo: { type: Type.STRING, enum: [...PERMISOS], description: 'no_aplica si la vivienda es propia o no arrienda' },
          },
          required: ['tipo', 'permiso_arriendo'],
        },
        presupuesto_veterinario: { type: Type.STRING, enum: [...SI_NO] },
        tiempo_disponible: { type: Type.STRING, enum: [...TIEMPOS] },
        ninos: { type: Type.STRING, description: 'Texto corto (p. ej. "dos niños de 5 y 8 años") o "desconocido"' },
        otras_mascotas: { type: Type.STRING, description: 'Texto corto o "desconocido"' },
        nombre_interesado: { type: Type.STRING, description: 'Su nombre si lo dijo; si no, cadena vacía' },
        datos_faltantes: { type: Type.ARRAY, items: { type: Type.STRING } },
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

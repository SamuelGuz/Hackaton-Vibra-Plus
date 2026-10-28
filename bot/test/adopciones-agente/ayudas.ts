// Ayudas compartidas por las pruebas del agente de adopciones (no es una prueba: vitest solo corre *.test.ts).
import { vi } from 'vitest'
import type { ContextoExterno } from '../../src/rag/tipos.js'
import { crearDeps } from '../fakes.js'
import { LlmFalso, RagFalso } from '../externo/fakes.js'

export interface Cambios {
  respuesta?: string
  guion_voz?: string
  transcripcion?: string
  perrito_id_foco?: string | null
  perritos_mencionados?: string[]
  intencion?: string
  conexion_emocional?: boolean
  alerta_bienestar?: boolean
  suitability?: number
  risk?: number
  tipo?: string
  permiso?: string
  presupuesto?: string
  tiempo?: string
  ninos?: string
  mascotas?: string
  nombre?: string
}

/** Lo que devolvería Gemini (snake_case, como en el esquema), con valores neutros salvo lo que se pida */
export function crudo(c: Cambios = {}): Record<string, unknown> {
  return {
    transcripcion: c.transcripcion ?? 'mensaje de la persona',
    respuesta: c.respuesta ?? 'Mira, te cuento la historia de Toby... ¿Cómo es tu casa? 🐶',
    guion_voz: c.guion_voz ?? 'Mira, te cuento la historia de Toby. ¿Cómo es tu casa?',
    perrito_id_foco: c.perrito_id_foco === undefined ? '5' : c.perrito_id_foco,
    perritos_mencionados: c.perritos_mencionados ?? ['5'],
    intencion: c.intencion ?? 'adoptar',
    conexion_emocional: c.conexion_emocional ?? false,
    alerta_bienestar: c.alerta_bienestar ?? false,
    evaluacion: {
      suitability_score: c.suitability ?? 20,
      risk_score: c.risk ?? 50,
      vivienda: { tipo: c.tipo ?? 'desconocido', permiso_arriendo: c.permiso ?? 'desconocido' },
      presupuesto_veterinario: c.presupuesto ?? 'desconocido',
      tiempo_disponible: c.tiempo ?? 'desconocido',
      ninos: c.ninos ?? 'desconocido',
      otras_mascotas: c.mascotas ?? 'desconocido',
      nombre_interesado: c.nombre ?? '',
      datos_faltantes: [],
    },
  }
}

/** Un adoptante excelente: con esto (y score >= 75) se agenda la visita */
export function excelente(c: Cambios = {}): Record<string, unknown> {
  return crudo({ suitability: 82, risk: 15, tipo: 'casa', permiso: 'no_aplica', presupuesto: 'si', tiempo: 'suficiente', ...c })
}

export function montar() {
  const t = crearDeps()
  const llm = new LlmFalso()
  const rag = new RagFalso()
  const ctx: ContextoExterno = { rag, llm, whatsappPublico: '573001112233' }
  return { ...t, llm, rag, ctx }
}

export function silenciarConsola() {
  return {
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  }
}

export const texto = (t: string) => ({ tipo: 'texto' as const, texto: t })
export const TEL = '573115550000'

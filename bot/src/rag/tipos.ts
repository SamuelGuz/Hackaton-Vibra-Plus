// Contrato público del motor RAG: lo que ve la landing, el agente y las campañas.
// Nada de aquí incluye datos internos (deudas, teléfonos, nombres del equipo).
import type { Especie } from '@huellitas/shared/tipos'

export type Tamano = 'pequeno' | 'mediano' | 'grande'

/** true / false cuando se sabe; null cuando todavía no se ha probado */
export interface Compatibilidad {
  ninos: boolean | null
  gatos: boolean | null
  perros: boolean | null
  apartamento: boolean | null
}

/** Perfil completo de un animal: lo que la base no guarda (historia, edad, tamaño…) se enriquece aquí. */
export interface PerfilRico {
  id: string
  nombre: string
  especie: Especie
  estado: string
  edadAnios: number
  edadTexto: string
  tamano: Tamano
  personalidad: string[]
  historia: string
  /** false cuando la historia se armó con plantilla y la dueña aún no la ha confirmado */
  historiaConfirmada: boolean
  compatibilidad: Compatibilidad
  necesidadesMedicas: string[]
  meta: { mensualCOP: number; padrinos: number; cubiertoPct: number }
  /** Solo URLs http(s) públicas; las rutas /archivos/* piden sesión y no se exponen */
  foto: string | null
  /** 0 a 1: qué tan urgente es ayudarlo (salud, sin padrino, viejito) */
  urgencia: number
  adoptable: boolean
}

/** Lo que de verdad pasó hoy con el animal, tomado de los registros del albergue */
export interface ActividadHoy {
  /** null = sin registro hoy */
  comioHoy: boolean | null
  medicinas: { programadas: number; tomadas: number }
  notaDelDia: string | null
}

export interface PerritoPublico extends PerfilRico {
  hoy: ActividadHoy
}

export interface ResultadoBusqueda {
  perrito: PerritoPublico
  /** 0 a 1 */
  puntaje: number
  /** Por qué encaja, en una frase */
  motivo: string
}

export interface RespuestaBusqueda {
  consulta: string
  /** 'hibrida' usó embeddings de Gemini; 'lexica' cayó a palabras (sin Gemini o con error) */
  modo: 'hibrida' | 'lexica'
  resultados: ResultadoBusqueda[]
}

/** Lo que usan el agente y las campañas para hablar con Gemini; en pruebas se reemplaza por uno falso */
export interface Llm {
  /** Salida JSON validada por esquema de Gemini */
  json<T>(p: {
    sistema: string
    mensajes: { rol: 'user' | 'model'; texto: string }[]
    esquema: unknown
    media?: { datos: Buffer; mime: string }
    temperatura?: number
  }): Promise<T>
  embeber(textos: string[], tipo: 'documento' | 'consulta'): Promise<number[][]>
}

/** Datos que la base no guarda y que la dueña (o la demo) enriquece a mano. Ver rag/perfiles-data.ts */
export interface PerfilCurado {
  edadAnios: number
  tamano: Tamano
  personalidad: string[]
  historia: string
  compatibilidad: Compatibilidad
  necesidadesMedicas: string[]
  /** Meta mensual de apadrinamiento en pesos; por defecto 40000 */
  mensualCOP?: number
}

export interface OpcionesListado {
  especie?: 'perro' | 'gato'
  limite?: number
  /** true: solo los que se pueden adoptar o apadrinar hoy (excluye adoptados y fallecidos). Por defecto true */
  soloVisibles?: boolean
}

/** Motor RAG: lo único que el agente, las campañas y las rutas públicas necesitan saber de él */
export interface ServicioRag {
  listar(o?: OpcionesListado): Promise<PerritoPublico[]>
  buscar(consulta: string, limite?: number): Promise<RespuestaBusqueda>
  porId(id: string): Promise<PerritoPublico | null>
  /** Los que más necesitan ayuda hoy, ordenados por `urgencia` descendente */
  urgentes(limite?: number): Promise<PerritoPublico[]>
}

/** Todo lo que el frente externo recibe del arranque (index.ts) */
export interface ContextoExterno {
  rag: ServicioRag
  llm: Llm
  /** Solo dígitos con indicativo (p. ej. 573001234567), para los botones wa.me; null si no hay */
  whatsappPublico: string | null
}

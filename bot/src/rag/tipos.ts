// Contrato público del motor RAG: lo que ve la landing, el agente y las campañas.
// Nada de aquí incluye datos internos (deudas, teléfonos, nombres del equipo).
import type { Especie } from '../panel-tipos.js'
import type { Voz } from '../adopciones-agente/voz.js'

export type Tamano = 'pequeno' | 'mediano' | 'grande'

/** true / false cuando se sabe; null cuando todavía no se ha probado */
export interface Compatibilidad {
  ninos: boolean | null
  gatos: boolean | null
  perros: boolean | null
  apartamento: boolean | null
}

/** Perfil completo de un animal: lo que la base no guarda (historia, edad, tamaño…) se enriquece aquí. */
export interface PerfilRico extends PerfilExtra {
  /** Fotos y datos de demostración; identidad pendiente de verificación. */
  datosDemo?: boolean
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
  /** URL http(s) pública o ruta de foto del catálogo; /archivos/* nunca se expone. */
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
export interface PerfilCurado extends PerfilExtra {
  /** Solo true cuando el refugio confirmó expresamente esta historia. */
  historiaConfirmada?: boolean
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
  /** Motor de preguntas (rag/respuestas.ts); el arranque lo arma cuando existe */
  respuestas?: ServicioRespuestas
  /** Voz del agente para la página (adopciones-agente/voz.ts); sin ella no hay audio, solo texto */
  voz?: Voz
  /** Espera antes de responder por WhatsApp, como una persona que escribe (adopciones-agente/humano.ts); sin ella, de una vez */
  pausaHumana?: (ms: number) => Promise<void>
  /** Página pública (p. ej. https://huellitasrefugio.lat): se le comparte una vez a quien escribe */
  sitioWeb?: string
  /** Datos para donar que se muestran tal cual. Lo que falte no se inventa: se ofrece pasarlo por el chat. */
  donaciones?: DatosDonacion
}

export interface DatosDonacion {
  nequi?: string
  /** Llave Bre-B */
  llave?: string
  /** Cuenta bancaria, como se quiera mostrar: "Bancolombia ahorros 123-456789-00" */
  cuenta?: string
  titular?: string
  /** Para coordinar donaciones de comida o insumos */
  telefono?: string
}

// ---------- Ampliaciones (T-RAG2): perfil más rico y motor de preguntas ----------

/** Campos opcionales que enriquecen el perfil. Se propagan a PerfilRico y PerritoPublico. */
export interface PerfilExtra {
  vacunado?: boolean
  esterilizado?: boolean
  desparasitado?: boolean
  microchip?: boolean
  pesoKg?: number
  comidaFavorita?: string
  rutinaDia?: string
  cuidadosEspeciales?: string[]
  curiosidades?: string[]
  /** YYYY-MM-DD */
  fechaRescate?: string
  lugarRescate?: string
}

/** Una respuesta de referencia del refugio (horarios, proceso de adopción, apadrinamiento…). Ver rag/conocimiento-data.ts */
export interface EntradaConocimiento {
  id: string
  tema: 'adopcion' | 'apadrinamiento' | 'donaciones' | 'visitas' | 'salud' | 'comida' | 'voluntariado' | 'refugio' | 'devoluciones' | 'cuidados' | 'otros'
  /** Formas distintas de preguntarlo, en lenguaje de la gente */
  preguntas: string[]
  respuesta: string
  palabrasClave: string[]
}

export type TipoFuente = 'animal' | 'medicina' | 'conocimiento' | 'calculo' | 'contacto'

export interface RespuestaPregunta {
  pregunta: string
  /** Texto final para la persona, en español colombiano cálido */
  respuesta: string
  /** De dónde salió cada dato; vacío solo cuando no se supo responder */
  fuentes: { tipo: TipoFuente; id: string; titulo: string }[]
  intencion: string
  /** 0 a 1. Bajo = se recomienda pasar con una persona del refugio */
  confianza: number
  /** 'determinista': armada solo con datos del refugio; 'llm': Gemini redactó sobre esos mismos datos */
  modo: 'determinista' | 'llm'
  /** true cuando no hay datos suficientes y se ofrece pasar con una persona */
  sinRespuesta?: boolean
}

/** Responde preguntas en lenguaje natural sobre animales, medicinas, el refugio y cómo ayudar */
export interface ServicioRespuestas {
  preguntar(pregunta: string): Promise<RespuestaPregunta>
}

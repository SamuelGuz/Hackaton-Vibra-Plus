// Contrato público del RAG y del agente de voz. Espejo de bot/src/rag/tipos.ts:
// el panel no importa del bot, así que si cambia allá hay que cambiarlo aquí.

export type Especie = 'perro' | 'gato'
export type Tamano = 'pequeno' | 'mediano' | 'grande'

/** true / false cuando se sabe; null cuando todavía no se ha probado */
export interface Compatibilidad {
  ninos: boolean | null
  gatos: boolean | null
  perros: boolean | null
  apartamento: boolean | null
}

export interface ActividadHoy {
  /** null = sin registro hoy */
  comioHoy: boolean | null
  medicinas: { programadas: number; tomadas: number }
  notaDelDia: string | null
}

export interface PerritoPublico {
  id: string
  nombre: string
  especie: Especie
  estado: string
  edadAnios: number
  edadTexto: string
  tamano: Tamano
  personalidad: string[]
  historia: string
  historiaConfirmada: boolean
  compatibilidad: Compatibilidad
  necesidadesMedicas: string[]
  meta: { mensualCOP: number; padrinos: number; cubiertoPct: number }
  foto: string | null
  urgencia: number
  adoptable: boolean
  hoy: ActividadHoy
}

export interface Contacto {
  whatsapp: string | null
}

export interface RespuestaPerritos {
  total: number
  contacto: Contacto
  perritos: PerritoPublico[]
}

export interface ResultadoBusqueda {
  perrito: PerritoPublico
  /** 0 a 1 */
  puntaje: number
  motivo: string
}

export interface RespuestaBusqueda {
  consulta: string
  modo: 'hibrida' | 'lexica'
  contacto: Contacto
  resultados: ResultadoBusqueda[]
}

export interface PerritoMencionado {
  id: string
  nombre: string
  especie: Especie
  edadTexto: string
  foto: string | null
}

export interface RespuestaAgenteVoz {
  sesionId: string
  transcripcion: string
  respuesta: string
  guionVoz: string
  perritos: PerritoMencionado[]
  accion: 'ninguna' | 'visita_agendada' | 'padrinazgo'
}

/** Lo que pinta una tarjeta: el perrito y, si salió de una búsqueda, por qué encaja */
export interface ItemTarjeta {
  perrito: PerritoPublico
  motivo?: string
}

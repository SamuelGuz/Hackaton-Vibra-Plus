// Contrato de la IA (placa viva Task 11b, adaptada a los tipos compartidos). La implementación real
// usa Gemini (src/ia/); los flujos dependen solo de esta interfaz y en las pruebas entra una falsa y
// determinista. Nada de lo que reciba debe llevar teléfonos, cédulas, direcciones ni emails.
import type { Accion, HechoDiario } from '@huellitas/shared/vistas'
import type { ItemCatalogo } from '@huellitas/shared/registro'
import type { Animal, Clinica, Tratamiento } from '@huellitas/shared/tipos'

export interface MediaBytes {
  bytes: ArrayBuffer
  mime: string
}

/** Lo que la persona dijo: un audio, un texto o ambos. */
export interface EntradaIa {
  audio?: MediaBytes
  texto?: string
}

/** Contexto para que la IA ubique de qué animal habla la persona. */
export interface ContextoIa {
  /** Animal de la placa que abrió la conversación; si existe, se usa su código */
  animal?: Animal
  /** Animales que se pueden nombrar: el prompt solo recibe codigo, nombre y alias */
  candidatos: Animal[]
  tratamientos: Tratamiento[]
  catalogo: ItemCatalogo[]
}

export type TipoComprobante = 'factura' | 'transferencia' | 'otro'

export interface Comprobante {
  tipo: TipoComprobante
  /** Pesos COP, entero; null si no se pudo leer */
  monto: number | null
  fecha?: string
  clinicaId?: string
  concepto?: string
  animalCodigo?: string
  /** false cuando monto es null: el bot pregunta "No pude leer el monto, ¿me lo dices?" */
  legible: boolean
}

export interface Diario {
  texto: string
  /** Ids de hechos que usó; todos deben venir en la lista de entrada */
  hechosUsados: string[]
}

export interface IaApi {
  /** Convierte voz o texto en acciones tipadas. Descarta las de animales fuera de los candidatos. */
  extraerAcciones(entrada: EntradaIa, ctx: ContextoIa): Promise<Accion[]>
  /** Lee una foto de factura o transferencia. */
  leerComprobante(img: MediaBytes, clinicas: Clinica[]): Promise<Comprobante>
  /** Redacta el diario del padrino solo con los hechos dados; lanza si inventa un hecho. */
  redactarDiario(animal: Animal, hechos: HechoDiario[]): Promise<Diario>
}

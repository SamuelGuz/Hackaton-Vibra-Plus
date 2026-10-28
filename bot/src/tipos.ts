import type { DatosAlbergue, Propuesta, Rol } from './panel-tipos.js'

/** Lo que el bot (o el panel) propone guardar. Es la misma forma que usa el panel. */
export type Accion = Propuesta

export type EstadoRegistro = 'por_confirmar' | 'confirmado' | 'corregido' | 'anulado'

export interface Usuario {
  id: number
  nombre: string
  rol: Rol
  telefono: string
}

// ---------- Lo que llega y lo que sale por WhatsApp ----------

export type Entrada =
  | { tipo: 'texto'; texto: string }
  /** Toque en un botón o en una fila de lista */
  | { tipo: 'boton'; id: string; titulo: string }
  | { tipo: 'audio'; mediaId: string; mime: string }
  | { tipo: 'imagen'; mediaId: string; mime: string; texto?: string }
  /** Stickers, ubicaciones, contactos… */
  | { tipo: 'otro' }

export interface Boton {
  id: string
  /** Máximo 20 caracteres (límite de WhatsApp) */
  titulo: string
}

export interface Fila {
  id: string
  /** Máximo 24 caracteres */
  titulo: string
  /** Máximo 72 caracteres */
  descripcion?: string
}

export type Salida =
  | { tipo: 'texto'; texto: string }
  /** Máximo 3 botones */
  | { tipo: 'botones'; texto: string; botones: Boton[] }
  /** Máximo 10 filas. `boton` es el texto del botón que abre la lista (máximo 20) */
  | { tipo: 'lista'; texto: string; boton: string; filas: Fila[] }

// ---------- Estado de la conversación ----------

export type TipoPlata = 'ingreso' | 'gasto'

export type Estado =
  | { paso: 'menu' }
  | { paso: 'medicina' }
  | { paso: 'medicina_duplicada' }
  | { paso: 'comida_especie'; llegada: boolean }
  | { paso: 'comida_cantidad'; especie: 'perro' | 'gato' }
  | { paso: 'plata_monto'; tipo: TipoPlata }
  | { paso: 'plata_categoria'; tipo: TipoPlata; monto: number }
  | { paso: 'plata_clinica'; tipo: TipoPlata; monto: number; categoria: string; abono: boolean }
  | {
      paso: 'plata_foto'
      tipo: TipoPlata
      monto: number
      categoria: string
      abono: boolean
      clinicaId: string | null
    }
  | { paso: 'factura_foto' }
  | { paso: 'factura_monto'; soporte: string | null; clinicaId: string | null; concepto: string }
  | { paso: 'factura_clinica'; soporte: string | null; monto: number; concepto: string }
  | { paso: 'animal' }
  | { paso: 'animal_nombre' }
  | { paso: 'animal_nota'; animalId: string }

// ---------- IA ----------

export interface EntradaIa {
  texto?: string
  media?: { datos: Buffer; mime: string }
  /** Pista de lo que se espera, p. ej. 'factura' cuando se pidió la foto de una factura */
  pista?: 'factura' | 'libre'
  datos: DatosAlbergue
  ahora: Date
}

export interface Entendido {
  /** Lo que se escuchó o se leyó, tal cual */
  transcripcion: string
  acciones: Accion[]
  /** 0 a 1 */
  confianza: number
  /** Acciones que la IA vio pero que todavía no han pasado ("le voy a dar") */
  futuras: number
  /** Lo que se alcanzó a leer de una factura, aunque falte el monto o la clínica */
  factura?: { monto: number | null; clinicaId: string | null; concepto: string }
}

// ---------- Dependencias (reales o falsas en las pruebas) ----------

export interface NuevoRegistro {
  usuarioId: number
  canal: 'whatsapp' | 'panel'
  tipoEntrada: 'texto' | 'audio' | 'imagen' | 'boton'
  mediaUrl?: string | null
  transcripcion: string
  acciones: Accion[]
  confianza?: number | null
  estado: 'por_confirmar' | 'confirmado'
  /** uuid que genera el panel para que un reenvío no se guarde dos veces */
  clienteId?: string
}

export interface Registro {
  id: string
  usuarioId: number | null
  estado: EstadoRegistro
  acciones: Accion[]
  mediaUrl: string | null
}

export interface Repo {
  usuarioPorTelefono(telefono: string): Promise<Usuario | null>
  usuarioPorId(id: number): Promise<Usuario | null>
  /** true si el mensaje es nuevo; false si Meta lo está reenviando */
  marcarMensaje(waMessageId: string): Promise<boolean>
  leerEstado(usuarioId: number): Promise<{ estado: Estado; actualizadoEn: Date } | null>
  guardarEstado(usuarioId: number, estado: Estado): Promise<void>
  hoy(ahora: Date): Promise<DatosAlbergue>
  crearRegistro(r: NuevoRegistro): Promise<string>
  leerRegistro(id: string): Promise<Registro | null>
  /** Cambia el registro y sus filas hijas en una sola transacción. Devuelve cuántos cambió. */
  cambiarEstado(ids: string[], estado: EstadoRegistro): Promise<number>
  crearSesion(usuarioId: number): Promise<string>
}

export interface Wa {
  enviar(telefono: string, salida: Salida): Promise<void>
  descargar(mediaId: string): Promise<{ datos: Buffer; mime: string }>
}

export interface Ia {
  entender(e: EntradaIa): Promise<Entendido>
}

export interface Archivos {
  /** Guarda el archivo y devuelve la ruta con la que se pide, p. ej. '/archivos/ab12.ogg' */
  guardar(datos: Buffer, mime: string): Promise<string>
}

export interface Deps {
  repo: Repo
  wa: Wa
  ia: Ia
  archivos: Archivos
  panelUrl: string
  ahora: () => Date
}

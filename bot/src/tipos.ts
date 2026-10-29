import type { NuevaSolicitudAdopcion, SolicitudGuardada } from './adopcion/solicitudes.js'
import type { SeguimientoDeAdopcion } from './adopcion/seguimientos.js'
import type { CambioSolicitud, DiaSeguimiento, Monton } from './adopcion/tipos.js'
import type { TipoInforme } from './informes/armar.js'
import type { DatosAlbergue, Propuesta, Rol } from './panel-tipos.js'
import type { MensajeWa } from './wa/webhook.js'

/** Un mensaje del buzón que falta atender */
export interface EntrantePendiente extends MensajeWa {
  intentos: number
  recibidoEn: Date
}

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
  /** Imagen PNG con un pie de foto corto (máximo 1024) */
  | { tipo: 'imagen'; png: Buffer; texto: string }

// ---------- Estado de la conversación ----------

export type TipoPlata = 'ingreso' | 'gasto'

export type Estado =
  | { paso: 'menu' }
  | { paso: 'medicina' }
  | { paso: 'medicina_duplicada' }
  | { paso: 'comida_especie'; llegada: boolean }
  /** `unidad: 'kg'`: se preguntó por kilos sueltos (carne, recortes) en vez de bultos */
  | { paso: 'comida_cantidad'; especie: 'perro' | 'gato'; unidad?: 'kg' }
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
  /** Se preguntó "¿Está bien?": se puede responder tocando, escribiendo "sí" o en audio */
  | { paso: 'confirmar'; registroId: string }

// ---------- IA ----------

export interface EntradaIa {
  texto?: string
  media?: { datos: Buffer; mime: string }
  /** Pista de lo que se espera, p. ej. 'factura' cuando se pidió la foto de una factura */
  pista?: 'factura' | 'libre'
  /** Más datos del refugio para responder preguntas (solicitudes, seguimientos, caja), ya filtrados según quién escribe */
  extra?: string
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
  /** La persona pidió ver un informe o una gráfica en vez de anotar algo */
  informe?: TipoInforme
  /** Si preguntó algo, saludó o agradeció: lo que se le contesta. Vacío si solo contó lo que hizo. */
  respuesta?: string
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

export interface MiembroEquipo extends Usuario {
  activo: boolean
}

/** Alguien que le escribió al bot sin estar en el equipo */
export interface SolicitudEquipo {
  telefono: string
  /** Nombre del perfil de WhatsApp, si lo tiene */
  nombre: string | null
  mensajes: number
  ultimoMensajeEn: string
}

export interface NuevoMiembro {
  nombre: string
  rol: Rol
  /** Solo dígitos, con el indicativo del país */
  telefono: string
}

export interface Repo {
  usuarioPorTelefono(telefono: string): Promise<Usuario | null>
  /** Anota (o suma un mensaje) a alguien que escribió sin estar en el equipo */
  anotarSolicitud(telefono: string, nombrePerfil: string | null): Promise<void>
  equipo(): Promise<{ personas: MiembroEquipo[]; solicitudes: SolicitudEquipo[] }>
  /** Crea a la persona, o la reactiva con el nuevo nombre y rol si el número ya existía. Borra su solicitud. */
  agregarAlEquipo(m: NuevoMiembro): Promise<Usuario>
  /** false si no existe */
  cambiarActivo(usuarioId: number, activo: boolean): Promise<boolean>
  descartarSolicitud(telefono: string): Promise<void>
  contarSolicitudes(): Promise<number>
  usuarioPorId(id: number): Promise<Usuario | null>
  /** Guarda el mensaje como pendiente. true si es nuevo; false si Meta lo está reenviando.
   *  Las horas del buzón las pone siempre el bot, para no depender del reloj de la base. */
  guardarEntrante(m: MensajeWa, ahora: Date): Promise<boolean>
  /** Pendientes cuya hora de intento ya llegó, del más viejo al más nuevo */
  entrantesPendientes(ahora: Date, limite: number): Promise<EntrantePendiente[]>
  /** Cierra el mensaje: ya se atendió, o se rindió con él */
  cerrarEntrante(id: string, estado: 'atendido' | 'fallido', error?: string): Promise<void>
  /** Suma un intento y lo deja para más tarde */
  reintentarEntrante(id: string, proximoEn: Date, error: string): Promise<void>
  leerEstado(usuarioId: number): Promise<{ estado: Estado; actualizadoEn: Date } | null>
  guardarEstado(usuarioId: number, estado: Estado): Promise<void>
  hoy(ahora: Date): Promise<DatosAlbergue>
  crearRegistro(r: NuevoRegistro): Promise<string>
  leerRegistro(id: string): Promise<Registro | null>
  /** Cambia el registro y sus filas hijas en una sola transacción. Devuelve cuántos cambió. */
  cambiarEstado(ids: string[], estado: EstadoRegistro): Promise<number>
  crearSesion(usuarioId: number): Promise<string>
  /** Si el archivo ('/archivos/x.jpg') es un recibo o factura de plata, quién lo subió; null si no es de plata */
  duenoDeRecibo(url: string): Promise<{ usuarioId: number | null } | null>

  // ---------- Solicitudes de adopción ----------
  /** Guarda o actualiza por `claveOrigen`. Nunca pisa lo que decidió la coordinación (montón, nota, llamada). */
  guardarSolicitudAdopcion(s: NuevaSolicitudAdopcion, ahora: Date): Promise<{ id: string; nueva: boolean }>
  /** Todas, de la más vieja a la más nueva */
  solicitudesAdopcion(): Promise<SolicitudGuardada[]>
  /** Aplica solo lo que viene. false si no existe. */
  cambiarSolicitudAdopcion(id: string, cambio: CambioSolicitud): Promise<boolean>

  /** Marca `fecha` (AAAA-MM-DD) como hecha para `clave`. true solo la primera vez: así una tarea del día corre una vez. */
  reclamarDia(clave: string, fecha: string): Promise<boolean>

  // ---------- Seguimientos después de la adopción ----------
  /** Los 5 seguimientos de cada adopción activa, con el resultado de los que ya se llamaron */
  seguimientosAdopcion(): Promise<SeguimientoDeAdopcion[]>
  /** Anota cómo salió la llamada (lo vuelve a anotar si ya estaba). false si la adopción no existe. */
  registrarSeguimiento(adopcionId: string, dia: DiaSeguimiento, resultado: Monton, usuarioId: number, ahora: Date): Promise<boolean>
}

export interface Wa {
  enviar(telefono: string, salida: Salida): Promise<void>
  descargar(mediaId: string): Promise<{ datos: Buffer; mime: string }>
  /** Marca el mensaje como leído y muestra "escribiendo…" (hasta 25 s o hasta la respuesta) */
  escribiendo?(mensajeId: string): Promise<void>
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
  /** Dibuja una hoja HTML como imagen PNG (informes y gráficas) */
  dibujar(html: string): Promise<Buffer>
  panelUrl: string
  ahora: () => Date
}

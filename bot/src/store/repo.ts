// Persistencia del servidor detrás de una interfaz (D5). Implementaciones: MemoryRepo (pruebas y demo),
// PgRepo (producción, T9). Las rutas, los flujos y los crons hablan solo con esta interfaz.
import type { Animal, Clinica, ConfigComida, Persona, Tratamiento } from '@huellitas/shared/tipos'
import type { BaseAlbergue, ConfigServidor, EstadoRegistro, ItemCatalogo, Padrinazgo, Registro } from '@huellitas/shared/registro'
import type { Seguimiento, Solicitud } from '@huellitas/shared/adopcion/tipos'

export interface Repo {
  // ── Personas (equipo) ──
  /** Todas las personas del equipo, activas o no. */
  personas(): Promise<Persona[]>
  /** La persona con ese id, o null. */
  personaPorId(id: string): Promise<Persona | null>
  /** La persona con ese teléfono (E.164 sin "+"), o null. */
  personaPorTelefono(telefono: string): Promise<Persona | null>
  /** Agrega una persona nueva (alta de voluntarios). Si el id ya existe, la reemplaza. */
  crearPersona(p: Persona): Promise<void>

  // ── Animales y tratamientos ──
  /** Todos los animales, en el orden en que se cargaron. */
  animales(): Promise<Animal[]>
  /** El animal con ese id interno, o null. */
  animalPorId(id: string): Promise<Animal | null>
  /** El animal con ese código de placa ("TOB01"; sin distinguir mayúsculas), o null. */
  animalPorCodigo(codigo: string): Promise<Animal | null>
  /** Todos los tratamientos (o los de un animal). El filtro por fecha (inicio/fin) lo hace shared/domain/dosis. */
  tratamientos(animalId?: string): Promise<Tratamiento[]>

  // ── Bitácora de registros ──
  /** Registros de un día de Bogotá (YYYY-MM-DD), de todos los estados, en orden de llegada; opcional por animal. */
  registrosDelDia(fecha: string, animalId?: string): Promise<Registro[]>
  /** Registros de un rango de días de Bogotá, ambos extremos incluidos (YYYY-MM-DD); opcional por animal. */
  registrosEntre(desde: string, hasta: string, animalId?: string): Promise<Registro[]>
  /** El registro con ese id, o null. */
  registroPorId(id: string): Promise<Registro | null>
  /** Todos los registros que comparten un registroIaId (un audio o foto), en orden de llegada. */
  registrosPorIa(registroIaId: string): Promise<Registro[]>
  /** Registros en ese estado de cualquier día (p. ej. todos los por_confirmar para autoconfirmar). */
  registrosPorEstado(estado: EstadoRegistro): Promise<Registro[]>
  /** Agrega registros. Idempotente: un id que ya existe se ignora. Devuelve los ids que sí se agregaron. */
  agregarRegistros(registros: Registro[]): Promise<string[]>
  /** Cambia el estado de esos registros y anota quién (`por`) y cuándo (`en`, ISO). Devuelve cuántos cambió; ids desconocidos no cuentan. */
  cambiarEstado(ids: string[], estado: EstadoRegistro, por: string, en: string): Promise<number>

  // ── Dinero, comida y configuración ──
  /** Clínicas con su deuda base; la deuda de hoy es la base más las deudas y abonos de la bitácora. */
  clinicas(): Promise<Clinica[]>
  /** Kg por bulto y consumo diario por especie, y los umbrales de aviso de comida del panel. */
  configComida(): Promise<ConfigComida>
  /** Parámetros de placa viva (umbrales, hora de cierre, teléfono del albergue, baseUrl). */
  config(): Promise<ConfigServidor>
  /** Catálogo de alimento que usan los días de comida. */
  catalogo(): Promise<ItemCatalogo[]>
  /** Punto de partida de /api/hoy: último conteo de bultos, último cuadre de caja y contador de vidas. */
  base(): Promise<BaseAlbergue>

  // ── Padrinos ──
  /** Padrinazgos con activo = true. */
  padrinazgosActivos(): Promise<Padrinazgo[]>

  // ── Adopciones ──
  /** Todas las solicitudes de adopción. */
  solicitudes(): Promise<Solicitud[]>
  /** La solicitud con ese id, o null. */
  solicitudPorId(id: string): Promise<Solicitud | null>
  /** Crea o reemplaza una solicitud (por id). */
  guardarSolicitud(s: Solicitud): Promise<void>
  /** Todos los seguimientos, pendientes o ya llamados. */
  seguimientos(): Promise<Seguimiento[]>
  /** Crea o reemplaza un seguimiento (por id). */
  guardarSeguimiento(s: Seguimiento): Promise<void>
}

/** Todo lo que necesita un repo para arrancar: la semilla de MemoryRepo y de los scripts de carga. */
export interface DatosSemilla {
  personas: Persona[]
  animales: Animal[]
  tratamientos: Tratamiento[]
  clinicas: Clinica[]
  configComida: ConfigComida
  config: ConfigServidor
  catalogo: ItemCatalogo[]
  base: BaseAlbergue
  padrinazgos: Padrinazgo[]
  registros?: Registro[]
  solicitudes?: Solicitud[]
  seguimientos?: Seguimiento[]
}

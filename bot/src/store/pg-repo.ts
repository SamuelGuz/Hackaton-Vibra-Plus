// Repo durable sobre Postgres (D5). Habla con una interfaz mínima `Sql` (pg en producción, PGlite en pruebas).
// La bitácora es la fuente de verdad; la copia a Google Sheets sale de la cola `sheets_pendientes`, que se llena
// en la misma sentencia que guarda el registro, así un fallo de Sheets nunca pierde ni oculta un registro (Review Focus 5).
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Seguimiento, Solicitud } from '@huellitas/shared/adopcion/tipos'
import { ahoraBogota } from '@huellitas/shared/domain/hora'
import {
  animalIdDe,
  type BaseAlbergue,
  type ConfigServidor,
  type EstadoRegistro,
  type ItemCatalogo,
  type Padrinazgo,
  type PropuestaServidor,
  type Registro,
} from '@huellitas/shared/registro'
import type { Animal, Clinica, ConfigComida, Persona, Tratamiento } from '@huellitas/shared/tipos'
import type { DatosSemilla, Repo } from './repo'
import {
  type Fila,
  leerBooleano,
  leerBooleanoONulo,
  leerListaTexto,
  leerListaTextoONula,
  leerNumero,
  leerNumeroONulo,
  leerObjeto,
  leerTexto,
  leerTextoONulo,
  leerUno,
  leerUnoONulo,
  type Sql,
} from './sql'

const ESPECIES = ['perro', 'gato'] as const
const ESTADOS_ANIMAL = ['cuarentena', 'tratamiento', 'adoptable', 'hogar_temporal', 'adoptado', 'fallecido', 'devuelto'] as const
const ROLES = ['cuidador', 'bienestar', 'admin', 'adopciones', 'comunicacion', 'voluntario'] as const
const ESTADOS_REGISTRO = ['por_confirmar', 'confirmado', 'corregido', 'anulado'] as const
const ORIGENES = ['panel', 'audio', 'foto', 'texto'] as const
const TIPOS_PROPUESTA = ['dosis', 'inventario', 'movimiento', 'nota', 'deuda', 'estado_animal', 'comida', 'observacion', 'avance'] as const
const MONTONES = ['verde', 'amarillo', 'rojo'] as const
const PARA_QUIEN = ['yo', 'familia', 'regalo'] as const
const VIVIENDAS = ['casa', 'apartamento', 'finca', 'otra'] as const
const DONDE_VIVIRA = ['dentro_casa', 'patio', 'guardia', 'amarrado', 'azotea'] as const
const DIAS_SEGUIMIENTO = [2, 5, 15, 30, 90] as const

// ── Migración y semilla ──

/** Aplica db/schema.sql. Es idempotente. El archivo se parte por ';' (sin comentarios `--`), así que no puede traer ';' dentro de textos. */
export async function migrar(sql: Sql): Promise<void> {
  const ruta = fileURLToPath(new URL('../../../db/schema.sql', import.meta.url))
  const texto = await readFile(ruta, 'utf8')
  const sentencias = texto
    .split('\n')
    .map((l) => l.replace(/--.*$/, ''))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s !== '')
  for (const s of sentencias) await sql.query(s)
}

const TABLAS_SEMILLA = ['personas', 'animales', 'tratamientos', 'clinicas', 'config', 'catalogo', 'padrinazgos', 'registros', 'solicitudes', 'seguimientos']

/**
 * Carga la semilla solo si todas las tablas de datos están vacías. Devuelve true si cargó.
 * Las sentencias son idempotentes, pero no hay transacción: si el proceso cae a la mitad hay que vaciar las tablas y reintentar.
 * Los registros de la semilla no se encolan para Sheets: la hoja se crea con el script de carga.
 */
export async function sembrar(sql: Sql, semilla: DatosSemilla): Promise<boolean> {
  const cuentas = TABLAS_SEMILLA.map((t) => `(SELECT count(*) FROM ${t})`).join(' + ')
  const { rows } = await sql.query(`SELECT ${cuentas} AS n`)
  const primera = rows[0]
  if (!primera || leerNumero(primera, 'n') > 0) return false

  for (const p of semilla.personas) await guardarPersona(sql, p)
  for (const a of semilla.animales) await guardarAnimal(sql, a)
  for (const t of semilla.tratamientos) await guardarTratamiento(sql, t)
  for (const c of semilla.clinicas) await guardarClinica(sql, c)
  await guardarConfig(sql, 'servidor', semilla.config)
  await guardarConfig(sql, 'comida', semilla.configComida)
  await guardarConfig(sql, 'base', semilla.base)
  for (const i of semilla.catalogo) await guardarItemCatalogo(sql, i)
  for (const p of semilla.padrinazgos) await guardarPadrinazgo(sql, p)
  for (const r of semilla.registros ?? []) await insertarRegistro(sql, r, false)
  for (const s of semilla.solicitudes ?? []) await guardarSolicitudSql(sql, s)
  for (const s of semilla.seguimientos ?? []) await guardarSeguimientoSql(sql, s)
  return true
}

// ── Cola de Sheets (outbox) ──

export interface PendienteSheets {
  id: number
  /** Hoja de destino ('Eventos') */
  tab: string
  /** 'agregar' = fila nueva (fila es el Registro completo) · 'actualizar' = cambio de estado ({ id, estado, confirmadoPor, confirmadoEn }) */
  operacion: 'agregar' | 'actualizar'
  fila: Fila
  intentos: number
  /** ISO de Bogotá */
  creadoEn: string
}

/** Las filas más antiguas de la cola, en orden de llegada (el 'actualizar' de un registro siempre va después de su 'agregar'). */
export async function pendientesSheets(sql: Sql, limite: number): Promise<PendienteSheets[]> {
  const { rows } = await sql.query(
    `SELECT id, tab, operacion, fila, intentos, floor(extract(epoch from creado_en))::bigint::text AS creado_s
       FROM sheets_pendientes ORDER BY id LIMIT $1::int`,
    [limite],
  )
  return rows.map((f) => ({
    id: leerNumero(f, 'id'),
    tab: leerTexto(f, 'tab'),
    operacion: leerUno(f, 'operacion', ['agregar', 'actualizar'] as const),
    fila: leerObjeto(f, 'fila'),
    intentos: leerNumero(f, 'intentos'),
    creadoEn: isoBogota(f, 'creado_s'),
  }))
}

/** Saca de la cola las filas que Sheets ya recibió. */
export async function marcarEnviados(sql: Sql, ids: number[]): Promise<void> {
  if (ids.length === 0) return
  await sql.query(`DELETE FROM sheets_pendientes WHERE id = ANY($1::int[])`, [ids])
}

/** Suma un intento a las filas que Sheets rechazó (429, red). Siguen en la cola para el próximo cron. */
export async function marcarFallo(sql: Sql, ids: number[]): Promise<void> {
  if (ids.length === 0) return
  await sql.query(`UPDATE sheets_pendientes SET intentos = intentos + 1 WHERE id = ANY($1::int[])`, [ids])
}

// ── Utilidades de SQL ──

/** INSERT ... ON CONFLICT (id) DO UPDATE para una tabla. Una columna 'x:json' viaja como texto y se convierte a jsonb. */
function upsert(tabla: string, columnas: string[]): string {
  const nombres = columnas.map((c) => c.split(':')[0] ?? c)
  const valores = columnas.map((c, i) => (c.endsWith(':json') ? `$${i + 1}::text::jsonb` : `$${i + 1}`))
  const cambios = nombres.filter((n) => n !== 'id').map((n) => `${n} = EXCLUDED.${n}`)
  return `INSERT INTO ${tabla} (${nombres.join(', ')}) VALUES (${valores.join(', ')}) ON CONFLICT (id) DO UPDATE SET ${cambios.join(', ')}`
}

/** Un instante guardado como segundos desde 1970 (texto) → '2026-10-27T14:01:00-05:00'. */
function isoBogota(f: Fila, col: string): string {
  return ahoraBogota(new Date(leerNumero(f, col) * 1000)).iso
}

function isoBogotaONulo(f: Fila, col: string): string | null {
  return f[col] === null || f[col] === undefined ? null : isoBogota(f, col)
}

const json = (v: unknown) => JSON.stringify(v)

// ── Personas ──

const SQL_PERSONA = upsert('personas', ['id', 'nombre', 'cargo', 'rol', 'color', 'foto', 'telefono', 'activo'])

function guardarPersona(sql: Sql, p: Persona) {
  return sql.query(SQL_PERSONA, [p.id, p.nombre, p.cargo, p.rol, p.color, p.foto, p.telefono ?? null, p.activo ?? null])
}

function personaDe(f: Fila): Persona {
  const p: Persona = {
    id: leerTexto(f, 'id'),
    nombre: leerTexto(f, 'nombre'),
    cargo: leerTexto(f, 'cargo'),
    rol: leerUno(f, 'rol', ROLES),
    color: leerTexto(f, 'color'),
    foto: leerTextoONulo(f, 'foto'),
  }
  const telefono = leerTextoONulo(f, 'telefono')
  if (telefono !== null) p.telefono = telefono
  const activo = leerBooleanoONulo(f, 'activo')
  if (activo !== null) p.activo = activo
  return p
}

const SELECT_PERSONA = `SELECT id, nombre, cargo, rol, color, foto, telefono, activo FROM personas`

// ── Animales y tratamientos ──

const SQL_ANIMAL = upsert('animales', [
  'id',
  'nombre',
  'especie',
  'estado',
  'foto',
  'fecha_ingreso',
  'advertencias:json',
  'caracter',
  'padrino',
  'codigo',
  'alias:json',
  'canil',
])

function guardarAnimal(sql: Sql, a: Animal) {
  return sql.query(SQL_ANIMAL, [
    a.id,
    a.nombre,
    a.especie,
    a.estado,
    a.foto,
    a.fechaIngreso,
    json(a.advertencias),
    a.caracter,
    a.padrino,
    a.codigo ?? null,
    a.alias === undefined ? null : json(a.alias),
    a.canil ?? null,
  ])
}

function animalDe(f: Fila): Animal {
  const a: Animal = {
    id: leerTexto(f, 'id'),
    nombre: leerTexto(f, 'nombre'),
    especie: leerUno(f, 'especie', ESPECIES),
    estado: leerUno(f, 'estado', ESTADOS_ANIMAL),
    foto: leerTextoONulo(f, 'foto'),
    fechaIngreso: leerTexto(f, 'fecha_ingreso'),
    advertencias: leerListaTexto(f, 'advertencias'),
    caracter: leerTexto(f, 'caracter'),
    padrino: leerTextoONulo(f, 'padrino'),
  }
  const codigo = leerTextoONulo(f, 'codigo')
  if (codigo !== null) a.codigo = codigo
  const alias = leerListaTextoONula(f, 'alias')
  if (alias !== null) a.alias = alias
  const canil = leerTextoONulo(f, 'canil')
  if (canil !== null) a.canil = canil
  return a
}

const SELECT_ANIMAL = `SELECT id, nombre, especie, estado, foto, fecha_ingreso, advertencias, caracter, padrino, codigo, alias, canil FROM animales`

const SQL_TRATAMIENTO = upsert('tratamientos', ['id', 'animal_id', 'medicamento', 'dosis', 'horas:json', 'inicio', 'fin', 'critico', 'activo'])

function guardarTratamiento(sql: Sql, t: Tratamiento) {
  return sql.query(SQL_TRATAMIENTO, [t.id, t.animalId, t.medicamento, t.dosis, json(t.horas), t.inicio, t.fin, t.critico ?? null, t.activo ?? null])
}

function tratamientoDe(f: Fila): Tratamiento {
  const t: Tratamiento = {
    id: leerTexto(f, 'id'),
    animalId: leerTexto(f, 'animal_id'),
    medicamento: leerTexto(f, 'medicamento'),
    dosis: leerTexto(f, 'dosis'),
    horas: leerListaTexto(f, 'horas'),
    inicio: leerTexto(f, 'inicio'),
    fin: leerTexto(f, 'fin'),
  }
  const critico = leerBooleanoONulo(f, 'critico')
  if (critico !== null) t.critico = critico
  const activo = leerBooleanoONulo(f, 'activo')
  if (activo !== null) t.activo = activo
  return t
}

const SELECT_TRATAMIENTO = `SELECT id, animal_id, medicamento, dosis, horas, inicio, fin, critico, activo FROM tratamientos`

// ── Clínicas, configuración, catálogo y padrinos ──

const SQL_CLINICA = upsert('clinicas', ['id', 'nombre', 'deuda', 'limite'])

function guardarClinica(sql: Sql, c: Clinica) {
  return sql.query(SQL_CLINICA, [c.id, c.nombre, c.deuda, c.limite])
}

const SQL_CONFIG = `INSERT INTO config (key, value) VALUES ($1, $2::text::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`

function guardarConfig(sql: Sql, clave: 'servidor' | 'comida' | 'base', valor: ConfigServidor | ConfigComida | BaseAlbergue) {
  return sql.query(SQL_CONFIG, [clave, json(valor)])
}

/** El objeto de config con esa clave, validado por `leer`. Un fallo dice de qué config se trata. */
async function leerConfig<T>(sql: Sql, clave: 'servidor' | 'comida' | 'base', leer: (o: Fila) => T): Promise<T> {
  const { rows } = await sql.query(`SELECT value FROM config WHERE key = $1`, [clave])
  const fila = rows[0]
  if (!fila) throw new Error(`Falta la config "${clave}": hay que cargar la semilla`)
  try {
    return leer(leerObjeto(fila, 'value'))
  } catch (e) {
    throw new Error(`La config "${clave}" está mal guardada: ${e instanceof Error ? e.message : String(e)}`)
  }
}

const porEspecie = (o: Fila, col: string) => {
  const e = leerObjeto(o, col)
  return { perro: leerNumero(e, 'perro'), gato: leerNumero(e, 'gato') }
}

const configServidorDe = (o: Fila): ConfigServidor => ({
  umbralPreguntar: leerNumero(o, 'umbralPreguntar'),
  umbralAutoconfirmar: leerNumero(o, 'umbralAutoconfirmar'),
  minutosAutoconfirmar: leerNumero(o, 'minutosAutoconfirmar'),
  diasAlertaComida: leerNumero(o, 'diasAlertaComida'),
  horaCierre: leerTexto(o, 'horaCierre'),
  telefonoAlbergue: leerTexto(o, 'telefonoAlbergue'),
  baseUrl: leerTexto(o, 'baseUrl'),
})

const configComidaDe = (o: Fila): ConfigComida => ({
  kgPorBulto: porEspecie(o, 'kgPorBulto'),
  consumoDiarioKg: porEspecie(o, 'consumoDiarioKg'),
  diasAviso: leerNumero(o, 'diasAviso'),
  diasUrgente: leerNumero(o, 'diasUrgente'),
})

const baseDe = (o: Fila): BaseAlbergue => {
  const conteo = leerObjeto(o, 'conteoInicial')
  const caja = leerObjeto(o, 'cajaInicial')
  return {
    conteoInicial: { fecha: leerTexto(conteo, 'fecha'), bultos: porEspecie(conteo, 'bultos') },
    cajaInicial: { fecha: leerTexto(caja, 'fecha'), monto: leerNumero(caja, 'monto') },
    vidasCambiadas: leerNumero(o, 'vidasCambiadas'),
  }
}

const SQL_CATALOGO = upsert('catalogo', ['id', 'nombre', 'tipo', 'kg_por_unidad', 'especie_objetivo', 'consumo_diario_kg_por_animal'])

function guardarItemCatalogo(sql: Sql, i: ItemCatalogo) {
  return sql.query(SQL_CATALOGO, [i.id, i.nombre, i.tipo, i.kgPorUnidad, i.especieObjetivo ?? null, i.consumoDiarioKgPorAnimal ?? null])
}

function itemCatalogoDe(f: Fila): ItemCatalogo {
  const i: ItemCatalogo = {
    id: leerTexto(f, 'id'),
    nombre: leerTexto(f, 'nombre'),
    tipo: leerTexto(f, 'tipo'),
    kgPorUnidad: leerNumero(f, 'kg_por_unidad'),
  }
  const especie = leerUnoONulo(f, 'especie_objetivo', ESPECIES)
  if (especie !== null) i.especieObjetivo = especie
  const consumo = leerNumeroONulo(f, 'consumo_diario_kg_por_animal')
  if (consumo !== null) i.consumoDiarioKgPorAnimal = consumo
  return i
}

const SQL_PADRINAZGO = upsert('padrinazgos', ['id', 'persona_telefono', 'persona_nombre', 'animal_id', 'activo'])

function guardarPadrinazgo(sql: Sql, p: Padrinazgo) {
  return sql.query(SQL_PADRINAZGO, [p.id, p.personaTelefono, p.personaNombre, p.animalId, p.activo])
}

// ── Bitácora de registros ──

const SELECT_REGISTRO = `SELECT id, floor(extract(epoch from fecha_hora))::bigint::text AS fecha_s, agente_id, origen, estado, propuesta,
  frase_exacta, confianza, registro_ia_id, media_url, compromiso_id, confirmado_por,
  floor(extract(epoch from confirmado_en))::bigint::text AS confirmado_s
  FROM registros`

const COLUMNAS_REGISTRO = `id, fecha_hora, dia, agente_id, origen, estado, tipo, animal_id, propuesta, frase_exacta, confianza, registro_ia_id, media_url, compromiso_id, confirmado_por, confirmado_en`
const VALORES_REGISTRO = `$1, $2::text::timestamptz, ($2::text::timestamptz AT TIME ZONE 'America/Bogota')::date, $3, $4, $5, $6, $7, $8::text::jsonb, $9, $10, $11, $12, $13, $14, $15::text::timestamptz`

// Una sola sentencia por registro: inserta (ignorando un id repetido) y, solo si fue nuevo, encola la fila de Sheets.
const SQL_REGISTRO_CON_COLA = `WITH nuevo AS (
  INSERT INTO registros (${COLUMNAS_REGISTRO}) VALUES (${VALORES_REGISTRO}) ON CONFLICT (id) DO NOTHING RETURNING id
), cola AS (
  INSERT INTO sheets_pendientes (tab, operacion, fila) SELECT 'Eventos', 'agregar', $16::text::jsonb FROM nuevo
)
SELECT id FROM nuevo`

const SQL_REGISTRO_SIN_COLA = `INSERT INTO registros (${COLUMNAS_REGISTRO}) VALUES (${VALORES_REGISTRO}) ON CONFLICT (id) DO NOTHING RETURNING id`

/** Inserta un registro. Devuelve true si era nuevo; un id repetido se ignora. */
async function insertarRegistro(sql: Sql, r: Registro, encolar: boolean): Promise<boolean> {
  const params: unknown[] = [
    r.id,
    r.fechaHora,
    r.agenteId,
    r.origen,
    r.estado,
    r.propuesta.tipo,
    animalIdDe(r.propuesta),
    json(r.propuesta),
    r.fraseExacta ?? null,
    r.confianza ?? null,
    r.registroIaId ?? null,
    r.mediaUrl ?? null,
    r.compromisoId ?? null,
    r.confirmadoPor ?? null,
    r.confirmadoEn ?? null,
  ]
  if (encolar) params.push(json(r))
  const { rows } = await sql.query(encolar ? SQL_REGISTRO_CON_COLA : SQL_REGISTRO_SIN_COLA, params)
  return rows.length > 0
}

/** El tipo se comprobó al leer; el contenido lo escribió insertarRegistro a partir de un Registro ya tipado. */
function esPropuesta(p: Fila): p is Fila & PropuestaServidor {
  return TIPOS_PROPUESTA.some((t) => t === p['tipo'])
}

function registroDe(f: Fila): Registro {
  const propuesta = leerObjeto(f, 'propuesta')
  if (!esPropuesta(propuesta)) throw new Error(`SQL: la propuesta del registro "${leerTexto(f, 'id')}" tiene un tipo desconocido`)
  const r: Registro = {
    id: leerTexto(f, 'id'),
    fechaHora: isoBogota(f, 'fecha_s'),
    agenteId: leerTexto(f, 'agente_id'),
    origen: leerUno(f, 'origen', ORIGENES),
    estado: leerUno(f, 'estado', ESTADOS_REGISTRO),
    propuesta,
  }
  const frase = leerTextoONulo(f, 'frase_exacta')
  if (frase !== null) r.fraseExacta = frase
  const confianza = leerNumeroONulo(f, 'confianza')
  if (confianza !== null) r.confianza = confianza
  const ia = leerTextoONulo(f, 'registro_ia_id')
  if (ia !== null) r.registroIaId = ia
  const media = leerTextoONulo(f, 'media_url')
  if (media !== null) r.mediaUrl = media
  const compromiso = leerTextoONulo(f, 'compromiso_id')
  if (compromiso !== null) r.compromisoId = compromiso
  const por = leerTextoONulo(f, 'confirmado_por')
  if (por !== null) r.confirmadoPor = por
  const en = isoBogotaONulo(f, 'confirmado_s')
  if (en !== null) r.confirmadoEn = en
  return r
}

// Una sola sentencia: cambia el estado y encola una fila 'actualizar' por cada registro que cambió.
const SQL_CAMBIAR_ESTADO = `WITH p AS (
  SELECT $1::text[] AS ids, $2::text AS estado, $3::text AS por, $4::text AS en
), act AS (
  UPDATE registros SET estado = p.estado, confirmado_por = p.por, confirmado_en = p.en::timestamptz
  FROM p WHERE registros.id = ANY(p.ids) RETURNING registros.id AS id
), cola AS (
  INSERT INTO sheets_pendientes (tab, operacion, fila)
  SELECT 'Eventos', 'actualizar', jsonb_build_object('id', act.id, 'estado', p.estado, 'confirmadoPor', p.por, 'confirmadoEn', p.en)
  FROM act, p
)
SELECT count(*)::int AS n FROM act`

// ── Adopciones ──

const COLUMNAS_SOLICITUD = [
  'id',
  'fecha',
  'nombre',
  'telefono',
  'cedula',
  'direccion',
  'animal_id',
  'familia_de_acuerdo',
  'para_quien',
  'destinatario',
  'vivienda',
  'vivienda_con_mallas',
  'donde_vivira',
  'acepta_esterilizar',
  'acepta_vacunar',
  'acepta_seguimiento',
  'quiere_entrega_inmediata',
  'pregunto_por_caracter',
  'plan_emergencia',
  'mascotas_anteriores',
  'motivo',
  'monton_manual',
  'nota',
  'llamada_agendada',
]
const SQL_SOLICITUD = upsert('solicitudes', COLUMNAS_SOLICITUD)
const SELECT_SOLICITUD = `SELECT ${COLUMNAS_SOLICITUD.join(', ')} FROM solicitudes`

function guardarSolicitudSql(sql: Sql, s: Solicitud) {
  return sql.query(SQL_SOLICITUD, [
    s.id,
    s.fecha,
    s.nombre,
    s.telefono,
    s.cedula,
    s.direccion,
    s.animalId,
    s.familiaDeAcuerdo,
    s.paraQuien,
    s.destinatario ?? null,
    s.vivienda,
    s.viviendaConMallas,
    s.dondeVivira,
    s.aceptaEsterilizar,
    s.aceptaVacunar,
    s.aceptaSeguimiento,
    s.quiereEntregaInmediata,
    s.preguntoPorCaracter,
    s.planEmergencia,
    s.mascotasAnteriores,
    s.motivo,
    s.montonManual,
    s.nota,
    s.llamadaAgendada,
  ])
}

function solicitudDe(f: Fila): Solicitud {
  const s: Solicitud = {
    id: leerTexto(f, 'id'),
    fecha: leerTexto(f, 'fecha'),
    nombre: leerTexto(f, 'nombre'),
    telefono: leerTexto(f, 'telefono'),
    cedula: leerTexto(f, 'cedula'),
    direccion: leerTexto(f, 'direccion'),
    animalId: leerTextoONulo(f, 'animal_id'),
    familiaDeAcuerdo: leerBooleano(f, 'familia_de_acuerdo'),
    paraQuien: leerUno(f, 'para_quien', PARA_QUIEN),
    vivienda: leerUno(f, 'vivienda', VIVIENDAS),
    viviendaConMallas: leerBooleano(f, 'vivienda_con_mallas'),
    dondeVivira: leerUno(f, 'donde_vivira', DONDE_VIVIRA),
    aceptaEsterilizar: leerBooleano(f, 'acepta_esterilizar'),
    aceptaVacunar: leerBooleano(f, 'acepta_vacunar'),
    aceptaSeguimiento: leerBooleano(f, 'acepta_seguimiento'),
    quiereEntregaInmediata: leerBooleano(f, 'quiere_entrega_inmediata'),
    preguntoPorCaracter: leerBooleano(f, 'pregunto_por_caracter'),
    planEmergencia: leerTexto(f, 'plan_emergencia'),
    mascotasAnteriores: leerTexto(f, 'mascotas_anteriores'),
    motivo: leerTexto(f, 'motivo'),
    montonManual: leerUnoONulo(f, 'monton_manual', MONTONES),
    nota: leerTexto(f, 'nota'),
    llamadaAgendada: leerTextoONulo(f, 'llamada_agendada'),
  }
  const destinatario = leerTextoONulo(f, 'destinatario')
  if (destinatario !== null) s.destinatario = destinatario
  return s
}

const COLUMNAS_SEGUIMIENTO = ['id', 'solicitud_id', 'adoptante_nombre', 'adoptante_telefono', 'animal_id', 'fecha_entrega', 'dia', 'fecha', 'resultado', 'llamada_humana', 'nota']
const SQL_SEGUIMIENTO = upsert('seguimientos', COLUMNAS_SEGUIMIENTO)
const SELECT_SEGUIMIENTO = `SELECT ${COLUMNAS_SEGUIMIENTO.join(', ')} FROM seguimientos`

function guardarSeguimientoSql(sql: Sql, s: Seguimiento) {
  return sql.query(SQL_SEGUIMIENTO, [s.id, s.solicitudId, s.adoptanteNombre, s.adoptanteTelefono, s.animalId, s.fechaEntrega, s.dia, s.fecha, s.resultado, s.llamadaHumana ?? null, s.nota])
}

function seguimientoDe(f: Fila): Seguimiento {
  const dia = leerNumero(f, 'dia')
  const diaValido = DIAS_SEGUIMIENTO.find((d) => d === dia)
  if (diaValido === undefined) throw new Error(`SQL: el día de seguimiento ${dia} no es ninguno de ${DIAS_SEGUIMIENTO.join(', ')}`)
  const s: Seguimiento = {
    id: leerTexto(f, 'id'),
    solicitudId: leerTextoONulo(f, 'solicitud_id'),
    adoptanteNombre: leerTexto(f, 'adoptante_nombre'),
    adoptanteTelefono: leerTexto(f, 'adoptante_telefono'),
    animalId: leerTexto(f, 'animal_id'),
    fechaEntrega: leerTexto(f, 'fecha_entrega'),
    dia: diaValido,
    fecha: leerTexto(f, 'fecha'),
    resultado: leerUnoONulo(f, 'resultado', MONTONES),
    nota: leerTexto(f, 'nota'),
  }
  const llamadaHumana = leerBooleanoONulo(f, 'llamada_humana')
  if (llamadaHumana !== null) s.llamadaHumana = llamadaHumana
  return s
}

// ── El repo ──

export class PgRepo implements Repo {
  constructor(private sql: Sql) {}

  private async filas<T>(texto: string, leer: (f: Fila) => T, params?: unknown[]): Promise<T[]> {
    const { rows } = await this.sql.query(texto, params)
    return rows.map(leer)
  }

  private async una<T>(texto: string, leer: (f: Fila) => T, params?: unknown[]): Promise<T | null> {
    return (await this.filas(texto, leer, params))[0] ?? null
  }

  personas(): Promise<Persona[]> {
    return this.filas(`${SELECT_PERSONA} ORDER BY orden`, personaDe)
  }

  personaPorId(id: string): Promise<Persona | null> {
    return this.una(`${SELECT_PERSONA} WHERE id = $1`, personaDe, [id])
  }

  personaPorTelefono(telefono: string): Promise<Persona | null> {
    return this.una(`${SELECT_PERSONA} WHERE telefono = $1 ORDER BY orden LIMIT 1`, personaDe, [telefono])
  }

  async crearPersona(p: Persona): Promise<void> {
    await guardarPersona(this.sql, p)
  }

  animales(): Promise<Animal[]> {
    return this.filas(`${SELECT_ANIMAL} ORDER BY orden`, animalDe)
  }

  animalPorId(id: string): Promise<Animal | null> {
    return this.una(`${SELECT_ANIMAL} WHERE id = $1`, animalDe, [id])
  }

  animalPorCodigo(codigo: string): Promise<Animal | null> {
    return this.una(`${SELECT_ANIMAL} WHERE upper(codigo) = upper($1) ORDER BY orden LIMIT 1`, animalDe, [codigo])
  }

  tratamientos(animalId?: string): Promise<Tratamiento[]> {
    return this.filas(`${SELECT_TRATAMIENTO} WHERE ($1::text IS NULL OR animal_id = $1::text) ORDER BY orden`, tratamientoDe, [animalId ?? null])
  }

  registrosDelDia(fecha: string, animalId?: string): Promise<Registro[]> {
    return this.registrosEntre(fecha, fecha, animalId)
  }

  registrosEntre(desde: string, hasta: string, animalId?: string): Promise<Registro[]> {
    return this.filas(
      `${SELECT_REGISTRO} WHERE dia BETWEEN $1::text::date AND $2::text::date AND ($3::text IS NULL OR animal_id = $3::text) ORDER BY llegada`,
      registroDe,
      [desde, hasta, animalId ?? null],
    )
  }

  registroPorId(id: string): Promise<Registro | null> {
    return this.una(`${SELECT_REGISTRO} WHERE id = $1`, registroDe, [id])
  }

  registrosPorIa(registroIaId: string): Promise<Registro[]> {
    return this.filas(`${SELECT_REGISTRO} WHERE registro_ia_id = $1 ORDER BY llegada`, registroDe, [registroIaId])
  }

  registrosPorEstado(estado: EstadoRegistro): Promise<Registro[]> {
    return this.filas(`${SELECT_REGISTRO} WHERE estado = $1 ORDER BY llegada`, registroDe, [estado])
  }

  async agregarRegistros(registros: Registro[]): Promise<string[]> {
    const nuevos: string[] = []
    // En serie: el orden de llegada de la bitácora es el del lote
    for (const r of registros) if (await insertarRegistro(this.sql, r, true)) nuevos.push(r.id)
    return nuevos
  }

  async cambiarEstado(ids: string[], estado: EstadoRegistro, por: string, en: string): Promise<number> {
    if (ids.length === 0) return 0
    const { rows } = await this.sql.query(SQL_CAMBIAR_ESTADO, [ids, estado, por, en])
    const fila = rows[0]
    return fila ? leerNumero(fila, 'n') : 0
  }

  clinicas(): Promise<Clinica[]> {
    return this.filas(
      `SELECT id, nombre, deuda, limite FROM clinicas ORDER BY orden`,
      (f) => ({ id: leerTexto(f, 'id'), nombre: leerTexto(f, 'nombre'), deuda: leerNumero(f, 'deuda'), limite: leerNumero(f, 'limite') }),
    )
  }

  configComida(): Promise<ConfigComida> {
    return leerConfig(this.sql, 'comida', configComidaDe)
  }

  config(): Promise<ConfigServidor> {
    return leerConfig(this.sql, 'servidor', configServidorDe)
  }

  catalogo(): Promise<ItemCatalogo[]> {
    return this.filas(`SELECT id, nombre, tipo, kg_por_unidad, especie_objetivo, consumo_diario_kg_por_animal FROM catalogo ORDER BY orden`, itemCatalogoDe)
  }

  base(): Promise<BaseAlbergue> {
    return leerConfig(this.sql, 'base', baseDe)
  }

  padrinazgosActivos(): Promise<Padrinazgo[]> {
    return this.filas(
      `SELECT id, persona_telefono, persona_nombre, animal_id, activo FROM padrinazgos WHERE activo ORDER BY orden`,
      (f) => ({
        id: leerTexto(f, 'id'),
        personaTelefono: leerTexto(f, 'persona_telefono'),
        personaNombre: leerTexto(f, 'persona_nombre'),
        animalId: leerTexto(f, 'animal_id'),
        activo: leerBooleano(f, 'activo'),
      }),
    )
  }

  solicitudes(): Promise<Solicitud[]> {
    return this.filas(`${SELECT_SOLICITUD} ORDER BY orden`, solicitudDe)
  }

  solicitudPorId(id: string): Promise<Solicitud | null> {
    return this.una(`${SELECT_SOLICITUD} WHERE id = $1`, solicitudDe, [id])
  }

  async guardarSolicitud(s: Solicitud): Promise<void> {
    await guardarSolicitudSql(this.sql, s)
  }

  seguimientos(): Promise<Seguimiento[]> {
    return this.filas(`${SELECT_SEGUIMIENTO} ORDER BY orden`, seguimientoDe)
  }

  async guardarSeguimiento(s: Seguimiento): Promise<void> {
    await guardarSeguimientoSql(this.sql, s)
  }
}

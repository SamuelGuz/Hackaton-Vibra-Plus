// Arma la respuesta de GET /api/hoy con la forma DatosAlbergue del panel.
// cargarFilas() hace las consultas; armarHoy() es pura y se prueba sin base de datos.

import type { Pool } from '../datos/db.js'
import { fechaLocal } from '../formato.js'
import type {
  Animal,
  DatosAlbergue,
  DosisDada,
  Especie,
  EstadoAnimal,
  Movimiento,
  MovimientoInventario,
  Nota,
  Persona,
  PorConfirmar,
  Propuesta,
  Rol,
  Tratamiento,
} from '../panel-tipos.js'

/** Momento local sin zona, como lo usa el panel: '2026-10-27T09:30' */
const MOMENTO = `'YYYY-MM-DD"T"HH24:MI'`
const CONFIRMADOS = `('confirmado','corregido')`

export interface FilasHoy {
  usuarios: { id: number; nombre: string; rol: Rol }[]
  animales: {
    id: number
    nombre: string
    especie: Especie
    estado: EstadoAnimal
    foto_url: string | null
    fecha_ingreso: string
    alias: string[]
    advertencias: string[]
    caracter: string | null
    padrino: string | null
  }[]
  tratamientos: {
    id: number
    animal_id: number
    medicamento: string
    dosis: number
    unidad: string
    frecuencia_horas: number
    hora_inicio: string
    fecha_inicio: string
    fecha_fin: string | null
  }[]
  dosis: { id: number; tratamiento_id: number; valor: string; fecha_hora: string; creado_por: number | null; canal: string | null }[]
  /** `cantidad` en bultos (los kilos sueltos, ya convertidos); `kg` solo en kilos sueltos */
  inventario: { id: number; especie: Especie; cantidad: number; kg: number | null; fecha_hora: string; creado_por: number | null; origen: string | null }[]
  movimientos: {
    id: number
    tipo: 'ingreso' | 'gasto' | 'abono'
    monto: number
    categoria: string | null
    entidad_id: number | null
    soporte_url: string | null
    concepto: string | null
    fecha_hora: string
    creado_por: number | null
  }[]
  clinicas: { id: number; nombre: string; limite_credito: number | null; deuda: number }[]
  registros: {
    id: number
    fecha_hora: string
    tipo_entrada: string
    usuario_id: number | null
    transcripcion: string | null
    acciones_json: Propuesta[] | null
    estado: string
  }[]
  notas: { id: number; animal_id: number; detalle: string | null; fecha_hora: string; creado_por: number | null }[]
  config: Record<string, string>
  catalogo: { especie: Especie; kg_por_unidad: number; consumo_diario_kg_por_animal: number }[]
  aCargo: { especie: Especie; n: number }[]
  adopciones: number
  /** La última de cada vacuna por animal; `valor` es la fecha del refuerzo (AAAA-MM-DD) */
  vacunas?: { animal_id: number; detalle: string; valor: string }[]
}

const CARGO: Record<Rol, { cargo: string; color: string }> = {
  cuidador: { cargo: 'Cuidador', color: '#2f6b3b' },
  bienestar: { cargo: 'Bienestar animal', color: '#a8432c' },
  admin: { cargo: 'Administración', color: '#1f2a44' },
  adopciones: { cargo: 'Adopciones', color: '#595449' },
  comunicacion: { cargo: 'Comunicación', color: '#7a5c2e' },
  voluntario: { cargo: 'Voluntario', color: '#4f6b7a' },
}

const ESTADO_PANEL: Record<string, PorConfirmar['estado']> = {
  por_confirmar: 'pendiente',
  confirmado: 'confirmado',
  corregido: 'corregido',
  anulado: 'descartado',
}

const CATEGORIAS = new Set(['comida', 'veterinaria', 'limpieza', 'servicios', 'transporte', 'donacion', 'padrino', 'rifa', 'otro'])

/** Horas del día en que toca un tratamiento: desde la hora de inicio, cada `frecuencia` horas, sin pasar de medianoche. */
export function horasDelDia(horaInicio: string, frecuenciaHoras: number): string[] {
  const [h, m] = horaInicio.split(':').map(Number)
  const horas: string[] = []
  for (let min = h * 60 + m; min < 24 * 60; min += frecuenciaHoras * 60) {
    horas.push(`${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`)
  }
  return horas
}

/** 0.5 + 'pastilla' → 'media pastilla'; 3 + 'ml' → '3 ml' */
export function dosisHablada(dosis: number, unidad: string): string {
  if (dosis === 0.5) return `media ${unidad}`
  return `${dosis.toLocaleString('es-CO', { maximumFractionDigits: 2 })} ${unidad}`
}

const id = (n: number | null | undefined) => (n == null ? '' : String(n))
const numero = (v: string | undefined, porDefecto: number) => (v === undefined || v === '' ? porDefecto : Number(v))

export type FilasEventos = Pick<FilasHoy, 'dosis' | 'inventario' | 'movimientos' | 'notas'>

export function armarEventos(f: FilasEventos) {
  const dosisDadas: DosisDada[] = f.dosis.map((d) => ({
    id: id(d.id),
    tratamientoId: id(d.tratamiento_id),
    hora: d.valor,
    fechaHora: d.fecha_hora,
    quien: id(d.creado_por),
    origen: d.canal === 'panel' ? 'panel' : 'bot',
  }))

  const inventario: MovimientoInventario[] = f.inventario.map((m) => ({
    id: id(m.id),
    fechaHora: m.fecha_hora,
    tipo: m.especie,
    cambio: m.cantidad,
    quien: id(m.creado_por),
    origen: m.origen === 'panel' ? 'panel' : 'bot',
    ...(m.kg != null ? { kg: m.kg, unidad: 'kg' as const } : {}),
  }))

  const movimientos: Movimiento[] = f.movimientos.map((m) => ({
    id: id(m.id),
    fechaHora: m.fecha_hora,
    tipo: m.tipo === 'ingreso' ? 'ingreso' : 'gasto',
    monto: m.monto,
    categoria: (m.categoria && CATEGORIAS.has(m.categoria) ? m.categoria : 'otro') as Movimiento['categoria'],
    clinicaId: m.entidad_id == null ? null : id(m.entidad_id),
    abonoDeuda: m.tipo === 'abono',
    foto: m.soporte_url,
    quien: id(m.creado_por),
    nota: m.concepto ?? '',
  }))

  const notas: Nota[] = f.notas.map((n) => ({
    id: id(n.id),
    animalId: id(n.animal_id),
    texto: n.detalle ?? '',
    fechaHora: n.fecha_hora,
    quien: id(n.creado_por),
  }))

  return { dosisDadas, inventario, movimientos, notas }
}

export function armarHoy(f: FilasHoy): DatosAlbergue {
  const personas: Persona[] = f.usuarios.map((u) => ({ id: id(u.id), nombre: u.nombre, rol: u.rol, foto: null, ...CARGO[u.rol] }))

  // `alias` no está en el tipo del panel: va de más para que el bot encuentre a "Tobi"
  const animales: (Animal & { alias: string[] })[] = f.animales.map((a) => ({
    id: id(a.id),
    nombre: a.nombre,
    alias: a.alias,
    especie: a.especie,
    estado: a.estado,
    foto: a.foto_url,
    fechaIngreso: a.fecha_ingreso,
    advertencias: a.advertencias,
    caracter: a.caracter ?? '',
    padrino: a.padrino,
  }))

  const tratamientos: Tratamiento[] = f.tratamientos.map((t) => ({
    id: id(t.id),
    animalId: id(t.animal_id),
    medicamento: t.medicamento,
    dosis: dosisHablada(t.dosis, t.unidad),
    horas: horasDelDia(t.hora_inicio, t.frecuencia_horas),
    inicio: t.fecha_inicio,
    fin: t.fecha_fin ?? '9999-12-31',
  }))

  const { dosisDadas, inventario, movimientos, notas } = armarEventos(f)

  const porConfirmar: PorConfirmar[] = f.registros.map((r) => ({
    id: id(r.id),
    fechaHora: r.fecha_hora,
    origen: r.tipo_entrada === 'imagen' ? 'foto' : 'audio',
    quien: id(r.usuario_id),
    textoOriginal: r.transcripcion ?? '',
    propuestas: r.acciones_json ?? [],
    estado: ESTADO_PANEL[r.estado] ?? 'pendiente',
  }))

  const c = f.config
  const kgPorBulto: Record<Especie, number> = { perro: 0, gato: 0 }
  const consumoPorAnimal: Record<Especie, number> = { perro: 0, gato: 0 }
  for (const item of f.catalogo) {
    kgPorBulto[item.especie] = item.kg_por_unidad
    consumoPorAnimal[item.especie] = item.consumo_diario_kg_por_animal
  }
  const aCargo: Record<Especie, number> = { perro: 0, gato: 0 }
  for (const fila of f.aCargo) aCargo[fila.especie] = fila.n

  return {
    personas,
    animales,
    tratamientos,
    dosisDadas,
    inventario,
    conteoInicial: {
      fecha: c.conteo_fecha ?? '2000-01-01',
      bultos: { perro: numero(c.conteo_bultos_perro, 0), gato: numero(c.conteo_bultos_gato, 0) },
    },
    movimientos,
    cajaInicial: { fecha: c.caja_inicial_fecha ?? '2000-01-01', monto: numero(c.caja_inicial_monto, 0) },
    clinicas: f.clinicas.map((k) => ({ id: id(k.id), nombre: k.nombre, deuda: k.deuda, limite: k.limite_credito ?? 0 })),
    porConfirmar,
    notas,
    configComida: {
      kgPorBulto,
      consumoDiarioKg: {
        perro: aCargo.perro * consumoPorAnimal.perro,
        gato: aCargo.gato * consumoPorAnimal.gato,
      },
      diasAviso: numero(c.dias_aviso, 6),
      diasUrgente: numero(c.dias_urgente, 4),
    },
    vidasCambiadas: numero(c.vidas_cambiadas, 0) + f.adopciones,
    metaDelDia: { kg: numero(c.meta_dia_kg, 25), pesos: numero(c.meta_dia_pesos, 150_000), semanaPesos: numero(c.meta_semana_pesos, 200_000) },
    vacunas: (f.vacunas ?? []).map((v) => ({ animalId: id(v.animal_id), vacuna: v.detalle, vence: v.valor })),
  }
}

export interface Rango {
  /** 'AAAA-MM-DD', incluido */
  desde: string
  /** 'AAAA-MM-DD', incluido */
  hasta: string
}

/** Consultas de eventos en un rango de fechas. Las usan /api/hoy y /api/eventos. */
export async function cargarEventos(pool: Pool, r: Rango) {
  const p = [r.desde, r.hasta]
  const enRango = (col: string) => `(${col})::date BETWEEN $1::date AND $2::date`
  const [dosis, inventario, movimientos, notas] = await Promise.all([
    pool.query<FilasHoy['dosis'][number]>(
      `SELECT e.id, e.tratamiento_id, e.valor, to_char(e.fecha_hora, ${MOMENTO}) AS fecha_hora, e.creado_por, r.canal
       FROM eventos_salud e LEFT JOIN registros_ia r ON r.id = e.registro_id
       WHERE e.tipo = 'dosis' AND e.tratamiento_id IS NOT NULL AND e.estado IN ${CONFIRMADOS} AND ${enRango('e.fecha_hora')}
       ORDER BY e.fecha_hora`,
      p,
    ),
    pool.query<FilasHoy['inventario'][number]>(
      // Los kilos sueltos van también en bultos equivalentes, para que el panel calcule los días igual que el bot
      `SELECT m.id, c.especie_objetivo AS especie,
              CASE WHEN c.unidad = 'kg' THEN COALESCE(m.cantidad * c.kg_por_unidad / NULLIF((
                SELECT b.kg_por_unidad FROM catalogo_items b
                WHERE b.tipo = 'comida' AND b.especie_objetivo = c.especie_objetivo AND b.unidad <> 'kg' ORDER BY b.id LIMIT 1), 0), 0)
              ELSE m.cantidad END AS cantidad,
              CASE WHEN c.unidad = 'kg' THEN m.cantidad * c.kg_por_unidad END AS kg,
              to_char(m.fecha_hora, ${MOMENTO}) AS fecha_hora, m.creado_por, m.origen
       FROM inventario_movimientos m JOIN catalogo_items c ON c.id = m.item_id
       WHERE c.tipo = 'comida' AND c.especie_objetivo IS NOT NULL AND m.estado IN ${CONFIRMADOS} AND ${enRango('m.fecha_hora')}
       ORDER BY m.fecha_hora`,
      p,
    ),
    pool.query<FilasHoy['movimientos'][number]>(
      `SELECT id, tipo, monto, categoria, entidad_id, soporte_url, concepto,
              to_char(fecha + creado_en::time, ${MOMENTO}) AS fecha_hora, creado_por
       FROM movimientos_financieros
       WHERE tipo IN ('ingreso','gasto','abono') AND estado IN ${CONFIRMADOS} AND fecha BETWEEN $1::date AND $2::date
       ORDER BY fecha, creado_en`,
      p,
    ),
    pool.query<FilasHoy['notas'][number]>(
      `SELECT id, animal_id, detalle, to_char(fecha_hora, ${MOMENTO}) AS fecha_hora, creado_por
       FROM eventos_salud
       WHERE tipo = 'observacion' AND estado IN ${CONFIRMADOS} AND ${enRango('fecha_hora')}
       ORDER BY fecha_hora`,
      p,
    ),
  ])
  return { dosis: dosis.rows, inventario: inventario.rows, movimientos: movimientos.rows, notas: notas.rows }
}

function fechaMenos(ahora: Date, dias: number): string {
  const d = new Date(ahora)
  d.setDate(d.getDate() - dias)
  return fechaLocal(d)
}

export async function cargarFilas(pool: Pool, ahora: Date): Promise<FilasHoy> {
  const configRes = await pool.query<{ clave: string; valor: string }>('SELECT clave, valor FROM config')
  const config = Object.fromEntries(configRes.rows.map((r) => [r.clave, r.valor]))
  const hoy = fechaLocal(ahora)
  // Desde el último conteo o cuadre, para que el panel calcule bodega y caja; mínimo los últimos 7 días
  const desde = [config.conteo_fecha, config.caja_inicial_fecha, fechaMenos(ahora, 7)]
    .filter((x): x is string => Boolean(x))
    .sort()[0]

  const [usuarios, animales, tratamientos, eventos, clinicas, registros, catalogo, aCargo, adopciones, vacunas] = await Promise.all([
    pool.query(`SELECT id, nombre, rol FROM usuarios WHERE activo ORDER BY id`),
    pool.query(
      `SELECT a.id, a.nombre, a.especie, a.estado, a.foto_url, a.fecha_ingreso, a.alias, a.advertencias, a.caracter,
              (SELECT p.nombre FROM padrinazgos pz JOIN personas p ON p.id = pz.persona_id
               WHERE pz.animal_id = a.id AND pz.activo ORDER BY pz.desde DESC LIMIT 1) AS padrino
       FROM animales a ORDER BY a.nombre`,
    ),
    pool.query(
      `SELECT id, animal_id, medicamento, dosis, unidad, frecuencia_horas, hora_inicio, fecha_inicio, fecha_fin
       FROM tratamientos WHERE activo ORDER BY hora_inicio`,
    ),
    cargarEventos(pool, { desde, hasta: hoy }),
    pool.query(
      `SELECT e.id, e.nombre, e.limite_credito,
              COALESCE(SUM(CASE m.tipo WHEN 'factura' THEN m.monto WHEN 'abono' THEN -m.monto END), 0)::bigint AS deuda
       FROM entidades e
       LEFT JOIN movimientos_financieros m ON m.entidad_id = e.id AND m.estado IN ${CONFIRMADOS}
       WHERE e.tipo = 'clinica' GROUP BY e.id ORDER BY e.id`,
    ),
    pool.query(
      `SELECT id, to_char(creado_en, ${MOMENTO}) AS fecha_hora, tipo_entrada, usuario_id, transcripcion, acciones_json, estado
       FROM registros_ia
       WHERE canal = 'whatsapp'
         AND ((estado = 'por_confirmar' AND creado_en > now() - interval '7 days') OR creado_en > now() - interval '2 days')
       ORDER BY creado_en DESC`,
    ),
    pool.query(
      `SELECT especie_objetivo AS especie, kg_por_unidad, consumo_diario_kg_por_animal
       FROM catalogo_items WHERE tipo = 'comida' AND especie_objetivo IS NOT NULL AND unidad <> 'kg' ORDER BY id`,
    ),
    pool.query(
      `SELECT especie, count(*)::int AS n FROM animales
       WHERE estado IN ('cuarentena','tratamiento','adoptable','hogar_temporal') GROUP BY especie`,
    ),
    pool.query(`SELECT count(*)::int AS n FROM adopciones WHERE estado = 'activa'`),
    pool.query(
      `SELECT DISTINCT ON (animal_id, lower(detalle)) animal_id, detalle, valor
       FROM eventos_salud
       WHERE tipo = 'vacuna' AND estado IN ${CONFIRMADOS} AND detalle IS NOT NULL AND valor ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       ORDER BY animal_id, lower(detalle), fecha_hora DESC`,
    ),
  ])

  return {
    usuarios: usuarios.rows,
    animales: animales.rows,
    tratamientos: tratamientos.rows,
    ...eventos,
    clinicas: clinicas.rows,
    registros: registros.rows,
    config,
    catalogo: catalogo.rows,
    aCargo: aCargo.rows,
    adopciones: adopciones.rows[0]?.n ?? 0,
    vacunas: vacunas.rows,
  }
}

export async function cargarHoy(pool: Pool, ahora: Date): Promise<DatosAlbergue> {
  return armarHoy(await cargarFilas(pool, ahora))
}

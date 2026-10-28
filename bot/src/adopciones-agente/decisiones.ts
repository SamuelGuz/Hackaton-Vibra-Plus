// Reglas del agente que NO dependen de Gemini: se calculan en código para que sean predecibles y se puedan probar.
import { ahoraBogota } from '@huellitas/shared/domain/hora'
import {
  INTENCIONES,
  PERMISOS,
  SI_NO,
  TIEMPOS,
  TIPOS_VIVIENDA,
  type Evaluacion,
  type EvaluacionParcial,
  type Intencion,
  type RespuestaModelo,
} from './tipos'

export const UMBRAL_VISITA = 75
export const RIESGO_MAXIMO_VISITA = 40
export const UMBRAL_PADRINAZGO = 40
export const TURNOS_MIN_PADRINAZGO = 3
export const HORA_VISITA = '10:00 a. m.'

const MAX_RESPUESTA = 3500
const MAX_TRANSCRIPCION = 1000

export class RespuestaInvalida extends Error {}

// ---------- Puntajes y evaluación acumulada ----------

/** Número entero de 0 a 100; null si no es un número usable */
export function acotarPuntaje(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  if (!Number.isFinite(n)) return null
  return Math.min(100, Math.max(0, Math.round(n)))
}

export function evaluacionInicial(): Evaluacion {
  return {
    suitability: 0,
    risk: 50,
    viviendaTipo: 'desconocido',
    permisoArriendo: 'desconocido',
    presupuestoVeterinario: 'desconocido',
    tiempoDisponible: 'desconocido',
    ninos: 'desconocido',
    otrasMascotas: 'desconocido',
    nombre: null,
  }
}

function opcion<T extends string>(v: unknown, validos: readonly T[]): T | undefined {
  return typeof v === 'string' && (validos as readonly string[]).includes(v) && v !== 'desconocido' ? (v as T) : undefined
}

/** Una línea, sin saltos ni tabulaciones, de largo acotado; undefined si no dice nada */
function textoCorto(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.replace(/\s+/g, ' ').trim().slice(0, max).trim()
  return t === '' || /^(desconocido|null|n\/a|-)$/i.test(t) ? undefined : t
}

function objeto(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/** Lee el bloque `evaluacion` de Gemini sin confiar en él: acota puntajes y descarta lo inválido o desconocido */
export function normalizarEvaluacion(crudo: unknown): EvaluacionParcial {
  const o = objeto(crudo)
  if (!o) return {}
  const vivienda = objeto(o.vivienda)
  const r: EvaluacionParcial = {}
  const suitability = acotarPuntaje(o.suitability_score)
  const risk = acotarPuntaje(o.risk_score)
  if (suitability !== null) r.suitability = suitability
  if (risk !== null) r.risk = risk
  const tipo = opcion(vivienda?.tipo, TIPOS_VIVIENDA)
  const permiso = opcion(vivienda?.permiso_arriendo, PERMISOS)
  const presupuesto = opcion(o.presupuesto_veterinario, SI_NO)
  const tiempo = opcion(o.tiempo_disponible, TIEMPOS)
  const ninos = textoCorto(o.ninos, 80)
  const mascotas = textoCorto(o.otras_mascotas, 80)
  const nombre = textoCorto(o.nombre_interesado, 60)
  if (tipo) r.viviendaTipo = tipo
  if (permiso) r.permisoArriendo = permiso
  if (presupuesto) r.presupuestoVeterinario = presupuesto
  if (tiempo) r.tiempoDisponible = tiempo
  if (ninos) r.ninos = ninos
  if (mascotas) r.otrasMascotas = mascotas
  if (nombre) r.nombre = nombre
  return r
}

/** Suma lo nuevo a lo ya sabido: un turno que no menciona un dato no lo borra; uno que lo corrige, sí lo cambia */
export function combinarEvaluacion(previa: Evaluacion, nueva: EvaluacionParcial): Evaluacion {
  return {
    suitability: nueva.suitability ?? previa.suitability,
    risk: nueva.risk ?? previa.risk,
    viviendaTipo: nueva.viviendaTipo ?? previa.viviendaTipo,
    permisoArriendo: nueva.permisoArriendo ?? previa.permisoArriendo,
    presupuestoVeterinario: nueva.presupuestoVeterinario ?? previa.presupuestoVeterinario,
    tiempoDisponible: nueva.tiempoDisponible ?? previa.tiempoDisponible,
    ninos: nueva.ninos ?? previa.ninos,
    otrasMascotas: nueva.otrasMascotas ?? previa.otrasMascotas,
    nombre: nueva.nombre ?? previa.nombre,
  }
}

/** Lo que todavía falta preguntar para poder decidir una visita */
export function calcularFaltantes(e: Evaluacion): string[] {
  const f: string[] = []
  if (e.viviendaTipo === 'desconocido') f.push('vivienda')
  if (e.permisoArriendo === 'desconocido') f.push('permiso_arriendo')
  if (e.presupuestoVeterinario === 'desconocido') f.push('presupuesto_veterinario')
  if (e.tiempoDisponible === 'desconocido') f.push('tiempo_disponible')
  return f
}

// ---------- Visita ----------

export function puedeAgendarVisita(c: {
  evaluacion: Evaluacion
  intencion: Intencion
  alertaBienestar: boolean
  perroAdoptable: boolean
}): boolean {
  const e = c.evaluacion
  return (
    !c.alertaBienestar &&
    c.perroAdoptable &&
    (c.intencion === 'adoptar' || c.intencion === 'explorar') &&
    e.suitability >= UMBRAL_VISITA &&
    e.risk <= RIESGO_MAXIMO_VISITA &&
    (e.permisoArriendo === 'si' || e.permisoArriendo === 'no_aplica') &&
    e.presupuestoVeterinario === 'si' &&
    e.tiempoDisponible === 'suficiente'
  )
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** Año, mes (1-12), día y día de la semana (0 = domingo) de un instante, vistos desde Bogotá */
function fechaBogota(d: Date): { anio: number; mes: number; dia: number; semana: number; hora: string } {
  const b = ahoraBogota(d)
  const [anio = 0, mes = 1, dia = 1] = b.fecha.split('-').map(Number)
  return { anio, mes, dia, semana: new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay(), hora: b.hora }
}

/** El sábado a las 10:00 a. m. (hora de Bogotá): hoy si es sábado antes de las 10:00; si no, el sábado siguiente */
export function proximoSabado10(ahora: Date): Date {
  const b = fechaBogota(ahora)
  let dias = (6 - b.semana + 7) % 7
  if (dias === 0 && b.hora >= '10:00') dias = 7
  const sabado = new Date(Date.UTC(b.anio, b.mes - 1, b.dia + dias)).toISOString().slice(0, 10)
  return new Date(`${sabado}T10:00:00-05:00`)
}

/** "sábado 31 de octubre", en hora de Bogotá */
export function describirFecha(d: Date): string {
  const b = fechaBogota(d)
  return `${DIAS[b.semana]} ${b.dia} de ${MESES[b.mes - 1]}`
}

// ---------- Padrinazgo ----------

export function debeOfrecerPadrinazgo(c: { intencion: Intencion; suitability: number; turnos: number; conexion: boolean }): boolean {
  if (c.intencion === 'apadrinar' || c.intencion === 'donar') return true
  if (!c.conexion) return false
  return c.intencion === 'no_puede_adoptar' || (c.suitability < UMBRAL_PADRINAZGO && c.turnos >= TURNOS_MIN_PADRINAZGO)
}

/** ¿El texto ya habla de ser Padrino y del valor desde $20.000? */
export function mencionaPadrinazgo(texto: string): boolean {
  return /padrin|apadrin/i.test(texto) && /20[.,\s]?000/.test(texto)
}

// ---------- Voz ----------

/** Texto de chat → texto para decir en voz alta: sin emojis, markdown ni viñetas, y con las cifras en pesos legibles */
export function aGuionVoz(texto: string): string {
  return texto
    .replace(/[\p{Extended_Pictographic}‍️⃣]/gu, '')
    .replace(/\$\s?(\d(?:[\d.]*\d)?)(?:\s?COP\b)?/g, '$1 pesos')
    .replace(/[*_`~#>]/g, '')
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-•]|\d+[.)])\s+/, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((l) => (/[.!?…:;,]$/.test(l) ? l : `${l}.`))
    .join(' ')
    .replace(/\s+([.,;:!?…])/g, '$1')
}

// ---------- Respuesta de Gemini ----------

function cadena(v: unknown): string {
  return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : ''
}

/** Valida lo que devolvió Gemini. Sin `respuesta` no hay qué decirle a la persona: se considera una falla. */
export function normalizarRespuesta(crudo: unknown): RespuestaModelo {
  const o = objeto(crudo)
  if (!o) throw new RespuestaInvalida('Gemini no devolvió un objeto')
  const respuesta = cadena(o.respuesta).slice(0, MAX_RESPUESTA).trim()
  if (!respuesta) throw new RespuestaInvalida('Gemini no devolvió "respuesta"')
  const guion = typeof o.guion_voz === 'string' ? aGuionVoz(o.guion_voz) : ''
  const mencionados = Array.isArray(o.perritos_mencionados)
    ? [...new Set(o.perritos_mencionados.map(cadena).filter(Boolean))].slice(0, 3)
    : []
  return {
    transcripcion: cadena(o.transcripcion).slice(0, MAX_TRANSCRIPCION),
    respuesta,
    guionVoz: guion || aGuionVoz(respuesta),
    perritoIdFoco: cadena(o.perrito_id_foco) || null,
    perritosMencionados: mencionados,
    intencion: (INTENCIONES as readonly string[]).includes(o.intencion as string) ? (o.intencion as Intencion) : 'explorar',
    conexionEmocional: o.conexion_emocional === true,
    alertaBienestar: o.alerta_bienestar === true,
    evaluacion: normalizarEvaluacion(o.evaluacion),
  }
}

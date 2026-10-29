// Solicitudes de adopción guardadas: las del formulario y las que arma el agente cuando propone una visita.
// El sistema nunca decide una adopción: la sugerencia orienta y lo que pone la coordinación siempre gana.
import { clasificar } from './clasificar.js'
import type { CambioSolicitud, Clasificacion, DondeVivira, Monton, ParaQuien, Solicitud, Vivienda } from './tipos.js'

export type OrigenSolicitud = 'formulario' | 'agente'

/** Lo que el panel recibe: la solicitud, de dónde vino y, si la armó el agente, su visita propuesta y sus puntajes */
export interface SolicitudGuardada extends Solicitud {
  origen: OrigenSolicitud
  /** ISO. Es una propuesta del agente: falta que la coordinación la confirme */
  visitaPropuesta: string | null
  visitaEstado: 'propuesta' | 'retractada' | 'cancelada' | 'cambio_solicitado' | null
  puntajeIdoneidad: number | null
  puntajeRiesgo: number | null
}

/** Para guardar o actualizar por `claveOrigen` (id del formulario o 'wa:<teléfono>' / 'web:<sesión>' del agente) */
export interface NuevaSolicitudAdopcion {
  origen: OrigenSolicitud
  claveOrigen: string
  /** Lo que respondió o dijo la persona; las decisiones humanas (montón, nota, llamada) no se pisan al actualizar */
  respuestas: Omit<Solicitud, 'id' | 'fecha' | 'montonManual' | 'nota' | 'llamadaAgendada'>
  visitaPropuesta?: Date | null
  puntajeIdoneidad?: number | null
  puntajeRiesgo?: number | null
}

export const IDONEIDAD_VERDE = 75
export const RIESGO_MAXIMO_VERDE = 40
export const IDONEIDAD_AMARILLO = 50

/** Montón sugerido: el del formulario sale de las reglas; el del agente, de sus puntajes de pre-evaluación */
export function sugerencia(s: SolicitudGuardada): Clasificacion {
  if (s.origen === 'formulario') return clasificar(s)
  const idoneidad = s.puntajeIdoneidad ?? 0
  const riesgo = s.puntajeRiesgo ?? 100
  const razon = `Pre-evaluación del agente: idoneidad ${idoneidad}, riesgo ${riesgo}. Falta hablar con la persona.`
  if (idoneidad >= IDONEIDAD_VERDE && riesgo <= RIESGO_MAXIMO_VERDE) return { monton: 'verde', razon }
  if (idoneidad >= IDONEIDAD_AMARILLO) return { monton: 'amarillo', razon }
  return { monton: 'rojo', razon }
}

// ---------- Validación de lo que llega por la API ----------

const MONTONES: Monton[] = ['verde', 'amarillo', 'rojo']
const VIVIENDAS: Vivienda[] = ['casa', 'apartamento', 'finca', 'otra']
const PARA_QUIEN: ParaQuien[] = ['yo', 'familia', 'regalo']
const DONDE: DondeVivira[] = ['dentro_casa', 'patio', 'guardia', 'amarrado', 'azotea']
const MAX_TEXTO = 2000
const MAX_NOTA = 4000

type Resultado<T> = { ok: T } | { error: string }

const esTexto = (v: unknown, max = MAX_TEXTO): v is string => typeof v === 'string' && v.length <= max
const esFechaIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v))

/** POST /api/adopciones/solicitudes: una solicitud del formulario. `id` es el del formulario y la hace idempotente. */
export function validarSolicitudFormulario(c: unknown): Resultado<NuevaSolicitudAdopcion> {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return { error: 'Se espera un objeto con la solicitud' }
  const s = c as Record<string, unknown>
  if (!esTexto(s.id, 100) || !s.id.trim()) return { error: '"id" es obligatorio (el id de la respuesta del formulario)' }
  for (const k of ['nombre', 'telefono', 'cedula', 'direccion', 'planEmergencia', 'mascotasAnteriores', 'motivo'] as const) {
    if (!esTexto(s[k])) return { error: `"${k}" debe ser texto` }
  }
  if (!(s.nombre as string).trim()) return { error: '"nombre" no puede ir vacío' }
  for (const k of ['familiaDeAcuerdo', 'viviendaConMallas', 'aceptaEsterilizar', 'aceptaVacunar', 'aceptaSeguimiento', 'quiereEntregaInmediata', 'preguntoPorCaracter'] as const) {
    if (typeof s[k] !== 'boolean') return { error: `"${k}" debe ser true o false` }
  }
  if (!VIVIENDAS.includes(s.vivienda as Vivienda)) return { error: `"vivienda" debe ser una de: ${VIVIENDAS.join(', ')}` }
  if (!PARA_QUIEN.includes(s.paraQuien as ParaQuien)) return { error: `"paraQuien" debe ser una de: ${PARA_QUIEN.join(', ')}` }
  if (!DONDE.includes(s.dondeVivira as DondeVivira)) return { error: `"dondeVivira" debe ser una de: ${DONDE.join(', ')}` }
  if (s.animalId != null && !(typeof s.animalId === 'string' && /^\d{1,12}$/.test(s.animalId))) return { error: '"animalId" debe ser el id de un animal o null' }
  if (s.destinatario != null && !esTexto(s.destinatario)) return { error: '"destinatario" debe ser texto' }

  const r = s as unknown as Solicitud
  return {
    ok: {
      origen: 'formulario',
      claveOrigen: `formulario:${r.id.trim()}`,
      respuestas: {
        nombre: r.nombre.trim(),
        telefono: r.telefono,
        cedula: r.cedula,
        direccion: r.direccion,
        animalId: r.animalId ?? null,
        familiaDeAcuerdo: r.familiaDeAcuerdo,
        paraQuien: r.paraQuien,
        ...(r.destinatario ? { destinatario: r.destinatario } : {}),
        vivienda: r.vivienda,
        viviendaConMallas: r.viviendaConMallas,
        dondeVivira: r.dondeVivira,
        aceptaEsterilizar: r.aceptaEsterilizar,
        aceptaVacunar: r.aceptaVacunar,
        aceptaSeguimiento: r.aceptaSeguimiento,
        quiereEntregaInmediata: r.quiereEntregaInmediata,
        preguntoPorCaracter: r.preguntoPorCaracter,
        planEmergencia: r.planEmergencia,
        mascotasAnteriores: r.mascotasAnteriores,
        motivo: r.motivo,
      },
    },
  }
}

/** POST /api/adopciones/solicitudes/:id: solo viaja lo que cambió; mandar lo mismo dos veces deja lo mismo */
export function validarCambioSolicitud(c: unknown): Resultado<CambioSolicitud> {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return { error: 'Se espera un objeto con lo que cambió' }
  const s = c as Record<string, unknown>
  const cambio: CambioSolicitud = {}
  if ('montonManual' in s) {
    if (s.montonManual !== null && !MONTONES.includes(s.montonManual as Monton)) return { error: '"montonManual" debe ser verde, amarillo, rojo o null' }
    cambio.montonManual = s.montonManual as Monton | null
  }
  if ('nota' in s) {
    if (!esTexto(s.nota, MAX_NOTA)) return { error: `"nota" debe ser texto de máximo ${MAX_NOTA} caracteres` }
    cambio.nota = s.nota
  }
  if ('llamadaAgendada' in s) {
    if (s.llamadaAgendada !== null && !esFechaIso(s.llamadaAgendada)) return { error: '"llamadaAgendada" debe ser una fecha ISO o null' }
    cambio.llamadaAgendada = s.llamadaAgendada as string | null
  }
  if (Object.keys(cambio).length === 0) return { error: 'No viene nada para cambiar (montonManual, nota o llamadaAgendada)' }
  return { ok: cambio }
}

// ---------- Del agente ----------

/** Lo poco que el agente sabe, con el resto en blanco: su sugerencia sale de los puntajes, no de estas respuestas */
export function respuestasDelAgente(d: {
  nombre: string | null
  telefono: string | null
  animalId: string | null
  vivienda: string | null
}): NuevaSolicitudAdopcion['respuestas'] {
  const vivienda = VIVIENDAS.find((v) => d.vivienda?.toLowerCase().includes(v)) ?? 'otra'
  return {
    nombre: d.nombre?.trim() || 'Interesado del agente',
    telefono: d.telefono ?? '',
    cedula: '',
    direccion: '',
    animalId: d.animalId,
    familiaDeAcuerdo: false,
    paraQuien: 'yo',
    vivienda,
    viviendaConMallas: false,
    dondeVivira: 'dentro_casa',
    aceptaEsterilizar: false,
    aceptaVacunar: false,
    aceptaSeguimiento: false,
    quiereEntregaInmediata: false,
    preguntoPorCaracter: true,
    planEmergencia: '',
    mascotasAnteriores: '',
    motivo: '',
  }
}

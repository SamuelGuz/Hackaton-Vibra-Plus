// Copia de shared/src/adopcion/clasificar.ts. Si shared cambia, se copia de nuevo aquí.
// Clasificación de solicitudes de adopción (PLAN_INTEGRADO §5). Puro: sin IA y sin E/S.
// Regla de oro: el sistema jamás decide una adopción. Esto solo sugiere un montón y dice por qué.
import type { Clasificacion, DiaSeguimiento, Monton, Seguimiento, Solicitud } from './tipos.js'

const ORDEN_MONTON: Record<Monton, number> = { verde: 0, amarillo: 1, rojo: 2 }

/** Días después de la entrega en que se llama al adoptante */
const DIAS_SEGUIMIENTO: readonly DiaSeguimiento[] = [2, 5, 15, 30, 90]

/** Respuestas de hasta esta cantidad de palabras que empiezan como una evasiva se tratan como evasivas */
const PALABRAS_MAX_EVASIVA = 8

const EVASIVAS_AL_INICIO =
  /^(no se|ya veremos|ya se vera|despues vemos|ahi veremos|nada|ninguno|ninguna|no lo he pensado|no he pensado|no tengo|no hay|no aplica|n\/a)\b/
const EVASIVAS_EN_CUALQUIER_LADO = /\b(eso no pasa|no va a pasar|no creo que pase)\b/

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Plan de emergencia vacío o de esquiva ("no sé", "ya veremos", "eso no pasa") */
function esEvasivo(planEmergencia: string): boolean {
  const texto = normalizar(planEmergencia)
  if (texto === '') return true
  const palabras = texto.split(/\s+/).length
  if (palabras > PALABRAS_MAX_EVASIVA) return false
  return EVASIVAS_AL_INICIO.test(texto) || EVASIVAS_EN_CUALQUIER_LADO.test(texto)
}

function unir(frases: string[]): string {
  if (frases.length <= 1) return frases[0] ?? ''
  return `${frases.slice(0, -1).join(', ')} y ${frases[frases.length - 1]}`
}

/** Razones de 🔴, en el orden en que se dicen. Cada una es una frase corta. */
function razonesRojas(s: Solicitud): string[] {
  const razones: string[] = []
  if (s.paraQuien === 'regalo') {
    const para = s.destinatario?.trim()
    razones.push(`Dice que es un regalo para ${para ? para : 'otra persona'}`)
  }
  if (s.dondeVivira === 'guardia') razones.push('Lo quiere de perro de guardia')
  if (s.dondeVivira === 'amarrado') razones.push('Lo quiere amarrado')
  if (s.dondeVivira === 'azotea') razones.push('Lo dejaría en la azotea')
  if (!s.aceptaEsterilizar && !s.aceptaVacunar) razones.push('No acepta esterilizar ni vacunar')
  else if (!s.aceptaEsterilizar) razones.push('No acepta esterilizar')
  else if (!s.aceptaVacunar) razones.push('No acepta vacunar')
  if (!s.aceptaSeguimiento) razones.push('No acepta que le hagamos seguimiento después de la adopción')
  return razones
}

/** Señales de 🟡 (devolución) como complementos de una sola frase: "tiene afán…, fue evasivo… y no preguntó…" */
function senalesAmarillas(s: Solicitud): string[] {
  const senales: string[] = []
  if (s.quiereEntregaInmediata) senales.push('tiene afán por llevárselo ya')
  if (esEvasivo(s.planEmergencia)) senales.push('fue evasivo con el plan de emergencia')
  if (!s.preguntoPorCaracter) senales.push('no preguntó por el carácter ni la rutina')
  return senales
}

function mayuscula(frase: string): string {
  return frase.charAt(0).toUpperCase() + frase.slice(1)
}

/** Cuántas señales de alerta tiene (rojas, amarillas y familia en desacuerdo). Menos es mejor. */
function cantidadDeSenales(s: Solicitud): number {
  return razonesRojas(s).length + senalesAmarillas(s).length + (s.familiaDeAcuerdo ? 0 : 1)
}

/** Montón sugerido y la razón en una frase (S39). No mira `montonManual`: la sugerencia sigue visible. */
export function clasificar(s: Solicitud): Clasificacion {
  const rojas = razonesRojas(s)
  if (rojas.length > 0) return { monton: 'rojo', razon: rojas[0]! }

  const amarillas = senalesAmarillas(s)
  if (amarillas.length > 0) return { monton: 'amarillo', razon: mayuscula(unir(amarillas)) }

  if (!s.familiaDeAcuerdo) return { monton: 'amarillo', razon: 'No toda la familia está de acuerdo' }

  return { monton: 'verde', razon: 'Toda la familia está de acuerdo y aceptó esterilizar, vacunar y el seguimiento' }
}

/** El montón donde queda: el que puso la coordinadora, o la sugerencia (S38: nada se descarta para siempre) */
export function montonFinal(s: Solicitud): Monton {
  return s.montonManual ?? clasificar(s).monton
}

/** Por calidad, no por llegada: verde primero, luego menos señales de alerta y, a igual calidad, la más antigua */
export function ordenarPorCalidad(solicitudes: readonly Solicitud[]): Solicitud[] {
  const clave = solicitudes.map((s) => ({ s, monton: ORDEN_MONTON[montonFinal(s)], senales: cantidadDeSenales(s) }))
  clave.sort(
    (a, b) =>
      a.monton - b.monton ||
      a.senales - b.senales ||
      a.s.fecha.localeCompare(b.s.fecha),
  )
  return clave.map((c) => c.s)
}

/** YYYY-MM-DD + días, en UTC para que la zona horaria no mueva la fecha */
function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Los 5 seguimientos de una entrega: días 2, 5, 15, 30 y 90 (S41). Nacen pendientes. */
export function programarSeguimientos(
  solicitudId: string | null,
  adoptante: { nombre: string; telefono: string },
  animalId: string,
  fechaEntrega: string,
): Seguimiento[] {
  return DIAS_SEGUIMIENTO.map((dia) => ({
    id: `seg-${solicitudId ?? animalId}-${fechaEntrega}-d${dia}`,
    solicitudId,
    adoptanteNombre: adoptante.nombre,
    adoptanteTelefono: adoptante.telefono,
    animalId,
    fechaEntrega,
    dia,
    fecha: sumarDias(fechaEntrega, dia),
    resultado: null,
    llamadaHumana: false,
    nota: '',
  }))
}

/** "Hoy toca llamar a…": los pendientes cuya fecha ya llegó (o se pasó), del más atrasado al más nuevo */
export function seguimientosDeHoy(seguimientos: readonly Seguimiento[], fecha: string): Seguimiento[] {
  return seguimientos
    .filter((s) => s.resultado === null && s.fecha <= fecha)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.dia - b.dia)
}

/** Anota cómo salió la llamada. Amarillo y rojo exigen llamada humana (regla del cliente). */
export function registrarResultado(s: Seguimiento, resultado: Monton, nota?: string): Seguimiento {
  return { ...s, resultado, llamadaHumana: resultado !== 'verde', nota: nota ?? s.nota }
}

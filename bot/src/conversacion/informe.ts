// Informes con gráficas: se arman como hoja HTML, se dibujan como imagen y se mandan por el chat.
import { veAdoptantes } from '../adopcion/seguimientos.js'
import type { SolicitudGuardada } from '../adopcion/solicitudes.js'
import { diasDeComida, dosisDeHoy, vacunasPorVencer } from '../datos/calculos.js'
import { diasHablados, fechaLocal, horaBonita } from '../formato.js'
import {
  armarInforme,
  armarInformeMatutino,
  informeDePlata,
  NOMBRE_INFORME,
  TIPOS_INFORME,
  type Cita,
  type TipoInforme,
} from '../informes/armar.js'
import type { DatosAlbergue } from '../panel-tipos.js'
import { textos } from '../textos.js'
import type { Deps, Estado, Salida } from '../tipos.js'
import { preguntarAlgoMas } from './confirmar.js'
import { puedeVerPlata, type Ctx } from './ctx.js'
import { sinTildes } from './numeros.js'
import { listaParaHoy } from './recordatorios.js'
import { botonesDeSeguimiento, listaDeHoy, pendientes as pendientesSeguimiento } from './seguimientos.js'

const DESCRIPCION: Record<TipoInforme, string> = {
  general: 'Todo en una sola hoja',
  plata: 'Caja, gastos e ingresos de la semana',
  comida: 'Cuántos días alcanza y bultos abiertos',
  medicinas: 'Dadas, pendientes y atrasadas',
  animales: 'Cuántos hay y cómo están',
}

const PIDE_INFORME = /\b(informe|reporte|grafic[ao]s?|estadisticas?|balance|como vamos|como va(n|mos)? (la|el|los|las)|mandame (el|un) resumen)\b/

const TEMAS: [RegExp, TipoInforme][] = [
  [/\b(plata|caja|gastos?|ingresos?|donaciones|cuentas|finanzas|deudas?|platica)\b/, 'plata'],
  [/\b(comida|bultos?|concentrado|purina|alimento)\b/, 'comida'],
  [/\b(medicinas?|medicamentos?|dosis|tratamientos?)\b/, 'medicinas'],
  [/\b(animales|perros|gatos|peludos|adopciones|adoptados)\b/, 'animales'],
]

/** Si el texto pide un informe, dice cuál. Si no, null. */
export function informePedido(texto: string): TipoInforme | null {
  const t = sinTildes(texto.toLowerCase())
  if (!PIDE_INFORME.test(t)) return null
  return TEMAS.find(([re]) => re.test(t))?.[1] ?? 'general'
}

export async function elegirInforme(c: Ctx): Promise<Estado> {
  const filas = TIPOS_INFORME.filter((t) => !informeDePlata(t) || puedeVerPlata(c)).map((t) => ({
    id: `i:${t}`,
    titulo: NOMBRE_INFORME[t],
    descripcion: DESCRIPCION[t],
  }))
  await c.enviar({ tipo: 'lista', texto: textos.informeCual, boton: textos.informeBoton, filas })
  return { paso: 'menu' }
}

export async function enviarInforme(c: Ctx, tipo: string): Promise<Estado> {
  if (!(TIPOS_INFORME as readonly string[]).includes(tipo)) return elegirInforme(c)
  const t = tipo as TipoInforme
  if (informeDePlata(t) && !puedeVerPlata(c)) return preguntarAlgoMas(c, textos.informeSinPlata)

  await c.enviar({ tipo: 'texto', texto: textos.informePreparando })
  let png: Buffer
  try {
    png = await c.deps.dibujar(armarInforme(t, await c.datos(), c.ahora, puedeVerPlata(c)))
  } catch (err) {
    console.error(`No se pudo dibujar el informe ${t}:`, err)
    return preguntarAlgoMas(c, textos.informeFallo)
  }
  await c.enviar({ tipo: 'imagen', png, texto: `${NOMBRE_INFORME[t]} · Refugio Yesenia` })
  return preguntarAlgoMas(c, textos.informeOtro)
}

// ---------- Resumen de la mañana: lo manda el despertador (scheduler.ts) sin que nadie lo pida ----------

/** "2026-10-27T20:00:00.000Z" → "15:00" en hora de Colombia */
const horaLocal = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** Visitas propuestas y llamadas agendadas para hoy, en orden de hora */
export function citasDeHoy(solicitudes: readonly SolicitudGuardada[], d: DatosAlbergue, ahora: Date, conNombre: boolean): Cita[] {
  const hoy = fechaLocal(ahora)
  const animal = (id: string | null) => d.animales.find((a) => a.id === id)?.nombre ?? null
  const quien = (nombre: string) => (conNombre ? nombre.trim().split(/\s+/)[0] || 'Un interesado' : 'Un interesado')
  const citas: Cita[] = []
  for (const s of solicitudes) {
    for (const [tipo, cuando] of [['visita', s.visitaPropuesta], ['llamada', s.llamadaAgendada]] as const) {
      if (!cuando) continue
      const fecha = new Date(cuando)
      if (Number.isNaN(fecha.getTime()) || fechaLocal(fecha) !== hoy) continue
      citas.push({ hora: horaLocal(fecha), tipo, quien: quien(s.nombre), animal: animal(s.animalId) })
    }
  }
  return citas.sort((a, b) => a.hora.localeCompare(b.hora))
}

/** Lo del día en texto, por si la imagen no se pudo dibujar */
function textoDelDia(d: DatosAlbergue, ahora: Date, citas: Cita[]): string {
  const faltan = dosisDeHoy(d, ahora).filter((x) => x.estado !== 'dada').length
  const comida = (['perro', 'gato'] as const)
    .map((e) => ({ e, dias: diasDeComida(d, e) }))
    .filter((x) => Number.isFinite(x.dias))
    .map(({ e, dias }) => `${e} ${diasHablados(dias)}`)
  const lineas = [`💊 Medicinas de hoy: ${faltan}`]
  if (comida.length) lineas.push(`🍖 Comida: ${comida.join(' · ')}`)
  for (const c of citas) lineas.push(`📅 ${horaBonita(c.hora)} · ${c.tipo === 'visita' ? 'Visita de' : 'Llamar a'} ${c.quien}${c.animal ? ` por ${c.animal}` : ''}`)
  return lineas.join('\n')
}

/**
 * Manda a ese teléfono la foto con lo del día (medicinas, comida, vacunas, visitas y seguimientos),
 * la alerta de vacunas y un mensaje con botones por cada seguimiento. false si el número no es del equipo.
 * Fuera de la ventana de 24 h de WhatsApp, Meta rechaza el envío: el error sube a quien llama.
 */
export async function enviarResumenMatutino(deps: Deps, telefono: string): Promise<boolean> {
  const usuario = await deps.repo.usuarioPorTelefono(telefono)
  if (!usuario) return false
  const ahora = deps.ahora()
  const enviar = (s: Salida) => deps.wa.enviar(usuario.telefono, s)
  const [d, seguimientos, solicitudes] = await Promise.all([
    deps.repo.hoy(ahora),
    pendientesSeguimiento(deps, ahora),
    deps.repo.solicitudesAdopcion(),
  ])
  const citas = citasDeHoy(solicitudes, d, ahora, veAdoptantes(usuario.rol))
  const hoy = fechaLocal(ahora)
  const extras = {
    citas,
    seguimientos: seguimientos.map((s) => ({ animal: s.animalNombre, dia: s.dia, atrasado: s.fecha < hoy })),
  }
  const saludo = textos.buenosDias(usuario.nombre)
  // Sin navegador para dibujar, lo mismo va por escrito. Un error de WhatsApp sí sube a quien llama.
  const png = await deps.dibujar(armarInformeMatutino(d, ahora, extras)).catch((err) => {
    console.error('No se pudo dibujar el resumen de la mañana:', err)
    return null
  })
  if (png) await enviar({ tipo: 'imagen', png, texto: saludo })
  else await enviar({ tipo: 'texto', texto: `${saludo}\n\n${textoDelDia(d, ahora, citas)}` })

  // Lo que toca hacer hoy, como lista para leer de una
  await enviar({ tipo: 'texto', texto: listaParaHoy(d, ahora) })

  const vacunas = vacunasPorVencer(d, ahora)
  if (vacunas.length) {
    const lineas = vacunas.map((v) => `• ${v.animal} · ${v.vacuna} · ${v.vencida ? 'venció' : 'vence'} el ${diaDelMes(v.vence)}`)
    await enviar({ tipo: 'texto', texto: `${textos.vacunasTitulo}\n${lineas.join('\n')}` })
  }
  const llamadas = listaDeHoy(seguimientos, ahora, usuario.rol)
  if (llamadas) {
    await enviar({ tipo: 'texto', texto: `${llamadas}\n\n${textos.seguimientosToca}` })
    for (const s of botonesDeSeguimiento(seguimientos)) await enviar(s)
  }
  return true
}

/** "2026-10-30" → "30 de octubre" */
const diaDelMes = (fecha: string) => new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })

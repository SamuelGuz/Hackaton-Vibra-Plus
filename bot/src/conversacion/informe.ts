// Informes con gráficas: se arman como hoja HTML, se dibujan como imagen y se mandan por el chat.
import { armarInforme, informeDePlata, NOMBRE_INFORME, TIPOS_INFORME, type TipoInforme } from '../informes/armar.js'
import { textos } from '../textos.js'
import type { Estado } from '../tipos.js'
import { preguntarAlgoMas } from './confirmar.js'
import { puedeVerPlata, type Ctx } from './ctx.js'
import { sinTildes } from './numeros.js'

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

// "Le di una medicina": se elige la dosis de una lista, sin escribir nombres.
import { horaBonita, horaDe } from '../formato.js'
import type { DatosAlbergue } from '../panel-tipos.js'
import { botones, textos } from '../textos.js'
import type { Accion, Estado, Fila } from '../tipos.js'
import { dosisDeHoy } from '../datos/calculos.js'
import { buscarAnimal } from './animal.js'
import type { Ctx } from './ctx.js'
import { guardarYPreguntar, preguntarAlgoMas } from './confirmar.js'
import { esNo, esSi, normal } from './elegir.js'
import { unoALaVez } from './candado.js'

const MAX_FILAS = 9

type Dosis = ReturnType<typeof dosisDeHoy>[number]

function pendientesDeHoy(d: DatosAlbergue, ahora: Date): Dosis[] {
  return (
    dosisDeHoy(d, ahora)
      .filter((x) => x.estado !== 'dada' && !x.reporte)
      // Las atrasadas primero: son las que más importan
      .sort((a, b) => Number(b.estado === 'atrasada') - Number(a.estado === 'atrasada') || a.hora.localeCompare(b.hora))
  )
}

/** Las dosis que nombra el texto, por el animal ("Mateo", "Tobi") o por la medicina ("el fenobarbital") */
function dosisQueNombra(d: DatosAlbergue, pendientes: Dosis[], texto: string): Dosis[] {
  const animales = new Set(buscarAnimal(d, texto).map((a) => a.id))
  const t = ` ${normal(texto)} `
  const nombraMedicina = (x: Dosis) => normal(x.tratamiento.medicamento).split(' ').some((p) => p.length >= 4 && t.includes(p))
  const delAnimal = pendientes.filter((x) => animales.has(x.tratamiento.animalId))
  if (delAnimal.length === 0) return pendientes.filter(nombraMedicina)
  const ademasMedicina = delAnimal.filter(nombraMedicina)
  return ademasMedicina.length ? ademasMedicina : delAnimal
}

/** Lista de dosis pendientes. Con `pista` (lo que se escribió o dijo), solo las que nombra; si es una sola, la elige. */
export async function empezarMedicina(c: Ctx, pista?: string): Promise<Estado> {
  const d = await c.datos()
  const pendientes = pendientesDeHoy(d, c.ahora)
  if (pendientes.length === 0) return preguntarAlgoMas(c, textos.medicinaNinguna)
  const nombradas = pista ? dosisQueNombra(d, pendientes, pista) : []
  if (nombradas.length === 1) return elegirDosis(c, idDosis(nombradas[0]))
  return mostrarDosis(c, d, nombradas.length ? nombradas : pendientes)
}

/** Lo que se escribió o dijo en el paso "¿a quién le diste?". Null si no nombra ninguna dosis pendiente. */
export async function dosisEscrita(c: Ctx, texto: string): Promise<Estado | null> {
  const d = await c.datos()
  const nombradas = dosisQueNombra(d, pendientesDeHoy(d, c.ahora), texto)
  if (nombradas.length === 0) return null
  if (nombradas.length === 1) return elegirDosis(c, idDosis(nombradas[0]))
  return mostrarDosis(c, d, nombradas)
}

const idDosis = (x: Dosis) => `d:${x.tratamiento.id}:${x.hora}`

async function mostrarDosis(c: Ctx, d: DatosAlbergue, pendientes: Dosis[]): Promise<Estado> {
  const nombre = (id: string) => d.animales.find((a) => a.id === id)?.nombre ?? '?'
  const filas: Fila[] = pendientes.slice(0, MAX_FILAS).map((x) => ({
    id: idDosis(x),
    titulo: `${nombre(x.tratamiento.animalId)} · ${horaBonita(x.hora)}`,
    descripcion: `${x.tratamiento.medicamento} · ${x.tratamiento.dosis}${x.estado === 'atrasada' ? ' · ¡atrasada!' : ''}`,
  }))
  filas.push({ id: 'd:otra', titulo: 'Otra medicina', descripcion: 'No está en la lista' })
  await c.enviar({ tipo: 'lista', texto: textos.medicinaElegir, boton: textos.medicinaBoton, filas })
  return { paso: 'medicina' }
}

/** Quién y a qué hora ya reportó esa dosis hoy, o null si nadie. */
export function yaReportada(d: DatosAlbergue, tratamientoId: string, hora: string, ahora: Date) {
  const x = dosisDeHoy(d, ahora).find((y) => y.tratamiento.id === tratamientoId && y.hora === hora)
  if (!x) return null
  const quien = (id: string) => d.personas.find((p) => p.id === id)?.nombre ?? 'alguien del equipo'
  if (x.dada) return { quien: quien(x.dada.quien), hora: horaDe(x.dada.fechaHora) }
  if (x.reporte) return { quien: quien(x.reporte.quien), hora: horaDe(x.reporte.fechaHora) }
  return null
}

export async function elegirDosis(c: Ctx, id: string): Promise<Estado> {
  if (id === 'd:otra') {
    await c.enviar({ tipo: 'texto', texto: textos.medicinaOtra })
    return { paso: 'menu' }
  }
  // id = 'd:<tratamiento>:<HH:MM>'
  const [, tratamientoId = '', hora = ''] = /^d:([^:]+):(\d{2}:\d{2})$/.exec(id) ?? []
  // Revisar y guardar de a uno: si dos personas tocan la misma dosis al tiempo, la segunda ve la primera
  return unoALaVez(async () => {
    const d = await c.datos(true)
    const t = d.tratamientos.find((x) => x.id === tratamientoId)
    if (!t || !t.horas.includes(hora)) return preguntarAlgoMas(c, textos.seMePerdio)

    const previa = yaReportada(d, t.id, hora, c.ahora)
    if (previa) {
      await c.enviar({
        tipo: 'botones',
        texto: textos.dosisDuplicada(previa.quien, previa.hora),
        botones: [
          { id: 'dup:si', titulo: 'Sí, es otra' },
          { id: 'dup:no', titulo: 'No, ya está' },
        ],
      })
      return { paso: 'medicina_duplicada' }
    }

    const accion: Accion = { tipo: 'dosis', animalId: t.animalId, tratamientoId: t.id, hora }
    return guardarYPreguntar(c, { acciones: [accion], tipoEntrada: 'boton' })
  })
}

/** "Sí, es otra" / "No, ya está" escrito o dicho. Null si no es ni sí ni no. */
export function duplicadaEscrita(c: Ctx, texto: string): Promise<Estado> | null {
  if (esNo(texto)) return responderDuplicada(c, 'dup:no')
  if (esSi(texto) || /\botra\b/.test(normal(texto))) return responderDuplicada(c, 'dup:si')
  return null
}

export async function responderDuplicada(c: Ctx, id: string): Promise<Estado> {
  if (id === 'dup:si') {
    await c.enviar({ tipo: 'texto', texto: textos.medicinaOtra })
    return { paso: 'menu' }
  }
  await c.enviar({ tipo: 'botones', texto: textos.dosisNoRepito, botones: [botones.menu, botones.fin] })
  return { paso: 'menu' }
}

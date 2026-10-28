// "Le di una medicina": se elige la dosis de una lista, sin escribir nombres.
import { horaBonita, horaDe } from '../formato.js'
import type { DatosAlbergue } from '../panel-tipos.js'
import { botones, textos } from '../textos.js'
import type { Accion, Estado, Fila } from '../tipos.js'
import { dosisDeHoy } from '../datos/calculos.js'
import type { Ctx } from './ctx.js'
import { guardarYPreguntar, preguntarAlgoMas } from './confirmar.js'

const MAX_FILAS = 9

export async function empezarMedicina(c: Ctx): Promise<Estado> {
  const d = await c.datos()
  const nombre = (id: string) => d.animales.find((a) => a.id === id)?.nombre ?? '?'
  const pendientes = dosisDeHoy(d, c.ahora)
    .filter((x) => x.estado !== 'dada' && !x.reporte)
    // Las atrasadas primero: son las que más importan
    .sort((a, b) => Number(b.estado === 'atrasada') - Number(a.estado === 'atrasada') || a.hora.localeCompare(b.hora))

  if (pendientes.length === 0) return preguntarAlgoMas(c, textos.medicinaNinguna)

  const filas: Fila[] = pendientes.slice(0, MAX_FILAS).map((x) => ({
    id: `d:${x.tratamiento.id}:${x.hora}`,
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
  const d = await c.datos()
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
}

export async function responderDuplicada(c: Ctx, id: string): Promise<Estado> {
  if (id === 'dup:si') {
    await c.enviar({ tipo: 'texto', texto: textos.medicinaOtra })
    return { paso: 'menu' }
  }
  await c.enviar({ tipo: 'botones', texto: textos.dosisNoRepito, botones: [botones.menu, botones.fin] })
  return { paso: 'menu' }
}

// Audio, foto o texto libre: la IA saca las acciones, se guardan por confirmar y se pregunta "¿Está bien?".
import { textos } from '../textos.js'
import type { Accion, Entendido, Estado, NuevoRegistro } from '../tipos.js'
import type { Ctx } from './ctx.js'
import { guardarYPreguntar } from './confirmar.js'
import { enviarInforme } from './informe.js'
import { bajarYGuardar, entenderSeguro } from './medios.js'
import { yaReportada } from './medicina.js'
import { mostrarMenu } from './menu.js'

/** Quita las dosis que alguien ya reportó hoy y las repetidas dentro del mismo mensaje. */
export async function sinDosisRepetidas(c: Ctx, acciones: Accion[]): Promise<{ acciones: Accion[]; avisos: string[] }> {
  const d = await c.datos()
  const vistas = new Set<string>()
  const avisos: string[] = []
  const quedan: Accion[] = []
  for (const a of acciones) {
    if (a.tipo !== 'dosis') {
      quedan.push(a)
      continue
    }
    const clave = `${a.tratamientoId}/${a.hora}`
    if (vistas.has(clave)) continue
    vistas.add(clave)
    const previa = yaReportada(d, a.tratamientoId, a.hora, c.ahora)
    if (previa) {
      const animal = d.animales.find((x) => x.id === a.animalId)?.nombre ?? 'el animal'
      avisos.push(textos.dosisOmitida(animal, a.hora, previa.quien, previa.hora))
      continue
    }
    quedan.push(a)
  }
  return { acciones: quedan, avisos }
}

export async function registrarEntendido(
  c: Ctx,
  e: Entendido | null,
  origen: { tipoEntrada: NuevoRegistro['tipoEntrada']; mediaUrl?: string | null },
): Promise<Estado> {
  if (!e) return mostrarMenu(c, textos.noEntendi)
  const { acciones, avisos } = await sinDosisRepetidas(c, e.acciones)
  if (acciones.length === 0) {
    if (e.informe && !avisos.length) return enviarInforme(c, e.informe)
    if (avisos.length) return mostrarMenu(c, avisos.join('\n'))
    return mostrarMenu(c, e.futuras > 0 ? textos.futura : textos.noEntendi)
  }
  return guardarYPreguntar(c, {
    acciones,
    avisos,
    tipoEntrada: origen.tipoEntrada,
    mediaUrl: origen.mediaUrl,
    transcripcion: e.transcripcion,
    confianza: e.confianza,
    mostrarEscuche: origen.tipoEntrada === 'audio',
  })
}

export async function libreTexto(c: Ctx, texto: string): Promise<Estado> {
  return registrarEntendido(c, await entenderSeguro(c, { texto, pista: 'libre' }), { tipoEntrada: 'texto' })
}

export async function libreMedia(c: Ctx, mediaId: string, tipo: 'audio' | 'imagen', texto?: string): Promise<Estado> {
  const m = await bajarYGuardar(c, mediaId)
  const e = await entenderSeguro(c, { media: { datos: m.datos, mime: m.mime }, texto, pista: 'libre' })
  return registrarEntendido(c, e, { tipoEntrada: tipo, mediaUrl: m.url })
}

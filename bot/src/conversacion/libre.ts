// Audio, foto o texto libre: la IA saca las acciones, se guardan por confirmar y se pregunta "¿Está bien?".
import { textos } from '../textos.js'
import type { Accion, Entendido, Estado, NuevoRegistro } from '../tipos.js'
import { esDePlata } from '../api/permisos.js'
import { unoALaVez } from './candado.js'
import { puedeManejarPlata, type Ctx } from './ctx.js'
import { guardarDirecto, guardarYPreguntar, preguntarAlgoMas } from './confirmar.js'
import { enviarInforme } from './informe.js'
import { bajarYGuardar, entenderSeguro } from './medios.js'
import { conKilos } from './kilos.js'
import { yaReportada } from './medicina.js'
import { mostrarMenu } from './menu.js'
import { opcionDelMenu, temaDeTexto } from './intencion.js'

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
  /** `escrito`: lo que la persona escribió, para buscar el tema si la IA no anotó nada */
  origen: { tipoEntrada: NuevoRegistro['tipoEntrada']; mediaUrl?: string | null; escrito?: string },
): Promise<Estado> {
  const esAudio = origen.tipoEntrada === 'audio'
  // Lo que no es un aviso de dosis repetida: se muestra, pero no frena el guardado de un audio clarito
  const notas: string[] = []
  // "20 kilos de carne" se lee del texto aunque la IA falle o lo tome por 20 bultos
  const dicho = origen.escrito ?? e?.transcripcion ?? ''
  const conKilosLeidos = conKilos(e?.acciones ?? [], dicho)
  if (!e && conKilosLeidos.length) {
    // Sin IA solo se rescataron los kilos: que no crea que se anotó todo lo demás
    e = { transcripcion: dicho, acciones: [], confianza: 0, futuras: 0 }
    notas.push(textos.soloRescateKilos)
  }
  if (e) e = { ...e, acciones: conKilosLeidos }
  if (!e) {
    // Sin IA igual se intenta con lo escrito
    const tema = origen.escrito ? temaDeTexto(origen.escrito) : null
    if (tema) return opcionDelMenu(c, tema, origen.escrito)
    return mostrarMenu(c, esAudio ? textos.noPudeEscuchar : textos.noEntendi)
  }
  // La plata la registra quien la maneja (la misma regla del panel): a un voluntario se le quita y se le avisa
  let deLaIa = e.acciones
  if (!puedeManejarPlata(c) && deLaIa.some(esDePlata)) {
    deLaIa = deLaIa.filter((a) => !esDePlata(a))
    notas.push(textos.noPuedePlata)
    if (deLaIa.length === 0) return preguntarAlgoMas(c, textos.noPuedePlata)
  }
  const entendido = e
  // Si además preguntó algo ("abrí un bulto, ¿cuánta comida queda?"), la respuesta va arriba de lo anotado
  const respuesta = entendido.respuesta?.trim() ?? ''
  if (respuesta) notas.unshift(`💬 ${respuesta}`)
  const porGuardar = {
    tipoEntrada: origen.tipoEntrada,
    mediaUrl: origen.mediaUrl,
    transcripcion: entendido.transcripcion,
    confianza: entendido.confianza,
    mostrarEscuche: esAudio,
  }

  // Revisar si alguien ya la reportó y guardar van juntos y de a uno: si dos personas mandan la misma dosis
  // al mismo tiempo, la segunda ya ve la primera
  const r = await unoALaVez(async (): Promise<{ estado: Estado } | { avisos: string[] }> => {
    await c.datos(true)
    const { acciones, avisos } = await sinDosisRepetidas(c, deLaIa)
    if (acciones.length === 0) return { avisos }
    // Audio clarito y sin dosis repetidas: lo del campo se guarda de una; la plata sigue esperando el "Sí"
    if (esAudio && entendido.confianza >= CONFIANZA_PARA_GUARDAR_SOLO && avisos.length === 0) {
      const directas = acciones.filter(seGuardaSola)
      const conPlata = acciones.filter((a) => !seGuardaSola(a))
      if (directas.length && !conPlata.length) return { estado: await guardarDirecto(c, { ...porGuardar, acciones: directas, avisos: notas }) }
      if (directas.length) {
        await guardarDirecto(c, { ...porGuardar, acciones: directas, avisos: notas })
        return { estado: await guardarYPreguntar(c, { ...porGuardar, acciones: conPlata, mostrarEscuche: false }) }
      }
    }
    return { estado: await guardarYPreguntar(c, { ...porGuardar, acciones, avisos: [...avisos, ...notas] }) }
  })
  if ('estado' in r) return r.estado

  const { avisos } = r
  if (entendido.informe && !avisos.length) return enviarInforme(c, entendido.informe)
  // Solo traía una dosis que ya dio otra persona: se frena y se pregunta, no se repite sola
  if (avisos.length) return preguntarSiEsOtra(c, avisos)
  // Preguntó, saludó o agradeció: se le contesta, sin "No te entendí" ni el menú completo
  if (respuesta) return preguntarAlgoMas(c, respuesta)
  if (entendido.futuras > 0) return mostrarMenu(c, textos.futura)
  return sinNadaQueAnotar(c, origen.escrito ?? entendido.transcripcion, esAudio)
}

/** Desde esta confianza un audio se guarda sin preguntar "¿Está bien?" */
export const CONFIANZA_PARA_GUARDAR_SOLO = 0.9

/** Dosis, comida y notas: lo que se hace con las manos ocupadas. Plata, facturas y cambios de estado siempre se confirman. */
const seGuardaSola = (a: Accion) => a.tipo === 'dosis' || a.tipo === 'inventario' || a.tipo === 'nota'

async function preguntarSiEsOtra(c: Ctx, avisos: string[]): Promise<Estado> {
  await c.enviar({
    tipo: 'botones',
    texto: `${avisos.join('\n')}\n\n${textos.esOtraDosis}`,
    botones: [
      { id: 'dup:si', titulo: 'Sí, es otra' },
      { id: 'dup:no', titulo: 'No, ya está' },
    ],
  })
  return { paso: 'medicina_duplicada' }
}

/**
 * La IA entendió las palabras pero no hay nada que anotar ("le di una medicina a un perro": ¿a cuál?).
 * En vez de "no te entendí": se muestra lo que escuchó y se abre el camino del tema, o el menú si no hay tema.
 */
async function sinNadaQueAnotar(c: Ctx, dicho: string, esAudio: boolean): Promise<Estado> {
  const t = dicho.trim()
  const escuche = esAudio && t ? textos.escuche(t) : null
  const tema = t ? temaDeTexto(t) : null
  if (tema) {
    if (escuche) await c.enviar({ tipo: 'texto', texto: escuche })
    return opcionDelMenu(c, tema, t)
  }
  return mostrarMenu(c, escuche ? `${escuche}\n\n${textos.noSupeQueAnotar}` : textos.noEntendi)
}

export async function libreTexto(c: Ctx, texto: string): Promise<Estado> {
  return registrarEntendido(c, await entenderSeguro(c, { texto, pista: 'libre' }), { tipoEntrada: 'texto', escrito: texto })
}

export async function libreMedia(c: Ctx, mediaId: string, tipo: 'audio' | 'imagen', texto?: string): Promise<Estado> {
  const m = await bajarYGuardar(c, mediaId)
  const e = await entenderSeguro(c, { media: { datos: m.datos, mime: m.mime }, texto, pista: 'libre' })
  return registrarEntendido(c, e, { tipoEntrada: tipo, mediaUrl: m.url })
}

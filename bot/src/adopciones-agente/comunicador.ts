import type { ContextoExterno } from '../rag/tipos.js'
import type { Deps, Salida } from '../tipos.js'
import { pausaParaEscribir } from './humano.js'

/** Normalización del canal público; los mensajes internos nunca pasan por aquí */
export function textoPublico(texto: string): string {
  let emojis = 0
  return texto.replace(/\*\*([^*]+)\*\*|\*([^*\n]+)\*/g, (_, doble, simple) => doble ?? simple)
    .replace(/`([^`]+)`/g, '$1').replace(/^\s*(?:[-•]|#{1,6})\s*/gm, '')
    .replace(/^(?:¡?Claro!?|Por supuesto|Excelente pregunta|Gracias por contactarnos)[,!.:\s]*/i, '')
    .replace(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu, x => ++emojis <= 1 ? x : '')
    .replace(/\n+/g, ' ').replace(/ +/g, ' ').trim().replace(/[.]+$/, '')
}

/** Divide por frases completas; nunca recorta advertencias o datos para cumplir un largo */
export function fragmentarRespuesta(texto: string): string[] {
  const frases = texto.trim().split(/(?<=[.!?])\s+(?=[¿¡A-ZÁÉÍÓÚÑ])/u)
  const salidas: string[] = []
  let grupo: string[] = []
  for (const frase of frases) {
    if (frase.length > 600) throw new Error('Frase pública demasiado extensa; necesita una nueva redacción')
    const dosPreguntas = frase.includes('?') && grupo.some(f => f.includes('?'))
    if (grupo.length && (grupo.length === 3 || dosPreguntas || [...grupo, frase].join(' ').length > 600)) {
      salidas.push(grupo.join(' ')); grupo = []
    }
    grupo.push(frase)
  }
  if (grupo.length) salidas.push(grupo.join(' '))
  if (salidas.length > 3) throw new Error('Respuesta pública demasiado extensa; necesita una nueva redacción')
  return salidas
}

interface Entrega { salidas: Salida[]; siguiente: number; preparada: boolean; ultimoUso: number }
interface Buzon { entregas: Map<string, Entrega>; cola: Promise<void> }
const buzones = new WeakMap<Deps, Map<string, Buzon>>()
const TTL = 6 * 3_600_000

/** Cola por contacto y cursor por mensaje entrante. Un transporte rechazado siempre llega al webhook */
export function comunicar(deps: Deps, telefono: string, ctx: ContextoExterno, mensajeId: string | undefined,
  preparar: (enviar: (s: Salida) => Promise<void>) => Promise<void>): Promise<void> {
  let contactos = buzones.get(deps)
  if (!contactos) { contactos = new Map(); buzones.set(deps, contactos) }
  let buzon = contactos.get(telefono)
  if (!buzon) { buzon = { entregas: new Map(), cola: Promise.resolve() }; contactos.set(telefono, buzon) }
  const b = buzon
  const turno = b.cola.then(async () => {
    const ahora = deps.ahora().getTime()
    for (const [id, e] of b.entregas) if (e.preparada && e.siguiente === e.salidas.length && ahora - e.ultimoUso > TTL) b.entregas.delete(id)
    let entrega = mensajeId ? b.entregas.get(mensajeId) : undefined
    if (!entrega) {
      entrega = { salidas: [], siguiente: 0, preparada: false, ultimoUso: ahora }
      if (mensajeId) b.entregas.set(mensajeId, entrega)
      const e = entrega
      try {
        await preparar(async s => { e.salidas.push({ ...s, texto: textoPublico(s.texto) }) })
        e.preparada = true
      } catch (error) { if (mensajeId) b.entregas.delete(mensajeId); throw error }
    }
    entrega.ultimoUso = ahora
    while (entrega.siguiente < entrega.salidas.length) {
      const s = entrega.salidas[entrega.siguiente]
      const inicio = deps.ahora().getTime()
      if (mensajeId && deps.wa.escribiendo) await deps.wa.escribiendo(mensajeId).catch(e => console.error('No se pudo solicitar typing público:', e))
      if (ctx.pausaHumana) await ctx.pausaHumana(pausaParaEscribir(s.texto, deps.ahora().getTime() - inicio))
      await deps.wa.enviar(telefono, s)
      entrega.siguiente++
    }
    // El cursor vacío conserva deduplicación sin retener PNG completos durante seis horas.
    entrega.salidas = []
    entrega.siguiente = 0
  })
  b.cola = turno.catch(() => {})
  return turno
}

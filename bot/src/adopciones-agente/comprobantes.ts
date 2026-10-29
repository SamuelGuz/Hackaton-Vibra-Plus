// Comprobantes de donación que manda alguien de afuera: se leen con la IA, se le agradecen a la persona
// y a la administración le llega la foto con "¿Te llegó?". "Sí" lo registra como ingreso; "No" lo anula
// (conversacion/comprobante.ts). La plata la confirma siempre una persona: la IA solo lee.
import { Type, type Schema } from '@google/genai'
import { pesos } from '../formato.js'
import type { Entrada } from '../tipos.js'
import { avisarDonacion } from '../api/donaciones.js'
import { buscarAdministradoras } from './avisos.js'
import type { Recepcion } from './recepcion.js'
import { telefonoBonito, textosAgente } from './textos.js'

const ESPERA_MAXIMA_MS = 25_000

export const ESQUEMA_COMPROBANTE: Schema = {
  type: Type.OBJECT,
  properties: {
    es_comprobante: { type: Type.BOOLEAN, description: 'true si es el comprobante de un pago, transferencia o consignación' },
    monto: { type: Type.NUMBER, description: 'Pesos colombianos enteros: "$ 1.000,00" = 1000. 0 si no se ve' },
    fecha: { type: Type.STRING, description: 'Fecha y hora tal como aparecen, o vacío' },
    referencia: { type: Type.STRING, description: 'Referencia, número de aprobación o de comprobante, o vacío' },
    medio: { type: Type.STRING, description: 'Nequi, Daviplata, Bancolombia, Bre-B, consignación… o vacío' },
    descripcion: { type: Type.STRING, description: 'Qué se ve en la imagen, en una frase' },
  },
  required: ['es_comprobante', 'monto', 'fecha', 'referencia', 'medio', 'descripcion'],
}

const SISTEMA =
  'Miras una imagen que alguien le mandó por WhatsApp a una fundación de animales en Colombia. ' +
  'Di si es el comprobante de un pago o una transferencia (Nequi, Daviplata, Bancolombia, Bre-B, consignación). ' +
  'Si lo es, copia el monto, la fecha, la referencia y el medio tal como aparecen. Si un dato no se ve, déjalo vacío. Nunca inventes datos.'

/** Si el texto que acompaña la foto habla de plata, la foto se lee como comprobante; si no, es una pregunta para la IA */
const HABLA_DE_PAGO = /\b(pag\w*|don[eéoa]\w*|transfer\w*|consign\w*|nequi|daviplata|bancolombia|comprobante|soporte|recibo|aport\w*|envi[eé]|mand[eé]|bre-?b|llave|plata|dinero|plat[ií]ca)\b/i

interface Lectura {
  esComprobante: boolean
  monto: number | null
  fecha: string
  referencia: string
  medio: string
}

function texto(v: unknown, max = 80): string {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

/** Valida lo que leyó la IA: un monto que no es un entero positivo razonable no cuenta */
export function leerRespuesta(crudo: unknown): Lectura | null {
  if (!crudo || typeof crudo !== 'object') return null
  const o = crudo as Record<string, unknown>
  const monto = typeof o.monto === 'number' && Number.isFinite(o.monto) ? Math.round(o.monto) : NaN
  return {
    esComprobante: o.es_comprobante === true,
    monto: monto > 0 && monto < 1_000_000_000 ? monto : null,
    fecha: texto(o.fecha),
    referencia: texto(o.referencia, 40),
    medio: texto(o.medio, 40),
  }
}

function conTiempoLimite<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const t = setTimeout(() => rechazar(new Error(`La IA no leyó la foto en ${ms / 1000} s`)), ms)
    p.then(
      (v) => (clearTimeout(t), resolver(v)),
      (e) => (clearTimeout(t), rechazar(e)),
    )
  })
}

/**
 * Una foto que manda alguien de afuera. Con un texto que no habla de pagos, el texto va a la IA como pregunta
 * (`comoPregunta`). Si no, se lee como posible comprobante.
 */
export async function atenderFoto(
  r: Recepcion,
  entrada: Extract<Entrada, { tipo: 'imagen' }>,
  comoPregunta: (texto: string) => Promise<void>,
): Promise<void> {
  const pie = entrada.texto?.trim()
  if (pie && !HABLA_DE_PAGO.test(pie)) return comoPregunta(pie)

  let foto: { datos: Buffer; mime: string }
  try {
    foto = await r.deps.wa.descargar(entrada.mediaId)
  } catch (e) {
    console.error('No se pudo descargar la foto de alguien de afuera:', e instanceof Error ? e.message : e)
    return r.enviar({ tipo: 'texto', texto: textosAgente.fotoNoLlego })
  }
  const mime = (foto.mime || entrada.mime).split(';')[0].trim() || 'image/jpeg'
  const url = await r.deps.archivos.guardar(foto.datos, mime)

  let lectura: Lectura | null = null
  try {
    lectura = leerRespuesta(
      await conTiempoLimite(
        r.ctx.llm.json<unknown>({
          sistema: SISTEMA,
          mensajes: [{ rol: 'user', texto: pie ? `Mensaje que vino con la foto: ${pie}` : 'Esta es la foto.' }],
          esquema: ESQUEMA_COMPROBANTE,
          media: { datos: foto.datos, mime },
          temperatura: 0,
        }),
        ESPERA_MAXIMA_MS,
      ),
    )
  } catch (e) {
    console.error('La IA no pudo leer la foto:', e instanceof Error ? e.message : e)
  }

  // Leída y no es un comprobante: no se molesta al equipo
  if (lectura && !lectura.esComprobante) return r.enviar({ tipo: 'texto', texto: textosAgente.fotoNoComprobante })

  const de = telefonoBonito(r.telefono)
  const admins = (await buscarAdministradoras(r.deps).catch(() => [])).filter((a) => a.rol === 'admin')
  const aCadaAdmin = async (mensajes: (nombre: string) => Parameters<Recepcion['enviar']>[0][]) => {
    for (const a of admins) {
      try {
        for (const m of mensajes(a.nombre)) await r.deps.wa.enviar(a.telefono, m)
      } catch (e) {
        console.error(`No se pudo avisar a ${a.nombre} del comprobante:`, e instanceof Error ? e.message : e)
      }
    }
  }
  const imagen = { tipo: 'imagen' as const, png: foto.datos, mime, texto: `🧾 Comprobante que mandó ${de}` }

  if (!lectura || !lectura.monto) {
    // No se pudo leer (o no se ve el valor): la foto llega igual para revisarla a mano
    const aviso = lectura ? textosAgente.comprobanteSinValor(de) : textosAgente.comprobanteSinLeer(de)
    await aCadaAdmin(() => [imagen, { tipo: 'texto', texto: aviso }])
    return r.enviar({ tipo: 'texto', texto: textosAgente.graciasComprobanteRevisar })
  }

  const detalle = [lectura.medio, lectura.fecha, lectura.referencia && `ref. ${lectura.referencia}`].filter(Boolean).join(' · ')
  await avisarDonacion(r.deps, { monto: lectura.monto, de, detalle, foto: { datos: foto.datos, mime, url } })
  return r.enviar({ tipo: 'texto', texto: textosAgente.graciasComprobante(pesos(lectura.monto)) })
}

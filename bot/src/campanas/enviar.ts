// Correo saliente: Resend por su API o SMTP con nodemailer. Un destinatario que falla no detiene el resto.
import nodemailer from 'nodemailer'
import type { Campana, ConfigCorreo, Correo, MensajeCorreo } from './tipos'

const RESEND_URL = 'https://api.resend.com/emails'
const EN_PARALELO = 3
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Smtp = NonNullable<ConfigCorreo['smtp']>

export interface TransporteCorreo {
  sendMail(m: { from: string; to: string; subject: string; html: string; text: string }): Promise<{ messageId?: string }>
}

export interface OpcionesCorreo {
  /** Para pruebas: por defecto se usa el fetch global en el momento del envío */
  fetch?: typeof fetch
  /** Para pruebas: por defecto se crea un transporte nodemailer */
  crearTransporte?: (smtp: Smtp) => TransporteCorreo
}

export interface ResultadoEnvio {
  enviados: number
  fallidos: { para: string; error: string }[]
}

/** Resend si hay clave; si no, SMTP si está configurado; si no, null (el envío real queda apagado) */
export function crearCorreo(cfg: ConfigCorreo, opciones: OpcionesCorreo = {}): Correo | null {
  if (cfg.resendApiKey) return correoResend(cfg, cfg.resendApiKey, opciones.fetch)
  if (cfg.smtp) return correoSmtp(cfg, (opciones.crearTransporte ?? crearTransporteSmtp)(cfg.smtp))
  return null
}

/** Normaliza y separa los correos válidos (sin duplicados) de los que no sirven */
export function limpiarDestinatarios(lista: string[]): { validos: string[]; invalidos: string[] } {
  const validos = new Set<string>()
  const invalidos: string[] = []
  for (const bruto of lista) {
    const correo = String(bruto ?? '').trim().toLowerCase()
    if (!correo) continue
    if (correo.length <= 254 && CORREO_VALIDO.test(correo)) validos.add(correo)
    else invalidos.push(correo)
  }
  return { validos: [...validos], invalidos }
}

/** Envía la campaña a cada destinatario, de a 3 a la vez. Nunca aborta por un solo fallo. */
export async function enviarCampana(correo: Correo, campana: Campana, destinatarios: string[]): Promise<ResultadoEnvio> {
  const { validos, invalidos } = limpiarDestinatarios(destinatarios)
  const fallidos: ResultadoEnvio['fallidos'] = invalidos.map((para) => ({ para, error: 'dirección no válida' }))
  let enviados = 0
  let siguiente = 0

  const trabajar = async (): Promise<void> => {
    while (siguiente < validos.length) {
      const para = validos[siguiente++]
      if (para === undefined) break
      try {
        await correo.enviar({ para, asunto: campana.asunto, html: campana.html, texto: campana.texto })
        enviados++
      } catch (e) {
        fallidos.push({ para, error: e instanceof Error ? e.message : String(e) })
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(EN_PARALELO, validos.length) }, trabajar))
  return { enviados, fallidos }
}

function correoResend(cfg: ConfigCorreo, clave: string, http: typeof fetch | undefined): Correo {
  return {
    async enviar(m: MensajeCorreo) {
      const respuesta = await (http ?? fetch)(RESEND_URL, {
        method: 'POST',
        headers: { authorization: `Bearer ${clave}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: cfg.remitente, to: m.para, subject: m.asunto, html: m.html, text: m.texto }),
      })
      const cuerpo = (await respuesta.json().catch(() => null)) as { id?: string; message?: string } | null
      if (!respuesta.ok) throw new Error(`Resend respondió ${respuesta.status}${cuerpo?.message ? `: ${cuerpo.message}` : ''}`)
      return { id: cuerpo?.id }
    },
  }
}

function correoSmtp(cfg: ConfigCorreo, transporte: TransporteCorreo): Correo {
  return {
    async enviar(m: MensajeCorreo) {
      const info = await transporte.sendMail({ from: cfg.remitente, to: m.para, subject: m.asunto, html: m.html, text: m.texto })
      return { id: info.messageId }
    },
  }
}

function crearTransporteSmtp(smtp: Smtp): TransporteCorreo {
  const transporte = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure ?? smtp.port === 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  })
  return { sendMail: (m) => transporte.sendMail(m) }
}

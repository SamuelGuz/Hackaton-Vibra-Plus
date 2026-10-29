// Frente de campañas de correo: generar con Gemini, previsualizar y enviar por Resend o SMTP.
import type { ConfigCorreo } from './tipos.js'

export { generarCampana, validarCampana, type OpcionesCampana } from './generar.js'
export { crearCorreo, enviarCampana, limpiarDestinatarios, type OpcionesCorreo, type ResultadoEnvio } from './enviar.js'
export { montarRutasCampanas } from './rutas.js'
export type { Campana, CampanaEstructura, ConfigCorreo, Correo, MensajeCorreo, Objetivo, PerritoCampana } from './tipos.js'

const REMITENTE_POR_DEFECTO = 'Refugio Yesenia <onboarding@resend.dev>'
const PUERTO_SMTP_POR_DEFECTO = 587

/** Lee la configuración de correo del entorno. Sin RESEND_API_KEY ni SMTP_HOST no hay envío real. */
export function leerConfigCorreo(env: NodeJS.ProcessEnv, urlBase: string, whatsappPublico: string | null): ConfigCorreo {
  const puerto = Number(env.SMTP_PORT)
  return {
    remitente: env.CORREO_REMITENTE || REMITENTE_POR_DEFECTO,
    resendApiKey: env.RESEND_API_KEY || undefined,
    smtp: env.SMTP_HOST
      ? {
          host: env.SMTP_HOST,
          port: Number.isFinite(puerto) && puerto > 0 ? puerto : PUERTO_SMTP_POR_DEFECTO,
          user: env.SMTP_USER ?? '',
          pass: env.SMTP_PASS ?? '',
          secure: env.SMTP_SECURE === 'true' || env.SMTP_SECURE === '1',
        }
      : undefined,
    claveEnvio: env.CAMPANAS_CLAVE || undefined,
    urlBase,
    whatsappPublico,
  }
}

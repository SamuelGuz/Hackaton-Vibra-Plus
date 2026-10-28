// Contratos de las campañas de correo: lo que genera Gemini, lo que se renderiza y lo que sale por Resend o SMTP.

export type Objetivo = 'padrinos' | 'comida'

export interface PerritoCampana {
  id: string
  nombre: string
  edadTexto: string
  /** URL http(s) de la foto; null cuando no hay y se pinta un marcador */
  foto: string | null
  /** Vacía cuando la historia aún no está confirmada por la dueña */
  historiaCorta: string
  urgencia: number
}

/** Lo que se edita y se guarda de una campaña: de aquí salen el HTML y el texto */
export interface CampanaEstructura {
  asunto: string
  preheader: string
  saludo: string
  parrafos: string[]
  llamado: { texto: string; url: string }
  perritos: PerritoCampana[]
  objetivo: Objetivo
}

export interface Campana extends CampanaEstructura {
  html: string
  texto: string
}

export interface ConfigCorreo {
  remitente: string
  /** Si está, se envía por la API de Resend (tiene prioridad sobre SMTP) */
  resendApiKey?: string
  smtp?: { host: string; port: number; user: string; pass: string; secure?: boolean }
  /** Sin esta clave, el envío real queda desactivado: las rutas públicas solo previsualizan */
  claveEnvio?: string
  urlBase: string
  /** Solo dígitos con indicativo, para los enlaces wa.me; null si no hay */
  whatsappPublico: string | null
}

export interface MensajeCorreo {
  para: string
  asunto: string
  html: string
  texto: string
}

export interface Correo {
  enviar(m: MensajeCorreo): Promise<{ id?: string }>
}

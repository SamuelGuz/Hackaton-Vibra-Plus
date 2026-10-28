// Contratos de WhatsApp (placa viva Tasks 8 y 9). La implementación real es WaClient (src/wa/client.ts);
// los flujos dependen solo de esta interfaz y en las pruebas entra una falsa.

/** Un mensaje entrante ya normalizado a partir del payload de Meta. */
export interface InboundMessage {
  /** message.id de Meta ("wamid.…"): sirve para no procesar dos veces el mismo webhook */
  id: string
  /** Teléfono de quien escribe, E.164 sin "+" */
  from: string
  nombrePerfil?: string
  tipo: 'texto' | 'audio' | 'imagen' | 'boton'
  texto?: string
  mediaId?: string
  /** p. ej. 'audio/ogg; codecs=opus' */
  mime?: string
  botonId?: string
  /** Segundos desde epoch, como los manda Meta */
  timestamp: number
}

export interface BotonWa {
  id: string
  /** WhatsApp lo corta a 20 caracteres */
  titulo: string
}

export interface WaApi {
  /** Texto libre de servicio; solo se puede dentro de la ventana de 24 h. */
  enviarTexto(to: string, cuerpo: string): Promise<void>
  /** Mensaje con hasta 3 botones de respuesta; con más lanza Error('max 3 botones'). */
  enviarBotones(to: string, cuerpo: string, botones: BotonWa[]): Promise<void>
  /** Baja un audio o imagen: pide la URL del media y luego los bytes. */
  descargarMedia(mediaId: string): Promise<{ bytes: ArrayBuffer; mime: string }>
  /** Plantilla aprobada, para escribir fuera de la ventana de 24 h (solo "cierre_dia_huellitas"). */
  enviarPlantilla(to: string, nombre: string, params: string[]): Promise<void>
}

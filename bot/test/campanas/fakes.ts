// Correo falso para las campañas: guarda cada envío y puede fallar para destinatarios concretos.
import type { ConfigCorreo, Correo, MensajeCorreo } from '../../src/campanas/tipos'

export const CLAVE = 'clave-de-prueba-larga'

export const CONFIG: ConfigCorreo = {
  remitente: 'Fundación Huellitas <hola@huellitas.test>',
  urlBase: 'https://huellitas.test',
  whatsappPublico: null,
}

export class CorreoFalso implements Correo {
  enviados: MensajeCorreo[] = []
  fallarPara = new Set<string>()

  async enviar(m: MensajeCorreo): Promise<{ id?: string }> {
    if (this.fallarPara.has(m.para)) throw new Error(`rebotó ${m.para}`)
    this.enviados.push(m)
    return { id: `msg-${this.enviados.length}` }
  }
}

// Mensajes fijos del agente (los que no los escribe Gemini). Voz cálida, español de Colombia.
import { describirFecha, HORA_VISITA } from './decisiones'
import type { CanalAgente } from './tipos'

export const PADRINAZGO_DESDE = '$20.000 COP'

export const textosAgente = {
  falla: 'Ay, se me enredó la conexión un momentico 🐾 ¿Me escribes de nuevo en un ratico? Aquí sigo para ayudarte con los peluditos.',
  fallaWeb: 'Se me enredó la conexión un momentico. ¿Lo intentamos de nuevo?',
  limite: 'Qué alegría que quieras saber tanto de nuestros peluditos 🐾 Hemos hablado bastante hoy; escríbeme de nuevo dentro de un rato y seguimos.',
  limiteWeb: 'Hemos hablado bastante por ahora. Inténtalo de nuevo en unos minutos, ¿sí?',
  audioNoLlego: 'No alcancé a escuchar tu audio 🙈 ¿Me lo mandas de nuevo o me cuentas por escrito?',
  audioLargo: 'Tu audio quedó larguito y no lo pude procesar 🙈 ¿Me lo mandas más cortico o me escribes?',
  soloTextoOVoz: 'Gracias por escribirme 🐾 Por ahora solo puedo leer mensajes de texto o escuchar una nota de voz. ¿Me cuentas con palabras qué tipo de compañero buscas?',
  /** Lo que se le manda a Gemini cuando el turno de la persona es un audio */
  marcadorAudio: '(La persona te mandó una nota de voz: transcríbela en "transcripcion" y respóndele.)',
} as const

/** 573001234567 → +573001234567 */
export function telefonoBonito(digitos: string): string {
  return `+${digitos.replace(/\D/g, '')}`
}

/** Oferta de padrinazgo / donación, para cuando Gemini no la hizo por su cuenta */
export function ofertaPadrinazgo(perro: string | null, canal: CanalAgente, whatsappPublico: string | null): string {
  const de = perro ? `de ${perro}` : 'de uno de nuestros peluditos'
  const cierre =
    canal.tipo === 'whatsapp'
      ? 'Si te animas, cuéntame y vemos cómo hacerlo.'
      : whatsappPublico
        ? `Si te animas, escríbenos por WhatsApp al ${telefonoBonito(whatsappPublico)} y te ayudamos a empezar.`
        : 'Si te animas, cuéntame y vemos cómo hacerlo.'
  return `Y si hoy no puedes adoptar, igual puedes cambiar una vida: ser Padrino ${de} cuesta desde ${PADRINAZGO_DESDE} al mes, o también puedes ayudarnos donando comida. Sin presiones: cualquier ayuda cuenta 💛 ${cierre}`
}

/** Confirmación de la visita agendada. No promete la adopción: la decide el equipo después de conocerse. */
export function confirmacionVisita(perro: string, fecha: Date, canal: CanalAgente, whatsappPublico: string | null): string {
  const contacto =
    canal.tipo === 'whatsapp'
      ? 'Una de nuestras administradoras te escribirá para confirmarte la dirección.'
      : whatsappPublico
        ? `Para confirmar la dirección y el cupo, escríbenos por WhatsApp al ${telefonoBonito(whatsappPublico)}.`
        : 'Pregunta por la dirección y los detalles en los canales de la fundación.'
  return (
    `¡Y tengo una buena noticia! 🎉 Me encantaría que conozcas a ${perro} en persona: te dejé una visita para el ${describirFecha(fecha)} a las ${HORA_VISITA} en la fundación. ` +
    `${contacto} Recuerda que la decisión de la adopción la toma el equipo de la fundación después de conocerse 🐾`
  )
}

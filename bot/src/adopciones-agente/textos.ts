// Mensajes fijos del agente (los que no los escribe Gemini). Voz cálida, español de Colombia.
import { describirFecha, HORA_VISITA } from './decisiones.js'
import { esUsuarioWa } from '../wa/telefono.js'
import type { CanalAgente } from './tipos.js'

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

  // ---------- Recepción por botones (recepcion.ts) ----------
  bienvenida: '¡Hola! 👋 Qué alegría que nos escribas. Soy el asistente de la Fundación Huellitas 🐾\n\n¿En qué te podemos ayudar? Elige una opción 👇',
  menuOtraVez: '¿En qué más te ayudo? Elige una opción 👇',
  web: (url: string) => `🌐 Conoce a todos nuestros peluditos y nuestra historia en ${url}\nSi te queda cualquier duda, pregúntame aquí mismo 💬`,
  lista: 'Estos peluditos están buscando hogar 🐾 Toca *Ver peluditos* y elige uno para conocerlo.\n\nSi buscas algo especial (tamaño, que se lleve con niños, para apartamento), escríbemelo y te digo cuál encaja.',
  sinAnimales: 'Ahora mismo no tengo peluditos para mostrarte por aquí 🙈 Pero puedes ayudarnos de otras formas, o escribirme tu duda.',
  soloApadrinar: (perro: string) => `💛 ${perro} se queda con nosotros por su salud, pero puedes apadrinarlo.`,
  nombre: '¡Ya casi! ¿Cómo te llamas? ✍️',
  visitaSinAviso: (nombre: string) =>
    `¡Gracias, ${nombre}! 🐾 Ya tengo todo. Alguien del equipo te va a escribir por aquí para coordinar la visita.`,
  visitaYaPropuesta: (nombre: string, perro: string) =>
    `${nombre}, tu visita para conocer a ${perro} ya está propuesta 🐾 Alguien del equipo te escribe para confirmarla.`,
  mejorApadrinar: (nombre: string, perro: string, porTiempo: boolean) =>
    `Gracias por contarme con sinceridad, ${nombre} 💛 ${porTiempo ? `${perro} necesita compañía buena parte del día` : `Cuidar a ${perro} trae gastos de comida y veterinario`}, así que quizás este no es el momento de adoptar. ` +
    `Pero igual puedes cambiarle la vida: apadrinándolo desde ${PADRINAZGO_DESDE} al mes, o donando comida 🐾`,
  preguntaArriendo: (nombre: string, perro: string) =>
    `${nombre}, antes de seguir: pregúntale al dueño o a la administración si permiten mascotas 🙏 Así ${perro} no corre el riesgo de tener que volver. ¿Ya sabes que sí te dejan?`,
  preguntaPresupuesto: (nombre: string, perro: string) =>
    `${nombre}, un peludito como ${perro} gasta en comida, vacunas y alguna visita al veterinario cada año. Piénsalo con calma 💛 ¿Cuentas con eso?`,
  graciasDonar: '💛 ¡Gracias por querer ayudar a los peluditos! Así puedes donar:',
  apadrinarA: (perro: string) => `💛 ¡Qué lindo que quieras apadrinar a ${perro}! Así puedes hacerlo:`,
  plataPorChat: '*Para donar plata:* escríbeme aquí "quiero donar" y alguien del equipo te pasa los datos de pago.',
  comidaPorChat: '*Para donar comida o insumos:* escríbeme aquí y coordinamos la entrega.',
  mandaComprobante: '🧾 Cuando dones, mándame aquí la foto del comprobante y le aviso al equipo para que lo confirme.',
  infoDudas: 'Si tienes cualquier duda, escríbemela aquí y te respondo 💬',
  escribeDuda: '¡Claro! Escríbeme tu pregunta o mándame una nota de voz 💬',
  // ---------- Comprobantes (comprobantes.ts) ----------
  fotoNoLlego: 'No me llegó bien la foto 🙈 ¿Me la mandas otra vez?',
  fotoNoComprobante:
    '¡Gracias por la foto! 🐾 Por aquí con fotos solo puedo leer comprobantes de donación. Si quieres contarme o preguntarme algo, escríbeme o mándame una nota de voz.',
  graciasComprobante: (monto: string) => `¡Mil gracias por tu donación de ${monto}! 💛 Ya le avisé al equipo para que confirme que llegó. Los peluditos te lo agradecen 🐾`,
  graciasComprobanteRevisar: '¡Mil gracias! 💛 No alcancé a leer bien tu foto, así que se la pasé al equipo para que la revise. Si es un comprobante, ellos confirman que llegó 🐾',
  comprobanteLlego: (admin: string, de: string, monto: string, detalle: string) =>
    `💸 ${admin}, llegó un comprobante de donación de ${de}: *${monto}*${detalle ? `\n${detalle}` : ''}\n\n¿Te llegó la plata? Si dices que sí, la registro como donación.`,
  comprobanteSinValor: (de: string) => `🧾 ${de} mandó un comprobante, pero no alcancé a leer el valor. Revísalo y, si te llegó, regístralo en el panel o cuéntamelo.`,
  comprobanteSinLeer: (de: string) => `🧾 ${de} mandó una foto que parece un comprobante, pero no la pude leer. Revísala y, si te llegó la plata, regístrala en el panel o cuéntamelo.`,
  mandaFotoComprobante: '¡Gracias! 💛 Mándame la foto o el pantallazo del comprobante y le aviso al equipo para que lo confirme 🧾',
} as const

/** 573001234567 → +573001234567 */
export function telefonoBonito(digitos: string): string {
  // Un id de usuario de WhatsApp no es un número: no se inventa uno
  if (esUsuarioWa(digitos)) return 'usuario de WhatsApp sin número visible (respóndele por este mismo chat)'
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

/** La visita que se propone: queda por confirmar con el equipo. No promete la adopción: la decide el equipo después de conocerse. */
export function confirmacionVisita(perro: string, fecha: Date, canal: CanalAgente, whatsappPublico: string | null): string {
  const contacto =
    canal.tipo === 'whatsapp'
      ? 'Una de nuestras administradoras te escribirá para confirmarla y darte la dirección.'
      : whatsappPublico
        ? `Para confirmar la dirección y el cupo, escríbenos por WhatsApp al ${telefonoBonito(whatsappPublico)}.`
        : 'Pregunta por la dirección y los detalles en los canales de la fundación.'
  return (
    `¡Y tengo una buena noticia! 🎉 Me encantaría que conozcas a ${perro} en persona: te propongo una visita el ${describirFecha(fecha)} a las ${HORA_VISITA} en la fundación, por confirmar. ` +
    `${contacto} Recuerda que la decisión de la adopción la toma el equipo de la fundación después de conocerse 🐾`
  )
}

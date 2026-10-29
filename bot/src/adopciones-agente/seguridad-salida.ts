/** Limpia valores de persona/modelo antes de incluirlos en prompts o avisos operativos. */
export function limpiarDatoNoConfiable(valor: string): string {
  return valor
    .replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, ' ')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const SALIDA_SENSIBLE = [
  /\b(?:suitability(?:[_\s-]?score)?|risk(?:[_\s-]?score)?|puntajes?|scores?)\b/i,
  /\b(?:adopci[oó]n|adoptar)\b[^.!?\n]{0,50}\b(?:aprobada|aprobado|confirmada|confirmado)\b/i,
  /\b(?:nequi|daviplata|bancolombia|bre-b|llave breb|n[uú]mero de cuenta|cuenta de ahorros|cuenta corriente)\b/i,
  /\b\d[\d .-]{7,}\d\b/,
  /\b(?:eres el asistente del|c[oó]mo hablas|lo que puedes afirmar|animales que puedes mencionar|salida\s*\(json\))\b/i,
  /\b(?:visita|cita)\b[^\n]{0,80}\b(?:confirmad[ao]s?|agendad[ao]s?|reservad[ao]s?|aprobad[ao]s?)\b/i,
  /\b(?:el equipo|la fundaci[oó]n|una administradora|alguien)\b[^\n]{0,60}\b(?:te (?:escribir[aá]|contactar[aá]|llamar[aá])|se comunicar[aá])\b/i,
  /\b(?:puedes|debes|te toca)\s+(?:venir|ir|acercarte)\b[^\n]{0,40}\b(?:ma[nñ]ana|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i,
]

/**
 * Devuelve null si la salida contiene información interna, una aprobación falsa o datos de pago/contacto que
 * no deben originarse en el modelo. El caller debe usar una respuesta fija de recuperación en ese caso.
 */
export function revisarSalidaModelo(texto: string, promptSistema: string): string | null {
  const limpio = limpiarDatoNoConfiable(texto)
  if (!limpio || SALIDA_SENSIBLE.some((patron) => patron.test(limpio))) return null
  const inicioPrompt = limpiarDatoNoConfiable(promptSistema).slice(0, 80)
  if (inicioPrompt.length >= 40 && limpio.toLocaleLowerCase().includes(inicioPrompt.toLocaleLowerCase())) return null
  return limpio
}

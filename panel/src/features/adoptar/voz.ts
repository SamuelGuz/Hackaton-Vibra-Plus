// Voz del navegador: reconocimiento (Web Speech API) y síntesis (speechSynthesis).
// Los tipos de SpeechRecognition no vienen en lib.dom, así que se declara lo mínimo que se usa.

export const IDIOMA_VOZ = 'es-CO'

export interface EventoResultadoVoz {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

export interface Reconocimiento {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: EventoResultadoVoz) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type ConstructorReconocimiento = new () => Reconocimiento

function constructorReconocimiento(): ConstructorReconocimiento | null {
  const w = window as unknown as {
    SpeechRecognition?: ConstructorReconocimiento
    webkitSpeechRecognition?: ConstructorReconocimiento
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** ¿Este navegador puede convertir la voz en texto? (Firefox no) */
export function hayReconocimiento(): boolean {
  return constructorReconocimiento() !== null
}

/** Reconocimiento listo para una sola frase en español de Colombia */
export function crearReconocimiento(): Reconocimiento | null {
  const Ctor = constructorReconocimiento()
  if (!Ctor) return null
  const r = new Ctor()
  r.lang = IDIOMA_VOZ
  r.continuous = false
  r.interimResults = false
  r.maxAlternatives = 1
  return r
}

export function haySintesis(): boolean {
  return typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined'
}

/** Voz en español: primero la colombiana, luego cualquier otra en español */
function elegirVoz(): SpeechSynthesisVoice | undefined {
  const voces = window.speechSynthesis.getVoices?.() ?? []
  const idioma = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-')
  return voces.find((v) => idioma(v) === 'es-co') ?? voces.find((v) => idioma(v).startsWith('es'))
}

// Chrome puede recoger el enunciado antes de que termine y nunca avisar: se guarda una referencia.
let enCurso: SpeechSynthesisUtterance | null = null

/** Lee el texto en voz alta y avisa cuando termina (o si falla). Sin síntesis, avisa de inmediato. */
export function hablar(texto: string, alTerminar: () => void): void {
  if (!haySintesis() || !texto.trim()) {
    alTerminar()
    return
  }
  const u = new window.SpeechSynthesisUtterance(texto)
  u.lang = IDIOMA_VOZ
  u.rate = 0.92
  u.pitch = 1
  const voz = elegirVoz()
  if (voz) u.voice = voz
  let avisado = false
  const fin = () => {
    if (avisado) return
    avisado = true
    if (enCurso === u) enCurso = null
    alTerminar()
  }
  u.onend = fin
  u.onerror = fin
  enCurso = u
  window.speechSynthesis.speak(u)
}

/** Calla al agente (al empezar a hablar la persona o al cerrar). No dispara el aviso de "terminó". */
export function callar(): void {
  if (enCurso) {
    enCurso.onend = null
    enCurso.onerror = null
    enCurso = null
  }
  if (haySintesis()) window.speechSynthesis.cancel()
}

// Arma el frente externo (catálogo de animales, agente de adopciones y campañas) para montarlo en el mismo servidor.
// Sin GEMINI_API_KEY no se arma: el bot sigue atendiendo solo al equipo y no hay rutas públicas.
import { pausaReal } from './adopciones-agente/humano.js'
import { crearVozGemini, type Voz } from './adopciones-agente/voz.js'
import type { ConfigExterno } from './app.js'
import { crearCorreo, leerConfigCorreo } from './campanas/index.js'
import { CONOCIMIENTO } from './rag/conocimiento-data.js'
import { crearLlmGemini, crearRag, crearRespuestas } from './rag/index.js'
import type { Llm } from './rag/tipos.js'
import type { Deps } from './tipos.js'

type Env = Record<string, string | undefined>

/** "+57 300 111 2233" → "573001112233", para los botones wa.me; null si no hay número */
const soloDigitos = (numero: string | undefined) => numero?.replace(/\D/g, '') || null

export function armarExterno(env: Env, deps: Pick<Deps, 'repo' | 'ahora'>, opciones: { llm?: Llm; voz?: Voz; pausaHumana?: (ms: number) => Promise<void> } = {}): ConfigExterno | undefined {
  if (!env.GEMINI_API_KEY) return undefined
  const llm = opciones.llm ?? crearLlmGemini({ apiKey: env.GEMINI_API_KEY, modelo: env.GEMINI_MODEL || 'gemini-2.5-flash' })
  const datos = () => deps.repo.hoy(deps.ahora())
  const rag = crearRag({ datos, llm, ahora: deps.ahora })
  const whatsappPublico = soloDigitos(env.WA_NUMERO_BOT)
  // Las campañas solo se envían si hay Resend o SMTP configurado; si no, se generan y se ven, pero no salen
  const config = leerConfigCorreo(env as NodeJS.ProcessEnv, env.PANEL_URL ?? '', whatsappPublico)
  const donaciones = {
    nequi: env.DONACIONES_NEQUI?.trim() || undefined,
    llave: env.DONACIONES_LLAVE?.trim() || undefined,
    cuenta: env.DONACIONES_CUENTA?.trim() || undefined,
    titular: env.DONACIONES_TITULAR?.trim() || undefined,
    telefono: env.DONACIONES_TELEFONO?.trim() || undefined,
  }
  return {
    rag,
    llm,
    whatsappPublico,
    // La página pública se le comparte una vez a quien escribe; los datos de donación se muestran tal cual
    sitioWeb: env.SITIO_WEB_URL?.trim().replace(/\/$/, '') || undefined,
    donaciones: Object.values(donaciones).some(Boolean) ? donaciones : undefined,
    respuestas: crearRespuestas({ rag, datos, conocimiento: CONOCIMIENTO, llm, ahora: deps.ahora }),
    // Con quien quiere adoptar, el agente responde como una persona que escribe (el equipo no)
    pausaHumana: opciones.pausaHumana ?? pausaReal,
    // La voz de la página (POST /api/publico/agente-voz con "conAudio": true), con la misma llave
    voz:
      opciones.voz ??
      crearVozGemini({ apiKey: env.GEMINI_API_KEY, modelo: env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts', voz: env.GEMINI_TTS_VOZ || 'Kore' }),
    correo: { config, enviador: crearCorreo(config) },
  }
}

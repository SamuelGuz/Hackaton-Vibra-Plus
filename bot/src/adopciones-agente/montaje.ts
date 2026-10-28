// Arma el frente externo (RAG, agente emocional, campañas) con las dependencias de master.
// El app.ts / server de master solo necesita dos líneas:
//   const externo = crearFrenteExterno({ deps })
//   externo.montarRutas(app)                                  // /api/publico/*, antes de exigir sesión
//   trabajarEntrantes({ ..., procesador: externo.procesador(procesadorInterno) })
import type { Hono } from 'hono'
import { crearCorreo, leerConfigCorreo, montarRutasCampanas } from '../campanas'
import type { Deps } from '../flujos/deps'
import { crearLlmGemini, crearRag, montarRutasRag } from '../rag'
import type { ContextoExterno, Llm } from '../rag/tipos'
import type { Procesador } from '../wa/trabajador'
import { crearProcesadorExterno } from './procesador'
import { montarRutasAgente } from './rutas'

export interface OpcionesFrenteExterno {
  deps: Deps
  /** Por defecto Gemini por REST con `GEMINI_API_KEY`; las pruebas pasan uno falso */
  llm?: Llm
  /** Variables del correo de las campañas (RESEND_API_KEY, SMTP_*, CAMPANAS_CLAVE…). Por defecto `process.env` */
  envCorreo?: Record<string, string | undefined>
}

export interface FrenteExterno {
  ctx: ContextoExterno
  /** Envuelve el procesador del equipo: quien no esté en `personas` lo atiende el agente emocional */
  procesador(base: Procesador): Procesador
  /** Monta `/api/publico/*`. Va ANTES de las rutas con sesión: el RAG abre el CORS de todo el prefijo */
  montarRutas(app: Hono<any>): void
}

export function crearFrenteExterno(o: OpcionesFrenteExterno): FrenteExterno {
  const { deps } = o
  const llm = o.llm ?? crearLlmGemini(deps.env)
  // El número que escribe la gente para adoptar es el mismo del bot (WA_NUMERO_BOT, solo dígitos)
  const numero = deps.env.WA_NUMERO_BOT?.replace(/\D/g, '')
  const whatsappPublico = numero ? numero : null
  const rag = crearRag({ repo: deps.repo, llm, ahora: deps.ahora })
  const ctx: ContextoExterno = { rag, llm, whatsappPublico }
  const configCorreo = leerConfigCorreo(o.envCorreo ?? process.env, deps.env.PANEL_URL, whatsappPublico)
  const correo = crearCorreo(configCorreo)

  return {
    ctx,
    procesador: (base) => crearProcesadorExterno({ base, deps, ctx }),
    montarRutas(app) {
      montarRutasRag(app, ctx)
      montarRutasAgente(app, deps, ctx)
      montarRutasCampanas(app, ctx, configCorreo, correo)
    },
  }
}

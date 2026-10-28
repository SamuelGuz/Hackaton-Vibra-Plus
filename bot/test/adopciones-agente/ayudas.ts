// Ayudas compartidas por las pruebas del agente de adopciones (no es una prueba: vitest solo corre *.test.ts).
// Todo es de master: MemoryRepo, MemoryKv (con reloj), Entrante/InboundMessage y un WaApi falso.
import { vi } from 'vitest'
import type { Persona } from '@huellitas/shared/tipos'
import { atenderInteresadoExterno } from '../../src/adopciones-agente/index'
import { leerEnv } from '../../src/env'
import type { Deps } from '../../src/flujos/deps'
import type { IaApi } from '../../src/ia/tipos'
import type { ContextoExterno } from '../../src/rag/tipos'
import { MemoryKv } from '../../src/store/kv'
import { MemoryRepo } from '../../src/store/memory-repo'
import type { Entrante, RespuestaNueva } from '../../src/wa/buzon'
import type { InboundMessage, WaApi } from '../../src/wa/tipos'
import { marcarVentana } from '../../src/wa/ventana'
import { semillaMini } from '../fixtures/semilla-mini'
import { LlmFalso, RagFalso } from '../externo/fakes'

/** Miércoles 28 de octubre de 2026, 10:00 en Bogotá: la próxima visita cae el sábado 31 */
export const AHORA = new Date('2026-10-28T10:00:00-05:00')
export const TEL = '573115550000'

type PersonaConTelefono = Persona & { telefono: string }
const persona = (p: Pick<PersonaConTelefono, 'id' | 'nombre' | 'rol' | 'telefono'> & Partial<Persona>): PersonaConTelefono => ({
  cargo: '',
  color: '#000000',
  foto: null,
  activo: true,
  ...p,
})

export const ANDREA = persona({ id: 'p-andrea', nombre: 'Andrea', rol: 'voluntario', telefono: '573001110001' })
export const CAROLINA = persona({ id: 'p-carolina', nombre: 'Carolina', rol: 'admin', telefono: '573000000003' })
export const MARIA = persona({ id: 'p-maria', nombre: 'María', rol: 'adopciones', telefono: '573000000004' })

export interface Cambios {
  respuesta?: string
  guion_voz?: string
  transcripcion?: string
  perrito_id_foco?: string | null
  perritos_mencionados?: string[]
  intencion?: string
  conexion_emocional?: boolean
  alerta_bienestar?: boolean
  suitability?: number
  risk?: number
  tipo?: string
  permiso?: string
  presupuesto?: string
  tiempo?: string
  ninos?: string
  mascotas?: string
  nombre?: string
}

/** Lo que devolvería Gemini (snake_case, como en el esquema), con valores neutros salvo lo que se pida */
export function crudo(c: Cambios = {}): Record<string, unknown> {
  return {
    transcripcion: c.transcripcion ?? 'mensaje de la persona',
    respuesta: c.respuesta ?? 'Mira, te cuento la historia de Toby... ¿Cómo es tu casa? 🐶',
    guion_voz: c.guion_voz ?? 'Mira, te cuento la historia de Toby. ¿Cómo es tu casa?',
    perrito_id_foco: c.perrito_id_foco === undefined ? '5' : c.perrito_id_foco,
    perritos_mencionados: c.perritos_mencionados ?? ['5'],
    intencion: c.intencion ?? 'adoptar',
    conexion_emocional: c.conexion_emocional ?? false,
    alerta_bienestar: c.alerta_bienestar ?? false,
    evaluacion: {
      suitability_score: c.suitability ?? 20,
      risk_score: c.risk ?? 50,
      vivienda: { tipo: c.tipo ?? 'desconocido', permiso_arriendo: c.permiso ?? 'desconocido' },
      presupuesto_veterinario: c.presupuesto ?? 'desconocido',
      tiempo_disponible: c.tiempo ?? 'desconocido',
      ninos: c.ninos ?? 'desconocido',
      otras_mascotas: c.mascotas ?? 'desconocido',
      nombre_interesado: c.nombre ?? '',
      datos_faltantes: [],
    },
  }
}

/** Un adoptante excelente: con esto (y score >= 75) se agenda la visita */
export function excelente(c: Cambios = {}): Record<string, unknown> {
  return crudo({ suitability: 82, risk: 15, tipo: 'casa', permiso: 'no_aplica', presupuesto: 'si', tiempo: 'suficiente', ...c })
}

const aArrayBuffer = (texto: string): ArrayBuffer => {
  const b = Buffer.from(texto)
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
}

/** WaApi falso: guarda los textos que salen por aquí (solo avisos al equipo: a la persona se le responde por el buzón). */
export class WaFalso implements WaApi {
  textos: { telefono: string; cuerpo: string }[] = []
  fallarPara = new Set<string>()
  descargar: (mediaId: string) => Promise<{ bytes: ArrayBuffer; mime: string }> = async (id) => ({
    bytes: aArrayBuffer(`archivo ${id}`),
    mime: 'audio/ogg',
  })

  async enviarTexto(to: string, cuerpo: string): Promise<void> {
    if (this.fallarPara.has(to)) throw new Error('fuera de la ventana de 24 h')
    this.textos.push({ telefono: to, cuerpo })
  }
  async enviarBotones(): Promise<void> {
    throw new Error('el agente no usa botones')
  }
  descargarMedia(mediaId: string) {
    return this.descargar(mediaId)
  }
  async enviarPlantilla(): Promise<void> {
    throw new Error('el agente no usa plantillas')
  }
}

const iaNoSeUsa: IaApi = {
  extraerAcciones: async () => {
    throw new Error('el agente externo no usa la IA interna')
  },
  leerComprobante: async () => {
    throw new Error('el agente externo no usa la IA interna')
  },
  redactarDiario: async () => {
    throw new Error('el agente externo no usa la IA interna')
  },
}

export type Mensaje = string | Partial<InboundMessage>

let contador = 0

/** Un mensaje de WhatsApp tal como lo deja el buzón al reclamarlo */
export function entrante(msg: Mensaje, tel = TEL, id?: string): Entrante {
  const base = typeof msg === 'string' ? { tipo: 'texto' as const, texto: msg } : msg
  const wamid = id ?? `wamid.${++contador}`
  const mensaje: InboundMessage = { id: wamid, from: tel, timestamp: Math.floor(AHORA.getTime() / 1000), tipo: 'texto', ...base }
  return { id: mensaje.id, telefono: mensaje.from, timestamp: mensaje.timestamp, mensaje, intentos: 0 }
}

export async function montar(o: { personas?: Persona[] } = {}) {
  const reloj = { ms: AHORA.getTime() }
  const kv = new MemoryKv(() => reloj.ms)
  const repo = new MemoryRepo({ ...semillaMini(), personas: o.personas ?? [ANDREA, CAROLINA] })
  const wa = new WaFalso()
  const deps: Deps = { env: leerEnv({ SESSION_SECRET: 'prueba' }), repo, kv, wa, ia: iaNoSeUsa, ahora: () => new Date(reloj.ms) }
  const llm = new LlmFalso()
  const rag = new RagFalso()
  const ctx: ContextoExterno = { rag, llm, whatsappPublico: '573001112233' }
  /** Todo lo que el agente le respondió a las personas (lo que el buzón mandaría) */
  const salidas: RespuestaNueva[] = []

  /** Cada administradora le escribió al bot hace un momento: su ventana de 24 h está abierta */
  async function abrirVentanas() {
    for (const p of await repo.personas()) if (p.telefono) await marcarVentana(kv, p.telefono, reloj.ms)
  }
  await abrirVentanas()

  return {
    deps,
    repo,
    kv,
    wa,
    llm,
    rag,
    ctx,
    salidas,
    reloj,
    abrirVentanas,
    /** La llamada n-ésima a Gemini (falla con un mensaje claro si no hubo tantas) */
    llamada(n: number) {
      const l = llm.llamadas[n]
      if (!l) throw new Error('No hubo una llamada ' + n + ' a Gemini (hubo ' + llm.llamadas.length + ')')
      return l
    },
    /** Corre el reloj de todo (Kv incluido) a esa fecha y reabre las ventanas del equipo */
    async fijar(fecha: Date) {
      reloj.ms = fecha.getTime()
      await abrirVentanas()
    },
    /** Pasa tiempo sin tocar las ventanas */
    avanzar(ms: number) {
      reloj.ms += ms
    },
    /** Entrega al agente un mensaje ya armado (para repetirlo, como hace el buzón al reintentar) */
    async escribirEntrante(e: Entrante): Promise<RespuestaNueva[]> {
      const { respuestas } = await atenderInteresadoExterno(deps, e, ctx)
      salidas.push(...respuestas)
      return respuestas
    },
    escribir(msg: Mensaje, tel = TEL, id?: string): Promise<RespuestaNueva[]> {
      return this.escribirEntrante(entrante(msg, tel, id))
    },
    /** Lo que se le respondió a ese número, en orden */
    alTelefono: (tel: string) => salidas.filter((s) => s.telefono === tel).map((s) => s.cuerpo),
    /** Los avisos que llegaron a ese número por WaApi.enviarTexto (administradoras) */
    avisos: (tel: string) => wa.textos.filter((e) => e.telefono === tel).map((e) => e.cuerpo),
  }
}

export type Montaje = Awaited<ReturnType<typeof montar>>

export function silenciarConsola() {
  return {
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  }
}

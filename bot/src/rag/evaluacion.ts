// Banco de preguntas para evaluar el motor de respuestas: cada pregunta dice qué DEBE y qué NO DEBE aparecer en la
// respuesta. Se usa en pruebas (test/rag/banco.test.ts) y a mano antes de una demo.
import { sinTildes } from './normalizar.js'
import type { ServicioRespuestas, TipoFuente } from './tipos.js'

export interface PreguntaBanco {
  id: string
  categoria: string
  pregunta: string
  nivel: 'publico' | 'interno'
  esperado: {
    /** TODAS estas frases deben aparecer en la respuesta (sin importar tildes ni mayúsculas) */
    contiene?: string[]
    /** NINGUNA de estas frases debe aparecer */
    noContiene?: string[]
    /** Al menos una fuente de este tipo */
    fuente?: TipoFuente
    /** El motor debe (true) o no debe (false) marcar `sinRespuesta` */
    sinRespuesta?: boolean
  }
}

export interface Falla {
  id: string
  pregunta: string
  motivo: string
  respuesta: string
}

export interface ResultadoEvaluacion {
  total: number
  aprobadas: number
  fallidas: Falla[]
}

/** Minúsculas, sin tildes y con espacios colapsados: así "Años" y "anos" son lo mismo */
const comparable = (s: string) => sinTildes(s).replace(/\s+/g, ' ').trim()

export async function evaluarBanco(crear: (nivel: 'publico' | 'interno') => ServicioRespuestas, banco: PreguntaBanco[]): Promise<ResultadoEvaluacion> {
  const servicios = new Map<'publico' | 'interno', ServicioRespuestas>()
  const servicio = (nivel: 'publico' | 'interno') => {
    let s = servicios.get(nivel)
    if (!s) servicios.set(nivel, (s = crear(nivel)))
    return s
  }

  const fallidas: Falla[] = []
  for (const q of banco) {
    let respuestaTexto = ''
    try {
      const r = await servicio(q.nivel).preguntar(q.pregunta)
      respuestaTexto = r.respuesta
      const texto = comparable(r.respuesta)
      const motivos: string[] = []
      for (const frase of q.esperado.contiene ?? []) if (!texto.includes(comparable(frase))) motivos.push(`falta "${frase}"`)
      for (const frase of q.esperado.noContiene ?? []) if (texto.includes(comparable(frase))) motivos.push(`no debía decir "${frase}"`)
      if (q.esperado.fuente && !r.fuentes.some((f) => f.tipo === q.esperado.fuente)) motivos.push(`falta una fuente de tipo "${q.esperado.fuente}" (hay: ${r.fuentes.map((f) => f.tipo).join(', ') || 'ninguna'})`)
      if (q.esperado.sinRespuesta !== undefined && Boolean(r.sinRespuesta) !== q.esperado.sinRespuesta) motivos.push(`sinRespuesta debía ser ${q.esperado.sinRespuesta} y fue ${Boolean(r.sinRespuesta)} (intención ${r.intencion})`)
      if (motivos.length) fallidas.push({ id: q.id, pregunta: q.pregunta, motivo: motivos.join('; '), respuesta: r.respuesta })
    } catch (e) {
      fallidas.push({ id: q.id, pregunta: q.pregunta, motivo: `lanzó un error: ${e instanceof Error ? e.message : String(e)}`, respuesta: respuestaTexto })
    }
  }
  return { total: banco.length, aprobadas: banco.length - fallidas.length, fallidas }
}

/** Texto legible de las fallas, para imprimir en la consola de pruebas */
export function resumirFallas(r: ResultadoEvaluacion): string {
  if (r.fallidas.length === 0) return `${r.aprobadas}/${r.total} preguntas aprobadas`
  const lineas = r.fallidas.map((f) => `- [${f.id}] "${f.pregunta}"\n    motivo: ${f.motivo}\n    respuesta: ${f.respuesta}`)
  return `${r.aprobadas}/${r.total} preguntas aprobadas; fallaron ${r.fallidas.length}:\n${lineas.join('\n')}`
}

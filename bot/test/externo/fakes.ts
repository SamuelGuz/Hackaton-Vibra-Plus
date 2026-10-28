// Gemini y RAG falsos para probar el frente externo sin red. Compartido por rag, adopciones-agente y campanas.
import type { Llm, PerritoPublico, RespuestaBusqueda, ServicioRag } from '../../src/rag/tipos'

export function perrito(p: Partial<PerritoPublico> & Pick<PerritoPublico, 'id' | 'nombre'>): PerritoPublico {
  return {
    especie: 'perro',
    estado: 'adoptable',
    edadAnios: 4,
    edadTexto: '4 años',
    tamano: 'mediano',
    personalidad: ['cariñoso'],
    historia: 'Llegó flaquito y asustado; hoy es el primero en la puerta cuando llega alguien.',
    historiaConfirmada: true,
    compatibilidad: { ninos: true, gatos: null, perros: true, apartamento: true },
    necesidadesMedicas: [],
    meta: { mensualCOP: 40000, padrinos: 0, cubiertoPct: 0 },
    foto: null,
    urgencia: 0.5,
    adoptable: true,
    hoy: { comioHoy: null, medicinas: { programadas: 0, tomadas: 0 }, notaDelDia: null },
    ...p,
  }
}

export const TOBY = perrito({
  id: '5', nombre: 'Toby', edadAnios: 3, edadTexto: '3 años', personalidad: ['tranquilo', 'cariñoso'],
  historia: 'Lo encontraron bajo un puente, con frío, esperando a alguien que nunca volvió. Aun así mueve la cola con todos.',
  urgencia: 0.6, hoy: { comioHoy: true, medicinas: { programadas: 0, tomadas: 0 }, notaDelDia: null },
})
export const MATEO = perrito({
  id: '1', nombre: 'Mateo', edadAnios: 9, edadTexto: '9 años', tamano: 'mediano', personalidad: ['viejito', 'calmado'],
  historia: 'Lo atropellaron en la vía. Después de la cirugía es el consentido del albergue.',
  necesidadesMedicas: ['Amoxicilina 2 veces al día', 'No puede subir escaleras'], urgencia: 0.9,
  meta: { mensualCOP: 60000, padrinos: 1, cubiertoPct: 40 },
  hoy: { comioHoy: true, medicinas: { programadas: 2, tomadas: 1 }, notaDelDia: 'Ya camina solito.' },
})
export const LUNA = perrito({
  id: '12', nombre: 'Luna', especie: 'gato', edadAnios: 2, edadTexto: '2 años', tamano: 'pequeno', personalidad: ['independiente'],
  compatibilidad: { ninos: true, gatos: true, perros: false, apartamento: true }, urgencia: 0.3,
})

export class RagFalso implements ServicioRag {
  constructor(public perritos: PerritoPublico[] = [TOBY, MATEO, LUNA]) {}
  consultas: string[] = []
  async listar(o: { especie?: 'perro' | 'gato'; limite?: number } = {}) {
    return this.perritos.filter((p) => !o.especie || p.especie === o.especie).slice(0, o.limite ?? 100)
  }
  async buscar(consulta: string, limite = 5): Promise<RespuestaBusqueda> {
    this.consultas.push(consulta)
    return { consulta, modo: 'lexica', resultados: this.perritos.slice(0, limite).map((perrito) => ({ perrito, puntaje: 0.8, motivo: 'encaja con lo que buscas' })) }
  }
  async porId(id: string) {
    return this.perritos.find((p) => p.id === id) ?? null
  }
  async urgentes(limite = 3) {
    return [...this.perritos].sort((a, b) => b.urgencia - a.urgencia).slice(0, limite)
  }
}

/** Devuelve, en orden, las respuestas que se le encolan; si se acaban, repite la última. Guarda cada llamada. */
export class LlmFalso implements Llm {
  respuestas: unknown[] = []
  llamadas: Parameters<Llm['json']>[0][] = []
  fallaEmbeddings = false
  responder(...r: unknown[]) {
    this.respuestas.push(...r)
  }
  async json<T>(p: Parameters<Llm['json']>[0]): Promise<T> {
    this.llamadas.push(p)
    const r = this.respuestas.length > 1 ? this.respuestas.shift() : this.respuestas[0]
    if (r instanceof Error) throw r
    if (r === undefined) throw new Error('LlmFalso sin respuesta encolada')
    return r as T
  }
  /** Vectores deterministas por bolsa de palabras (64 dimensiones): textos parecidos quedan cerca */
  async embeber(textos: string[]): Promise<number[][]> {
    if (this.fallaEmbeddings) throw new Error('embeddings caídos')
    return textos.map((t) => {
      const v = new Array<number>(64).fill(0)
      for (const w of t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(Boolean)) {
        let h = 0
        for (const c of w) h = (h * 31 + c.charCodeAt(0)) % 64
        v[h] = (v[h] ?? 0) + 1
      }
      return v
    })
  }
}

// Motor RAG: arma los perfiles ricos desde los datos del albergue, los guarda unos segundos en memoria
// y responde listados y búsquedas. Si Gemini falla, la búsqueda sigue funcionando solo con palabras.
import type { DatosAlbergue } from '../panel-tipos.js'
import { actividadHoy } from './actividad.js'
import { crearIndiceSemantico, ordenar, sugerirUrgentes, textoDocumento } from './buscar.js'
import { construirPerfil, esVisible } from './perfil.js'
import type { Llm, OpcionesListado, PerfilCurado, PerritoPublico, RespuestaBusqueda, ServicioRag } from './tipos.js'

export interface OpcionesRag {
  /** Normalmente `() => deps.repo.hoy(deps.ahora())` */
  datos: () => Promise<DatosAlbergue>
  /** Sin él (o si falla) la búsqueda es solo léxica */
  llm?: Llm
  ahora: () => Date
  /** Perfiles curados por nombre normalizado; por defecto los de rag/perfiles-data.ts */
  perfiles?: Record<string, PerfilCurado>
  /** Cuánto se reutiliza la foto de los datos (15 s por defecto) */
  ttlMs?: number
}

const TTL_POR_DEFECTO_MS = 15_000
/** Tras un fallo de embeddings no se vuelve a intentar durante este tiempo: la búsqueda no espera a Gemini caído */
const ENFRIAMIENTO_EMBEDDINGS_MS = 30_000
const CONSULTAS_EN_CACHE = 100

/** Carga rag/perfiles-data.ts si existe. Ruta en variable para que la ausencia del archivo no rompa el arranque. */
async function perfilesPorDefecto(): Promise<Record<string, PerfilCurado>> {
  try {
    const ruta = './perfiles-data.js'
    const modulo = (await import(/* @vite-ignore */ ruta)) as { PERFILES_CURADOS?: Record<string, PerfilCurado> }
    return modulo.PERFILES_CURADOS ?? {}
  } catch {
    return {}
  }
}

export function crearRag(o: OpcionesRag): ServicioRag {
  const ttl = o.ttlMs ?? TTL_POR_DEFECTO_MS
  const indice = o.llm ? crearIndiceSemantico(o.llm) : null
  const vectoresDeConsulta = new Map<string, number[]>()
  let perfiles: Promise<Record<string, PerfilCurado>> | null = o.perfiles ? Promise.resolve(o.perfiles) : null
  let foto: { en: number; perritos: PerritoPublico[] } | null = null
  let cargando: Promise<PerritoPublico[]> | null = null
  let embeddingsCaidosHasta = 0

  async function construir(): Promise<PerritoPublico[]> {
    const [datos, curados] = await Promise.all([o.datos(), (perfiles ??= perfilesPorDefecto())])
    const ahora = o.ahora()
    return datos.animales.map((a) => ({ ...construirPerfil(a, datos, curados, ahora), hoy: actividadHoy(a.id, datos, ahora) }))
  }

  /** Todos los perfiles (también los ocultos), compartiendo una sola carga entre peticiones simultáneas */
  async function todos(): Promise<PerritoPublico[]> {
    const t = o.ahora().getTime()
    if (foto && t - foto.en < ttl) return foto.perritos
    cargando ??= construir()
      .then((perritos) => {
        foto = { en: t, perritos }
        return perritos
      })
      .catch((e) => {
        // Mejor datos de hace un minuto que una página pública caída
        if (foto) return foto.perritos
        throw e
      })
      .finally(() => {
        cargando = null
      })
    return cargando
  }

  const visibles = async () => (await todos()).filter(esVisible)

  async function vectoresPara(consulta: string, perritos: PerritoPublico[]) {
    if (!o.llm || !indice || o.ahora().getTime() < embeddingsCaidosHasta) return undefined
    try {
      const clave = consulta.toLowerCase()
      const pedirConsulta = async () => {
        const guardado = vectoresDeConsulta.get(clave)
        if (guardado) return guardado
        const [v] = await o.llm!.embeber([consulta], 'consulta')
        if (!v) throw new Error('Gemini no devolvió el embedding de la consulta')
        if (vectoresDeConsulta.size >= CONSULTAS_EN_CACHE) vectoresDeConsulta.delete(vectoresDeConsulta.keys().next().value!)
        vectoresDeConsulta.set(clave, v)
        return v
      }
      const [vc, documentos] = await Promise.all([
        pedirConsulta(),
        indice.vectores(perritos.map((p) => ({ id: p.id, texto: textoDocumento(p) }))),
      ])
      return { consulta: vc, documentos }
    } catch {
      embeddingsCaidosHasta = o.ahora().getTime() + ENFRIAMIENTO_EMBEDDINGS_MS
      return undefined
    }
  }

  return {
    async listar(op: OpcionesListado = {}) {
      const base = op.soloVisibles === false ? await todos() : await visibles()
      return base
        .filter((p) => !op.especie || p.especie === op.especie)
        .sort((a, b) => Number(b.adoptable) - Number(a.adoptable) || b.urgencia - a.urgencia || a.nombre.localeCompare(b.nombre, 'es'))
        .slice(0, op.limite ?? 100)
    },

    async porId(id) {
      return (await todos()).find((p) => p.id === id) ?? null
    },

    async urgentes(limite = 3) {
      return sugerirUrgentes(await visibles(), limite).map((r) => r.perrito)
    },

    async buscar(consulta, limite = 6): Promise<RespuestaBusqueda> {
      const q = consulta.trim()
      const perritos = await visibles()
      if (!q) return { consulta: q, modo: 'lexica', resultados: sugerirUrgentes(perritos, limite) }
      const semantica = await vectoresPara(q, perritos)
      return { consulta: q, modo: semantica ? 'hibrida' : 'lexica', resultados: ordenar({ consulta: q, perritos, limite, semantica }) }
    },
  }
}

// Rutas públicas del RAG (sin sesión): lo que consumen la landing, otras webs y las campañas.
// Todo lo que sale pasa por `aPublico`, una lista blanca de campos: nada interno se cuela por accidente.
import type { Context } from 'hono'
import { cors } from 'hono/cors'
import type { Hono } from 'hono'
import { crearLimitador, ipDe } from './limitador'
import type { ContextoExterno, PerritoPublico } from './tipos'

const LIMITE_MAXIMO = 50
const LIMITE_LISTA = 20
const LIMITE_BUSQUEDA = 6
const LARGO_MAXIMO_CONSULTA = 300

export interface OpcionesRutasRag {
  /** Búsquedas por minuto y por IP (30 por defecto): cada una puede gastar Gemini */
  busquedasPorMinuto?: number
  /** Reloj del limitador, para pruebas */
  ahora?: () => number
}

/** Copia solo los campos públicos: si el tipo crece con algo interno, no sale hasta agregarlo aquí a propósito */
function aPublico(p: PerritoPublico): PerritoPublico {
  return {
    id: p.id,
    nombre: p.nombre,
    especie: p.especie,
    estado: p.estado,
    edadAnios: p.edadAnios,
    edadTexto: p.edadTexto,
    tamano: p.tamano,
    personalidad: p.personalidad,
    historia: p.historia,
    historiaConfirmada: p.historiaConfirmada,
    compatibilidad: p.compatibilidad,
    necesidadesMedicas: p.necesidadesMedicas,
    meta: p.meta,
    foto: p.foto && /^https?:\/\//i.test(p.foto) ? p.foto : null,
    urgencia: p.urgencia,
    adoptable: p.adoptable,
    hoy: { comioHoy: p.hoy.comioHoy, medicinas: p.hoy.medicinas, notaDelDia: p.hoy.notaDelDia },
  }
}

/** undefined si no vino; null si vino mal */
function leerLimite(valor: string | undefined, porDefecto: number): number | null {
  if (valor === undefined || valor === '') return porDefecto
  if (!/^\d+$/.test(valor)) return null
  const n = Number(valor)
  return n >= 1 && n <= LIMITE_MAXIMO ? n : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function montarRutasRag(app: Hono<any>, ctx: ContextoExterno, opciones: OpcionesRutasRag = {}): void {
  // Primero que todo en /api/publico/*: cualquier web puede leer estas rutas. Se incluye POST porque las rutas
  // hermanas (agente de voz, campañas) viven bajo el mismo prefijo y su preflight también pasa por aquí.
  app.use('/api/publico/*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'], allowHeaders: ['Content-Type'], maxAge: 600 }))

  const limitador = crearLimitador(opciones.busquedasPorMinuto ?? 30, 60_000, opciones.ahora)
  const contacto = { whatsapp: ctx.whatsappPublico }

  const error = (c: Context, estado: 400 | 429 | 500, mensaje: string) => {
    c.header('Cache-Control', 'no-store')
    return c.json({ error: mensaje }, estado)
  }

  app.get('/api/publico/rag/perritos', async (c) => {
    const especie = c.req.query('especie')
    if (especie !== undefined && especie !== '' && especie !== 'perro' && especie !== 'gato') return error(c, 400, 'especie debe ser perro o gato')
    const limite = leerLimite(c.req.query('limite'), LIMITE_LISTA)
    if (limite === null) return error(c, 400, `limite debe ser un número entero entre 1 y ${LIMITE_MAXIMO}`)
    try {
      const perritos = await ctx.rag.listar({ especie: especie ? (especie as 'perro' | 'gato') : undefined, limite })
      c.header('Cache-Control', 'public, max-age=15')
      return c.json({ total: perritos.length, contacto, perritos: perritos.map(aPublico) })
    } catch (e) {
      console.error('[rag] listar falló:', e)
      return error(c, 500, 'No pudimos cargar los perritos ahora. Intenta de nuevo en un momento.')
    }
  })

  app.get('/api/publico/rag/buscar', async (c) => {
    if (!limitador.permitir(ipDe(c.req.raw.headers))) return error(c, 429, 'Demasiadas búsquedas seguidas. Espera un minuto e intenta de nuevo.')
    const q = c.req.query('q')?.trim()
    if (!q) return error(c, 400, 'Falta q: escribe qué tipo de compañero buscas.')
    if (q.length > LARGO_MAXIMO_CONSULTA) return error(c, 400, `q no puede pasar de ${LARGO_MAXIMO_CONSULTA} caracteres`)
    const limite = leerLimite(c.req.query('limite'), LIMITE_BUSQUEDA)
    if (limite === null) return error(c, 400, `limite debe ser un número entero entre 1 y ${LIMITE_MAXIMO}`)
    try {
      const r = await ctx.rag.buscar(q, limite)
      c.header('Cache-Control', 'public, max-age=15')
      return c.json({
        consulta: r.consulta,
        modo: r.modo,
        contacto,
        resultados: r.resultados.map((x) => ({ perrito: aPublico(x.perrito), puntaje: x.puntaje, motivo: x.motivo })),
      })
    } catch (e) {
      console.error('[rag] buscar falló:', e)
      return error(c, 500, 'No pudimos buscar ahora. Intenta de nuevo en un momento.')
    }
  })
}

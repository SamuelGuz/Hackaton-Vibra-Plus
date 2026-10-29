// GET /api/publico/meta-del-dia: la barra de meta y el muro de confianza de la página de las tiendas de barrio.
// Pública (sin sesión) y de solo lectura. Sale solo de lo CONFIRMADO hoy, así que cada audio que Yesenia guarda
// o confirma se ve en vivo. Filtro de privacidad: cero nombres de personas, ni notas, ni teléfonos; solo nombres
// de animales, kilos, medicinas y montos.
import type { Hono } from 'hono'
import { cors } from 'hono/cors'
import { kgDeMovimiento } from '../datos/calculos.js'
import { fechaLocal, pesos } from '../formato.js'
import type { DatosAlbergue } from '../panel-tipos.js'
import { crearLimitador, ipDe } from '../rag/limitador.js'
import type { Deps } from '../tipos.js'

export const META_KG_POR_DEFECTO = 25
export const META_PESOS_POR_DEFECTO = 150_000
const MAX_ACCIONES = 8
const PETICIONES_POR_MINUTO = 60

export interface MetaDelDia {
  metaKg: number
  recaudadoKg: number
  metaPesos: number
  recaudadoPesos: number
  ultimasAcciones: { hora: string; texto: string }[]
}

/** '2026-10-27T09:15' → '09:15 AM' */
function horaPublica(fechaHora: string): string {
  const [h, m] = fechaHora.slice(11, 16).split(':').map(Number)
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

const redondear = (n: number) => Math.round(n * 10) / 10
const kgHablados = (kg: number) => `${redondear(kg).toLocaleString('es-CO', { maximumFractionDigits: 1 })} kg`
const para = (especie: string) => (especie === 'gato' ? 'los gatos' : 'los perros')

/** Lo de hoy, listo para mostrar en público. Las frases se arman aquí: nunca se copia texto que haya dicho alguien. */
export function metaDelDia(d: DatosAlbergue, ahora: Date): MetaDelDia {
  const hoy = fechaLocal(ahora)
  const deHoy = <T extends { fechaHora: string }>(lista: T[]) => lista.filter((x) => x.fechaHora.startsWith(hoy))
  const animal = (id: string) => d.animales.find((a) => a.id === id)?.nombre ?? null
  const acciones: { fechaHora: string; texto: string }[] = []

  const llegadas = deHoy(d.inventario).filter((m) => m.cambio > 0)
  for (const m of llegadas) {
    const texto =
      m.unidad === 'kg'
        ? `Llegaron ${kgHablados(kgDeMovimiento(d, m))} de carne para ${para(m.tipo)}`
        : `Llegaron ${m.cambio === 1 ? '1 bulto' : `${m.cambio} bultos`} de concentrado para ${para(m.tipo)}`
    acciones.push({ fechaHora: m.fechaHora, texto })
  }

  for (const x of deHoy(d.dosisDadas)) {
    const t = d.tratamientos.find((y) => y.id === x.tratamientoId)
    const nombre = t && animal(t.animalId)
    if (t && nombre) acciones.push({ fechaHora: x.fechaHora, texto: `${nombre} recibió su ${t.medicamento}` })
  }

  for (const n of deHoy(d.notas)) {
    const nombre = animal(n.animalId)
    if (nombre) acciones.push({ fechaHora: n.fechaHora, texto: `Cuidaron a ${nombre} y anotaron cómo sigue` })
  }

  const ingresos = deHoy(d.movimientos).filter((m) => m.tipo === 'ingreso')
  for (const m of ingresos) acciones.push({ fechaHora: m.fechaHora, texto: `Llegó un aporte de ${pesos(m.monto)}` })

  return {
    metaKg: d.metaDelDia?.kg ?? META_KG_POR_DEFECTO,
    recaudadoKg: redondear(llegadas.reduce((suma, m) => suma + kgDeMovimiento(d, m), 0)),
    metaPesos: d.metaDelDia?.pesos ?? META_PESOS_POR_DEFECTO,
    recaudadoPesos: ingresos.reduce((suma, m) => suma + m.monto, 0),
    ultimasAcciones: acciones
      .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
      .slice(0, MAX_ACCIONES)
      .map((a) => ({ hora: horaPublica(a.fechaHora), texto: a.texto })),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function montarRutaMetaDelDia(app: Hono<any>, deps: Deps): void {
  const limitador = crearLimitador(PETICIONES_POR_MINUTO, 60_000)
  app.use('/api/publico/meta-del-dia', cors({ origin: '*', allowMethods: ['GET', 'OPTIONS'], maxAge: 600 }))
  app.get('/api/publico/meta-del-dia', async (c) => {
    if (!limitador.permitir(ipDe(c.req.raw.headers))) return c.json({ error: 'Demasiadas consultas seguidas. Espera un minuto.' }, 429)
    try {
      const ahora = deps.ahora()
      c.header('Cache-Control', 'public, max-age=15')
      return c.json(metaDelDia(await deps.repo.hoy(ahora), ahora))
    } catch (e) {
      console.error('No se pudo armar la meta del día:', e)
      return c.json({ error: 'No pudimos traer la meta del día. Intenta en un momento.' }, 503)
    }
  })
}

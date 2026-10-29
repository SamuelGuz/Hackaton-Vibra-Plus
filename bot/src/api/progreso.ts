// La página web pública (panel/pagina-web-v2) lee de aquí la misión de la semana, lo que hace Yesenia y las donaciones.
// GET  /api/publico/progreso  → la misma forma que su /data/progreso.json (versión 2), con datos reales y confirmados.
// POST /api/publico/donacion  → "Ya doné" de la página: queda por confirmar y a la administración le llega el aviso.
// Filtro de privacidad: cero nombres de personas, notas o teléfonos. Las frases se arman aquí con animales, kilos y montos.
import type { Hono } from 'hono'
import { cors } from 'hono/cors'
import { kgDeMovimiento } from '../datos/calculos.js'
import { fechaLocal } from '../formato.js'
import type { DatosAlbergue } from '../panel-tipos.js'
import { crearLimitador, ipDe } from '../rag/limitador.js'
import type { Deps } from '../tipos.js'
import { avisarDonacion } from './donaciones.js'
import { metaDelDia } from './publico.js'

export const META_SEMANA_POR_DEFECTO = 200_000
const MAX_COMPRAS = 12
const MAX_DONACIONES = 12
const DIAS_HISTORIAL = 7
export const MONTO_MINIMO = 1_000
export const MONTO_MAXIMO = 10_000_000

type TipoCompra = 'bulto' | 'carne' | 'salud' | 'recibo' | 'entrega' | 'otro'
interface Compra { fecha: string; texto: string; monto?: number; tipo: TipoCompra }

/** '2026-10-29T15:40' (hora de Bogotá) → '2026-10-29T15:40:00-05:00' */
const iso = (fechaHora: string) => (fechaHora.length === 16 ? `${fechaHora}:00-05:00` : fechaHora)

/** AAAA-MM-DD del lunes de esta semana y de hace `dias` días */
function desde(ahora: Date, dias: number): string {
  const d = new Date(ahora)
  d.setDate(d.getDate() - dias)
  return fechaLocal(d)
}
function lunes(ahora: Date): string {
  return desde(ahora, (ahora.getDay() + 6) % 7)
}

const kg = (n: number) => `${(Math.round(n * 10) / 10).toLocaleString('es-CO', { maximumFractionDigits: 1 })} kg`

const GASTO: Record<string, { texto: string; tipo: TipoCompra }> = {
  comida: { texto: 'Compró comida para los peluditos.', tipo: 'bulto' },
  veterinaria: { texto: 'Pagó veterinaria y medicinas.', tipo: 'salud' },
  limpieza: { texto: 'Compró cosas de aseo para el refugio.', tipo: 'otro' },
  servicios: { texto: 'Pagó agua, luz o internet del refugio.', tipo: 'otro' },
  transporte: { texto: 'Pagó transporte para los animales.', tipo: 'otro' },
}

export function armarProgreso(d: DatosAlbergue, ahora: Date) {
  const semana = lunes(ahora)
  const historial = desde(ahora, DIAS_HISTORIAL)
  const reciente = <T extends { fechaHora: string }>(x: T) => x.fechaHora.slice(0, 10) >= historial
  const animal = (id: string) => d.animales.find((a) => a.id === id)?.nombre ?? null
  const compras: Compra[] = []

  for (const m of d.movimientos.filter(reciente)) {
    if (m.tipo !== 'gasto') continue
    if (m.abonoDeuda) compras.push({ fecha: iso(m.fechaHora), texto: 'Abonó a la deuda con la clínica veterinaria.', monto: m.monto, tipo: 'salud' })
    else {
      const g = GASTO[m.categoria] ?? { texto: 'Hizo una compra para el refugio.', tipo: 'otro' as const }
      compras.push({ fecha: iso(m.fechaHora), texto: g.texto, monto: m.monto, tipo: g.tipo })
    }
  }
  for (const m of d.inventario.filter(reciente)) {
    const para = m.tipo === 'gato' ? 'los gatos' : 'los perros'
    if (m.unidad === 'kg') {
      const k = kg(Math.abs(kgDeMovimiento(d, m)))
      compras.push(m.cambio > 0
        ? { fecha: iso(m.fechaHora), texto: `Recibió ${k} de carne y recortes para ${para}.`, tipo: 'carne' }
        : { fecha: iso(m.fechaHora), texto: `Sirvió ${k} de carne a ${para}.`, tipo: 'entrega' })
    } else {
      const n = Math.abs(m.cambio)
      compras.push(m.cambio > 0
        ? { fecha: iso(m.fechaHora), texto: `Llegaron ${n === 1 ? '1 bulto' : `${n} bultos`} de concentrado para ${para}.`, tipo: 'bulto' }
        : { fecha: iso(m.fechaHora), texto: `Abrió un bulto de concentrado y repartió la comida entre ${para}.`, tipo: 'entrega' })
    }
  }
  for (const x of d.dosisDadas.filter(reciente)) {
    const t = d.tratamientos.find((y) => y.id === x.tratamientoId)
    const nombre = t && animal(t.animalId)
    if (t && nombre) compras.push({ fecha: iso(x.fechaHora), texto: `Le dio su medicina a ${nombre}.`, tipo: 'salud' })
  }

  const ingresos = d.movimientos.filter((m) => m.tipo === 'ingreso')
  const recaudado = ingresos.filter((m) => m.fechaHora.slice(0, 10) >= semana).reduce((s, m) => s + m.monto, 0)
  const meta = d.metaDelDia?.semanaPesos ?? META_SEMANA_POR_DEFECTO

  return {
    version: 2,
    actualizado: ahora.toISOString(),
    periodo: { tipo: 'semana', desde: semana, hasta: fechaLocal(ahora) },
    ejemplo: false,
    metas: [
      { id: 'comida', titulo: 'Comida de la semana', detalle: 'Carne, huesos, menudencias y concentrado.', meta, recaudado, ejemplo: false },
    ],
    compras: compras.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, MAX_COMPRAS),
    // Solo fecha y monto: nunca quién donó (el muro con apodo lo arma Yesenia a mano si la persona lo pide)
    donaciones: ingresos
      .filter(reciente)
      .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
      .slice(0, MAX_DONACIONES)
      .map((m) => ({ fecha: iso(m.fechaHora), monto: m.monto })),
    donantes: [],
    compat: metaDelDia(d, ahora),
  }
}

/** Valida el cuerpo de "Ya doné" */
export function leerDonacion(x: unknown): { monto: number; apodo: string } | { error: string } {
  const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
  const monto = typeof o.monto === 'number' ? Math.round(o.monto) : NaN
  if (!Number.isFinite(monto) || monto < MONTO_MINIMO || monto > MONTO_MAXIMO) {
    return { error: `monto debe ser un número entre ${MONTO_MINIMO} y ${MONTO_MAXIMO}` }
  }
  const apodo = typeof o.apodo === 'string' ? o.apodo.replace(/[\u0000-\u001f\u007f-\u009f‎‏‪-‮]/g, '').trim().slice(0, 24) : ''
  return { monto, apodo }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function montarRutasProgreso(app: Hono<any>, deps: Deps): void {
  const lecturas = crearLimitador(60, 60_000)
  // Un aviso de donación le escribe a la administración: pocos por IP para que nadie la inunde
  const avisos = crearLimitador(5, 10 * 60_000)
  app.use('/api/publico/progreso', cors({ origin: '*', allowMethods: ['GET', 'OPTIONS'], maxAge: 600 }))
  app.use('/api/publico/donacion', cors({ origin: '*', allowMethods: ['POST', 'OPTIONS'], allowHeaders: ['Content-Type'], maxAge: 600 }))

  app.get('/api/publico/progreso', async (c) => {
    if (!lecturas.permitir(ipDe(c.req.raw.headers))) return c.json({ error: 'Demasiadas consultas seguidas. Espera un minuto.' }, 429)
    try {
      const ahora = deps.ahora()
      c.header('Cache-Control', 'public, max-age=20')
      return c.json(armarProgreso(await deps.repo.hoy(ahora), ahora))
    } catch (e) {
      console.error('No se pudo armar el progreso para la página:', e)
      return c.json({ error: 'No pudimos traer el progreso. Intenta en un momento.' }, 503)
    }
  })

  app.post('/api/publico/donacion', async (c) => {
    if (!avisos.permitir(ipDe(c.req.raw.headers))) return c.json({ error: 'Ya recibimos tu aviso. Si hace falta, escríbele a Yesenia por WhatsApp.' }, 429)
    const v = leerDonacion(await c.req.json().catch(() => null))
    if ('error' in v) return c.json({ error: v.error }, 400)
    try {
      await avisarDonacion(deps, { monto: v.monto, de: 'la página web', detalle: v.apodo ? `apodo para el muro: ${v.apodo}` : '' })
      return c.json({ ok: true })
    } catch (e) {
      console.error('No se pudo registrar el aviso de donación de la página:', e)
      return c.json({ error: 'No pudimos avisarle a Yesenia. Escríbele por WhatsApp.' }, 503)
    }
  })
}

// Rutas HTTP: webhook de WhatsApp (/wa), API del panel (/api/*) y archivos (/archivos/*).
import { Hono, type Context } from 'hono'
import { cors } from 'hono/cors'
import { armarEventos, type FilasEventos, type Rango } from './api/hoy.js'
import { validarCambioEstado, validarEvento } from './api/eventos.js'
import { atender } from './conversacion/atender.js'
import { fechaLocal } from './formato.js'
import { textos } from './textos.js'
import type { Accion, Deps, Usuario } from './tipos.js'
import { firmaValida, leerMensajes, type MensajeWa } from './wa/webhook.js'

export interface ConfigApp {
  deps: Deps
  usuarioPorSesion(token: string): Promise<Usuario | null>
  eventos(r: Rango): Promise<FilasEventos>
  leerArchivo(nombre: string): Promise<{ datos: Buffer; mime: string } | null>
  verifyToken: string
  appSecret: string
}

const TIPOS_EVENTO = { dosis: 'dosisDadas', inventario: 'inventario', movimiento: 'movimientos', nota: 'notas' } as const
const FECHA = /^\d{4}-\d{2}-\d{2}$/
const HORAS_AVISO_DESCONOCIDO = 24

export function crearApp(cfg: ConfigApp) {
  const { deps } = cfg
  const app = new Hono<{ Variables: { usuario: Usuario } }>()

  // ---------- WhatsApp ----------

  // Mensajes de una misma persona se atienden en orden, uno a la vez
  const colas = new Map<string, Promise<void>>()
  const avisadosDesconocidos = new Map<string, number>()

  async function procesar(m: MensajeWa) {
    if (!(await deps.repo.marcarMensaje(m.id))) return
    const usuario = await deps.repo.usuarioPorTelefono(m.de)
    if (!usuario) {
      const ultimo = avisadosDesconocidos.get(m.de) ?? 0
      if (Date.now() - ultimo > HORAS_AVISO_DESCONOCIDO * 3_600_000) {
        avisadosDesconocidos.set(m.de, Date.now())
        await deps.wa.enviar(m.de, { tipo: 'texto', texto: textos.desconocido })
      }
      return
    }
    await atender(deps, usuario, m.entrada)
  }

  function encolar(m: MensajeWa): Promise<void> {
    const antes = colas.get(m.de) ?? Promise.resolve()
    const ahora = antes.then(() => procesar(m)).catch((e) => console.error('Error con un mensaje de WhatsApp:', e))
    colas.set(m.de, ahora)
    void ahora.finally(() => {
      if (colas.get(m.de) === ahora) colas.delete(m.de)
    })
    return ahora
  }

  app.get('/wa', (c) => {
    const q = c.req.query()
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === cfg.verifyToken) return c.text(q['hub.challenge'] ?? '')
    return c.text('Token incorrecto', 403)
  })

  app.post('/wa', async (c) => {
    const cuerpo = await c.req.text()
    if (!firmaValida(cuerpo, c.req.header('x-hub-signature-256'), cfg.appSecret)) return c.text('Firma inválida', 401)
    let json: unknown
    try {
      json = JSON.parse(cuerpo)
    } catch {
      return c.text('JSON inválido', 400)
    }
    // Se responde de una vez: si Meta espera mucho, reenvía el mensaje
    leerMensajes(json as Record<string, unknown>).forEach(encolar)
    return c.text('ok')
  })

  // ---------- Sesión del panel ----------

  async function exigirSesion(c: Context, next: () => Promise<void>) {
    const cabecera = c.req.header('authorization')
    const token = cabecera?.startsWith('Bearer ') ? cabecera.slice(7) : c.req.query('t')
    const usuario = token ? await cfg.usuarioPorSesion(token) : null
    if (!usuario) return c.json({ error: 'Falta iniciar sesión: pídele al bot el enlace del panel' }, 401)
    c.set('usuario', usuario)
    await next()
  }

  app.use(
    '/api/*',
    cors({
      origin: deps.panelUrl.replace(/\/$/, ''),
      allowHeaders: ['Authorization', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'OPTIONS'],
    }),
  )
  app.use('/api/*', exigirSesion)

  // ---------- API del panel ----------

  app.get('/api/hoy', async (c) => {
    const datos = await deps.repo.hoy(deps.ahora())
    return c.json({ ...datos, yo: String(c.get('usuario').id) })
  })

  app.get('/api/eventos', async (c) => {
    const hoy = fechaLocal(deps.ahora())
    const desde = c.req.query('desde') ?? hoy
    const hasta = c.req.query('hasta') ?? hoy
    const tipo = c.req.query('tipo')
    if (!FECHA.test(desde) || !FECHA.test(hasta)) return c.json({ error: 'desde y hasta van como AAAA-MM-DD' }, 400)
    if (tipo && !(tipo in TIPOS_EVENTO)) return c.json({ error: `tipo debe ser uno de: ${Object.keys(TIPOS_EVENTO).join(', ')}` }, 400)
    const eventos = armarEventos(await cfg.eventos({ desde, hasta }))
    if (!tipo) return c.json(eventos)
    const clave = TIPOS_EVENTO[tipo as keyof typeof TIPOS_EVENTO]
    return c.json({ [clave]: eventos[clave] })
  })

  /**
   * La foto del recibo llega del panel como data URL (unos 100 KB). Se guarda como archivo y en la base
   * queda solo su ruta: el espejo copia la base a Sheets y una celda no acepta más de 50.000 caracteres.
   */
  async function guardarFoto(a: Accion): Promise<Accion> {
    if (a.tipo !== 'movimiento' || !a.movimiento.foto?.startsWith('data:')) return a
    const partes = /^data:([^;,]+);base64,(.+)$/.exec(a.movimiento.foto)
    const foto = partes ? await deps.archivos.guardar(Buffer.from(partes[2], 'base64'), partes[1]) : null
    return { ...a, movimiento: { ...a.movimiento, foto } }
  }

  // Lo que se toca en el panel es una decisión humana directa: nace confirmado (PLAN_INTEGRADO §3.3)
  app.post('/api/eventos', async (c) => {
    const cuerpo = await c.req.json().catch(() => null)
    const lista = Array.isArray(cuerpo) ? cuerpo : cuerpo?.eventos
    if (!Array.isArray(lista)) return c.json({ error: 'Se espera una lista de eventos' }, 400)
    const usuario = c.get('usuario')
    const guardados: { id: string; registroId: string }[] = []
    const errores: { id: unknown; error: string }[] = []
    for (const crudo of lista) {
      const v = validarEvento(crudo)
      if ('error' in v) {
        errores.push({ id: crudo?.id, error: v.error })
        continue
      }
      const { id, ...sinId } = v.ok
      try {
        const accion = await guardarFoto(sinId)
        const registroId = await deps.repo.crearRegistro({
          usuarioId: usuario.id,
          canal: 'panel',
          tipoEntrada: 'boton',
          transcripcion: 'Registrado en el panel',
          acciones: [accion],
          estado: 'confirmado',
          clienteId: id,
        })
        guardados.push({ id, registroId })
      } catch (e) {
        errores.push({ id, error: e instanceof Error ? e.message : 'No se pudo guardar' })
      }
    }
    return c.json({ guardados, errores }, errores.length && !guardados.length ? 400 : 200)
  })

  app.post('/api/eventos/estado', async (c) => {
    const v = validarCambioEstado(await c.req.json().catch(() => null))
    if (!v) return c.json({ error: 'Se espera { ids: [...], estado: "confirmado" | "corregido" | "anulado" }' }, 400)
    const cambiados = await deps.repo.cambiarEstado(v.ids, v.estado)
    return c.json({ cambiados })
  })

  // ---------- Archivos (audios y fotos) ----------

  app.get('/archivos/:nombre', exigirSesion, async (c) => {
    const a = await cfg.leerArchivo(c.req.param('nombre') ?? '')
    if (!a) return c.text('No existe', 404)
    return c.body(new Uint8Array(a.datos), 200, { 'Content-Type': a.mime, 'Cache-Control': 'private, max-age=86400' })
  })

  app.get('/salud', (c) => c.text('ok'))

  /** Espera a que se terminen de atender los mensajes que ya llegaron */
  const ociosa = async () => {
    while (colas.size) await Promise.all(colas.values())
  }
  return Object.assign(app, { ociosa })
}

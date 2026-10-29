// Rutas HTTP: webhook de WhatsApp (/wa), API del panel (/api/*) y archivos (/archivos/*).
import { Hono, type Context } from 'hono'
import { cors } from 'hono/cors'
import { armarEventos, type FilasEventos, type Rango } from './api/hoy.js'
import { validarMiembro } from './api/equipo.js'
import { validarCambioEstado, validarEvento } from './api/eventos.js'
import { datosParaRol, esDePlata, manejaPlata, veraPlata } from './api/permisos.js'
import { montarRutaMetaDelDia } from './api/publico.js'
import { montarRutasFotosCatalogo } from './catalogo/index.js'
import { pendientesDeHoy, veAdoptantes } from './adopcion/seguimientos.js'
import { sugerencia, validarCambioSolicitud, validarSolicitudFormulario } from './adopcion/solicitudes.js'
import { atenderInteresadoExterno, montarRutasAgente } from './adopciones-agente/index.js'
import { montarRutasCampanas, type ConfigCorreo, type Correo } from './campanas/index.js'
import { atender } from './conversacion/atender.js'
import { fechaLocal } from './formato.js'
import { montarRutasRag } from './rag/index.js'
import type { ContextoExterno } from './rag/tipos.js'
import { textos } from './textos.js'
import type { Accion, Deps, Usuario } from './tipos.js'
import { firmaValida, leerMensajes, type MensajeWa } from './wa/webhook.js'

/** Frente externo (interesados en adoptar o apadrinar): RAG, agente emocional y campañas de correo */
export type ConfigExterno = ContextoExterno & { correo: { config: ConfigCorreo; enviador: Correo | null } }

export interface ConfigApp {
  deps: Deps
  /** Sin esto, los números desconocidos reciben el aviso de siempre y no hay rutas públicas */
  externo?: ConfigExterno
  usuarioPorSesion(token: string): Promise<Usuario | null>
  eventos(r: Rango): Promise<FilasEventos>
  leerArchivo(nombre: string): Promise<{ datos: Buffer; mime: string } | null>
  verifyToken: string
  appSecret: string
}

const TIPOS_EVENTO = { dosis: 'dosisDadas', inventario: 'inventario', movimiento: 'movimientos', nota: 'notas' } as const
const FECHA = /^\d{4}-\d{2}-\d{2}$/
const HORAS_AVISO_DESCONOCIDO = 24
/** Espera antes de cada reintento de un mensaje. Al agotarlas, el mensaje queda como fallido. */
export const ESPERAS_REINTENTO_SEG = [10, 60, 300]
/** Un mensaje que lleva más que esto sin atender ya no se contesta: la respuesta llegaría fuera de lugar */
const HORAS_VENCE_ENTRANTE = 12

export function crearApp(cfg: ConfigApp) {
  const { deps } = cfg
  const app = new Hono<{ Variables: { usuario: Usuario } }>()

  // ---------- WhatsApp ----------

  // Mensajes de una misma persona se atienden en orden, uno a la vez
  const colas = new Map<string, Promise<void>>()
  const enCurso = new Set<string>()
  const avisadosDesconocidos = new Map<string, number>()

  async function procesar(m: MensajeWa) {
    const usuario = await deps.repo.usuarioPorTelefono(m.de)
    if (!usuario) {
      // Alguien de afuera (posible adoptante o padrino): lo atiende el agente emocional en vez del aviso de siempre
      if (cfg.externo) return atenderInteresadoExterno(deps, m.de, m.entrada, cfg.externo, { mensajeId: m.id })
      await deps.repo.anotarSolicitud(m.de, m.nombre ?? null)
      const ultimo = avisadosDesconocidos.get(m.de) ?? 0
      if (Date.now() - ultimo > HORAS_AVISO_DESCONOCIDO * 3_600_000) {
        avisadosDesconocidos.set(m.de, Date.now())
        await deps.wa.enviar(m.de, { tipo: 'texto', texto: textos.desconocido })
      }
      return
    }
    await atender(deps, usuario, m.entrada)
  }

  /** El mensaje se cierra en el buzón solo cuando ya se atendió. Si algo falla, queda para reintentar. */
  async function atenderDelBuzon(m: MensajeWa, intentos: number) {
    try {
      await procesar(m)
      await deps.repo.cerrarEntrante(m.id, 'atendido')
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      const espera = ESPERAS_REINTENTO_SEG[intentos]
      console.error(`Error con un mensaje de WhatsApp (intento ${intentos + 1}):`, e)
      if (espera === undefined) await deps.repo.cerrarEntrante(m.id, 'fallido', error)
      else await deps.repo.reintentarEntrante(m.id, new Date(deps.ahora().getTime() + espera * 1000), error)
    }
  }

  function encolar(m: MensajeWa, intentos = 0) {
    if (enCurso.has(m.id)) return
    enCurso.add(m.id)
    const antes = colas.get(m.de) ?? Promise.resolve()
    const ahora = antes
      .then(() => atenderDelBuzon(m, intentos))
      .catch((e) => console.error('El buzón no pudo anotar cómo terminó un mensaje:', e))
      .finally(() => enCurso.delete(m.id))
    colas.set(m.de, ahora)
    void ahora.finally(() => {
      if (colas.get(m.de) === ahora) colas.delete(m.de)
    })
  }

  /** Retoma lo que quedó pendiente en el buzón: al arrancar (si el bot se cayó) y cada rato (reintentos). */
  async function retomar(): Promise<number> {
    const ahora = deps.ahora()
    const pendientes = await deps.repo.entrantesPendientes(ahora, 50)
    for (const m of pendientes) {
      if (ahora.getTime() - m.recibidoEn.getTime() > HORAS_VENCE_ENTRANTE * 3_600_000) {
        await deps.repo.cerrarEntrante(m.id, 'fallido', 'vencido: llevaba demasiado tiempo sin atender')
      } else encolar(m, m.intentos)
    }
    return pendientes.length
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
    // Se guarda en el buzón y se responde de una vez: si Meta espera mucho, reenvía el mensaje.
    // Si no se pudo guardar, el 500 hace que Meta lo vuelva a mandar.
    try {
      for (const m of leerMensajes(json as Record<string, unknown>)) {
        if (await deps.repo.guardarEntrante(m, deps.ahora())) encolar(m)
      }
    } catch (e) {
      console.error('No se pudo guardar un mensaje de WhatsApp en el buzón:', e)
      return c.text('No se pudo guardar', 500)
    }
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

  // ---------- API pública (sin sesión): va antes de exigirSesion y del CORS del panel ----------

  // La barra de meta y el muro de la página de las tiendas: siempre prendida, no gasta IA
  montarRutaMetaDelDia(app, deps)

  if (cfg.externo) {
    montarRutasRag(app, cfg.externo)
    montarRutasFotosCatalogo(app)
    montarRutasAgente(app, deps, cfg.externo)
    montarRutasCampanas(app, cfg.externo, cfg.externo.correo.config, cfg.externo.correo.enviador)
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
    const usuario = c.get('usuario')
    // Quien no es administración recibe todo menos la plata (caja, movimientos, deuda)
    const datos = datosParaRol(await deps.repo.hoy(deps.ahora()), usuario)
    const solicitudesEquipo = usuario.rol === 'admin' ? await deps.repo.contarSolicitudes() : 0
    return c.json({ ...datos, yo: String(usuario.id), solicitudesEquipo })
  })

  // ---------- Seguimientos de adopción: a quién toca llamar hoy ----------

  // Todo el equipo ve la lista; el teléfono del adoptante, solo administración y adopciones (como las solicitudes)
  app.get('/api/seguimientos/hoy', async (c) => {
    const ahora = deps.ahora()
    const hoy = fechaLocal(ahora)
    const conTelefono = veAdoptantes(c.get('usuario').rol)
    const lista = pendientesDeHoy(await deps.repo.seguimientosAdopcion(), ahora)
    return c.json({
      fecha: hoy,
      seguimientos: lista.map((s) => ({
        id: s.id,
        adopcionId: s.adopcionId,
        animalId: s.animalId,
        animalNombre: s.animalNombre,
        dia: s.dia,
        fecha: s.fecha,
        fechaEntrega: s.fechaEntrega,
        adoptanteNombre: s.adoptanteNombre,
        adoptanteTelefono: conTelefono ? s.adoptanteTelefono || null : null,
        atrasado: s.fecha < hoy,
      })),
    })
  })

  // ---------- Equipo (solo la administradora) ----------

  async function soloAdmin(c: Context, next: () => Promise<void>) {
    if (c.get('usuario').rol !== 'admin') return c.json({ error: 'Solo la administración maneja el equipo' }, 403)
    await next()
  }
  app.use('/api/equipo', soloAdmin)
  app.use('/api/equipo/*', soloAdmin)

  app.get('/api/equipo', async (c) => c.json(await deps.repo.equipo()))

  app.post('/api/equipo', async (c) => {
    const v = validarMiembro(await c.req.json().catch(() => null))
    if ('error' in v) return c.json({ error: v.error }, 400)
    const persona = await deps.repo.agregarAlEquipo(v.ok)
    avisadosDesconocidos.delete(persona.telefono)
    // Fuera de la ventana de 24 h de WhatsApp el aviso no sale: la persona igual ya puede escribir
    const avisado = await deps.wa
      .enviar(persona.telefono, { tipo: 'texto', texto: textos.agregadoAlEquipo(persona.nombre) })
      .then(() => true)
      .catch((e) => {
        console.error('No se pudo avisar a la persona nueva:', e)
        return false
      })
    return c.json({ persona, avisado })
  })

  // ---------- Solicitudes de adopción (solo adopciones y administración: llevan cédula, dirección y teléfono) ----------

  async function soloAdopciones(c: Context, next: () => Promise<void>) {
    const rol = c.get('usuario').rol
    if (rol !== 'admin' && rol !== 'adopciones') return c.json({ error: 'Las solicitudes de adopción las ve el equipo de adopciones' }, 403)
    await next()
  }
  app.use('/api/adopciones', soloAdopciones)
  app.use('/api/adopciones/*', soloAdopciones)

  app.get('/api/adopciones/solicitudes', async (c) => {
    const solicitudes = await deps.repo.solicitudesAdopcion()
    return c.json({ solicitudes: solicitudes.map((s) => ({ ...s, sugerencia: sugerencia(s) })) })
  })

  // Importa una respuesta del formulario. Idempotente por su id: importarla otra vez actualiza, no duplica.
  app.post('/api/adopciones/solicitudes', async (c) => {
    const v = validarSolicitudFormulario(await c.req.json().catch(() => null))
    if ('error' in v) return c.json({ error: v.error }, 400)
    return c.json(await deps.repo.guardarSolicitudAdopcion(v.ok, deps.ahora()))
  })

  // Lo que decide la coordinación: montón, nota y llamada. Solo viaja lo que cambió.
  app.post('/api/adopciones/solicitudes/:id', async (c) => {
    const v = validarCambioSolicitud(await c.req.json().catch(() => null))
    if ('error' in v) return c.json({ error: v.error }, 400)
    if (!(await deps.repo.cambiarSolicitudAdopcion(c.req.param('id'), v.ok))) return c.json({ error: 'Esa solicitud no existe' }, 404)
    return c.json({ ok: true })
  })

  app.post('/api/equipo/:id/activo', async (c) => {
    const id = Number(c.req.param('id'))
    const activo = (await c.req.json().catch(() => null))?.activo
    if (!Number.isInteger(id) || typeof activo !== 'boolean') return c.json({ error: 'Se espera { activo: true | false }' }, 400)
    if (!activo && id === c.get('usuario').id) return c.json({ error: 'No te puedes quitar a ti misma del equipo' }, 400)
    if (!(await deps.repo.cambiarActivo(id, activo))) return c.json({ error: 'Esa persona no existe' }, 404)
    return c.json({ ok: true })
  })

  app.post('/api/equipo/solicitudes/descartar', async (c) => {
    const telefono = (await c.req.json().catch(() => null))?.telefono
    if (typeof telefono !== 'string') return c.json({ error: 'Se espera { telefono }' }, 400)
    await deps.repo.descartarSolicitud(telefono)
    return c.json({ ok: true })
  })

  app.get('/api/eventos', async (c) => {
    const hoy = fechaLocal(deps.ahora())
    const desde = c.req.query('desde') ?? hoy
    const hasta = c.req.query('hasta') ?? hoy
    const tipo = c.req.query('tipo')
    if (!FECHA.test(desde) || !FECHA.test(hasta)) return c.json({ error: 'desde y hasta van como AAAA-MM-DD' }, 400)
    if (tipo && !(tipo in TIPOS_EVENTO)) return c.json({ error: `tipo debe ser uno de: ${Object.keys(TIPOS_EVENTO).join(', ')}` }, 400)
    const eventos = armarEventos(await cfg.eventos({ desde, hasta }))
    if (!veraPlata(c.get('usuario').rol)) eventos.movimientos = []
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
    let negados = 0
    for (const crudo of lista) {
      const v = validarEvento(crudo)
      if ('error' in v) {
        errores.push({ id: crudo?.id, error: v.error })
        continue
      }
      if (esDePlata(v.ok) && !manejaPlata(usuario.rol)) {
        negados++
        errores.push({ id: v.ok.id, error: textos.panelSinPlata })
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
    // Si no se guardó nada: 403 cuando todo lo rechazado era plata sin permiso, 400 si había algo mal formado
    const estado = guardados.length || !errores.length ? 200 : negados === errores.length ? 403 : 400
    return c.json({ guardados, errores }, estado)
  })

  app.post('/api/eventos/estado', async (c) => {
    const v = validarCambioEstado(await c.req.json().catch(() => null))
    if (!v) return c.json({ error: 'Se espera { ids: [...], estado: "confirmado" | "corregido" | "anulado" }' }, 400)
    if (!manejaPlata(c.get('usuario').rol)) {
      const registros = await Promise.all(v.ids.map((id) => deps.repo.leerRegistro(id)))
      if (registros.some((r) => r?.acciones.some(esDePlata))) return c.json({ error: textos.panelSinPlata }, 403)
    }
    const cambiados = await deps.repo.cambiarEstado(v.ids, v.estado)
    return c.json({ cambiados })
  })

  // ---------- Archivos (audios y fotos) ----------

  app.get('/archivos/:nombre', exigirSesion, async (c) => {
    const nombre = c.req.param('nombre') ?? ''
    // Un recibo o una factura (de plata) lo abre la administración o quien lo subió; audios y fotos de notas, todo el equipo
    const usuario = c.get('usuario')
    if (!veraPlata(usuario.rol)) {
      const recibo = await deps.repo.duenoDeRecibo(`/archivos/${nombre}`)
      if (recibo && recibo.usuarioId !== usuario.id) return c.text('Ese archivo es de la caja: lo ve la administración', 403)
    }
    const a = await cfg.leerArchivo(nombre)
    if (!a) return c.text('No existe', 404)
    return c.body(new Uint8Array(a.datos), 200, { 'Content-Type': a.mime, 'Cache-Control': 'private, max-age=86400' })
  })

  app.get('/salud', (c) => c.text('ok'))

  /** Espera a que se terminen de atender los mensajes que ya llegaron */
  const ociosa = async () => {
    while (colas.size) await Promise.all(colas.values())
  }
  return Object.assign(app, { ociosa, retomar })
}

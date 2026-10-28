// Rutas públicas de campañas: sin sesión y con CORS abierto. Enviar correo de verdad exige la clave de campañas.
import { createHash, timingSafeEqual } from 'node:crypto'
import type { Context, Hono } from 'hono'
import { cors } from 'hono/cors'
import { crearLimitador, ipDe } from '../rag/limitador'
import type { ContextoExterno } from '../rag/tipos'
import { enviarCampana, limpiarDestinatarios } from './enviar'
import { generarCampana, LIMITE_MAXIMO, validarCampana, type OpcionesCampana } from './generar'
import { completar } from './plantilla'
import type { Campana, CampanaEstructura, ConfigCorreo, Correo } from './tipos'

const BASE = '/api/publico/campanas'
const PETICIONES_POR_VENTANA = 10
const VENTANA_MS = 10 * 60_000
const MAX_DESTINATARIOS = 50
const MAX_ID_PERRO = 40
const MAX_TONO = 100

type OpcionesRuta = Omit<OpcionesCampana, 'urlBase'>

/**
 * Registra las rutas públicas de campañas. Van antes de exigirSesion en app.ts.
 * Generar y enviar comparten un límite por IP: enviar también protege la clave contra adivinanzas.
 */
export function montarRutasCampanas(app: Hono<any>, ctx: ContextoExterno, cfg: ConfigCorreo, correo: Correo | null): void {
  const limitador = crearLimitador(PETICIONES_POR_VENTANA, VENTANA_MS)

  function claveCorrecta(enviada: string | undefined): boolean {
    if (!cfg.claveEnvio || !enviada) return false
    // Se comparan los hashes para que el largo de la clave no se filtre
    const huella = (t: string) => createHash('sha256').update(t).digest()
    return timingSafeEqual(huella(enviada), huella(cfg.claveEnvio))
  }

  app.use(`${BASE}/*`, cors({ origin: '*', allowMethods: ['POST', 'OPTIONS'], allowHeaders: ['Content-Type', 'X-Campana-Clave'] }))

  app.post(`${BASE}/generar`, async (c) => {
    if (!limitador.permitir(clienteDe(c))) return demasiadas(c)
    const cuerpo = await leerCuerpo(c)
    if (!cuerpo) return c.json({ error: 'El cuerpo debe ser un objeto JSON' }, 400)
    const opciones = leerOpciones(cuerpo)
    if (typeof opciones === 'string') return c.json({ error: opciones }, 400)

    const campana = await generarCampana(ctx, { ...opciones, urlBase: cfg.urlBase })
    return c.json({ campana: estructura(campana), html: campana.html, texto: campana.texto })
  })

  app.post(`${BASE}/enviar`, async (c) => {
    if (!limitador.permitir(clienteDe(c))) return demasiadas(c)
    const cuerpo = await leerCuerpo(c)
    if (!cuerpo) return c.json({ error: 'El cuerpo debe ser un objeto JSON' }, 400)
    const modo = cuerpo.modo ?? 'preview'
    if (modo !== 'preview' && modo !== 'real') return c.json({ error: 'modo debe ser "preview" o "real"' }, 400)
    const opciones = leerOpciones(cuerpo)
    if (typeof opciones === 'string') return c.json({ error: opciones }, 400)

    // Solo el envío real pide clave y correo configurado; el preview nunca manda nada
    let enviador: Correo | null = null
    if (modo === 'real') {
      if (!claveCorrecta(c.req.header('x-campana-clave'))) return c.json({ error: 'Clave de envío incorrecta o sin configurar' }, 403)
      if (!correo) return c.json({ error: 'El correo no está configurado en el servidor' }, 503)
      enviador = correo
    }

    const brutos = cuerpo.destinatarios ?? []
    if (!Array.isArray(brutos) || !brutos.every((d): d is string => typeof d === 'string')) {
      return c.json({ error: 'destinatarios debe ser una lista de correos' }, 400)
    }
    if (brutos.length > MAX_DESTINATARIOS) return c.json({ error: `Máximo ${MAX_DESTINATARIOS} destinatarios por envío` }, 400)
    const { validos, invalidos } = limpiarDestinatarios(brutos)
    if (enviador && validos.length === 0) return c.json({ error: 'Ningún destinatario tiene un correo válido', invalidos }, 400)

    let campana: Campana
    if (cuerpo.campana !== undefined) {
      // Lo que manda el cliente solo cuenta como datos: el HTML siempre se rehace aquí
      const valida = validarCampana(cuerpo.campana)
      if (!valida) return c.json({ error: 'La campaña no es válida: revisa asunto, párrafos, llamado y enlace (http o https)' }, 400)
      campana = completar(valida)
    } else {
      campana = await generarCampana(ctx, { ...opciones, urlBase: cfg.urlBase })
    }

    if (!enviador) {
      return c.json({
        modo: 'preview',
        asunto: campana.asunto,
        html: campana.html,
        texto: campana.texto,
        campana: estructura(campana),
        destinatarios: validos,
        invalidos,
      })
    }
    const resultado = await enviarCampana(enviador, campana, validos)
    return c.json({ modo: 'real', asunto: campana.asunto, enviados: resultado.enviados, fallidos: resultado.fallidos, invalidos })
  })
}

function clienteDe(c: Context): string {
  return ipDe({ get: (nombre) => c.req.header(nombre) })
}

function demasiadas(c: Context) {
  return c.json({ error: 'Demasiadas peticiones: espera unos minutos y vuelve a intentar' }, 429)
}

async function leerCuerpo(c: Context): Promise<Record<string, unknown> | null> {
  const texto = await c.req.text()
  if (!texto.trim()) return {}
  try {
    const json: unknown = JSON.parse(texto)
    return typeof json === 'object' && json !== null && !Array.isArray(json) ? (json as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function leerOpciones(c: Record<string, unknown>): OpcionesRuta | string {
  const objetivo = c.objetivo ?? 'padrinos'
  if (objetivo !== 'padrinos' && objetivo !== 'comida') return 'objetivo debe ser "padrinos" o "comida"'

  const limite = c.limite ?? 3
  if (typeof limite !== 'number' || !Number.isInteger(limite) || limite < 1 || limite > LIMITE_MAXIMO) {
    return `limite debe ser un entero de 1 a ${LIMITE_MAXIMO}`
  }

  const perroIds = c.perroIds
  if (
    perroIds !== undefined &&
    (!Array.isArray(perroIds) ||
      perroIds.length > LIMITE_MAXIMO ||
      !perroIds.every((id) => typeof id === 'string' && id.trim().length > 0 && id.length <= MAX_ID_PERRO))
  ) {
    return `perroIds debe ser una lista de hasta ${LIMITE_MAXIMO} ids`
  }

  const tono = c.tono
  if (tono !== undefined && (typeof tono !== 'string' || tono.length > MAX_TONO)) {
    return `tono debe ser texto de hasta ${MAX_TONO} caracteres`
  }

  return {
    objetivo,
    limite,
    perroIds: perroIds as string[] | undefined,
    tono: tono as string | undefined,
  }
}

function estructura(c: Campana): CampanaEstructura {
  return {
    asunto: c.asunto,
    preheader: c.preheader,
    saludo: c.saludo,
    parrafos: c.parrafos,
    llamado: c.llamado,
    perritos: c.perritos,
    objetivo: c.objetivo,
  }
}

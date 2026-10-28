// Trabaja la cola de a pocos: no llama a Gemini dentro del webhook y no cierra un mensaje
// hasta que el registro quedó guardado. Si la IA falla, reintenta; al agotar, guarda la nota cruda.
import { ahoraBogota } from '@huellitas/shared/domain/hora'
import type { Registro } from '@huellitas/shared/registro'
import { parsearEntrantes, verificarFirma } from './webhook'
import type { Buzon, Entrante, RespuestaNueva, RespuestaPendiente } from './buzon'

/** 5 s, 30 s, 2 min, 10 min. Al siguiente fallo se guarda la nota cruda. */
export const ESPERAS_SEG = [5, 30, 120, 600] as const

const TOPE_PARALELO = 2

export interface MedioGuardado {
  ruta: string
  mime: string
}

export interface Procesador {
  procesar(entrante: Entrante, medio?: MedioGuardado): Promise<{ registros: Registro[]; respuestas: RespuestaNueva[] }>
}

/** Guarda el texto o el audio tal cual, por confirmar, con el wamid como id para no duplicar. */
export function procesadorCrudo(): Procesador {
  return {
    async procesar(entrante, medio) {
      const tipo = entrante.mensaje.tipo
      const origen = tipo === 'audio' ? 'audio' : tipo === 'imagen' ? 'foto' : 'texto'
      const texto = entrante.mensaje.texto ?? (medio ? 'Audio o foto recibido' : 'Mensaje sin texto')
      const registro: Registro = {
        id: entrante.id,
        fechaHora: ahoraBogota(new Date(entrante.timestamp * 1000)).iso,
        agenteId: entrante.telefono,
        origen,
        estado: 'por_confirmar',
        propuesta: { tipo: 'nota', animalId: '', texto },
      }
      if (entrante.mensaje.texto !== undefined) registro.fraseExacta = entrante.mensaje.texto
      if (medio) registro.mediaUrl = medio.ruta
      return { registros: [registro], respuestas: [] }
    },
  }
}

export async function aceptarWebhook(opts: {
  buzon: Buzon
  cuerpo: string
  firma: string | null
  appSecret: string
  ahora: () => Date
}): Promise<200 | 401 | 500> {
  if (!(await verificarFirma(opts.cuerpo, opts.firma, opts.appSecret))) return 401
  let json: unknown
  try {
    json = JSON.parse(opts.cuerpo)
  } catch {
    return 200
  }
  try {
    await opts.buzon.guardarEntrantes(parsearEntrantes(json), opts.ahora())
    return 200
  } catch {
    return 500
  }
}

interface DepsTrabajo {
  buzon: Buzon
  ahora: () => Date
  procesador: Procesador
  descargar?: (mediaId: string) => Promise<{ bytes: ArrayBuffer; mime: string }>
  guardarArchivo?: (id: string, bytes: ArrayBuffer, mime: string) => Promise<string>
}

async function bajar(deps: DepsTrabajo, entrante: Entrante): Promise<MedioGuardado | undefined> {
  const mediaId = entrante.mensaje.mediaId
  if (!mediaId) return undefined
  if (!deps.descargar || !deps.guardarArchivo) throw new Error('falta cómo bajar el archivo')
  const archivo = await deps.descargar(mediaId)
  const ruta = await deps.guardarArchivo(entrante.id, archivo.bytes, archivo.mime)
  return { ruta, mime: archivo.mime }
}

function textoError(error: unknown): string {
  return error instanceof Error ? error.message : 'error'
}

async function atender(deps: DepsTrabajo, entrante: Entrante): Promise<void> {
  if (entrante.intentos >= ESPERAS_SEG.length) {
    let medio: MedioGuardado | undefined
    try {
      medio = await bajar(deps, entrante)
    } catch {
      medio = undefined
    }
    const { registros } = await procesadorCrudo().procesar(entrante, medio)
    const nota = registros[0]
    if (!nota) throw new Error('no se pudo armar la nota cruda')
    await deps.buzon.marcarSinIa(entrante.id, nota, deps.ahora())
    return
  }
  try {
    const medio = await bajar(deps, entrante)
    const resultado = await deps.procesador.procesar(entrante, medio)
    await deps.buzon.marcarGuardado(entrante.id, resultado.registros, resultado.respuestas, deps.ahora())
  } catch (error) {
    const espera = ESPERAS_SEG[entrante.intentos] ?? ESPERAS_SEG[ESPERAS_SEG.length - 1] ?? 600
    await deps.buzon.reintentar(entrante.id, espera, deps.ahora(), textoError(error))
  }
}

/** Reclama como máximo 2 mensajes (uno por teléfono) y los trabaja en paralelo. */
export async function trabajarEntrantes(deps: DepsTrabajo): Promise<void> {
  const lote = await deps.buzon.reclamar(deps.ahora(), TOPE_PARALELO)
  await Promise.all(lote.map((entrante) => atender(deps, entrante)))
}

/** Manda pocas respuestas por vez. Un fallo (429, red) las deja en la cola. */
export async function enviarSalientes(opts: {
  buzon: Buzon
  ahora: () => Date
  maximo: number
  enviar: (respuesta: RespuestaPendiente) => Promise<void>
}): Promise<number> {
  const lista = await opts.buzon.salientesListos(opts.ahora(), opts.maximo)
  let enviados = 0
  for (const respuesta of lista) {
    try {
      await opts.enviar(respuesta)
      await opts.buzon.marcarEnviado(respuesta.id)
      enviados += 1
    } catch {
      const espera = ESPERAS_SEG[respuesta.intentos] ?? ESPERAS_SEG[ESPERAS_SEG.length - 1] ?? 600
      await opts.buzon.reintentarSaliente(respuesta.id, espera, opts.ahora())
    }
  }
  return enviados
}

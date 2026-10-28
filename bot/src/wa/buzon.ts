// Cola duradera de WhatsApp. El webhook solo inserta; un trabajador cierra la fila
// en la misma transacción que escribe el registro. Un wamid repetido no crea otra fila.
import type { Registro } from '@huellitas/shared/registro'
import { insertarRegistro, leerRegistros } from '../store/pg-repo'
import { leerJson, leerNumero, leerTexto, type Fila, type Sql } from '../store/sql'
import type { InboundMessage } from './tipos'

export const ARRIENDO_SEG = 120

export type EstadoEntrante = 'recibido' | 'en_proceso' | 'guardado' | 'sin_ia'

export interface Entrante {
  id: string
  telefono: string
  timestamp: number
  mensaje: InboundMessage
  intentos: number
}

export interface RespuestaNueva {
  id: string
  telefono: string
  cuerpo: string
  botones?: { id: string; titulo: string }[]
}

export interface RespuestaPendiente extends RespuestaNueva {
  intentos: number
}

export interface Buzon {
  /** Inserta los que no estaban. Devuelve cuántos eran nuevos. */
  guardarEntrantes(mensajes: InboundMessage[], ahora: Date): Promise<number>
  /** El más viejo de cada teléfono libre, como máximo `maximo`. Les pone un arrendamiento. */
  reclamar(ahora: Date, maximo: number): Promise<Entrante[]>
  /** Cierra el mensaje y guarda registros y respuestas juntos. */
  marcarGuardado(id: string, registros: Registro[], respuestas: RespuestaNueva[], ahora: Date): Promise<void>
  /** Lo deja otra vez en espera, sin perderlo. */
  reintentar(id: string, esperaSeg: number, ahora: Date, error?: string): Promise<void>
  /** Se agotaron los intentos de la IA: guarda la nota cruda y cierra. */
  marcarSinIa(id: string, registro: Registro, ahora: Date): Promise<void>
  registros(): Promise<Registro[]>
  salientesListos(ahora: Date, maximo: number): Promise<RespuestaPendiente[]>
  marcarEnviado(id: string): Promise<void>
  reintentarSaliente(id: string, esperaSeg: number, ahora: Date): Promise<void>
}

const TIPOS = ['texto', 'audio', 'imagen', 'boton'] as const

interface FilaEntrante {
  id: string
  telefono: string
  timestamp: number
  mensaje: InboundMessage
  estado: EstadoEntrante
  intentos: number
  proximoEn: number
  bloqueoHasta: number | null
  error: string | null
}

interface FilaSaliente {
  id: string
  telefono: string
  cuerpo: string
  botones?: { id: string; titulo: string }[]
  estado: 'pendiente' | 'enviado'
  intentos: number
  proximoEn: number
}

function iso(ms: number): string {
  return new Date(ms).toISOString()
}

function mensajeDe(v: unknown): InboundMessage {
  if (typeof v !== 'object' || v === null) throw new Error('SQL: el payload no es un mensaje')
  const m = v as Fila
  const id = typeof m.id === 'string' ? m.id : ''
  const from = typeof m.from === 'string' ? m.from : ''
  const timestamp = typeof m.timestamp === 'number' ? m.timestamp : Number.NaN
  const tipo = TIPOS.find((t) => t === m.tipo)
  if (!id || !from || !Number.isFinite(timestamp) || !tipo) throw new Error('SQL: el payload no es un mensaje')
  const mensaje: InboundMessage = { id, from, timestamp, tipo }
  if (typeof m.nombrePerfil === 'string') mensaje.nombrePerfil = m.nombrePerfil
  if (typeof m.texto === 'string') mensaje.texto = m.texto
  if (typeof m.mediaId === 'string') mensaje.mediaId = m.mediaId
  if (typeof m.mime === 'string') mensaje.mime = m.mime
  if (typeof m.botonId === 'string') mensaje.botonId = m.botonId
  return mensaje
}

function aEntrante(f: FilaEntrante): Entrante {
  return { id: f.id, telefono: f.telefono, timestamp: f.timestamp, mensaje: f.mensaje, intentos: f.intentos }
}

function botonesDe(v: unknown): { id: string; titulo: string }[] | undefined {
  if (v === null || v === undefined) return undefined
  if (!Array.isArray(v)) throw new Error('SQL: los botones no son una lista')
  return v.map((b) => {
    if (typeof b !== 'object' || b === null) throw new Error('SQL: un botón no es un objeto')
    const o = b as Fila
    if (typeof o.id !== 'string' || typeof o.titulo !== 'string') throw new Error('SQL: un botón no tiene id y titulo')
    return { id: o.id, titulo: o.titulo }
  })
}

export function crearBuzonMemoria(): Buzon {
  const entrantes: FilaEntrante[] = []
  const salientes: FilaSaliente[] = []
  const registros: Registro[] = []

  function buscar(id: string): FilaEntrante {
    const fila = entrantes.find((e) => e.id === id)
    if (!fila || fila.estado !== 'en_proceso') throw new Error('el mensaje no está en proceso')
    return fila
  }

  return {
    async guardarEntrantes(mensajes, ahora) {
      let nuevos = 0
      for (const mensaje of mensajes) {
        if (entrantes.some((e) => e.id === mensaje.id)) continue
        entrantes.push({
          id: mensaje.id,
          telefono: mensaje.from,
          timestamp: mensaje.timestamp,
          mensaje,
          estado: 'recibido',
          intentos: 0,
          proximoEn: ahora.getTime(),
          bloqueoHasta: null,
          error: null,
        })
        nuevos += 1
      }
      return nuevos
    },

    async reclamar(ahora, maximo) {
      const porTelefono = new Map<string, FilaEntrante[]>()
      for (const fila of entrantes) {
        if (fila.estado === 'guardado' || fila.estado === 'sin_ia') continue
        const grupo = porTelefono.get(fila.telefono) ?? []
        grupo.push(fila)
        porTelefono.set(fila.telefono, grupo)
      }
      const elegibles: FilaEntrante[] = []
      for (const grupo of porTelefono.values()) {
        const ordenado = [...grupo].sort((a, b) => a.timestamp - b.timestamp || (a.id < b.id ? -1 : 1))
        const primero = ordenado[0]
        if (!primero) continue
        const arrendado = primero.estado === 'en_proceso' && primero.bloqueoHasta !== null && primero.bloqueoHasta > ahora.getTime()
        if (arrendado) continue
        const listo =
          primero.proximoEn <= ahora.getTime() ||
          (primero.estado === 'en_proceso' && (primero.bloqueoHasta ?? 0) <= ahora.getTime())
        if (!listo) continue
        elegibles.push(primero)
      }
      elegibles.sort((a, b) => a.timestamp - b.timestamp || (a.id < b.id ? -1 : 1))
      const tomados = elegibles.slice(0, maximo)
      for (const fila of tomados) {
        fila.estado = 'en_proceso'
        fila.bloqueoHasta = ahora.getTime() + ARRIENDO_SEG * 1000
      }
      return tomados.map(aEntrante)
    },

    async marcarGuardado(id, nuevos, respuestas, ahora) {
      const fila = buscar(id)
      registros.push(...nuevos)
      for (const respuesta of respuestas) {
        salientes.push({ ...respuesta, estado: 'pendiente', intentos: 0, proximoEn: ahora.getTime() })
      }
      fila.estado = 'guardado'
      fila.bloqueoHasta = null
    },

    async reintentar(id, esperaSeg, ahora, error) {
      const fila = buscar(id)
      fila.estado = 'recibido'
      fila.intentos += 1
      fila.proximoEn = ahora.getTime() + esperaSeg * 1000
      fila.bloqueoHasta = null
      fila.error = error ?? null
    },

    async marcarSinIa(id, registro, _ahora) {
      const fila = buscar(id)
      registros.push(registro)
      fila.estado = 'sin_ia'
      fila.bloqueoHasta = null
    },

    async registros() {
      return registros.map((r) => ({ ...r }))
    },

    async salientesListos(ahora, maximo) {
      return salientes
        .filter((s) => s.estado === 'pendiente' && s.proximoEn <= ahora.getTime())
        .sort((a, b) => a.proximoEn - b.proximoEn || (a.id < b.id ? -1 : 1))
        .slice(0, maximo)
        .map((s) => ({ id: s.id, telefono: s.telefono, cuerpo: s.cuerpo, ...(s.botones && { botones: s.botones }), intentos: s.intentos }))
    },

    async marcarEnviado(id) {
      const fila = salientes.find((s) => s.id === id)
      if (!fila) throw new Error('la respuesta no está en la cola')
      fila.estado = 'enviado'
    },

    async reintentarSaliente(id, esperaSeg, ahora) {
      const fila = salientes.find((s) => s.id === id && s.estado === 'pendiente')
      if (!fila) throw new Error('la respuesta no está en la cola')
      fila.intentos += 1
      fila.proximoEn = ahora.getTime() + esperaSeg * 1000
    },
  }
}

const SQL_RECLAMAR = `WITH ordenados AS (
  SELECT id, row_number() OVER (PARTITION BY telefono ORDER BY timestamp_wa, id) AS n
  FROM wa_entrantes
  WHERE estado IN ('recibido', 'en_proceso')
), primero AS (
  SELECT e.id
  FROM ordenados o
  JOIN wa_entrantes e ON e.id = o.id
  WHERE o.n = 1
    AND (
      (e.estado = 'recibido' AND e.proximo_en <= $1::timestamptz)
      OR (e.estado = 'en_proceso' AND (e.bloqueo_hasta IS NULL OR e.bloqueo_hasta <= $1::timestamptz))
    )
  ORDER BY e.timestamp_wa, e.id
  LIMIT $2::int
)
UPDATE wa_entrantes u
SET estado = 'en_proceso', bloqueo_hasta = $3::timestamptz
FROM primero p
WHERE u.id = p.id
  AND (
    (u.estado = 'recibido' AND u.proximo_en <= $1::timestamptz)
    OR (u.estado = 'en_proceso' AND (u.bloqueo_hasta IS NULL OR u.bloqueo_hasta <= $1::timestamptz))
  )
RETURNING u.id, u.telefono, u.timestamp_wa::text AS timestamp_wa, u.payload, u.intentos`

function entranteDe(f: Fila): Entrante {
  return {
    id: leerTexto(f, 'id'),
    telefono: leerTexto(f, 'telefono'),
    timestamp: leerNumero(f, 'timestamp_wa'),
    mensaje: mensajeDe(leerJson(f, 'payload')),
    intentos: leerNumero(f, 'intentos'),
  }
}

export function crearBuzonPg(sql: Sql): Buzon {
  async function cerrar(id: string, estado: 'guardado' | 'sin_ia', registros: Registro[], respuestas: RespuestaNueva[], ahora: Date) {
    await sql.transaccion(async (tx) => {
      for (const registro of registros) await insertarRegistro(tx, registro, true)
      for (const respuesta of respuestas) {
        await tx.query(
          `INSERT INTO wa_salientes (id, telefono, cuerpo, botones, estado, intentos, proximo_en, entrante_id)
           VALUES ($1, $2, $3, $4::text::jsonb, 'pendiente', 0, $5::timestamptz, $6)`,
          [respuesta.id, respuesta.telefono, respuesta.cuerpo, respuesta.botones ? JSON.stringify(respuesta.botones) : null, iso(ahora.getTime()), id],
        )
      }
      const { rows } = await tx.query(
        `UPDATE wa_entrantes SET estado = $2, bloqueo_hasta = NULL, error = NULL
         WHERE id = $1 AND estado = 'en_proceso' RETURNING id`,
        [id, estado],
      )
      if (rows.length === 0) throw new Error('el mensaje no está en proceso')
    })
  }

  return {
    async guardarEntrantes(mensajes, ahora) {
      let nuevos = 0
      for (const mensaje of mensajes) {
        const { rows } = await sql.query(
          `INSERT INTO wa_entrantes (id, telefono, timestamp_wa, payload, estado, proximo_en)
           VALUES ($1, $2, $3, $4::text::jsonb, 'recibido', $5::timestamptz)
           ON CONFLICT (id) DO NOTHING RETURNING id`,
          [mensaje.id, mensaje.from, mensaje.timestamp, JSON.stringify(mensaje), iso(ahora.getTime())],
        )
        if (rows.length > 0) nuevos += 1
      }
      return nuevos
    },

    async reclamar(ahora, maximo) {
      const vence = iso(ahora.getTime() + ARRIENDO_SEG * 1000)
      const { rows } = await sql.query(SQL_RECLAMAR, [iso(ahora.getTime()), maximo, vence])
      return rows.map(entranteDe)
    },

    marcarGuardado(id, registros, respuestas, ahora) {
      return cerrar(id, 'guardado', registros, respuestas, ahora)
    },

    async reintentar(id, esperaSeg, ahora, error) {
      const { rows } = await sql.query(
        `UPDATE wa_entrantes
         SET estado = 'recibido', intentos = intentos + 1, proximo_en = $2::timestamptz, bloqueo_hasta = NULL, error = $3
         WHERE id = $1 AND estado = 'en_proceso' RETURNING id`,
        [id, iso(ahora.getTime() + esperaSeg * 1000), error ?? null],
      )
      if (rows.length === 0) throw new Error('el mensaje no está en proceso')
    },

    marcarSinIa(id, registro, ahora) {
      return cerrar(id, 'sin_ia', [registro], [], ahora)
    },

    registros: () => leerRegistros(sql),

    async salientesListos(ahora, maximo) {
      const { rows } = await sql.query(
        `SELECT id, telefono, cuerpo, botones, intentos
         FROM wa_salientes
         WHERE estado = 'pendiente' AND proximo_en <= $1::timestamptz
         ORDER BY proximo_en, id
         LIMIT $2::int`,
        [iso(ahora.getTime()), maximo],
      )
      return rows.map((f) => {
        const botones = botonesDe(leerJson(f, 'botones'))
        return {
          id: leerTexto(f, 'id'),
          telefono: leerTexto(f, 'telefono'),
          cuerpo: leerTexto(f, 'cuerpo'),
          ...(botones && { botones }),
          intentos: leerNumero(f, 'intentos'),
        }
      })
    },

    async marcarEnviado(id) {
      const { rows } = await sql.query(`UPDATE wa_salientes SET estado = 'enviado' WHERE id = $1 AND estado = 'pendiente' RETURNING id`, [id])
      if (rows.length === 0) throw new Error('la respuesta no está en la cola')
    },

    async reintentarSaliente(id, esperaSeg, ahora) {
      const { rows } = await sql.query(
        `UPDATE wa_salientes SET intentos = intentos + 1, proximo_en = $2::timestamptz
         WHERE id = $1 AND estado = 'pendiente' RETURNING id`,
        [id, iso(ahora.getTime() + esperaSeg * 1000)],
      )
      if (rows.length === 0) throw new Error('la respuesta no está en la cola')
    },
  }
}

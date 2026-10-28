// Interfaz mínima de SQL (D5): PgRepo y PgKv hablan solo con ella. Dos adaptadores:
// pg (producción, DATABASE_URL) y PGlite (pruebas y desarrollo local sin Postgres).
import type { PGlite } from '@electric-sql/pglite'

/** Una fila tal como la entrega el driver: sin tipos todavía. Se estrecha con los lectores de más abajo. */
export type Fila = Record<string, unknown>

export interface Sql {
  /** Corre una sentencia con parámetros `$1, $2…`. Las filas ya son objetos; los valores se validan con los lectores. */
  query<T = Fila>(texto: string, params?: unknown[]): Promise<{ rows: T[] }>
  /** Varias sentencias que se confirman juntas, o se deshacen todas si una falla. */
  transaccion<T>(fn: (tx: Sql) => Promise<T>): Promise<T>
  cerrar(): Promise<void>
}

const esFila = (v: unknown): v is Fila => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Comprueba que cada fila sea un objeto. El tipo de sus valores lo comprueba quien las lee (leerTexto, leerNumero…). */
function filasValidas<T>(rows: unknown[]): T[] {
  return rows.map((fila, i) => {
    if (!esFila(fila)) throw new Error(`SQL: la fila ${i} no es un objeto`)
    // El tipo T lo escoge quien llama; solo se garantiza que es un objeto
    return fila as T
  })
}

type ConsultaPg = {
  query(texto: string, params?: unknown[]): Promise<{ rows: unknown[] }>
  release?(): void
}

/** Adaptador para `pg` (producción). Acepta un `Pool` real o cualquier cosa con `query` y `end`. */
export function sqlDesdePg(pool: ConsultaPg & { end(): Promise<void>; connect?(): Promise<ConsultaPg> }): Sql {
  const envolver = (q: ConsultaPg, cerrar: () => Promise<void>, transaccion: Sql['transaccion']): Sql => ({
    async query<T = Fila>(texto: string, params?: unknown[]) {
      const res = await q.query(texto, params)
      return { rows: filasValidas<T>(res.rows) }
    },
    transaccion,
    cerrar,
  })

  const sql: Sql = envolver(pool, () => pool.end(), async (fn) => {
    if (!pool.connect) {
      await pool.query('BEGIN')
      try {
        const resultado = await fn(sql)
        await pool.query('COMMIT')
        return resultado
      } catch (error) {
        await pool.query('ROLLBACK')
        throw error
      }
    }
    const cliente = await pool.connect()
    const tx = envolver(cliente, async () => {}, (interior) => interior(tx))
    try {
      await cliente.query('BEGIN')
      const resultado = await fn(tx)
      await cliente.query('COMMIT')
      return resultado
    } catch (error) {
      await cliente.query('ROLLBACK')
      throw error
    } finally {
      cliente.release?.()
    }
  })
  return sql
}

/** Adaptador para PGlite (pruebas y desarrollo local). */
export function sqlDesdePglite(db: PGlite): Sql {
  const sql: Sql = {
    async query<T = Fila>(texto: string, params?: unknown[]) {
      const res = await db.query(texto, params)
      return { rows: filasValidas<T>(res.rows) }
    },
    async transaccion(fn) {
      await db.query('BEGIN')
      try {
        const resultado = await fn(sql)
        await db.query('COMMIT')
        return resultado
      } catch (error) {
        await db.query('ROLLBACK')
        throw error
      }
    },
    cerrar: () => db.close(),
  }
  return sql
}

// ── Lectores: estrechan los valores de una fila en vez de castearlos. Si la base trae otra cosa, lanzan. ──

function malo(f: Fila, col: string, esperado: string): never {
  throw new Error(`SQL: la columna "${col}" no es ${esperado} (llegó ${JSON.stringify(f[col])})`)
}

export function leerTexto(f: Fila, col: string): string {
  const v = f[col]
  return typeof v === 'string' ? v : malo(f, col, 'texto')
}

export function leerTextoONulo(f: Fila, col: string): string | null {
  const v = f[col]
  if (v === null || v === undefined) return null
  return typeof v === 'string' ? v : malo(f, col, 'texto o nulo')
}

/** Acepta number y también el texto numérico con que pg entrega bigint y numeric. */
export function leerNumero(f: Fila, col: string): number {
  const v = f[col]
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : typeof v === 'bigint' ? Number(v) : NaN
  return Number.isFinite(n) ? n : malo(f, col, 'un número')
}

export function leerNumeroONulo(f: Fila, col: string): number | null {
  return f[col] === null || f[col] === undefined ? null : leerNumero(f, col)
}

export function leerBooleano(f: Fila, col: string): boolean {
  const v = f[col]
  return typeof v === 'boolean' ? v : malo(f, col, 'booleano')
}

export function leerBooleanoONulo(f: Fila, col: string): boolean | null {
  return f[col] === null || f[col] === undefined ? null : leerBooleano(f, col)
}

/** Uno de los valores permitidos (para columnas con un conjunto cerrado: rol, estado, montón…). */
export function leerUno<T extends string>(f: Fila, col: string, validos: readonly T[]): T {
  const v = f[col]
  const hallado = validos.find((x) => x === v)
  return hallado ?? malo(f, col, `uno de ${validos.join(' | ')}`)
}

export function leerUnoONulo<T extends string>(f: Fila, col: string, validos: readonly T[]): T | null {
  return f[col] === null || f[col] === undefined ? null : leerUno(f, col, validos)
}

/** Un jsonb ya interpretado. Los drivers lo entregan como objeto; si llegara como texto, se interpreta. */
export function leerJson(f: Fila, col: string): unknown {
  const v = f[col]
  if (typeof v !== 'string') return v
  try {
    return JSON.parse(v)
  } catch {
    return malo(f, col, 'JSON válido')
  }
}

export function leerListaTexto(f: Fila, col: string): string[] {
  const v = leerJson(f, col)
  return Array.isArray(v) && v.every((x): x is string => typeof x === 'string') ? v : malo(f, col, 'una lista de textos')
}

export function leerListaTextoONula(f: Fila, col: string): string[] | null {
  return f[col] === null || f[col] === undefined ? null : leerListaTexto(f, col)
}

export function leerObjeto(f: Fila, col: string): Fila {
  const v = leerJson(f, col)
  return esFila(v) ? v : malo(f, col, 'un objeto JSON')
}

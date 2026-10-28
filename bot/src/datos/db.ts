import pg from 'pg'

// Fechas y horas como texto, tal cual las guarda Postgres en hora de Bogotá
pg.types.setTypeParser(1082, (v) => v) // date → 'AAAA-MM-DD'
pg.types.setTypeParser(1083, (v) => v.slice(0, 5)) // time → 'HH:MM'
pg.types.setTypeParser(20, Number) // bigint
pg.types.setTypeParser(1700, Number) // numeric

export type Pool = pg.Pool

export function crearPool(url: string): Pool {
  return new pg.Pool({ connectionString: url, max: 5, options: '-c TimeZone=America/Bogota' })
}

/** Corre `fn` dentro de una transacción y la deshace si algo falla. */
export async function enTransaccion<T>(pool: Pool, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect()
  try {
    await c.query('BEGIN')
    const r = await fn(c)
    await c.query('COMMIT')
    return r
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    c.release()
  }
}

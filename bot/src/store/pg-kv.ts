// Kv sobre Postgres (D5): los mismos vencimientos que MemoryKv. El reloj entra por parámetro (milisegundos)
// y viaja a la base como dato, así los vencimientos se prueban sin esperar.
import type { Kv } from './kv'
import { leerTexto, type Sql } from './sql'

export class PgKv implements Kv {
  constructor(
    private sql: Sql,
    private ahora: () => number = Date.now,
  ) {}

  private instante(desplazamientoMs = 0): string {
    return new Date(this.ahora() + desplazamientoMs).toISOString()
  }

  async get(key: string): Promise<string | null> {
    const { rows } = await this.sql.query(`SELECT value FROM kv WHERE key = $1 AND (expira_en IS NULL OR expira_en > $2::text::timestamptz)`, [key, this.instante()])
    const fila = rows[0]
    return fila ? leerTexto(fila, 'value') : null
  }

  async put(key: string, value: string, ttlSegundos?: number): Promise<void> {
    const vence = ttlSegundos === undefined ? null : this.instante(ttlSegundos * 1000)
    await this.sql.query(
      `INSERT INTO kv (key, value, expira_en) VALUES ($1, $2, $3::text::timestamptz)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, expira_en = EXCLUDED.expira_en`,
      [key, value, vence],
    )
  }

  async delete(key: string): Promise<void> {
    await this.sql.query(`DELETE FROM kv WHERE key = $1`, [key])
  }

  /** Una sola sentencia: inserta, o reemplaza solo si lo que había ya venció. Si no devuelve fila, había un valor vigente. */
  async ponerSiNoExiste(key: string, value: string, ttlSegundos: number): Promise<boolean> {
    const { rows } = await this.sql.query(
      `INSERT INTO kv (key, value, expira_en) VALUES ($1, $2, $3::text::timestamptz)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, expira_en = EXCLUDED.expira_en
       WHERE kv.expira_en IS NOT NULL AND kv.expira_en <= $4::text::timestamptz
       RETURNING key`,
      [key, value, this.instante(ttlSegundos * 1000), this.instante()],
    )
    return rows.length > 0
  }
}

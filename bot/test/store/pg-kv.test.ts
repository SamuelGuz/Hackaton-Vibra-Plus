import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PgKv } from '../../src/store/pg-kv'
import { migrar } from '../../src/store/pg-repo'
import { sqlDesdePglite, type Sql } from '../../src/store/sql'

// Mismos casos que kv.test.ts (MemoryKv), contra Postgres de verdad (PGlite en memoria) y con reloj inyectado.
let sql: Sql
let ahora = 1_000_000
const avanzar = (segundos: number) => (ahora += segundos * 1000)

beforeAll(async () => {
  sql = sqlDesdePglite(new PGlite())
  await migrar(sql)
})

afterAll(async () => {
  await sql.cerrar()
})

beforeEach(async () => {
  ahora = 1_000_000
  await sql.query('DELETE FROM kv')
})

const nuevoKv = () => new PgKv(sql, () => ahora)

describe('PgKv', () => {
  it('guarda, lee y borra', async () => {
    const kv = nuevoKv()
    expect(await kv.get('a')).toBeNull()
    await kv.put('a', 'uno')
    expect(await kv.get('a')).toBe('uno')
    await kv.delete('a')
    expect(await kv.get('a')).toBeNull()
  })

  it('sin ttl el valor no vence', async () => {
    const kv = nuevoKv()
    await kv.put('a', 'uno')
    avanzar(10 * 365 * 24 * 3600)
    expect(await kv.get('a')).toBe('uno')
  })

  it('el valor vive hasta justo antes del ttl y desaparece al cumplirlo', async () => {
    const kv = nuevoKv()
    await kv.put('ctx', 'TOB01', 600)
    avanzar(599)
    expect(await kv.get('ctx')).toBe('TOB01')
    avanzar(1)
    expect(await kv.get('ctx')).toBeNull()
  })

  it('volver a guardar renueva el ttl y pisa el valor', async () => {
    const kv = nuevoKv()
    await kv.put('a', 'uno', 10)
    avanzar(8)
    await kv.put('a', 'dos', 10)
    avanzar(8)
    expect(await kv.get('a')).toBe('dos')
  })

  it('volver a guardar sin ttl quita el vencimiento anterior', async () => {
    const kv = nuevoKv()
    await kv.put('a', 'uno', 10)
    await kv.put('a', 'dos')
    avanzar(3600)
    expect(await kv.get('a')).toBe('dos')
  })

  it('ponerSiNoExiste guarda la primera vez y rechaza la segunda sin pisar el valor', async () => {
    const kv = nuevoKv()
    expect(await kv.ponerSiNoExiste('wamid.X', 'a', 172800)).toBe(true)
    expect(await kv.ponerSiNoExiste('wamid.X', 'b', 172800)).toBe(false)
    expect(await kv.get('wamid.X')).toBe('a')
  })

  it('ponerSiNoExiste vuelve a aceptar cuando el valor anterior ya venció (candado de 60 s)', async () => {
    const kv = nuevoKv()
    expect(await kv.ponerSiNoExiste('lock:t-1@2026-10-27T14:00', 'x', 60)).toBe(true)
    avanzar(59)
    expect(await kv.ponerSiNoExiste('lock:t-1@2026-10-27T14:00', 'y', 60)).toBe(false)
    avanzar(1)
    expect(await kv.ponerSiNoExiste('lock:t-1@2026-10-27T14:00', 'z', 60)).toBe(true)
    expect(await kv.get('lock:t-1@2026-10-27T14:00')).toBe('z')
  })

  it('ponerSiNoExiste tras delete vuelve a aceptar', async () => {
    const kv = nuevoKv()
    await kv.ponerSiNoExiste('k', 'a', 60)
    await kv.delete('k')
    expect(await kv.ponerSiNoExiste('k', 'b', 60)).toBe(true)
  })

  it('ponerSiNoExiste no pisa un valor sin vencimiento puesto con put', async () => {
    const kv = nuevoKv()
    await kv.put('k', 'fijo')
    avanzar(3600)
    expect(await kv.ponerSiNoExiste('k', 'otro', 60)).toBe(false)
    expect(await kv.get('k')).toBe('fijo')
  })

  it('con dos intentos a la vez sobre la misma clave solo uno gana (webhook repetido de Meta)', async () => {
    const kv = nuevoKv()
    const resultados = await Promise.all([kv.ponerSiNoExiste('wamid.Y', 'a', 60), kv.ponerSiNoExiste('wamid.Y', 'b', 60), kv.ponerSiNoExiste('wamid.Y', 'c', 60)])
    expect(resultados.filter(Boolean)).toHaveLength(1)
  })

  it('dos instancias sobre la misma base comparten los valores', async () => {
    await nuevoKv().put('compartido', 'si')
    expect(await nuevoKv().get('compartido')).toBe('si')
  })

  it('guarda el vencimiento en expira_en, y sin ttl lo deja vacío', async () => {
    const kv = nuevoKv()
    await kv.put('con', 'x', 60)
    await kv.put('sin', 'y')
    const { rows } = await sql.query<{ key: string; vence: string | null }>(
      `SELECT key, (extract(epoch from expira_en) * 1000)::bigint::text AS vence FROM kv ORDER BY key`,
    )
    expect(rows.map((r) => [r.key, r.vence === null ? null : Number(r.vence)])).toEqual([
      ['con', ahora + 60_000],
      ['sin', null],
    ])
  })
})

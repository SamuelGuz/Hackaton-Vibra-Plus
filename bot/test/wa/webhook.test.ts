import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MemoryKv } from '../../src/store/kv'
import { parsearEntrantes, verificarFirma, yaProcesado } from '../../src/wa/webhook'

function fixture(nombre: string): unknown {
  return JSON.parse(readFileSync(new URL(`../fixtures/wa/${nombre}.json`, import.meta.url), 'utf8'))
}

const SECRETO = 'app-secret-de-prueba'
const CUERPO = JSON.stringify(fixture('texto'))
const firmar = (cuerpo: string, secreto: string) => 'sha256=' + createHmac('sha256', secreto).update(cuerpo).digest('hex')

describe('verificarFirma', () => {
  it('acepta una firma sha256= correcta', async () => {
    expect(await verificarFirma(CUERPO, firmar(CUERPO, SECRETO), SECRETO)).toBe(true)
  })

  it('rechaza una firma alterada', async () => {
    const firma = firmar(CUERPO, SECRETO)
    const alterada = firma.slice(0, -1) + (firma.endsWith('0') ? '1' : '0')
    expect(await verificarFirma(CUERPO, alterada, SECRETO)).toBe(false)
  })

  it('rechaza un cuerpo distinto al firmado', async () => {
    expect(await verificarFirma(CUERPO + ' ', firmar(CUERPO, SECRETO), SECRETO)).toBe(false)
  })

  it('rechaza una firma hecha con otro secreto', async () => {
    expect(await verificarFirma(CUERPO, firmar(CUERPO, 'otro'), SECRETO)).toBe(false)
  })

  it('rechaza el header null', async () => {
    expect(await verificarFirma(CUERPO, null, SECRETO)).toBe(false)
  })

  it('rechaza un header sin prefijo sha256=, vacío o que no es hex', async () => {
    const hex = firmar(CUERPO, SECRETO).slice('sha256='.length)
    expect(await verificarFirma(CUERPO, hex, SECRETO)).toBe(false)
    expect(await verificarFirma(CUERPO, '', SECRETO)).toBe(false)
    expect(await verificarFirma(CUERPO, 'sha256=zzzz', SECRETO)).toBe(false)
    expect(await verificarFirma(CUERPO, 'sha256=' + hex.slice(0, 10), SECRETO)).toBe(false)
  })
})

describe('parsearEntrantes', () => {
  it('parsea un texto', () => {
    expect(parsearEntrantes(fixture('texto'))).toEqual([
      {
        id: 'wamid.HBgMNTczMDAxMjM0NTY3FQIAEhgUM0EB',
        from: '573001234567',
        nombrePerfil: 'Andrea',
        tipo: 'texto',
        texto: 'TOB01',
        timestamp: 1761616860,
      },
    ])
  })

  it('parsea un audio con su mediaId y su mime', () => {
    const [m] = parsearEntrantes(fixture('audio'))
    expect(m).toMatchObject({ tipo: 'audio', mediaId: '1003383421387256', mime: 'audio/ogg; codecs=opus', from: '573001234567' })
    expect(m?.texto).toBeUndefined()
  })

  it('parsea una imagen con su mediaId, su mime y el pie de foto', () => {
    const [m] = parsearEntrantes(fixture('imagen'))
    expect(m).toMatchObject({ tipo: 'imagen', mediaId: '1186244025443316', mime: 'image/jpeg', texto: 'Factura clínica' })
  })

  it('parsea interactive.button_reply como boton con botonId', () => {
    const [m] = parsearEntrantes(fixture('boton'))
    expect(m).toMatchObject({ tipo: 'boton', botonId: 'animal:TOB01', texto: 'Tobías', timestamp: 1761616863 })
  })

  it('los payloads de statuses devuelven []', () => {
    expect(parsearEntrantes(fixture('statuses'))).toEqual([])
  })

  it('entradas que no son un payload de Meta devuelven []', () => {
    expect(parsearEntrantes(null)).toEqual([])
    expect(parsearEntrantes('hola')).toEqual([])
    expect(parsearEntrantes({})).toEqual([])
    expect(parsearEntrantes({ entry: 'x' })).toEqual([])
    expect(parsearEntrantes({ entry: [{ changes: [{ value: { messages: [{ id: 1 }] } }] }] })).toEqual([])
  })

  it('ignora tipos no soportados (sticker) sin tumbar el resto', () => {
    const base = fixture('texto') as { entry: { changes: { value: { messages: unknown[] } }[] }[] }
    base.entry[0]!.changes[0]!.value.messages.unshift({ from: '573001234567', id: 'wamid.S', timestamp: '1', type: 'sticker' })
    expect(parsearEntrantes(base).map((m) => m.id)).toEqual(['wamid.HBgMNTczMDAxMjM0NTY3FQIAEhgUM0EB'])
  })
})

describe('yaProcesado (Review Focus 4: Meta reenvía el mismo webhook)', () => {
  it('da false la primera vez y true la segunda', async () => {
    const kv = new MemoryKv()
    expect(await yaProcesado(kv, 'wamid.X')).toBe(false)
    expect(await yaProcesado(kv, 'wamid.X')).toBe(true)
  })

  it('otro message.id no se ve afectado', async () => {
    const kv = new MemoryKv()
    await yaProcesado(kv, 'wamid.X')
    expect(await yaProcesado(kv, 'wamid.Y')).toBe(false)
  })

  it('la marca vence a los 2 días', async () => {
    let ahora = 0
    const kv = new MemoryKv(() => ahora)
    await yaProcesado(kv, 'wamid.X')
    ahora = 2 * 24 * 3600 * 1000 - 1
    expect(await yaProcesado(kv, 'wamid.X')).toBe(true)
    ahora = 2 * 24 * 3600 * 1000 + 1
    expect(await yaProcesado(kv, 'wamid.X')).toBe(false)
  })
})

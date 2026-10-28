import { createHmac } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { migrar } from '../../src/store/pg-repo'
import { sqlDesdePglite, type Sql } from '../../src/store/sql'
import { crearBuzonMemoria, crearBuzonPg, type Buzon } from '../../src/wa/buzon'
import type { InboundMessage } from '../../src/wa/tipos'
import { aceptarWebhook, enviarSalientes, ESPERAS_SEG, procesadorCrudo, trabajarEntrantes } from '../../src/wa/trabajador'

function msg(id: string, from: string, timestamp: number, texto = 'hola'): InboundMessage {
  return { id, from, timestamp, tipo: 'texto', texto }
}

const firmar = (cuerpo: string, secreto: string) => 'sha256=' + createHmac('sha256', secreto).update(cuerpo).digest('hex')

let sql: Sql | undefined

beforeAll(async () => {
  sql = sqlDesdePglite(new PGlite())
  await migrar(sql)
  await migrar(sql)
})

afterAll(async () => {
  await sql?.cerrar()
})

function casos(nombre: string, abrir: () => Promise<Buzon>) {
  describe(nombre, () => {
    let buzon: Buzon
    let ahora = new Date('2026-10-28T15:00:00Z')
    const clock = () => ahora
    const avanzar = (segundos: number) => {
      ahora = new Date(ahora.getTime() + segundos * 1000)
    }

    beforeEach(async () => {
      ahora = new Date('2026-10-28T15:00:00Z')
      buzon = await abrir()
    })

    it('guarda una ráfaga desordenada y la entrega en orden, una persona a la vez', async () => {
      const vistos: string[] = []
      let enCurso = 0
      let maximo = 0
      await buzon.guardarEntrantes(
        [msg('c', '573001', 30, 'tercero'), msg('a', '573001', 10, 'primero'), msg('b', '573001', 20, 'segundo')],
        ahora,
      )
      expect(await buzon.guardarEntrantes([msg('a', '573001', 10, 'primero')], ahora)).toBe(0)

      for (let i = 0; i < 3; i++) {
        await trabajarEntrantes({
          buzon,
          ahora: clock,
          procesador: {
            async procesar(e) {
              enCurso += 1
              maximo = Math.max(maximo, enCurso)
              vistos.push(e.id)
              enCurso -= 1
              return procesadorCrudo().procesar(e)
            },
          },
        })
      }

      expect(vistos).toEqual(['a', 'b', 'c'])
      expect(maximo).toBe(1)
      const guardados = await buzon.registros()
      expect(guardados.map((r) => r.id)).toEqual(['a', 'b', 'c'])
      expect(guardados.every((r) => r.estado === 'por_confirmar')).toBe(true)
    })

    it('procesa a dos personas a la vez y no pasa de ahí', async () => {
      await buzon.guardarEntrantes(
        [msg('p1', '573001', 1), msg('p1b', '573001', 2), msg('p2', '573002', 1), msg('p3', '573003', 1)],
        ahora,
      )
      let maximo = 0
      let enCurso = 0
      const soltar = new Map<string, () => void>()
      const trabajo = trabajarEntrantes({
        buzon,
        ahora: clock,
        procesador: {
          procesar: (e) =>
            new Promise((resolver) => {
              enCurso += 1
              maximo = Math.max(maximo, enCurso)
              soltar.set(e.id, () => {
                enCurso -= 1
                void procesadorCrudo()
                  .procesar(e)
                  .then(resolver)
              })
            }),
        },
      })
      await esperar(() => soltar.size === 2)
      expect(maximo).toBe(2)
      expect(soltar.has('p1b')).toBe(false)
      for (const soltarUno of soltar.values()) soltarUno()
      await trabajo
    })

    it('un arrendamiento vencido vuelve a tomar el mismo mensaje', async () => {
      await buzon.guardarEntrantes([msg('a', '573001', 1)], ahora)
      expect((await buzon.reclamar(ahora, 2)).map((e) => e.id)).toEqual(['a'])
      expect(await buzon.reclamar(ahora, 2)).toEqual([])
      avanzar(119)
      expect(await buzon.reclamar(ahora, 2)).toEqual([])
      avanzar(2)
      expect((await buzon.reclamar(ahora, 2)).map((e) => e.id)).toEqual(['a'])
    })

    it('si Gemini falla, reintenta y al final guarda la nota cruda una sola vez', async () => {
      await buzon.guardarEntrantes([msg('audio-1', '573001', 5, 'abrí un bulto')], ahora)
      const procesador = {
        procesar: async () => {
          throw new Error('Gemini no respondió')
        },
      }
      for (let i = 0; i < ESPERAS_SEG.length; i++) {
        await trabajarEntrantes({ buzon, ahora: clock, procesador })
        expect(await buzon.registros()).toEqual([])
        expect(await buzon.reclamar(ahora, 2)).toEqual([])
        avanzar(ESPERAS_SEG[i] ?? 0)
      }
      await trabajarEntrantes({ buzon, ahora: clock, procesador })
      const guardados = await buzon.registros()
      expect(guardados).toHaveLength(1)
      expect(guardados[0]?.id).toBe('audio-1')
      expect(guardados[0]?.estado).toBe('por_confirmar')
      expect(guardados[0]?.fraseExacta).toBe('abrí un bulto')
      await trabajarEntrantes({ buzon, ahora: clock, procesador })
      expect(await buzon.registros()).toHaveLength(1)
    })
  })
}

casos('buzón en memoria', async () => crearBuzonMemoria())

casos('buzón en Postgres', async () => {
  if (!sql) throw new Error('falta la base')
  await sql.query('TRUNCATE wa_entrantes, wa_salientes, registros RESTART IDENTITY')
  return crearBuzonPg(sql)
})

describe('webhook y salidas', () => {
  let buzon: Buzon
  let ahora = new Date('2026-10-28T15:00:00Z')
  const clock = () => ahora
  const avanzar = (segundos: number) => {
    ahora = new Date(ahora.getTime() + segundos * 1000)
  }

  beforeEach(() => {
    ahora = new Date('2026-10-28T15:00:00Z')
    buzon = crearBuzonMemoria()
  })

  it('el webhook guarda y responde antes de llamar a Gemini', async () => {
    let llamadas = 0
    const cuerpo = JSON.stringify({
      entry: [{ changes: [{ value: { messages: [{ id: 'wamid.1', from: '573001', timestamp: '10', type: 'text', text: { body: 'hola' } }] } }] }],
    })
    const respuesta = await aceptarWebhook({
      buzon,
      cuerpo,
      firma: firmar(cuerpo, 'secreto'),
      appSecret: 'secreto',
      ahora: clock,
    })
    expect(respuesta).toBe(200)
    expect(llamadas).toBe(0)
    await trabajarEntrantes({
      buzon,
      ahora: clock,
      procesador: {
        async procesar() {
          llamadas += 1
          return { registros: [], respuestas: [] }
        },
      },
    })
    expect(llamadas).toBe(1)
  })

  it('una firma mala no guarda nada', async () => {
    const respuesta = await aceptarWebhook({
      buzon,
      cuerpo: '{}',
      firma: 'sha256=00',
      appSecret: 'secreto',
      ahora: clock,
    })
    expect(respuesta).toBe(401)
    expect(await buzon.reclamar(ahora, 2)).toEqual([])
  })

  it('si la base falla, el webhook responde 500 para que Meta reintente', async () => {
    const roto: Buzon = {
      ...buzon,
      guardarEntrantes: async () => {
        throw new Error('postgres caído')
      },
    }
    const cuerpo = JSON.stringify({
      entry: [{ changes: [{ value: { messages: [{ id: 'wamid.2', from: '573001', timestamp: '10', type: 'text', text: { body: 'hola' } }] } }] }],
    })
    const respuesta = await aceptarWebhook({
      buzon: roto,
      cuerpo,
      firma: firmar(cuerpo, 'secreto'),
      appSecret: 'secreto',
      ahora: clock,
    })
    expect(respuesta).toBe(500)
  })

  it('baja el audio antes de la IA y, si la bajada falla, no llama a Gemini', async () => {
    await buzon.guardarEntrantes([{ id: 'aud', from: '573001', timestamp: 4, tipo: 'audio', mediaId: 'media-1', mime: 'audio/ogg' }], ahora)
    let gemini = 0
    await trabajarEntrantes({
      buzon,
      ahora: clock,
      descargar: async () => {
        throw new Error('sin red')
      },
      guardarArchivo: async () => 'no',
      procesador: {
        async procesar() {
          gemini += 1
          return { registros: [], respuestas: [] }
        },
      },
    })
    expect(gemini).toBe(0)

    avanzar(ESPERAS_SEG[0] ?? 5)
    const rutas: string[] = []
    await trabajarEntrantes({
      buzon,
      ahora: clock,
      descargar: async () => ({ bytes: new Uint8Array([1, 2, 3]).buffer, mime: 'audio/ogg' }),
      guardarArchivo: async (id, _bytes, _mime) => {
        rutas.push(`${id}.ogg`)
        return `archivos/${id}.ogg`
      },
      procesador: {
        async procesar(_e, medio) {
          expect(medio?.ruta).toBe('archivos/aud.ogg')
          return { registros: [], respuestas: [] }
        },
      },
    })
    expect(rutas).toEqual(['aud.ogg'])
  })

  it('un 429 deja la respuesta en la cola y un envío bueno la saca', async () => {
    await buzon.guardarEntrantes([msg('m', '573001', 1, 'plata')], ahora)
    await trabajarEntrantes({
      buzon,
      ahora: clock,
      procesador: {
        async procesar(e) {
          const hecho = await procesadorCrudo().procesar(e)
          return { registros: hecho.registros, respuestas: [{ id: 'out-1', telefono: e.telefono, cuerpo: 'Anotado' }] }
        },
      },
    })
    const envios: string[] = []
    expect(
      await enviarSalientes({
        buzon,
        ahora: clock,
        maximo: 5,
        enviar: async () => {
          throw new Error('WhatsApp: 429')
        },
      }),
    ).toBe(0)
    expect(
      await enviarSalientes({
        buzon,
        ahora: clock,
        maximo: 5,
        enviar: async (s) => {
          envios.push(s.cuerpo)
        },
      }),
    ).toBe(0)
    avanzar(ESPERAS_SEG[0] ?? 5)
    expect(
      await enviarSalientes({
        buzon,
        ahora: clock,
        maximo: 5,
        enviar: async (s) => {
          envios.push(s.cuerpo)
        },
      }),
    ).toBe(1)
    expect(envios).toEqual(['Anotado'])
    expect(
      await enviarSalientes({
        buzon,
        ahora: clock,
        maximo: 5,
        enviar: async () => {
          throw new Error('no debería')
        },
      }),
    ).toBe(0)
  })
})

function esperar(listo: () => boolean): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const inicio = Date.now()
    const tick = () => {
      if (listo()) resolver()
      else if (Date.now() - inicio > 1000) rechazar(new Error('tardó demasiado'))
      else setTimeout(tick, 5)
    }
    tick()
  })
}

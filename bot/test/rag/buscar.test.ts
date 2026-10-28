import { describe, expect, it } from 'vitest'
import { crearRag } from '../../src/rag/servicio.js'
import type { Llm } from '../../src/rag/tipos.js'
import { LlmFalso } from '../externo/fakes.js'
import { AHORA, PERFILES, datosRag } from './datos.js'

const rag = (o: Partial<Parameters<typeof crearRag>[0]> = {}) =>
  crearRag({ datos: async () => datosRag(), ahora: () => AHORA, perfiles: PERFILES, ...o })

const ids = (r: { resultados: { perrito: { id: string } }[] }) => r.resultados.map((x) => x.perrito.id)

/** Embeddings a mano: la consulta apunta a [1,0]; solo Rocky está en esa dirección. Cuenta cada llamada. */
class LlmVectorial implements Llm {
  log: { tipo: string; n: number }[] = []
  async json<T>(): Promise<T> {
    throw new Error('no se usa')
  }
  async embeber(textos: string[], tipo: 'documento' | 'consulta') {
    this.log.push({ tipo, n: textos.length })
    return textos.map((t) => (tipo === 'consulta' || t.includes('Rocky') ? [1, 0] : [0, 1]))
  }
  documentos = () => this.log.filter((l) => l.tipo === 'documento')
}

describe('búsqueda léxica', () => {
  it('"busco un perrito tranquilo para mi mamá" pone primero a los tranquilos y mayores', async () => {
    const r = await rag().buscar('busco un perrito tranquilo para mi mamá')
    expect(r.modo).toBe('lexica')
    expect(ids(r).slice(0, 2).sort()).toEqual(['1', '3']) // Mateo y Toby
    expect(ids(r)[0]).toBe('1') // Mateo: tranquilo y de 9 años
    expect(ids(r)).not.toContain('4') // Luna es gato
    expect(ids(r)).not.toContain('5') // adoptado
    expect(r.resultados[0].motivo).toBe('Es viejito y tranquilo y tiene 9 años — ideal para una persona mayor')
    expect(r.resultados[0].puntaje).toBeGreaterThan(r.resultados[1].puntaje)
  })

  it('"quiero ayudar al más viejito" devuelve primero al más viejo y urgente', async () => {
    const r = await rag().buscar('quiero ayudar al más viejito')
    expect(ids(r)[0]).toBe('1')
    expect(r.resultados[0].motivo).toMatch(/9 años/)
  })

  it('"el más viejito" ordena por edad aunque varios sean urgentes (las reglas no se saturan)', async () => {
    const d = datosRag()
    const viejo = (id: string, nombre: string) => ({ id, nombre, especie: 'perro' as const, estado: 'adoptable' as const, foto: null, fechaIngreso: '2026-01-01', advertencias: [], caracter: '', padrino: null })
    d.animales = d.animales.filter((a) => a.id !== '1') // Mateo (9 años y en tratamiento) tiene su propia prueba
    d.animales.push(viejo('20', 'Benito'), viejo('21', 'Lola'), viejo('22', 'Paco'))
    const curado = (edadAnios: number) => ({ ...PERFILES.mateo, edadAnios, necesidadesMedicas: [] })
    const r = await rag({ datos: async () => d, perfiles: { ...PERFILES, benito: curado(12), lola: curado(11), paco: curado(8) } }).buscar('quiero ayudar al más viejito', 4)
    expect(ids(r).slice(0, 3)).toEqual(['20', '21', '22'])
  })

  it('el motivo no repite frases largas de personalidad ("Pasa las tardes echado…")', async () => {
    const d = datosRag()
    const r = await rag({ datos: async () => d, perfiles: { ...PERFILES, rocky: { ...PERFILES.rocky, personalidad: ['Juguetón', 'Mucha energía', 'Le encanta caminar y correr'] } } }).buscar('perrito juguetón')
    expect(r.resultados[0].motivo).toMatch(/^Es juguetón y tiene 2 años/)
  })

  it('filtra por especie: gato solo gatos, perritos solo perros', async () => {
    expect(ids(await rag().buscar('quiero un gato'))).toEqual(['4'])
    const perros = ids(await rag().buscar('perritos juguetones'))
    expect(perros[0]).toBe('2')
    expect(perros).not.toContain('4')
  })

  it('"con gatos" no es filtro de especie sino compatibilidad', async () => {
    const r = await rag().buscar('un perro que se lleve bien con gatos')
    expect(ids(r)).not.toContain('4')
    expect(ids(r)).not.toContain('2') // Rocky no se lleva con gatos
  })

  it('apartamento: los que no se adaptan no van primero', async () => {
    const r = await rag().buscar('vivo en un apartamento pequeño')
    expect(ids(r).slice(0, 2)).not.toContain('2')
  })

  it('el nombre propio gana: "háblame de Toby"', async () => {
    expect(ids(await rag().buscar('háblame de Toby'))[0]).toBe('3')
  })

  it('consulta vacía devuelve a los más urgentes', async () => {
    const r = await rag().buscar('   ')
    expect(ids(r)[0]).toBe('1')
    expect(r.modo).toBe('lexica')
    expect(r.resultados[0].motivo).toBeTruthy()
  })

  it('si nada encaja, sugiere a los más urgentes en vez de quedar vacío', async () => {
    const r = await rag().buscar('xyzzy plugh')
    expect(r.resultados.length).toBeGreaterThan(0)
    expect(ids(r)[0]).toBe('1')
  })

  it('respeta el límite', async () => {
    expect((await rag().buscar('perrito', 2)).resultados).toHaveLength(2)
  })
})

describe('búsqueda híbrida con embeddings', () => {
  it('usa los embeddings cuando funcionan: encuentra por significado lo que las palabras no ven', async () => {
    const llm = new LlmVectorial()
    const r = await rag({ llm }).buscar('algo que me haga reír')
    expect(r.modo).toBe('hibrida')
    expect(ids(r)).toEqual(['2'])
    // sin Gemini esa misma consulta no encuentra nada y cae a los urgentes
    expect(ids(await rag().buscar('algo que me haga reír'))[0]).toBe('1')
  })

  it('cae a léxica sin romperse si los embeddings fallan', async () => {
    const llm = new LlmFalso()
    llm.fallaEmbeddings = true
    const r = await rag({ llm }).buscar('perrito tranquilo')
    expect(r.modo).toBe('lexica')
    expect(ids(r).length).toBeGreaterThan(0)
  })

  it('con embeddings sanos del LlmFalso la respuesta es híbrida', async () => {
    const r = await rag({ llm: new LlmFalso() }).buscar('perrito tranquilo')
    expect(r.modo).toBe('hibrida')
    expect(ids(r)[0]).toBeTruthy()
  })

  it('cachea los embeddings de documentos: la segunda búsqueda no los repite', async () => {
    const llm = new LlmVectorial()
    const s = rag({ llm })
    await s.buscar('perrito tranquilo')
    await s.buscar('algo juguetón')
    expect(llm.documentos()).toEqual([{ tipo: 'documento', n: 4 }]) // los 4 visibles, en un solo lote
    expect(llm.log.filter((l) => l.tipo === 'consulta')).toHaveLength(2)
  })

  it('re-embebe solo el documento que cambió', async () => {
    const llm = new LlmVectorial()
    const datos = datosRag()
    const s = rag({ llm, ttlMs: 0, datos: async () => structuredClone(datos) })
    await s.buscar('perrito')
    datos.animales.find((a) => a.id === '4')!.caracter = 'Ahora es muy juguetón' // Luna no tiene perfil curado: su texto cambia
    await s.buscar('perrito')
    expect(llm.documentos()).toEqual([{ tipo: 'documento', n: 4 }, { tipo: 'documento', n: 1 }])
  })
})

describe('listar, porId y urgentes', () => {
  it('lista solo visibles, con la actividad de hoy, y filtra por especie', async () => {
    const d = datosRag()
    d.notas.push({ id: 'n1', animalId: '2', texto: 'Ya comió', fechaHora: '2026-10-27T09:00', quien: '1' })
    const s = rag({ datos: async () => d })
    const todos = await s.listar()
    expect(todos.map((p) => p.id).sort()).toEqual(['1', '2', '3', '4'])
    expect(todos.find((p) => p.id === '2')!.hoy.comioHoy).toBe(true)
    expect((await s.listar({ especie: 'gato' })).map((p) => p.id)).toEqual(['4'])
    expect(await s.listar({ limite: 2 })).toHaveLength(2)
    expect((await s.listar({ soloVisibles: false })).map((p) => p.id)).toContain('5')
  })

  it('porId devuelve el perfil o null', async () => {
    expect((await rag().porId('1'))!.nombre).toBe('Mateo')
    expect(await rag().porId('999')).toBeNull()
  })

  it('urgentes ordena por urgencia descendente', async () => {
    const u = await rag().urgentes(3)
    expect(u).toHaveLength(3)
    expect(u[0].id).toBe('1')
    expect(u[0].urgencia).toBeGreaterThanOrEqual(u[1].urgencia)
    expect(u[1].urgencia).toBeGreaterThanOrEqual(u[2].urgencia)
  })
})

describe('caché de datos', () => {
  it('no vuelve a pedir los datos dentro del TTL y sí después', async () => {
    let llamadas = 0
    let ahora = AHORA.getTime()
    const s = crearRag({ datos: async () => (llamadas++, datosRag()), ahora: () => new Date(ahora), perfiles: PERFILES })
    await Promise.all([s.listar(), s.listar(), s.buscar('perrito')])
    await s.urgentes()
    expect(llamadas).toBe(1)
    ahora += 16_000
    await s.listar()
    expect(llamadas).toBe(2)
  })

  it('si la base falla, sigue sirviendo la última foto buena', async () => {
    let falla = false
    let ahora = AHORA.getTime()
    const s = crearRag({ datos: async () => (falla ? Promise.reject(new Error('db caída')) : datosRag()), ahora: () => new Date(ahora), perfiles: PERFILES })
    await s.listar()
    falla = true
    ahora += 60_000
    expect(await s.listar()).toHaveLength(4)
  })

  it('sin foto previa, el error de la base sí se propaga', async () => {
    const s = crearRag({ datos: () => Promise.reject(new Error('db caída')), ahora: () => AHORA, perfiles: PERFILES })
    await expect(s.listar()).rejects.toThrow('db caída')
  })
})

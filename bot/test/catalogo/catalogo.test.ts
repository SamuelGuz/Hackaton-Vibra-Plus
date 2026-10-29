import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { crearSalidaCatalogo, montarRutasFotosCatalogo } from '../../src/catalogo/index.js'
import { crearRag } from '../../src/rag/servicio.js'
import { construirPerfil } from '../../src/rag/perfil.js'
import { montarRutasRag } from '../../src/rag/rutas.js'
import { LlmFalso } from '../externo/fakes.js'
import { AHORA, PERFILES, datosRag } from '../rag/datos.js'

it('limita listado, búsqueda, urgentes y acceso directo a los cinco perros demo', async () => {
  const datos = datosRag()
  const rag = crearRag({ datos: async () => datos, ahora: () => AHORA, perfiles: PERFILES, catalogoDemo: true })
  expect((await rag.listar({ soloVisibles: false })).map(p => p.nombre).sort()).toEqual(['Mateo', 'Toby'])
  expect(await rag.porId('2')).toBeNull()
  expect((await rag.buscar('Rocky')).resultados.every(r => ['Mateo', 'Toby'].includes(r.perrito.nombre))).toBe(true)
  expect((await rag.urgentes()).every(p => ['Mateo', 'Toby'].includes(p.nombre))).toBe(true)
  expect(datos.animales).toHaveLength(6)
})
it('permite desactivar explícitamente el catálogo demo', async () => {
  const rag = crearRag({ datos: async () => datosRag(), ahora: () => AHORA, perfiles: PERFILES, catalogoDemo: false })
  expect(await rag.porId('2')).toMatchObject({ nombre: 'Rocky' })
})
it('oculta también el acceso por id de perros adoptados y nombres homónimos de gatos', async () => {
  const d = datosRag()
  d.animales[0].estado = 'adoptado'
  d.animales[2].especie = 'gato'
  const rag = crearRag({ datos: async () => d, ahora: () => AHORA, catalogoDemo: true })
  expect(await rag.porId('1')).toBeNull()
  expect(await rag.porId('3')).toBeNull()
  expect(await rag.listar()).toEqual([])
})
it('la API entrega fotos absolutas del mismo origen y expone la etiqueta demo', async () => {
  const rag = crearRag({ datos: async () => datosRag(), ahora: () => AHORA, catalogoDemo: true })
  const app = new Hono()
  montarRutasRag(app, { rag, llm: new LlmFalso(), whatsappPublico: null })
  const r = await app.request('https://api.refugio.test/api/publico/rag/perritos')
  const json = await r.json()
  expect(json.perritos.every((p: any) => p.datosDemo === true && p.historiaConfirmada === false && p.foto.startsWith('https://api.refugio.test/api/publico/catalogo/fotos/'))).toBe(true)
})
it('configura la base pública para consumidores de perfiles fuera de las rutas HTTP', async () => {
  const rag = crearRag({ datos: async () => datosRag(), ahora: () => AHORA, catalogoDemo: true, basePublica: 'https://api.refugio.test' })
  expect((await rag.listar())[0].foto).toMatch(/^https:\/\/api.refugio.test\/api\/publico\/catalogo\/fotos\//)
})
it('no confunde un perfil curado con una historia confirmada', () => {
  const d = datosRag()
  expect(construirPerfil(d.animales[0], d, PERFILES, AHORA).historiaConfirmada).toBe(false)
  expect(construirPerfil(d.animales[0], d, { mateo: { ...PERFILES.mateo, historiaConfirmada: true } }, AHORA).historiaConfirmada).toBe(true)
})
it('sirve las cinco fotos reales en su MIME correcto y no abre rutas arbitrarias', async () => {
  const app = new Hono()
  montarRutasFotosCatalogo(app)
  for (const nombre of ['mateo', 'bruno', 'canela', 'pecas', 'toby']) {
    const r = await app.request(`/api/publico/catalogo/fotos/${nombre}.png`)
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('image/png')
    expect(new Uint8Array(await r.arrayBuffer()).slice(0, 4)).toEqual(new Uint8Array([137, 80, 78, 71]))
  }
  expect((await app.request('/api/publico/catalogo/fotos/secreto.png')).status).toBe(404)
})
it('renderiza máximo tres candidatos, escapa texto y embebe solo fotos locales', async () => {
  const rag = crearRag({ datos: async () => datosRag(), ahora: () => AHORA, perfiles: PERFILES, catalogoDemo: true })
  const p = (await rag.listar())[0]
  let html = ''
  const salida = await crearSalidaCatalogo([{ ...p, nombre: '<script>alert(1)</script>', foto: 'https://host-no-permitido/spy' }, p, p, p], async h => { html = h; return Buffer.from('png') })
  expect(salida).toMatchObject({ tipo: 'imagen', png: Buffer.from('png') })
  expect(html).toContain('&lt;script&gt;')
  expect(html).not.toContain('https://host-no-permitido')
  expect(html.match(/class="tarjeta"/g)).toHaveLength(3)
  expect(html).toContain('data:image/png;base64,')
  expect(html).toContain('DEMO')
})
it('no asigna una foto demo por compartir nombre con un animal real', async () => {
  const rag = crearRag({ datos: async () => datosRag(), ahora: () => AHORA, catalogoDemo: false })
  const mateo = (await rag.listar()).find(p => p.nombre === 'Mateo')!
  let html = ''
  await crearSalidaCatalogo([{ ...mateo, historiaConfirmada: true, foto: 'https://refugio.test/mateo-real.png' }], async h => { html = h; return Buffer.from('png') })
  expect(html.includes('data:image/png;base64,')).toBe(false)
  expect(html).not.toContain('https://refugio.test')
  expect(html).toContain('class="sin-foto"')
})


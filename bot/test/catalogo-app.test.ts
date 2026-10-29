import { describe, expect, it } from 'vitest'
import { crearApp } from '../src/app.js'
import { armarExterno } from '../src/externo.js'
import { crearDeps } from './fakes.js'
import { LlmFalso } from './externo/fakes.js'

describe('catálogo montado en la aplicación', () => {
  it('sirve fotos públicas reales sin pedir un token del panel y rechaza otros archivos', async () => {
    const { deps } = crearDeps()
    const externo = armarExterno({ GEMINI_API_KEY: 'solo-prueba' }, deps, { llm: new LlmFalso(), pausaHumana: async () => {} })
    const app = crearApp({ deps, externo, usuarioPorSesion: async () => null,
      eventos: async () => ({ dosis: [], inventario: [], movimientos: [], notas: [] }), leerArchivo: async () => null,
      verifyToken: 'test', appSecret: 'test' })
    const foto = await app.request('/api/publico/catalogo/fotos/mateo.png')
    expect(foto.status).toBe(200)
    expect(foto.headers.get('Content-Type')).toBe('image/png')
    const png = new Uint8Array(await foto.arrayBuffer())
    expect([...png.slice(0, 4)]).toEqual([137, 80, 78, 71])
    expect((await app.request('/api/publico/catalogo/fotos/desconocido.png')).status).toBe(404)
  })
})

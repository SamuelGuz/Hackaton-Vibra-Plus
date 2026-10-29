import { readFile } from 'node:fs/promises'
import type { Hono } from 'hono'
import { ANCHO } from '../informes/plantilla.js'
import type { PerritoPublico } from '../rag/tipos.js'
import type { Salida } from '../tipos.js'
import { CATALOGO_DEMO, fichaDemo } from './datos.js'
export { CATALOGO_DEMO, fichaDemo, fotoPublicaSegura } from './datos.js'

// Se publican exclusivamente los cinco recursos de esta lista, nunca una ruta del usuario.
// tsc conserva el módulo en dist/src/catalogo: el fallback busca los assets versionados en src.
async function fotoLocal(clave: string): Promise<Buffer> {
  try { return await readFile(new URL(`./assets/${clave}.png`, import.meta.url)) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return readFile(new URL(`../../../src/catalogo/assets/${clave}.png`, import.meta.url))
  }
}

export function montarRutasFotosCatalogo(app: Hono<any>): void {
  app.get('/api/publico/catalogo/fotos/:archivo', async c => {
    const ficha = CATALOGO_DEMO.find(p => `${p.clave}.png` === c.req.param('archivo'))
    if (!ficha) return c.notFound()
    const imagen = await fotoLocal(ficha.clave)
    return new Response(new Uint8Array(imagen), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': '*' } })
  })
}

const escapar = (t: string) => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Render local y determinista: no se visita ninguna URL del perfil. */
export async function crearSalidaCatalogo(perritos: PerritoPublico[], dibujar: (html: string) => Promise<Buffer>): Promise<Salida> {
  const candidatos = perritos.slice(0, 3)
  if (!candidatos.length) return { tipo: 'texto', texto: 'No encontré candidatos para mostrar. Cuéntame qué compañero buscas y revisamos otras opciones.' }
  const esDemo = candidatos.some(p => p.datosDemo === true)
  const tarjetas = await Promise.all(candidatos.map(async p => {
    const ficha = p.datosDemo === true ? fichaDemo(p.nombre) ?? CATALOGO_DEMO.find(f => p.foto?.endsWith(f.fotoRuta)) : undefined
    const foto = ficha ? `<img alt="" src="data:image/png;base64,${(await fotoLocal(ficha.clave)).toString('base64')}">` : '<div class="sin-foto">♥</div>'
    const demo = p.datosDemo === true
    return `<article class="tarjeta">${foto}<div class="contenido">${demo ? '<span class="demo">DEMO · Datos por confirmar</span>' : ''}<h2>${escapar(p.nombre)}</h2><p class="rasgos">${escapar(p.edadTexto)} · ${escapar(p.tamano === 'pequeno' ? 'pequeño' : p.tamano)}</p><p>${escapar(p.personalidad.slice(0, 3).join(' · ') || 'Conozcámonos con calma')}</p><strong>${p.adoptable ? 'Conversemos sobre su adopción' : 'Puedes ayudar apadrinando'}</strong></div></article>`
  }))
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:${ANCHO}px;background:#f8f2e7;color:#243f34;font-family:Arial,sans-serif;padding:24px}header{margin-bottom:24px}header small{font-size:16px;letter-spacing:3px}h1{font-size:34px;line-height:1.05;margin:12px 0}header p{font-size:19px;line-height:1.35;margin:0}.tarjeta{display:flex;overflow:hidden;border-radius:22px;background:white;margin:18px 0;min-height:220px;box-shadow:0 3px 0 #e5dccb}.tarjeta img,.sin-foto{width:170px;min-width:170px;object-fit:cover;object-position:center}.sin-foto{display:flex;align-items:center;justify-content:center;font-size:80px;background:#dce9df}.contenido{padding:18px;flex:1}h2{margin:10px 0;font-size:29px;overflow-wrap:anywhere}p{font-size:19px;line-height:1.35;margin:10px 0}.rasgos{color:#59665d}.demo{font-size:14px;letter-spacing:.5px;color:#815b28;font-weight:bold}strong{font-size:18px;color:#235443}footer{font-size:17px;line-height:1.4;margin-top:24px;color:#59665d}</style></head><body><header><small>REFUGIO YESENIA · CONOCE A TU COMPAÑERO</small><h1>Una nueva historia<br>puede empezar contigo.</h1><p>Estas son algunas opciones para conocernos mejor.</p></header>${tarjetas.join('')}<footer>${esDemo ? 'Catálogo de demostración. Las fotos son asignaciones de ejemplo; la identidad y los datos deben confirmarse con el refugio antes de adoptar.' : 'Consulta con el refugio la disponibilidad y los datos de cada compañero antes de adoptar.'}</footer></body></html>`
  return { tipo: 'imagen', png: await dibujar(html), texto: `Conoce a ${candidatos.map(p => p.nombre).join(', ')}${esDemo ? '. DEMO: fotos y datos por confirmar con el refugio' : ''}` }
}



import { saludo } from '../formato.js'
import { OPCIONES_MENU, textos } from '../textos.js'
import type { Estado } from '../tipos.js'
import { puedeManejarPlata, type Ctx } from './ctx.js'

export async function mostrarMenu(c: Ctx, antes?: string): Promise<Estado> {
  const filas = OPCIONES_MENU.filter((o) => !o.plata || puedeManejarPlata(c)).map(({ id, titulo, descripcion }) => ({
    id,
    titulo,
    descripcion,
  }))
  const texto = textos.menu(saludo(c.ahora), c.usuario.nombre)
  await c.enviar({ tipo: 'lista', texto: antes ? `${antes}\n\n${texto}` : texto, boton: textos.menuBoton, filas })
  return { paso: 'menu' }
}

export async function abrirPanel(c: Ctx): Promise<Estado> {
  const token = await c.deps.repo.crearSesion(c.usuario.id)
  const url = `${c.deps.panelUrl.replace(/\/$/, '')}/?t=${token}`
  await c.enviar({ tipo: 'texto', texto: textos.panel(url) })
  return { paso: 'menu' }
}

// "¿A quién toca llamar hoy?": los seguimientos de adopción del día, y anotar cómo salió cada llamada con un toque.
import { esDiaSeguimiento, lineaSeguimiento, pendientesDeHoy, veAdoptantes, type SeguimientoDeAdopcion } from '../adopcion/seguimientos.js'
import type { Monton } from '../adopcion/tipos.js'
import { fechaLocal } from '../formato.js'
import type { Rol } from '../panel-tipos.js'
import { textos } from '../textos.js'
import type { Deps, Estado, Salida } from '../tipos.js'
import { preguntarAlgoMas } from './confirmar.js'
import type { Ctx } from './ctx.js'
import { sinTildes } from './numeros.js'

/** Más mensajes con botones que esto en un solo pedido ya es mucho: el resto se anota escribiendo "seguimientos" otra vez */
const MAX_CON_BOTONES = 5

const PIDE_SEGUIMIENTOS = /\b(seguimientos?|a quien (le |me )?(llamo|toca llamar|tengo que llamar|hay que llamar)|llamadas? (de|para) hoy)\b/

/** Si el texto pide la lista de seguimientos */
export function pideSeguimientos(texto: string): boolean {
  return PIDE_SEGUIMIENTOS.test(sinTildes(texto.toLowerCase()))
}

export async function pendientes(deps: Deps, ahora: Date): Promise<SeguimientoDeAdopcion[]> {
  return pendientesDeHoy(await deps.repo.seguimientosAdopcion(), ahora)
}

/** "📞 Hoy toca llamar a los adoptantes de:" con una línea por llamada; null si no hay ninguna */
export function listaDeHoy(lista: readonly SeguimientoDeAdopcion[], ahora: Date, rol: Rol): string | null {
  if (lista.length === 0) return null
  const hoy = fechaLocal(ahora)
  return [textos.seguimientosTitulo, ...lista.map((s) => lineaSeguimiento(s, hoy, veAdoptantes(rol)))].join('\n')
}

/** Un mensaje por llamada con 🟢 🟡 🔴: el resultado se anota con un toque */
export function botonesDeSeguimiento(lista: readonly SeguimientoDeAdopcion[]): Salida[] {
  return lista.slice(0, MAX_CON_BOTONES).map((s) => {
    const id = `sg:${s.adopcionId}:${s.dia}`
    return {
      tipo: 'botones',
      texto: textos.seguimientoComoSalio(s.animalNombre, s.dia, s.adoptanteNombre),
      botones: [
        { id: `${id}:verde`, titulo: '🟢 Todo bien' },
        { id: `${id}:amarillo`, titulo: '🟡 Ojo / Revisar' },
        { id: `${id}:rojo`, titulo: '🔴 Problemas' },
      ],
    }
  })
}

export async function verSeguimientos(c: Ctx): Promise<Estado> {
  const lista = await pendientes(c.deps, c.ahora)
  const texto = listaDeHoy(lista, c.ahora, c.usuario.rol)
  if (!texto) return preguntarAlgoMas(c, textos.seguimientosNinguno)
  const masDeLaCuenta = lista.length > MAX_CON_BOTONES ? `\n\n${textos.seguimientosMas(lista.length - MAX_CON_BOTONES)}` : ''
  await c.enviar({ tipo: 'texto', texto: `${texto}\n\n${textos.seguimientosToca}${masDeLaCuenta}` })
  for (const s of botonesDeSeguimiento(lista)) await c.enviar(s)
  return { paso: 'menu' }
}

const RESULTADOS: Monton[] = ['verde', 'amarillo', 'rojo']

/** Botón 'sg:<adopción>:<día>:<verde|amarillo|rojo>' */
export async function anotarSeguimiento(c: Ctx, id: string): Promise<Estado> {
  const [, adopcionId = '', diaTexto = '', resultado = ''] = id.split(':')
  const dia = Number(diaTexto)
  if (!esDiaSeguimiento(dia) || !RESULTADOS.includes(resultado as Monton)) return preguntarAlgoMas(c, textos.seMePerdio)
  const todos = await c.deps.repo.seguimientosAdopcion()
  const s = todos.find((x) => x.adopcionId === adopcionId && x.dia === dia)
  if (!s || !(await c.deps.repo.registrarSeguimiento(adopcionId, dia, resultado as Monton, c.usuario.id, c.ahora))) {
    return preguntarAlgoMas(c, textos.seMePerdio)
  }
  return preguntarAlgoMas(c, textos.seguimientoAnotado(s.animalNombre, dia, resultado as Monton))
}

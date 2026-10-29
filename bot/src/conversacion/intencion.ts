// Las opciones del menú, y adivinar cuál quería la persona cuando dijo o escribió algo que la IA no pudo anotar
// ("le di una medicina a un perro" no dice a cuál: se abre la lista de dosis en vez de "no te entendí").
import type { Estado } from '../tipos.js'
import { empezarAnimal } from './animal.js'
import { empezarComida } from './comida.js'
import type { Ctx } from './ctx.js'
import { normal } from './elegir.js'
import { elegirInforme, informePedido } from './informe.js'
import { empezarMedicina } from './medicina.js'
import { abrirPanel, mostrarMenu } from './menu.js'
import { empezarFactura, empezarPlata } from './plata.js'
import { verHoy } from './resumen.js'
import { pideSeguimientos, verSeguimientos } from './seguimientos.js'

/** Abre una opción del menú. `pista` es lo que se dijo, para saltarse preguntas que ya se respondieron. */
export function opcionDelMenu(c: Ctx, opcion: string, pista?: string): Promise<Estado> {
  switch (opcion) {
    case 'med':
      return empezarMedicina(c, pista)
    case 'bulto':
      return empezarComida(c, false)
    case 'llego':
      return empezarComida(c, true)
    case 'entro':
      return empezarPlata(c, 'ingreso')
    case 'salio':
      return empezarPlata(c, 'gasto')
    case 'factura':
      return empezarFactura(c)
    case 'animal':
      return empezarAnimal(c)
    case 'hoy':
      return verHoy(c)
    case 'panel':
      return abrirPanel(c)
    case 'informe':
      return elegirInforme(c)
    case 'seg':
      return verSeguimientos(c)
    default:
      return mostrarMenu(c)
  }
}

// En orden: lo más específico primero ("llegó comida" antes que "comida")
const TEMAS: [RegExp, string][] = [
  [/\b(medicin\w*|medicament\w*|dosis|pastilla\w*|inyecci\w*|inyecte|gotas|jarabe|antibiotic\w*|desparasit\w*|pipeta)\b/, 'med'],
  [/\bfactura\b/, 'factura'],
  [/\b(llego|llegaron|trajeron|compre|compramos)\b.*\b(comida|bultos?|costal\w*|concentrado)\b/, 'llego'],
  [/\b(abri|abrimos|destape|empece)\b.*\b(bultos?|costal\w*|concentrado)\b|\b(bultos?|costal\w*|concentrado|comida)\b/, 'bulto'],
  [/\b(entro|entraron|recibi|recibimos|donaron|consignaron|me dieron|ingreso)\b|\bdonacion\b/, 'entro'],
  [/\b(salio|gaste|gastamos|pague|pagamos|gasto)\b/, 'salio'],
  [/\b(que (falta|hay|toca)|lo de hoy|pendientes?)\b/, 'hoy'],
  [/\bpanel\b/, 'panel'],
]

/** La opción del menú de la que habla el texto, o null */
export function temaDeTexto(texto: string): string | null {
  const t = normal(texto)
  if (informePedido(texto)) return 'informe'
  if (pideSeguimientos(texto)) return 'seg'
  return TEMAS.find(([re]) => re.test(t))?.[1] ?? null
}

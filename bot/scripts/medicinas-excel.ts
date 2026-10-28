// Crea el libro de Excel de muestra con las medicinas de demostración (datos ficticios).
// Uso: tsx scripts/medicinas-excel.ts [ruta] [--forzar]
// Sin ruta usa MEDICINAS_XLSX o datos/medicinas.xlsx. No pisa un archivo existente salvo con --forzar.

import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { crearAlmacenExcel } from '../src/medicinas/almacen-excel.js'
import { semillaMedicinas } from '../src/medicinas/semilla.js'

export interface Entorno {
  salida: (texto: string) => void
  error: (texto: string) => void
  ahora?: () => Date
}

/** Devuelve el código de salida (0 = bien) */
export async function ejecutar(args: string[], entorno: Entorno): Promise<number> {
  const opciones = args.filter((a) => a.startsWith('--'))
  const posicionales = args.filter((a) => !a.startsWith('--'))
  const desconocidas = opciones.filter((o) => o !== '--forzar')
  if (desconocidas.length > 0 || posicionales.length > 1) {
    entorno.error(`Opción no reconocida: ${desconocidas.join(' ') || posicionales.slice(1).join(' ')}`)
    entorno.error('Uso: tsx scripts/medicinas-excel.ts [ruta] [--forzar]')
    return 2
  }
  const forzar = opciones.includes('--forzar')
  const ruta = path.resolve(posicionales[0] ?? process.env.MEDICINAS_XLSX ?? 'datos/medicinas.xlsx')

  const existe = await fs.stat(ruta).then(() => true, () => false)
  if (existe && !forzar) {
    entorno.error(`Ya existe ${ruta}. No lo piso: puede tener datos reales. Use --forzar para reemplazarlo.`)
    return 1
  }

  const datos = semillaMedicinas((entorno.ahora ?? (() => new Date()))())
  await crearAlmacenExcel(ruta).guardar(datos) // guardar() es atómico: nunca deja el archivo a medias
  entorno.salida(`Libro creado: ${ruta}`)
  entorno.salida(`  ${datos.medicamentos.length} medicamentos, ${datos.lotes.length} lotes, ${datos.contactos.length} contactos (datos ficticios de demostración)`)
  entorno.salida('Ábralo con Excel para ver las hojas LEEME, Medicamentos, Lotes y Contactos.')
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  ejecutar(process.argv.slice(2), { salida: console.log, error: console.error }).then(
    (codigo) => process.exit(codigo),
    (e) => {
      console.error(e instanceof Error ? e.message : e)
      process.exit(1)
    },
  )
}

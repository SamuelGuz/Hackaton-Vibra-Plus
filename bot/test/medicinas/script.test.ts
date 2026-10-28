import fs from 'node:fs/promises'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ejecutar } from '../../scripts/medicinas-excel.js'
import { crearAlmacenExcel } from '../../src/medicinas/almacen-excel.js'
import { AHORA, carpetaTemporal } from './fixtures.js'

let dir = ''
let limpiar: () => Promise<void> = async () => {}
beforeEach(async () => {
  ;({ dir, limpiar } = await carpetaTemporal())
})
afterEach(() => limpiar())

function correr(args: string[]) {
  const salida: string[] = []
  const error: string[] = []
  const codigo = ejecutar(args, { salida: (t) => salida.push(t), error: (t) => error.push(t), ahora: () => AHORA })
  return codigo.then((c) => ({ codigo: c, salida: salida.join('\n'), error: error.join('\n') }))
}

describe('scripts/medicinas-excel', () => {
  it('crea el libro de muestra y resume lo que escribió', async () => {
    const ruta = path.join(dir, 'nuevo', 'medicinas.xlsx')
    const r = await correr([ruta])
    expect(r.codigo).toBe(0)
    expect(r.salida).toContain(ruta)
    expect(r.salida).toMatch(/\d+ medicamentos/)
    expect(r.salida).toMatch(/\d+ lotes/)
    expect(r.salida).toMatch(/\d+ contactos/)
    const datos = await crearAlmacenExcel(ruta).leer()
    expect(datos.medicamentos.length).toBeGreaterThan(25)
  })

  it('se niega a pisar un archivo existente y lo deja intacto', async () => {
    const ruta = path.join(dir, 'medicinas.xlsx')
    await fs.writeFile(ruta, 'datos del dueño que no se pueden perder')
    const r = await correr([ruta])
    expect(r.codigo).not.toBe(0)
    expect(r.error).toContain('--forzar')
    expect(await fs.readFile(ruta, 'utf8')).toBe('datos del dueño que no se pueden perder')
  })

  it('con --forzar lo reemplaza', async () => {
    const ruta = path.join(dir, 'medicinas.xlsx')
    await fs.writeFile(ruta, 'viejo')
    const r = await correr([ruta, '--forzar'])
    expect(r.codigo).toBe(0)
    expect((await crearAlmacenExcel(ruta).leer()).medicamentos.length).toBeGreaterThan(25)
    expect(await fs.readdir(dir)).toEqual(['medicinas.xlsx'])
  })

  it('--forzar puede ir antes de la ruta', async () => {
    const ruta = path.join(dir, 'medicinas.xlsx')
    await fs.writeFile(ruta, 'viejo')
    expect((await correr(['--forzar', ruta])).codigo).toBe(0)
  })

  it('rechaza opciones desconocidas sin escribir nada', async () => {
    const ruta = path.join(dir, 'medicinas.xlsx')
    const r = await correr([ruta, '--borrar-todo'])
    expect(r.codigo).not.toBe(0)
    expect(r.error).toContain('--borrar-todo')
    await expect(fs.stat(ruta)).rejects.toThrow()
  })
})

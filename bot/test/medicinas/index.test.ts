import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { crearMedicinas } from '../../src/medicinas/index.js'
import { AHORA, carpetaTemporal } from './fixtures.js'

let dir = ''
let limpiar: () => Promise<void> = async () => {}
beforeEach(async () => {
  ;({ dir, limpiar } = await carpetaTemporal())
})
afterEach(async () => {
  delete process.env.MEDICINAS_XLSX
  await limpiar()
})

describe('crearMedicinas', () => {
  it('crea el archivo con datos de demo si falta y el servicio ya consulta con el reloj dado', async () => {
    const { servicio, almacen } = crearMedicinas({ ruta: path.join(dir, 'm.xlsx'), ahora: () => AHORA })
    expect((await servicio.buscar('amoxicilna'))[0].medicamento.nombre).toBe('Amoxicilina')
    expect((await almacen.leer()).medicamentos.length).toBeGreaterThan(25)
    expect((await servicio.stockBajo()).length).toBeGreaterThan(0)
  })
  it('semilla: false crea el libro vacío', async () => {
    const { almacen } = crearMedicinas({ ruta: path.join(dir, 'vacio.xlsx'), semilla: false })
    expect(await almacen.leer()).toEqual({ medicamentos: [], lotes: [], contactos: [] })
  })
  it('usa MEDICINAS_XLSX cuando no se da ruta', async () => {
    process.env.MEDICINAS_XLSX = path.join(dir, 'env.xlsx')
    const { almacen } = crearMedicinas({ ahora: () => AHORA })
    await almacen.leer()
    const { servicio } = crearMedicinas({ semilla: false })
    expect((await servicio.datos()).medicamentos.length).toBeGreaterThan(25) // leyó el mismo archivo, ya creado
  })
})

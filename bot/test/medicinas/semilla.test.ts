import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { crearAlmacenExcel } from '../../src/medicinas/almacen-excel.js'
import { crearAlmacenMemoria } from '../../src/medicinas/almacen-memoria.js'
import { diasEntre, hoyBogota } from '../../src/medicinas/fechas.js'
import { crearServicioMedicinas } from '../../src/medicinas/servicio.js'
import { semillaMedicinas } from '../../src/medicinas/semilla.js'
import { dosisHablada, horasDelDia } from '../../src/api/hoy.js'
import type { Tratamiento } from '../../src/panel-tipos.js'
import { AHORA, carpetaTemporal } from './fixtures.js'

const datos = semillaMedicinas(AHORA)
const servicio = crearServicioMedicinas(crearAlmacenMemoria(datos), { ahora: () => AHORA })

/** Los tratamientos de verdad de scripts/semilla.ts, leídos del propio archivo para que no se desfasen. */
async function tratamientosDeLaSemillaDelAlbergue(): Promise<Tratamiento[]> {
  const fuente = await fs.readFile(path.join(import.meta.dirname, '../../scripts/semilla.ts'), 'utf8')
  const re = /\[\s*'([^']+)',\s*'([^']+)',\s*([\d.]+),\s*'([^']+)',\s*(\d+),\s*'(\d\d:\d\d)',\s*(-?\d+),\s*(-?\d+)\s*\]/g
  const lista: Tratamiento[] = []
  for (const m of fuente.matchAll(re)) {
    lista.push({
      id: `t${lista.length}`,
      animalId: m[1],
      medicamento: m[2],
      dosis: dosisHablada(Number(m[3]), m[4]),
      horas: horasDelDia(m[6], Number(m[5])),
      inicio: '2000-01-01',
      fin: '2999-12-31',
    })
  }
  return lista
}

describe('semillaMedicinas', () => {
  it('es determinista y no comparte estado entre llamadas', () => {
    const a = semillaMedicinas(AHORA)
    const b = semillaMedicinas(AHORA)
    expect(a).toEqual(b)
    a.medicamentos[0].nombre = 'x'
    expect(semillaMedicinas(AHORA).medicamentos[0].nombre).not.toBe('x')
  })

  it('tiene alrededor de 30 medicamentos y 45 contactos con la mezcla pedida', () => {
    expect(datos.medicamentos.length).toBeGreaterThanOrEqual(28)
    expect(datos.medicamentos.length).toBeLessThanOrEqual(36)
    const por = (t: string) => datos.contactos.filter((c) => c.tipo === t).length
    expect(por('proveedor')).toBe(5)
    expect(por('clinica')).toBe(2)
    expect(por('padrino')).toBe(10)
    expect(por('donante')).toBe(10)
    expect(por('adoptante')).toBe(10)
    expect(por('voluntario')).toBe(8)
    expect(datos.contactos.some((c) => !c.activo)).toBe(true)
    expect(datos.contactos.map((c) => c.nombre)).toEqual(expect.arrayContaining(['Clínica Veterinaria San Roque', 'Clínica Veterinaria 24 Horas']))
  })

  it('es coherente: ids únicos, lotes y proveedores que existen, datos claramente falsos', () => {
    const unicos = (xs: string[]) => new Set(xs).size === xs.length
    expect(unicos(datos.medicamentos.map((m) => m.id))).toBe(true)
    expect(unicos(datos.lotes.map((l) => l.id))).toBe(true)
    expect(unicos(datos.contactos.map((c) => c.id))).toBe(true)
    const medIds = new Set(datos.medicamentos.map((m) => m.id))
    for (const l of datos.lotes) expect(medIds.has(l.medicamentoId), l.id).toBe(true)
    const prov = new Map(datos.contactos.map((c) => [c.id, c]))
    for (const m of datos.medicamentos) {
      const p = prov.get(m.proveedorId ?? '')
      expect(p && ['proveedor', 'clinica'].includes(p.tipo), m.id).toBe(true)
      expect(m.precioUnitarioCOP).toBeGreaterThan(0)
      expect(m.stockMinimo).toBeGreaterThan(0)
      const lotes = datos.lotes.filter((l) => l.medicamentoId === m.id)
      expect(lotes.length, m.id).toBeGreaterThanOrEqual(2)
      expect(lotes.length, m.id).toBeLessThanOrEqual(3)
    }
    for (const c of datos.contactos) {
      expect(c.telefono).toMatch(/^573\d{9}$/)
      expect(c.correo).toMatch(/@example\.com$/)
    }
    const hoy = hoyBogota(AHORA)
    for (const l of datos.lotes) expect(diasEntre(l.ingreso, hoy)).toBeGreaterThanOrEqual(0)
    expect(datos.medicamentos.some((m) => m.requiereFormula && m.nombre === 'Tramadol')).toBe(true)
  })

  it('cada medicamento que usan los tratamientos de scripts/semilla.ts se enlaza con uno del catálogo', async () => {
    const tratamientos = await tratamientosDeLaSemillaDelAlbergue()
    expect(tratamientos.length).toBeGreaterThanOrEqual(8)
    const nombres = tratamientos.map((t) => t.medicamento)
    expect(nombres).toEqual(expect.arrayContaining(['Amoxicilina', 'Meloxicam (dolor)', 'Desparasitante', 'Gotas para los ojos', 'Antibiótico', 'Vitaminas', 'Fenobarbital (anticonvulsivo)', 'Baño con champú medicado']))
    for (const t of tratamientos) {
      const usados = []
      for (const m of datos.medicamentos) {
        const dias = await servicio.diasDeStock(m.id, [t], AHORA)
        if (dias !== null) usados.push({ id: m.id, dias })
      }
      expect(usados.length, `${t.medicamento} debe enlazar con exactamente un medicamento`).toBe(1)
      expect(usados[0].dias, t.medicamento).toBeGreaterThan(0)
    }
    // y los tratamientos se reparten bien: Amoxicilina no se confunde con amoxicilina + clavulánico
    const amox = await servicio.diasDeStock('amoxicilina', tratamientos, AHORA)
    expect(amox).not.toBeNull()
  })

  it('trae los casos de demo: vencidos, por vencer, stock bajo y uno en cero', async () => {
    expect((await servicio.vencidos(AHORA)).length).toBeGreaterThanOrEqual(3)
    const por30 = await servicio.porVencer(30, AHORA)
    expect(por30.length).toBeGreaterThanOrEqual(3)
    expect(por30.every((x) => x.diasRestantes >= 0 && x.diasRestantes <= 30)).toBe(true)
    const bajos = await servicio.stockBajo()
    expect(bajos.length).toBeGreaterThanOrEqual(3)
    expect(bajos.some((b) => b.stock === 0)).toBe(true)
    // pero la mayoría está sana
    expect(bajos.length).toBeLessThan(datos.medicamentos.length / 2)
  })

  it('las fechas se mueven con "ahora": siempre hay vencidos y por vencer sea cual sea el día', async () => {
    const otro = new Date('2027-03-15T09:00:00-05:00')
    const s = crearServicioMedicinas(crearAlmacenMemoria(semillaMedicinas(otro)), { ahora: () => otro })
    expect((await s.vencidos(otro)).length).toBeGreaterThanOrEqual(3)
    expect((await s.porVencer(30, otro)).length).toBeGreaterThanOrEqual(3)
  })

  it('se busca como en el chat: dolor, antibiótico, parásitos, convulsiones', async () => {
    const primero = async (q: string) => (await servicio.buscar(q)).map((r) => r.medicamento.categoria)
    expect(await primero('algo para el dolor')).toEqual(expect.arrayContaining(['analgesico', 'antiinflamatorio']))
    expect((await primero('antibiótico')).slice(0, 6).every((c) => c === 'antibiotico')).toBe(true)
    expect((await servicio.buscar('amoxicilna'))[0].medicamento.nombre).toBe('Amoxicilina')
    expect((await servicio.buscar('meloxicam'))[0].medicamento.nombre).toBe('Meloxicam')
    expect((await servicio.buscar('convulsiones'))[0].medicamento.nombre).toBe('Fenobarbital')
    expect((await servicio.buscar('para los parásitos')).length).toBeGreaterThanOrEqual(2)
  })

  it('sobrevive a un viaje por el Excel', async () => {
    const { dir, limpiar } = await carpetaTemporal()
    try {
      const almacen = crearAlmacenExcel(path.join(dir, 'm.xlsx'), { semilla: () => datos })
      expect(await almacen.leer()).toEqual(datos)
    } finally {
      await limpiar()
    }
  })
})

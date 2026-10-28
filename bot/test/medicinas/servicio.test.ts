import { describe, expect, it } from 'vitest'
import { crearAlmacenMemoria } from '../../src/medicinas/almacen-memoria.js'
import { diasEntre, esFechaISO, hoyBogota, sumarDias } from '../../src/medicinas/fechas.js'
import { crearServicioMedicinas } from '../../src/medicinas/servicio.js'
import { distancia, normalizar } from '../../src/medicinas/texto.js'
import type { Tratamiento } from '../../src/panel-tipos.js'
import { AHORA, datosDePrueba, dia, HOY, lote, med } from './fixtures.js'

function servicio(datos = datosDePrueba()) {
  return crearServicioMedicinas(crearAlmacenMemoria(datos), { ahora: () => AHORA })
}
const ids = (r: { medicamento: { id: string } }[]) => r.map((x) => x.medicamento.id)

function tratamiento(medicamento: string, dosis: string, horas: string[], extra: Partial<Tratamiento> = {}): Tratamiento {
  return { id: 't', animalId: '1', medicamento, dosis, horas, inicio: dia(-2), fin: dia(5), ...extra }
}

describe('fechas y texto', () => {
  it('usa la fecha de Bogotá, no la UTC', () => {
    expect(hoyBogota(new Date('2026-10-29T02:30:00Z'))).toBe('2026-10-28') // 9:30 p. m. en Bogotá
    expect(hoyBogota(AHORA)).toBe(HOY)
  })
  it('suma días y los cuenta', () => {
    expect(sumarDias('2026-12-30', 3)).toBe('2027-01-02')
    expect(diasEntre('2026-10-28', '2026-11-27')).toBe(30)
    expect(diasEntre('2026-10-28', '2026-10-23')).toBe(-5)
  })
  it('valida fechas reales', () => {
    expect(esFechaISO('2026-02-28')).toBe(true)
    expect(esFechaISO('2026-02-30')).toBe(false)
    expect(esFechaISO('28/10/2026')).toBe(false)
  })
  it('normaliza tildes, mayúsculas y signos', () => {
    expect(normalizar('  Champú  Medicado (Dolor)! ')).toBe('champu medicado dolor')
    expect(distancia('amoxicilna', 'amoxicilina', 2)).toBe(1)
    expect(distancia('perro', 'gatos', 1)).toBeGreaterThan(1)
  })
})

describe('buscar', () => {
  it.each([
    ['amoxicilina', 'amox'],
    ['AMOXICILINA', 'amox'],
    ['amoxicilna', 'amox'], // falta una letra
    ['amoxicilinaa', 'amox'], // sobra una
    ['meloxicam', 'melox'],
    ['Meloxicán', 'melox'], // tilde de más
    ['meloxicm', 'melox'],
    ['metacam', 'melox'], // alias
    ['amoxi', 'amox'], // alias y prefijo
    ['trihidrato', 'amox'], // principio activo
    ['fenobarbital', 'feno'],
    ['champu medicado', 'champu'],
    ['gotas para los ojos', 'gotas'],
  ])('"%s" encuentra %s primero', async (texto, esperado) => {
    const r = await servicio().buscar(texto)
    expect(r[0]?.medicamento.id).toBe(esperado)
  })

  it('entiende sinónimos de uso', async () => {
    const s = servicio()
    expect(ids(await s.buscar('algo para el dolor'))).toEqual(expect.arrayContaining(['melox', 'tram']))
    expect(ids(await s.buscar('algo para el dolor'))).not.toContain('amox')
    expect(ids(await s.buscar('antibiótico'))).toEqual(expect.arrayContaining(['amox', 'amox-clav']))
    expect(ids(await s.buscar('antibiotico'))).not.toContain('melox')
    expect(ids(await s.buscar('para los parásitos'))).toEqual(['ivm'])
    expect(ids(await s.buscar('convulsiones'))[0]).toBe('feno')
    expect(ids(await s.buscar('algo para los ojos'))[0]).toBe('gotas')
    expect(ids(await s.buscar('vitaminas'))).toEqual(expect.arrayContaining(['vit', 'compl-b']))
    expect(ids(await s.buscar('antibiotco'))).toContain('amox') // error de tipeo en la categoría
  })

  it('lo exacto va antes que lo parecido', async () => {
    const r = await servicio().buscar('amoxicilina')
    expect(ids(r).slice(0, 2)).toEqual(['amox', 'amox-clav'])
  })

  it('no inventa resultados', async () => {
    const s = servicio()
    expect(await s.buscar('xyzqwerty')).toEqual([])
    expect(await s.buscar('   ')).toEqual([])
    expect(await s.buscar('algo para el')).toEqual([])
  })

  it('respeta el límite', async () => {
    expect(await servicio().buscar('antibiótico', 1)).toHaveLength(1)
  })

  it('el resumen trae stock sin lotes vencidos, lotes, proveedor y próximo vencimiento', async () => {
    const [r] = await servicio().buscar('amoxicilina')
    expect(r.stock).toBe(2) // el lote vencido (10) no cuenta
    expect(r.lotes.map((l) => l.id)).toEqual(['l2', 'l1']) // todos, ordenados por vencimiento
    expect(r.venceProximo).toBe(dia(40))
    expect(r.bajoMinimo).toBe(true)
    expect(r.proveedor?.nombre).toBe('Droguería Veterinaria El Cachorro')
  })
})

describe('porId', () => {
  it('devuelve el resumen o null', async () => {
    const s = servicio()
    expect((await s.porId('melox'))?.stock).toBe(100)
    expect((await s.porId('melox'))?.proveedor).toBeNull()
    expect(await s.porId('nada')).toBeNull()
  })
  it('usa el reloj inyectado: un lote que vence mañana deja de contar pasado mañana', async () => {
    const datos = { medicamentos: [med('a', 'A')], lotes: [lote('x', 'a', 1, 5)], contactos: [] }
    let ahora = AHORA
    const s = crearServicioMedicinas(crearAlmacenMemoria(datos), { ahora: () => ahora })
    expect((await s.porId('a'))?.stock).toBe(5)
    ahora = new Date('2026-10-30T10:00:00-05:00')
    expect((await s.porId('a'))?.stock).toBe(0)
    expect((await s.porId('a'))?.venceProximo).toBeNull()
  })
  it('el lote vale hasta el final del día en que vence', async () => {
    const datos = { medicamentos: [med('a', 'A')], lotes: [lote('x', 'a', 0, 5)], contactos: [] }
    const s = crearServicioMedicinas(crearAlmacenMemoria(datos), { ahora: () => AHORA })
    expect((await s.porId('a'))?.stock).toBe(5)
  })
})

describe('stock bajo', () => {
  it('incluye bajo el mínimo y también el stock en cero, pero no el que está justo en el mínimo', async () => {
    const datos = datosDePrueba()
    datos.medicamentos.push(med('justo', 'Justo', { stockMinimo: 4 }))
    datos.lotes.push(lote('lj', 'justo', 90, 4))
    const r = await servicio(datos).stockBajo()
    expect(ids(r).sort()).toEqual(['amox', 'keto'].sort()) // amox 2<3, keto 0<5 (solo tenía un lote vencido)
  })
  it('un medicamento sin ningún lote cuenta como stock cero', async () => {
    const datos = datosDePrueba()
    datos.medicamentos.push(med('sin', 'Sin lotes', { stockMinimo: 1 }))
    expect(ids(await servicio(datos).stockBajo())).toContain('sin')
  })
  it('stockMinimo 0 nunca es bajo', async () => {
    const datos = { medicamentos: [med('a', 'A', { stockMinimo: 0 })], lotes: [], contactos: [] }
    expect(await servicio(datos).stockBajo()).toEqual([])
  })
})

describe('vencimientos', () => {
  it('porVencer devuelve solo lotes no vencidos dentro de la ventana, ordenados', async () => {
    const s = servicio()
    const a30 = await s.porVencer(30, AHORA)
    expect(a30.map((x) => x.lote.id)).toEqual(['l7'])
    expect(a30[0].diasRestantes).toBe(25)
    expect(a30[0].medicamento.id).toBe('ivm')
    const a60 = await s.porVencer(60, AHORA)
    expect(a60.map((x) => x.lote.id)).toEqual(['l7', 'l1'])
    expect(a60[1].diasRestantes).toBe(40)
  })
  it('el lote que vence hoy cuenta con 0 días; el de ayer ya está vencido', async () => {
    const datos = {
      medicamentos: [med('a', 'A')],
      lotes: [lote('hoy', 'a', 0, 1), lote('ayer', 'a', -1, 1)],
      contactos: [],
    }
    const s = servicio(datos)
    expect((await s.porVencer(0, AHORA)).map((x) => x.lote.id)).toEqual(['hoy'])
    expect((await s.vencidos(AHORA)).map((x) => x.lote.id)).toEqual(['ayer'])
  })
  it('vencidos trae días negativos, el más viejo primero', async () => {
    const r = await servicio().vencidos(AHORA)
    expect(r.map((x) => [x.lote.id, x.diasRestantes])).toEqual([
      ['l2', -5],
      ['l12', -3],
    ])
  })
  it('ignora lotes sin unidades', async () => {
    const datos = { medicamentos: [med('a', 'A')], lotes: [lote('v', 'a', -10, 0), lote('p', 'a', 5, 0)], contactos: [] }
    const s = servicio(datos)
    expect(await s.vencidos(AHORA)).toEqual([])
    expect(await s.porVencer(30, AHORA)).toEqual([])
  })
})

describe('contactos', () => {
  it('filtra por tipo y devuelve todos sin filtro', async () => {
    const s = servicio()
    expect((await s.contactos()).length).toBe(4)
    expect((await s.contactos('padrino')).map((c) => c.id)).toEqual(['pad1', 'pad2'])
    expect(await s.contactos('donante')).toEqual([])
  })
})

describe('diasDeStock', () => {
  it('Amoxicilina 3 ml cada 12 h con frasco de 60 ml: 2 frascos = 120 ml a 6 ml/día = 20 días', async () => {
    const t = tratamiento('Amoxicilina', '3 ml', ['08:00', '20:00'])
    expect(await servicio().diasDeStock('amox', [t], AHORA)).toBe(20)
  })
  it('Fenobarbital (anticonvulsivo) se enlaza con Fenobarbital: 90 pastillas, 1 al día', async () => {
    const t = tratamiento('Fenobarbital (anticonvulsivo)', '1 pastilla', ['14:00'])
    expect(await servicio().diasDeStock('feno', [t], AHORA)).toBe(90)
  })
  it('"media pastilla" cuenta 0,5 y "Meloxicam (dolor)" se enlaza con Meloxicam', async () => {
    const t = tratamiento('Meloxicam (dolor)', 'media pastilla', ['08:00'])
    expect(await servicio().diasDeStock('melox', [t], AHORA)).toBe(200)
  })
  it('convierte gotas a ml: 2 gotas cada 6 h, frasco de 10 ml × 2 = 20 ml', async () => {
    const t = tratamiento('Gotas para los ojos', '2 gotas', ['08:00', '14:00', '20:00', '02:00'])
    // 8 gotas al día = 0,4 ml → 50 días
    expect(await servicio().diasDeStock('gotas', [t], AHORA)).toBe(50)
  })
  it('un baño usa unos 30 ml del frasco de champú: 3 frascos de 250 ml', async () => {
    const t = tratamiento('Baño con champú medicado', '1 baño', ['10:00'])
    // 3 × 250 ml = 750 ml / 30 ml = 25 baños
    expect(await servicio().diasDeStock('champu', [t], AHORA)).toBe(25)
  })
  it('acepta dosis con coma decimal y fracciones', async () => {
    const s = servicio()
    expect(await s.diasDeStock('melox', [tratamiento('Meloxicam', '0,5 pastilla', ['08:00'])], AHORA)).toBe(200)
    expect(await s.diasDeStock('melox', [tratamiento('Meloxicam', '1/2 pastilla', ['08:00'])], AHORA)).toBe(200)
    expect(await s.diasDeStock('melox', [tratamiento('Meloxicam', '2 pastillas', ['08:00'])], AHORA)).toBe(50)
  })
  it('suma los tratamientos activos del mismo medicamento', async () => {
    const a = tratamiento('Fenobarbital', '1 pastilla', ['08:00', '20:00'])
    const b = tratamiento('Fenobarbital', '1 pastilla', ['14:00'], { id: 't2' })
    expect(await servicio().diasDeStock('feno', [a, b], AHORA)).toBe(30) // 3 al día
  })
  it('si la dosis no se entiende cuenta 1 unidad por toma', async () => {
    const t = tratamiento('Fenobarbital', 'según indicación', ['08:00', '20:00'])
    expect(await servicio().diasDeStock('feno', [t], AHORA)).toBe(45) // 2 al día
  })
  it('ignora tratamientos vencidos, futuros o inactivos', async () => {
    const s = servicio()
    const viejo = tratamiento('Fenobarbital', '1 pastilla', ['08:00'], { fin: dia(-1) })
    const futuro = tratamiento('Fenobarbital', '1 pastilla', ['08:00'], { inicio: dia(1), fin: dia(9) })
    const inactivo = { ...tratamiento('Fenobarbital', '1 pastilla', ['08:00']), activo: false }
    expect(await s.diasDeStock('feno', [viejo, futuro, inactivo], AHORA)).toBeNull()
    const hoyMismo = tratamiento('Fenobarbital', '1 pastilla', ['08:00'], { inicio: HOY, fin: HOY })
    expect(await s.diasDeStock('feno', [hoyMismo], AHORA)).toBe(90)
  })
  it('es null si nadie lo usa o no existe, y 0 si no queda stock', async () => {
    const s = servicio()
    expect(await s.diasDeStock('feno', [], AHORA)).toBeNull()
    expect(await s.diasDeStock('feno', [tratamiento('Ibuprofeno', '1 pastilla', ['08:00'])], AHORA)).toBeNull()
    expect(await s.diasDeStock('no-existe', [tratamiento('Fenobarbital', '1', ['08:00'])], AHORA)).toBeNull()
    expect(await s.diasDeStock('keto', [tratamiento('Ketoconazol', '1 pastilla', ['08:00'])], AHORA)).toBe(0)
  })
  it('un tratamiento cuenta para el medicamento que mejor coincide, no para todos los que lo contienen', async () => {
    const s = servicio()
    const t = tratamiento('Amoxicilina', '1 ml', ['08:00'])
    expect(await s.diasDeStock('amox-clav', [t], AHORA)).toBeNull()
    expect(await s.diasDeStock('amox', [t], AHORA)).not.toBeNull()
  })
})

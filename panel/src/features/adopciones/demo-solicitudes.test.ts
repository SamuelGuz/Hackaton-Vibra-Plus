import { describe, expect, it } from 'vitest'
import { clasificar } from '@huellitas/shared/adopcion/clasificar'
import { crearDatosDemo } from '../../data/demo'
import { crearSolicitudesDemo } from './demo-solicitudes'

const AHORA = new Date(2026, 9, 27, 9, 30)

describe('crearSolicitudesDemo (S42)', () => {
  const solicitudes = crearSolicitudesDemo(AHORA)
  const cuantas = (monton: string) => solicitudes.filter((s) => clasificar(s).monton === monton).length

  it('son 25 solicitudes: 8 verdes, 9 amarillas y 8 rojas según las reglas', () => {
    expect(solicitudes).toHaveLength(25)
    expect([cuantas('verde'), cuantas('amarillo'), cuantas('rojo')]).toEqual([8, 9, 8])
  })

  it('cada una tiene su razón en una frase', () => {
    for (const s of solicitudes) {
      const { razon } = clasificar(s)
      expect(razon.length).toBeGreaterThan(10)
      expect(razon).not.toMatch(/[.!?]\s*\S/) // una sola frase
    }
  })

  it('los ids son únicos y ninguna viene movida a mano (la demo muestra la sugerencia)', () => {
    expect(new Set(solicitudes.map((s) => s.id)).size).toBe(25)
    expect(solicitudes.every((s) => s.montonManual === null)).toBe(true)
  })

  it('animalId es un animal de los datos demo, o null si preguntó en general', () => {
    const animales = new Set(crearDatosDemo(AHORA).animales.map((a) => a.id))
    for (const s of solicitudes) {
      if (s.animalId !== null) expect(animales.has(s.animalId)).toBe(true)
    }
    expect(solicitudes.some((s) => s.animalId === null)).toBe(true)
  })

  it('teléfonos y cédulas son obviamente ficticios', () => {
    for (const s of solicitudes) {
      expect(s.telefono).toMatch(/^300 000 00\d\d$/)
      expect(s.cedula).toMatch(/^1\.000\.000\.0\d\d$/)
    }
  })

  it('el caso Bruno: pide a Bruno con prisa por llevárselo y cae en 🟡', () => {
    const bruno = crearDatosDemo(AHORA).animales.find((a) => a.nombre === 'Bruno')
    const caso = solicitudes.find((s) => s.animalId === bruno?.id && s.quiereEntregaInmediata)
    expect(caso).toBeDefined()
    expect(clasificar(caso!).monton).toBe('amarillo')
    expect(clasificar(caso!).razon).toContain('afán')
  })

  it('las fechas son de los últimos días respecto a "ahora", la más nueva de hoy', () => {
    const fechas = solicitudes.map((s) => s.fecha).sort()
    expect(fechas[fechas.length - 1]!.startsWith('2026-10-27')).toBe(true)
    expect(fechas[0]! >= '2026-10-22').toBe(true)
    expect(crearSolicitudesDemo(new Date(2026, 10, 3, 9, 0)).map((s) => s.fecha).sort().at(-1)!.startsWith('2026-11-03')).toBe(true)
  })

  it('es determinista para un mismo "ahora"', () => {
    expect(crearSolicitudesDemo(AHORA)).toEqual(solicitudes)
  })
})

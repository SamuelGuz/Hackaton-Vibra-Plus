import { describe, expect, it } from 'vitest'
import { ahoraBogota, horaCorta } from '../../src/domain/hora'

describe('horaCorta', () => {
  it('pasa 14:01 a 2:01 PM', () => {
    expect(horaCorta('14:01')).toBe('2:01 PM')
  })
  it('pasa 00:05 a 12:05 AM', () => {
    expect(horaCorta('00:05')).toBe('12:05 AM')
  })
  it('deja el mediodía en 12:00 PM y el 12:30 en PM', () => {
    expect(horaCorta('12:00')).toBe('12:00 PM')
    expect(horaCorta('12:30')).toBe('12:30 PM')
  })
  it('pasa 23:59 a 11:59 PM y 08:00 a 8:00 AM', () => {
    expect(horaCorta('23:59')).toBe('11:59 PM')
    expect(horaCorta('08:00')).toBe('8:00 AM')
  })
  it('lee la hora de un ISO con -05:00 tal como está escrita', () => {
    expect(horaCorta('2026-10-27T14:01:00-05:00')).toBe('2:01 PM')
  })
  it('lee un ISO sin zona como hora de Bogotá', () => {
    expect(horaCorta('2026-10-27T06:58')).toBe('6:58 AM')
  })
  it('convierte un ISO en UTC a hora de Bogotá', () => {
    expect(horaCorta('2026-10-27T19:01:00Z')).toBe('2:01 PM')
  })
})

describe('ahoraBogota', () => {
  it('a las 03:30 UTC del 28 todavía es el 27 en Bogotá', () => {
    const r = ahoraBogota(new Date('2026-10-28T03:30:00Z'))
    expect(r.fecha).toBe('2026-10-27')
    expect(r.hora).toBe('22:30')
    expect(r.iso).toBe('2026-10-27T22:30:00-05:00')
  })
  it('a las 05:00 UTC ya es medianoche del mismo día en Bogotá', () => {
    const r = ahoraBogota(new Date('2026-01-01T05:00:00Z'))
    expect(r.fecha).toBe('2026-01-01')
    expect(r.hora).toBe('00:00')
  })
  it('sin argumento usa el reloj actual', () => {
    expect(ahoraBogota().fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

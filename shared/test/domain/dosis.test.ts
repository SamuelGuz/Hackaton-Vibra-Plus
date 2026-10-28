import { describe, expect, it } from 'vitest'
import { asignarCompromiso, dosisDelDia } from '../../src/domain/dosis'
import type { Tratamiento } from '../../src/tipos'
import { COMPROMISO_TOB_02, COMPROMISO_TOB_14, DOSIS_TOB, FECHA, semilla } from '../fixtures/semilla'

function trat(parcial: Partial<Tratamiento> = {}): Tratamiento {
  return { ...semilla().tratamientos[0]!, ...parcial }
}

describe('dosisDelDia', () => {
  it('cada 12 h desde las 14:00 da 02:00 y 14:00', () => {
    const dosis = dosisDelDia([trat()], FECHA)
    expect(dosis.map((d) => d.hora)).toEqual(['02:00', '14:00'])
  })

  it('cada 8 h desde las 06:00 da 3 dosis', () => {
    expect(dosisDelDia([trat({ horas: ['06:00', '14:00', '22:00'] })], FECHA)).toHaveLength(3)
  })

  it('arma el compromisoId como tratamiento@fechaTHH:mm y copia animal y medicamento', () => {
    const dosis = dosisDelDia([trat()], FECHA)
    expect(dosis).toEqual(DOSIS_TOB)
    expect(dosis.map((d) => d.compromisoId)).toEqual([COMPROMISO_TOB_02, COMPROMISO_TOB_14])
  })

  it('ordena las horas aunque el tratamiento las traiga desordenadas', () => {
    expect(dosisDelDia([trat({ horas: ['14:00', '02:00'] })], FECHA).map((d) => d.hora)).toEqual(['02:00', '14:00'])
  })

  it('un tratamiento con fin anterior a la fecha da 0 dosis', () => {
    expect(dosisDelDia([trat({ fin: '2026-10-26' })], FECHA)).toEqual([])
  })

  it('el último día del tratamiento todavía da dosis', () => {
    expect(dosisDelDia([trat({ fin: FECHA })], FECHA)).toHaveLength(2)
  })

  it('un tratamiento con activo:false da 0 dosis aunque esté dentro de inicio–fin', () => {
    expect(dosisDelDia([trat({ activo: false })], FECHA)).toEqual([])
  })

  it('un tratamiento sin activo (undefined) sí da dosis', () => {
    expect(dosisDelDia([trat({ activo: undefined })], FECHA)).toHaveLength(2)
  })

  it('un tratamiento que empieza mañana da 0 dosis hoy', () => {
    expect(dosisDelDia([trat({ inicio: '2026-10-28' })], FECHA)).toEqual([])
  })

  it('un tratamiento sin fecha de fin (cadena vacía) sigue vigente', () => {
    expect(dosisDelDia([trat({ fin: '' })], FECHA)).toHaveLength(2)
  })

  it('junta las dosis de varios tratamientos', () => {
    const otro = trat({ id: 't-mat-1', animalId: 'MAT', medicamento: 'Antibiótico', horas: ['08:00'] })
    expect(dosisDelDia([trat(), otro], FECHA).map((d) => d.compromisoId)).toEqual([
      COMPROMISO_TOB_02,
      COMPROMISO_TOB_14,
      `t-mat-1@${FECHA}T08:00`,
    ])
  })
})

describe('asignarCompromiso', () => {
  it('asigna la dosis de las 14:00 a un reporte de las 14:20', () => {
    expect(asignarCompromiso('TOB', 'anticonvulsivo', '14:20', DOSIS_TOB)).toEqual(DOSIS_TOB[1])
  })

  it('ignora mayúsculas, tildes y espacios del medicamento', () => {
    expect(asignarCompromiso('TOB', 'Anticonvulsivo ', '14:20', DOSIS_TOB)).toEqual(DOSIS_TOB[1])
    expect(asignarCompromiso('TOB', 'ANTICONVULSÍVO', '14:20', DOSIS_TOB)).toEqual(DOSIS_TOB[1])
    expect(asignarCompromiso('TOB', ' anti convulsivo', '14:20', DOSIS_TOB)).toEqual(DOSIS_TOB[1])
  })

  it('elige la dosis más cercana', () => {
    expect(asignarCompromiso('TOB', 'anticonvulsivo', '03:30', DOSIS_TOB)).toEqual(DOSIS_TOB[0])
    expect(asignarCompromiso('TOB', 'anticonvulsivo', '12:30', DOSIS_TOB)).toEqual(DOSIS_TOB[1])
  })

  it('con una diferencia de más de 180 min devuelve undefined', () => {
    expect(asignarCompromiso('TOB', 'anticonvulsivo', '17:01', DOSIS_TOB)).toBeUndefined()
  })

  it('con exactamente 180 min todavía asigna', () => {
    expect(asignarCompromiso('TOB', 'anticonvulsivo', '17:00', DOSIS_TOB)).toEqual(DOSIS_TOB[1])
    expect(asignarCompromiso('TOB', 'anticonvulsivo', '11:00', DOSIS_TOB)).toEqual(DOSIS_TOB[1])
  })

  it('no asigna la dosis de otro animal ni de otro medicamento', () => {
    expect(asignarCompromiso('MAT', 'anticonvulsivo', '14:00', DOSIS_TOB)).toBeUndefined()
    expect(asignarCompromiso('TOB', 'ibuprofeno', '14:00', DOSIS_TOB)).toBeUndefined()
  })

  it('sin dosis programadas devuelve undefined', () => {
    expect(asignarCompromiso('TOB', 'anticonvulsivo', '14:00', [])).toBeUndefined()
  })
})

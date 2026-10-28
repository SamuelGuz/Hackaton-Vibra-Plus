import { describe, expect, it } from 'vitest'
import { actividadHoy } from '../../src/rag/actividad'
import { AHORA, HOY, datosRag } from './datos'

const nota = (animalId: string, texto: string, hora = '10:00', dia = HOY) => ({ animalId, texto, fechaHora: `${dia}T${hora}:00-05:00` })

describe('actividadHoy', () => {
  it('sin registros no adivina: comioHoy null y sin nota', () => {
    expect(actividadHoy('2', datosRag(), AHORA)).toEqual({ comioHoy: null, medicinas: { programadas: 0, tomadas: 0 }, notaDelDia: null })
  })

  it('comió: solo un registro de comida de hoy lo dice', () => {
    const d = datosRag()
    d.comieronHoy.add('2')
    expect(actividadHoy('2', d, AHORA).comioHoy).toBe(true)
    expect(actividadHoy('3', d, AHORA).comioHoy).toBeNull() // otro animal: no se sabe
  })

  it('una nota que habla de comida no cuenta como registro de comida: se muestra, pero comioHoy sigue en null', () => {
    const d = datosRag()
    d.notas.push(nota('2', 'Ya comió todo su concentrado'))
    expect(actividadHoy('2', d, AHORA)).toMatchObject({ comioHoy: null, notaDelDia: 'Ya comió todo su concentrado' })
  })

  it('la nota de otro día no cuenta', () => {
    const d = datosRag()
    d.notas.push(nota('2', 'Ya camina solito'))
    d.notas.push(nota('2', 'Nota vieja', '09:00', '2026-10-26'))
    expect(actividadHoy('2', d, AHORA).notaDelDia).toBe('Ya camina solito')
  })

  it('manda la nota más reciente del animal y no la de otro', () => {
    const d = datosRag()
    d.notas.push(nota('2', 'Primera', '08:00'), nota('2', 'La última', '13:00'), nota('3', 'Otra cosa', '14:00'))
    expect(actividadHoy('2', d, AHORA).notaDelDia).toBe('La última')
  })

  it('medicinas: 1 de 2 dosis tomadas hoy', () => {
    const d = datosRag()
    d.dosisDadas.push({ tratamientoId: 't1', hora: '08:00', fechaHora: `${HOY}T08:10:00-05:00` })
    d.dosisDadas.push({ tratamientoId: 't1', hora: '20:00', fechaHora: '2026-10-26T20:05:00-05:00' })
    expect(actividadHoy('1', d, AHORA).medicinas).toEqual({ programadas: 2, tomadas: 1 })
  })

  it('un tratamiento vencido no programa dosis', () => {
    const d = datosRag()
    d.tratamientos[0]!.fin = '2026-10-01'
    expect(actividadHoy('1', d, AHORA).medicinas).toEqual({ programadas: 0, tomadas: 0 })
  })

  it('un tratamiento suspendido (activo: false) no programa dosis', () => {
    const d = datosRag()
    d.tratamientos[0]!.activo = false
    expect(actividadHoy('1', d, AHORA).medicinas).toEqual({ programadas: 0, tomadas: 0 })
  })

  it('no deja salir teléfonos que alguien escribió en una nota', () => {
    const d = datosRag()
    d.notas.push(nota('2', 'Ya comió. Llamar a Pedro al 300 123 4567'))
    expect(actividadHoy('2', d, AHORA).notaDelDia).not.toMatch(/4567/)
  })
})

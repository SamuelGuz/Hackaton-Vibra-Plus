import { describe, expect, it } from 'vitest'
import { actividadHoy } from '../../src/rag/actividad.js'
import { AHORA, HOY, datosRag } from './datos.js'

const nota = (animalId: string, texto: string, hora = '10:00', dia = HOY) => ({ id: `n${Math.random()}`, animalId, texto, fechaHora: `${dia}T${hora}`, quien: '1' })

describe('actividadHoy', () => {
  it('sin registros no adivina: comioHoy null y sin nota', () => {
    expect(actividadHoy('2', datosRag(), AHORA)).toEqual({ comioHoy: null, medicinas: { programadas: 0, tomadas: 0 }, notaDelDia: null })
  })

  it('comió: una nota de hoy lo dice', () => {
    const d = datosRag()
    d.notas.push(nota('2', 'Ya comió todo su concentrado'))
    expect(actividadHoy('2', d, AHORA)).toMatchObject({ comioHoy: true, notaDelDia: 'Ya comió todo su concentrado' })
  })

  it('no comió: "no quiso comer" y "no comió" dan false', () => {
    for (const texto of ['No quiso comer en la mañana', 'Hoy no comió nada']) {
      const d = datosRag()
      d.notas.push(nota('2', texto))
      expect(actividadHoy('2', d, AHORA).comioHoy, texto).toBe(false)
    }
  })

  it('una nota que no habla de comida no cuenta, y la de otro día tampoco', () => {
    const d = datosRag()
    d.notas.push(nota('2', 'Ya camina solito'))
    d.notas.push(nota('2', 'Comió bien', '09:00', '2026-10-26'))
    expect(actividadHoy('2', d, AHORA)).toMatchObject({ comioHoy: null, notaDelDia: 'Ya camina solito' })
  })

  it('manda la nota más reciente del animal y no la de otro', () => {
    const d = datosRag()
    d.notas.push(nota('2', 'No quiso comer', '08:00'), nota('2', 'Ya comió', '13:00'), nota('3', 'Otra cosa', '14:00'))
    expect(actividadHoy('2', d, AHORA)).toMatchObject({ comioHoy: true, notaDelDia: 'Ya comió' })
  })

  it('medicinas: 1 de 2 dosis tomadas hoy', () => {
    const d = datosRag()
    d.dosisDadas.push({ id: 'd1', tratamientoId: 't1', hora: '08:00', fechaHora: `${HOY}T08:10`, quien: '1', origen: 'bot' })
    d.dosisDadas.push({ id: 'd0', tratamientoId: 't1', hora: '20:00', fechaHora: '2026-10-26T20:05', quien: '1', origen: 'bot' })
    expect(actividadHoy('1', d, AHORA).medicinas).toEqual({ programadas: 2, tomadas: 1 })
  })

  it('un tratamiento vencido no programa dosis', () => {
    const d = datosRag()
    d.tratamientos[0].fin = '2026-10-01'
    expect(actividadHoy('1', d, AHORA).medicinas).toEqual({ programadas: 0, tomadas: 0 })
  })

  it('no deja salir teléfonos que alguien escribió en una nota', () => {
    const d = datosRag()
    d.notas.push(nota('2', 'Ya comió. Llamar a Pedro al 300 123 4567'))
    expect(actividadHoy('2', d, AHORA).notaDelDia).not.toMatch(/4567/)
  })
})

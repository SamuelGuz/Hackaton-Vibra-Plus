import { describe, expect, it } from 'vitest'
import { cargarDatosRag } from '../../src/rag/datos'
import { AHORA, HOY, registro, repoRag } from './datos'

const dosis = (hora: string, extra = {}) => registro({ tipo: 'dosis', animalId: '1', tratamientoId: 't1', hora }, extra)

describe('cargarDatosRag', () => {
  it('sin registros: animales y tratamientos de la base y nada de actividad', async () => {
    const d = await cargarDatosRag(repoRag(), AHORA)
    expect(d.animales.map((a) => a.id)).toEqual(['1', '2', '3', '4', '5', '6'])
    expect(d.tratamientos.map((t) => t.id)).toEqual(['t1'])
    expect(d.dosisDadas).toEqual([])
    expect(d.notas).toEqual([])
    expect([...d.comieronHoy]).toEqual([])
  })

  it('"hoy" es el día de Bogotá: a las 22:30 del 27 (03:30Z del 28) los registros del 27 siguen siendo de hoy', async () => {
    const repo = repoRag({ registros: [registro({ tipo: 'comida', animalId: '2', texto: 'comió' })] })
    expect([...(await cargarDatosRag(repo, new Date('2026-10-28T03:30:00Z'))).comieronHoy]).toEqual(['2'])
    expect([...(await cargarDatosRag(repo, new Date('2026-10-28T06:00:00Z'))).comieronHoy]).toEqual([])
  })

  it('comida: un registro de comida de hoy marca al animal; los anulados y los de otro día no', async () => {
    const repo = repoRag({
      registros: [
        registro({ tipo: 'comida', animalId: '2', texto: 'se comió todo' }),
        registro({ tipo: 'comida', animalId: '3', texto: 'comió' }, { estado: 'anulado' }),
        registro({ tipo: 'comida', animalId: '4', texto: 'comió' }, { fechaHora: '2026-10-26T09:00:00-05:00' }),
        registro({ tipo: 'nota', animalId: '1', texto: 'Ya comió' }),
      ],
    })
    expect([...(await cargarDatosRag(repo, AHORA)).comieronHoy]).toEqual(['2'])
  })

  it('dosis: solo las de hoy no anuladas, sin quién las dio', async () => {
    const repo = repoRag({
      registros: [
        dosis('08:00', { fechaHora: `${HOY}T08:10:00-05:00`, estado: 'por_confirmar' }),
        dosis('20:00', { estado: 'anulado' }),
        dosis('08:00', { fechaHora: '2026-10-26T08:10:00-05:00' }),
      ],
    })
    const d = await cargarDatosRag(repo, AHORA)
    expect(d.dosisDadas).toEqual([{ tratamientoId: 't1', hora: '08:00', fechaHora: `${HOY}T08:10:00-05:00` }])
  })

  it('notas: nota, observación y avance de hoy; sin agenteId ni frase exacta', async () => {
    const repo = repoRag({
      registros: [
        registro({ tipo: 'nota', animalId: '2', texto: 'Ya camina solito' }, { fraseExacta: 'dijo Carlos' }),
        registro({ tipo: 'observacion', animalId: '2', texto: 'Algo triste' }, { fechaHora: `${HOY}T10:00:00-05:00` }),
        registro({ tipo: 'avance', animalId: '3', texto: 'Mejora la cadera' }, { fechaHora: `${HOY}T11:00:00-05:00` }),
        registro({ tipo: 'nota', animalId: '3', texto: 'borrada' }, { estado: 'anulado' }),
        registro({ tipo: 'inventario', especie: 'perro', cambio: -1 }),
      ],
    })
    const d = await cargarDatosRag(repo, AHORA)
    expect(d.notas.map((n) => [n.animalId, n.texto])).toEqual([['2', 'Ya camina solito'], ['2', 'Algo triste'], ['3', 'Mejora la cadera']])
    expect(JSON.stringify(d)).not.toMatch(/p-carlos|Carlos/)
  })

  it('padrinos: cuenta los padrinazgos activos por animal, sin nombres ni teléfonos', async () => {
    const repo = repoRag({
      padrinazgos: [
        { id: 'a', personaTelefono: '573009990001', personaNombre: 'Valentina G.', animalId: '4', activo: true },
        { id: 'b', personaTelefono: '573009990002', personaNombre: 'Luis', animalId: '4', activo: true },
        { id: 'c', personaTelefono: '573009990003', personaNombre: 'Inactivo', animalId: '3', activo: false },
      ],
    })
    const d = await cargarDatosRag(repo, AHORA)
    expect(d.padrinosPorAnimal).toEqual({ '4': 2 })
    expect(JSON.stringify(d.padrinosPorAnimal)).not.toMatch(/Valentina|5730/)
  })
})

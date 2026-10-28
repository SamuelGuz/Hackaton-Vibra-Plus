import { describe, expect, it } from 'vitest'
import { hechosSemana } from '../../src/domain/padrino'
import type { Registro } from '../../src/registro'
import { FECHA, comida, registro, semilla } from '../fixtures/semilla'

const TOBIAS = semilla().animales[0]!
const MATEO = semilla().animales[1]!

/** Una dosis confirmada de Tobías: programada a `hora` del día `dia` y reportada `minutos` después. */
function dosis(id: string, dia: string, hora: string, minutos = 1, parcial: Partial<Registro> = {}): Registro {
  const [h = 0, m = 0] = hora.split(':').map(Number)
  const total = h * 60 + m + minutos
  const reportada = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  return registro({
    id,
    estado: 'confirmado',
    fechaHora: `${dia}T${reportada}:00-05:00`,
    compromisoId: `t-tob-anticonvulsivo@${dia}T${hora}`,
    propuesta: { tipo: 'dosis', animalId: 'TOB', tratamientoId: 't-tob-anticonvulsivo', hora },
    ...parcial,
  })
}

function semanaDeDosis(): Registro[] {
  const dias = ['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', FECHA]
  return dias.flatMap((dia) => [dosis(`d-${dia}-02`, dia, '02:00'), dosis(`d-${dia}-14`, dia, '14:00')])
}

function avance(id: string, texto: string, parcial: Partial<Registro> = {}): Registro {
  return registro({
    id,
    estado: 'confirmado',
    propuesta: { tipo: 'avance', animalId: 'TOB', texto: 'camina' },
    fraseExacta: texto,
    compromisoId: undefined,
    ...parcial,
  })
}

describe('hechosSemana', () => {
  it('14 de 14 dosis en la semana producen "Recibió sus 14 dosis a tiempo"', () => {
    const hechos = hechosSemana(TOBIAS, semanaDeDosis())
    expect(hechos.map((h) => h.texto)).toContain('Recibió sus 14 dosis a tiempo')
  })

  it('el hecho de las dosis apunta al id de un registro de dosis', () => {
    const registros = semanaDeDosis()
    const hecho = hechosSemana(TOBIAS, registros).find((h) => h.texto.startsWith('Recibió'))
    expect(registros.map((r) => r.id)).toContain(hecho?.eventoId)
  })

  it('una dosis reportada con más de 60 minutos de atraso no cuenta como a tiempo', () => {
    const registros = [dosis('d1', FECHA, '02:00'), dosis('d2', FECHA, '14:00', 90)]
    expect(hechosSemana(TOBIAS, registros).map((h) => h.texto)).toEqual(['Recibió 1 de 2 dosis a tiempo'])
  })

  it('una sola dosis a tiempo usa el singular', () => {
    expect(hechosSemana(TOBIAS, [dosis('d1', FECHA, '14:00')]).map((h) => h.texto)).toEqual(['Recibió su dosis a tiempo'])
  })

  it('un avance produce un hecho con su fraseExacta', () => {
    const hechos = hechosSemana(TOBIAS, [avance('a1', 'ya camina solito')])
    expect(hechos).toEqual([{ eventoId: 'a1', texto: 'ya camina solito' }])
  })

  it('una observación produce un hecho con su fraseExacta', () => {
    const o = registro({
      id: 'o1',
      estado: 'confirmado',
      propuesta: { tipo: 'observacion', animalId: 'TOB', texto: 'tranquilo' },
      fraseExacta: 'hoy estuvo muy tranquilo',
      compromisoId: undefined,
    })
    expect(hechosSemana(TOBIAS, [o])).toEqual([{ eventoId: 'o1', texto: 'hoy estuvo muy tranquilo' }])
  })

  it('la comida produce un hecho que cuenta los días distintos en que comió', () => {
    const registros = [
      comida('c1', 'TOB', { estado: 'confirmado', fechaHora: '2026-10-25T08:00:00-05:00' }),
      comida('c2', 'TOB', { estado: 'confirmado', fechaHora: '2026-10-25T17:00:00-05:00' }),
      comida('c3', 'TOB', { estado: 'confirmado', fechaHora: '2026-10-26T08:00:00-05:00' }),
    ]
    expect(hechosSemana(TOBIAS, registros).map((h) => h.texto)).toEqual(['Comió bien 2 días de la semana'])
    expect(hechosSemana(TOBIAS, [registros[0]!]).map((h) => h.texto)).toEqual(['Comió bien 1 día de la semana'])
  })

  it('solo entran registros confirmados', () => {
    const registros = [
      avance('a1', 'confirmado'),
      avance('a2', 'sin confirmar', { estado: 'por_confirmar' }),
      avance('a3', 'anulado', { estado: 'anulado' }),
      avance('a4', 'corregido', { estado: 'corregido' }),
      dosis('d1', FECHA, '14:00', 1, { estado: 'por_confirmar' }),
    ]
    expect(hechosSemana(TOBIAS, registros)).toEqual([{ eventoId: 'a1', texto: 'confirmado' }])
  })

  it('solo entran los tipos dosis, comida, avance y observacion del animal', () => {
    const registros = [
      avance('a-mateo', 'de Mateo', { propuesta: { tipo: 'avance', animalId: 'MAT', texto: 'x' } }),
      registro({ id: 'n1', estado: 'confirmado', propuesta: { tipo: 'nota', animalId: 'TOB', texto: 'nota' }, compromisoId: undefined }),
      registro({ id: 'e1', estado: 'confirmado', propuesta: { tipo: 'estado_animal', animalId: 'TOB', estado: 'adoptable' }, compromisoId: undefined }),
      registro({ id: 'i1', estado: 'confirmado', propuesta: { tipo: 'inventario', especie: 'perro', cambio: -1 }, compromisoId: undefined }),
      comida('c-mateo', 'MAT', { estado: 'confirmado' }),
    ]
    expect(hechosSemana(TOBIAS, registros)).toEqual([])
    expect(hechosSemana(MATEO, registros).map((h) => h.eventoId)).toEqual(['c-mateo', 'a-mateo'])
  })

  it('ningún hecho incluye nombres de agentes', () => {
    const registros = [...semanaDeDosis(), avance('a1', 'ya camina solito'), comida('c1', 'TOB', { estado: 'confirmado' })]
    const nombres = semilla().personas.map((p) => p.nombre)
    for (const hecho of hechosSemana(TOBIAS, registros)) {
      for (const nombre of nombres) expect(hecho.texto).not.toContain(nombre)
    }
  })

  it('un avance sin fraseExacta usa el texto de la propuesta', () => {
    const a = avance('a1', 'x', { fraseExacta: undefined, propuesta: { tipo: 'avance', animalId: 'TOB', texto: 'ya come solo' } })
    expect(hechosSemana(TOBIAS, [a])).toEqual([{ eventoId: 'a1', texto: 'ya come solo' }])
  })

  it('sin registros no hay hechos', () => {
    expect(hechosSemana(TOBIAS, [])).toEqual([])
  })
})

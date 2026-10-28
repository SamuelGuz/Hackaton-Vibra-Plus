import { describe, expect, it } from 'vitest'
import { programarSeguimientos, registrarResultado, seguimientosDeHoy } from '../../src/adopcion/clasificar'

const ADOPTANTE = { nombre: 'Laura Ortiz', telefono: '300 000 0001' }

describe('programarSeguimientos (S41)', () => {
  it('crea los 5 seguimientos de los días 2, 5, 15, 30 y 90', () => {
    const lista = programarSeguimientos('sol-1', ADOPTANTE, 'perro-2', '2026-10-28')
    expect(lista.map((s) => s.dia)).toEqual([2, 5, 15, 30, 90])
    expect(lista.map((s) => s.fecha)).toEqual(['2026-10-30', '2026-11-02', '2026-11-12', '2026-11-27', '2027-01-26'])
  })

  it('copia solicitud, adoptante, animal y fecha de entrega; nace pendiente y sin llamada humana', () => {
    const [primero] = programarSeguimientos('sol-1', ADOPTANTE, 'perro-2', '2026-10-28')
    expect(primero).toMatchObject({
      solicitudId: 'sol-1',
      adoptanteNombre: 'Laura Ortiz',
      adoptanteTelefono: '300 000 0001',
      animalId: 'perro-2',
      fechaEntrega: '2026-10-28',
      resultado: null,
      llamadaHumana: false,
      nota: '',
    })
  })

  it('acepta un adoptante que no vino por el formulario (solicitudId null)', () => {
    const lista = programarSeguimientos(null, ADOPTANTE, 'gato-1', '2026-10-28')
    expect(lista.every((s) => s.solicitudId === null)).toBe(true)
  })

  it('cada seguimiento tiene id propio', () => {
    const lista = programarSeguimientos('sol-1', ADOPTANTE, 'perro-2', '2026-10-28')
    expect(new Set(lista.map((s) => s.id)).size).toBe(5)
  })

  it('cruza el fin de año sin errores de zona horaria', () => {
    const lista = programarSeguimientos('sol-1', ADOPTANTE, 'perro-2', '2026-12-30')
    expect(lista.map((s) => s.fecha)).toEqual(['2027-01-01', '2027-01-04', '2027-01-14', '2027-01-29', '2027-03-30'])
  })
})

describe('seguimientosDeHoy', () => {
  const lista = programarSeguimientos('sol-1', ADOPTANTE, 'perro-2', '2026-10-28')

  it('el mismo día de la entrega todavía no toca llamar', () => {
    expect(seguimientosDeHoy(lista, '2026-10-28')).toEqual([])
  })

  it('el día 2 toca llamar al día 2', () => {
    expect(seguimientosDeHoy(lista, '2026-10-30').map((s) => s.dia)).toEqual([2])
  })

  it('lo atrasado también aparece, en orden de fecha', () => {
    expect(seguimientosDeHoy(lista, '2026-11-12').map((s) => s.dia)).toEqual([2, 5, 15])
  })

  it('los que ya tienen resultado salen de la lista', () => {
    const hecho = lista.map((s) => (s.dia === 2 ? registrarResultado(s, 'verde') : s))
    expect(seguimientosDeHoy(hecho, '2026-11-02').map((s) => s.dia)).toEqual([5])
  })
})

describe('registrarResultado: 🟡/🔴 → llamada humana obligatoria (S41)', () => {
  const [seg] = programarSeguimientos('sol-1', ADOPTANTE, 'perro-2', '2026-10-28')

  it('verde no exige llamada humana', () => {
    expect(registrarResultado(seg!, 'verde')).toMatchObject({ resultado: 'verde', llamadaHumana: false })
  })

  it.each(['amarillo', 'rojo'] as const)('%s exige llamada humana', (resultado) => {
    expect(registrarResultado(seg!, resultado, 'Dice que lo devolvería')).toMatchObject({
      resultado,
      llamadaHumana: true,
      nota: 'Dice que lo devolvería',
    })
  })

  it('sin nota conserva la que había y no modifica el original', () => {
    const conNota = { ...seg!, nota: 'Llamar en la tarde' }
    expect(registrarResultado(conNota, 'amarillo').nota).toBe('Llamar en la tarde')
    expect(seg!.resultado).toBeNull()
  })
})

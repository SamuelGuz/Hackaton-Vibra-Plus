import { describe, expect, it } from 'vitest'
import { buildCierre, textoCierre } from '../../src/domain/cierre'
import type { Registro } from '../../src/registro'
import type { Cierre } from '../../src/vistas'
import { COMPROMISO_TOB_02, FECHA, comida, registro, semilla } from '../fixtures/semilla'

function cierre(eventos: Registro[], modifica?: (s: ReturnType<typeof semilla>) => void): Cierre {
  const s = semilla()
  modifica?.(s)
  return buildCierre(s.animales, s.tratamientos, eventos, s.personas, FECHA)
}

const dosis02 = (estado: Registro['estado'] = 'confirmado'): Registro =>
  registro({ id: 'd-02', estado, compromisoId: COMPROMISO_TOB_02, fechaHora: `${FECHA}T02:05:00-05:00` })
const dosis14 = (estado: Registro['estado'] = 'confirmado'): Registro => registro({ id: 'd-14', estado })

/** Los 4 animales comieron y las dos dosis de Tobías tienen registro. */
function diaCompleto(): Registro[] {
  return [
    comida('c-tob', 'TOB', { estado: 'confirmado' }),
    comida('c-mat', 'MAT', { estado: 'confirmado' }),
    comida('c-bru', 'BRU', { estado: 'por_confirmar' }),
    comida('c-lun', 'LUN', { estado: 'corregido' }),
    dosis02(),
    dosis14(),
  ]
}

describe('buildCierre', () => {
  it('todos comieron (confirmado o por confirmar) y todas las dosis tienen registro: todoBien', () => {
    const c = cierre(diaCompleto())
    expect(c.todoBien).toBe(true)
    expect(c.faltantes).toEqual([])
  })

  it('si Luna no tiene comida, faltantes dice "Luna no consta que haya comido"', () => {
    const c = cierre(diaCompleto().filter((r) => r.id !== 'c-lun'))
    expect(c.todoBien).toBe(false)
    expect(c.faltantes).toContain('Luna no consta que haya comido')
    expect(c.faltantes).toHaveLength(1)
  })

  it('una comida anulada no cuenta', () => {
    const eventos = diaCompleto().map((r) => (r.id === 'c-lun' ? { ...r, estado: 'anulado' as const } : r))
    expect(cierre(eventos).faltantes).toEqual(['Luna no consta que haya comido'])
  })

  it('una dosis sin registro genera "Tobías: dosis de las 2:00 PM pendiente"', () => {
    const c = cierre(diaCompleto().filter((r) => r.id !== 'd-14'))
    expect(c.todoBien).toBe(false)
    expect(c.faltantes).toEqual(['Tobías: dosis de las 2:00 PM pendiente'])
  })

  it('la dosis de la madrugada sin registro dice las 2:00 AM', () => {
    const c = cierre(diaCompleto().filter((r) => r.id !== 'd-02'))
    expect(c.faltantes).toEqual(['Tobías: dosis de las 2:00 AM pendiente'])
  })

  it('una dosis con registro anulado sigue pendiente', () => {
    const eventos = diaCompleto().map((r) => (r.id === 'd-14' ? { ...r, estado: 'anulado' as const } : r))
    expect(cierre(eventos).faltantes).toEqual(['Tobías: dosis de las 2:00 PM pendiente'])
  })

  it('un tratamiento suspendido no deja dosis pendientes', () => {
    const c = cierre(
      diaCompleto().filter((r) => r.propuesta.tipo !== 'dosis'),
      (s) => {
        s.tratamientos[0] = { ...s.tratamientos[0]!, activo: false }
      },
    )
    expect(c.todoBien).toBe(true)
  })

  it('un pendiente por confirmar de Andrea genera la línea "Tobías – anticonvulsivo – 2:01 PM – Andrea"', () => {
    const c = cierre([...diaCompleto().filter((r) => r.id !== 'd-14'), dosis14('por_confirmar')])
    expect(c.pendientes).toEqual([
      { registroId: 'c-bru', linea: 'Bruno – comida – 2:01 PM – Andrea' },
      { registroId: 'd-14', linea: 'Tobías – anticonvulsivo – 2:01 PM – Andrea' },
    ])
  })

  it('lo por confirmar no impide el todoBien', () => {
    const c = cierre(diaCompleto().map((r) => (r.id === 'd-14' ? { ...r, estado: 'por_confirmar' as const } : r)))
    expect(c.todoBien).toBe(true)
    expect(c.pendientes.map((p) => p.registroId)).toContain('d-14')
  })

  it('lo confirmado no aparece en pendientes', () => {
    expect(cierre(diaCompleto().filter((r) => r.estado === 'confirmado')).pendientes).toEqual([])
  })

  it('un pendiente de alguien que ya no está en el equipo dice "Alguien"', () => {
    const c = cierre([dosis14('por_confirmar')].map((r) => ({ ...r, agenteId: 'p-fantasma' })))
    expect(c.pendientes[0]?.linea).toBe('Tobías – anticonvulsivo – 2:01 PM – Alguien')
  })

  it('los animales adoptados o fallecidos no cuentan', () => {
    const eventos = diaCompleto().filter((r) => r.id !== 'c-lun' && r.id !== 'c-mat')
    const c = cierre(eventos, (s) => {
      s.animales[3] = { ...s.animales[3]!, estado: 'adoptado' }
      s.animales[1] = { ...s.animales[1]!, estado: 'fallecido' }
    })
    expect(c.todoBien).toBe(true)
  })

  it('las dosis de un animal adoptado tampoco cuentan', () => {
    const c = cierre([comida('c-mat', 'MAT'), comida('c-bru', 'BRU'), comida('c-lun', 'LUN')], (s) => {
      s.animales[0] = { ...s.animales[0]!, estado: 'adoptado' }
    })
    expect(c.todoBien).toBe(true)
  })
})

describe('textoCierre', () => {
  it('con todoBien empieza con la frase de paz mental', () => {
    const texto = textoCierre(cierre(diaCompleto()), 4)
    expect(texto.startsWith('Tranquilos: los 4 comieron hoy y ninguno se quedó sin su medicina.')).toBe(true)
  })

  it('con todoBien y sin pendientes es solo esa frase', () => {
    const todoDecidido = diaCompleto().map((r) => ({ ...r, estado: 'confirmado' as const }))
    const texto = textoCierre(cierre(todoDecidido), 4)
    expect(texto).toBe('Tranquilos: los 4 comieron hoy y ninguno se quedó sin su medicina.')
  })

  it('con todoBien y pendientes los lista debajo', () => {
    const texto = textoCierre(cierre([...diaCompleto().filter((r) => r.id !== 'd-14'), dosis14('por_confirmar')]), 4)
    expect(texto.startsWith('Tranquilos: los 4 comieron hoy y ninguno se quedó sin su medicina.')).toBe(true)
    expect(texto).toContain('Por confirmar:')
    expect(texto).toContain('Tobías – anticonvulsivo – 2:01 PM – Andrea')
  })

  it('sin todoBien no dice "Tranquilos" y lista lo que falta', () => {
    const texto = textoCierre(cierre(diaCompleto().filter((r) => r.id !== 'c-lun' && r.id !== 'd-14')), 4)
    expect(texto).not.toContain('Tranquilos')
    expect(texto).toContain('Antes de cerrar el día, falta revisar:')
    expect(texto).toContain('Luna no consta que haya comido')
    expect(texto).toContain('Tobías: dosis de las 2:00 PM pendiente')
  })
})

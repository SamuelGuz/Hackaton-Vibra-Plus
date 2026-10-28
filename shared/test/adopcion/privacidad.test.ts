import { describe, expect, it } from 'vitest'
import { sinDatosSensibles } from '../../src/adopcion/privacidad'
import { solicitud } from './solicitud'

describe('sinDatosSensibles (S42)', () => {
  it('quita cédula, dirección y teléfono', () => {
    const copia = sinDatosSensibles(solicitud())
    expect(copia).not.toHaveProperty('cedula')
    expect(copia).not.toHaveProperty('direccion')
    expect(copia).not.toHaveProperty('telefono')
  })

  it('ningún valor sensible sobrevive en el JSON', () => {
    const s = solicitud()
    const json = JSON.stringify(sinDatosSensibles(s))
    expect(json).not.toContain(s.cedula)
    expect(json).not.toContain(s.direccion)
    expect(json).not.toContain(s.telefono)
  })

  it('conserva el resto de los campos', () => {
    const s = solicitud({ nota: 'Llamar el viernes', paraQuien: 'familia' })
    const { cedula, direccion, telefono, ...resto } = s
    void [cedula, direccion, telefono]
    expect(sinDatosSensibles(s)).toEqual(resto)
  })

  it('devuelve una copia: la solicitud original sigue completa', () => {
    const s = solicitud()
    sinDatosSensibles(s)
    expect(s.cedula).toBe('1.000.000.001')
    expect(s.telefono).toBe('300 000 0001')
  })
})

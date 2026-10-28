import { describe, expect, it } from 'vitest'
import { quitarDatosSensibles } from '../../src/ia/redact'

describe('quitarDatosSensibles', () => {
  it('reemplaza teléfono, documento y email de la frase del plan', () => {
    const r = quitarDatosSensibles('llámame al 3001234567, CC 1098765432, ana@x.co')
    expect(r).not.toContain('3001234567')
    expect(r).not.toContain('1098765432')
    expect(r).not.toContain('ana@x.co')
    expect(r).toContain('[tel]')
    expect(r).toContain('[doc]')
    expect(r).toContain('[email]')
    expect(r).toBe('llámame al [tel], [doc], [email]')
  })

  it.each([
    ['300 123 4567', 'mi cel 300 123 4567 gracias'],
    ['+57 300 123 4567', 'mi cel +57 300 123 4567 gracias'],
    ['300-123-4567', 'mi cel 300-123-4567 gracias'],
    ['573001234567', 'mi cel 573001234567 gracias'],
    ['601 234 5678', 'fijo 601 234 5678 gracias'],
    ['(601) 234 5678', 'fijo (601) 234 5678 gracias'],
    ['234 5678', 'fijo 234 5678 gracias'],
  ])('quita el teléfono %s', (numero, frase) => {
    const r = quitarDatosSensibles(frase)
    expect(r).not.toContain(numero)
    expect(r).toContain('[tel]')
  })

  it.each([
    ['1.098.765.432', 'CC 1.098.765.432'],
    ['1098765432', 'cédula 1098765432'],
    ['1098765432', 'cedula: 1098765432'],
    ['900.123.456-7', 'NIT 900.123.456-7'],
    ['1098765432', 'C.C. 1098765432'],
    ['1098765432', 'mi documento es 1098765432'],
    ['1098765432', 'se la lleva el de 1098765432'],
    ['1.098.765.432', 'se la lleva el de 1.098.765.432'],
  ])('quita el documento %s en "%s"', (numero, frase) => {
    const r = quitarDatosSensibles(frase)
    expect(r).not.toContain(numero)
    expect(r).toContain('[doc]')
  })

  it('quita la dirección', () => {
    const r = quitarDatosSensibles('vivo en Calle 45 # 12-30 apto 301, Bogotá')
    expect(r).not.toContain('45')
    expect(r).not.toContain('12-30')
    expect(r).toContain('[dir]')
    expect(r).toContain('Bogotá')
  })

  it.each(['Carrera 7 No. 45-12', 'cra 15 #100-20', 'Avenida 68 # 24A-10', 'Diagonal 40 sur # 5-17'])(
    'quita la dirección "%s"',
    (direccion) => {
      const r = quitarDatosSensibles(`queda en ${direccion} del barrio`)
      expect(r).toBe('queda en [dir] del barrio')
    },
  )

  it('quita varios datos en una misma frase y no deja ninguno', () => {
    const r = quitarDatosSensibles('Soy Ana, ana.perez@correo.com, 3109876543, NIT 900123456-7, Calle 10 # 5-20')
    expect(r).toBe('Soy Ana, [email], [tel], [doc], [dir]')
  })

  it.each([
    'le di 2 pastillas a Tobías a las 14:01',
    'abrí un bulto de 25 kg de Dog Chow',
    'pagué una factura de 2.500.000 a la clínica',
    'pagué una factura de 12.500.000 a la clínica',
    'abono de 150000 a la clínica',
    'Registro TOB01 (Tobías): comió bien',
    'son las 2:01 PM del 28/10/2026',
  ])('no toca el texto normal: %s', (frase) => {
    expect(quitarDatosSensibles(frase)).toBe(frase)
  })

  it('un texto vacío queda vacío', () => {
    expect(quitarDatosSensibles('')).toBe('')
  })
})

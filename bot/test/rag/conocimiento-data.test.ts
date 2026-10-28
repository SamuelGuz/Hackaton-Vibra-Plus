import { describe, expect, it } from 'vitest'
import { CONOCIMIENTO } from '../../src/rag/conocimiento-data.js'

const TEMAS_OBLIGATORIOS = [
  'adopcion',
  'apadrinamiento',
  'donaciones',
  'visitas',
  'salud',
  'comida',
  'voluntariado',
  'refugio',
  'devoluciones',
  'cuidados',
] as const

const TEMAS_VALIDOS = [...TEMAS_OBLIGATORIOS, 'otros']

describe('base de conocimiento del refugio', () => {
  it('tiene al menos 90 entradas', () => {
    expect(CONOCIMIENTO.length).toBeGreaterThanOrEqual(90)
  })

  it('cada id es único y en kebab-case', () => {
    const ids = CONOCIMIENTO.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id, id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('cada entrada tiene un tema válido', () => {
    for (const entrada of CONOCIMIENTO) {
      expect(TEMAS_VALIDOS, entrada.id).toContain(entrada.tema)
    }
  })

  it('cada tema obligatorio tiene al menos 7 entradas', () => {
    for (const tema of TEMAS_OBLIGATORIOS) {
      const cuantas = CONOCIMIENTO.filter((e) => e.tema === tema).length
      expect(cuantas, tema).toBeGreaterThanOrEqual(7)
    }
  })

  it('cada entrada tiene entre 3 y 6 preguntas, todas con texto', () => {
    for (const entrada of CONOCIMIENTO) {
      expect(entrada.preguntas.length, entrada.id).toBeGreaterThanOrEqual(3)
      expect(entrada.preguntas.length, entrada.id).toBeLessThanOrEqual(6)
      for (const pregunta of entrada.preguntas) {
        expect(pregunta.trim().length, entrada.id).toBeGreaterThan(0)
      }
    }
  })

  it('cada respuesta mide entre 40 y 400 caracteres', () => {
    for (const entrada of CONOCIMIENTO) {
      expect(entrada.respuesta.length, entrada.id).toBeGreaterThanOrEqual(40)
      expect(entrada.respuesta.length, entrada.id).toBeLessThanOrEqual(400)
    }
  })

  it('cada entrada tiene entre 4 y 8 palabras clave en minúsculas y sin tildes', () => {
    for (const entrada of CONOCIMIENTO) {
      expect(entrada.palabrasClave.length, entrada.id).toBeGreaterThanOrEqual(4)
      expect(entrada.palabrasClave.length, entrada.id).toBeLessThanOrEqual(8)
      for (const palabra of entrada.palabrasClave) {
        expect(palabra, entrada.id).toMatch(/^[a-z0-9]+$/)
      }
    }
  })

  it('no menciona el nombre anterior del refugio', () => {
    const texto = JSON.stringify(CONOCIMIENTO)
    expect(texto).not.toMatch(/huellitas/i)
  })

  it('no contiene teléfonos, cuentas bancarias ni correos', () => {
    const texto = JSON.stringify(CONOCIMIENTO)
    expect(texto).not.toContain('@')
    expect(texto).not.toMatch(/\d{7,}/)
    expect(texto).not.toMatch(/\b3\d{2}[ -]?\d{3}[ -]?\d{4}\b/)
    expect(texto).not.toMatch(/nequi|bancolombia|davivienda/i)
  })

  it('fija el proceso de adopción con esterilización y vacunación como compromiso', () => {
    const adopcion = CONOCIMIENTO.find((e) => e.id === 'adopcion-costo')
    expect(adopcion?.respuesta).toMatch(/no tiene costo/i)
    expect(adopcion?.respuesta).toMatch(/esterilizar/i)
    expect(adopcion?.respuesta).toMatch(/vacunar/i)
  })

  it('las visitas son los sábados a las 10:00 a. m.', () => {
    const visitas = CONOCIMIENTO.find((e) => e.id === 'visitas-cuando')
    expect(visitas?.respuesta).toMatch(/sábados a las 10:00 a\. m\./)
  })
})

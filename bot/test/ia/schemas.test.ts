import { describe, expect, it } from 'vitest'
import { ESQUEMA_ACCIONES, ESQUEMA_COMPROBANTE, ESQUEMA_DIARIO } from '../../src/ia/schemas'
import type { EsquemaGemini } from '../../src/ia/schemas'
import type { TipoAccion } from '@huellitas/shared/vistas'

/** Todos los valores de TipoAccion; si el tipo cambia, esta lista deja de compilar. */
const TIPOS: Record<TipoAccion, true> = {
  comida: true,
  dosis: true,
  observacion: true,
  avance: true,
  inventario: true,
  factura: true,
  abono: true,
  donacion: true,
  nota: true,
}

function propiedad(esquema: EsquemaGemini, nombre: string): EsquemaGemini {
  const p = esquema.properties?.[nombre]
  if (!p) throw new Error(`falta la propiedad ${nombre}`)
  return p
}

describe('ESQUEMA_ACCIONES', () => {
  const acciones = propiedad(ESQUEMA_ACCIONES, 'acciones')
  const accion = acciones.items as EsquemaGemini

  it('es un objeto con una lista de acciones obligatoria', () => {
    expect(ESQUEMA_ACCIONES.type).toBe('object')
    expect(ESQUEMA_ACCIONES.required).toEqual(['acciones'])
    expect(acciones.type).toBe('array')
  })

  it('exige tipo, tiempo, fraseExacta y confianza en cada acción', () => {
    expect(accion.type).toBe('object')
    expect(accion.required).toEqual(expect.arrayContaining(['tipo', 'tiempo', 'fraseExacta', 'confianza']))
  })

  it('el enum de tipo coincide con TipoAccion de shared', () => {
    expect([...(propiedad(accion, 'tipo').enum ?? [])].sort()).toEqual(Object.keys(TIPOS).sort())
  })

  it('tiempo es pasado, presente o futuro y confianza es un número', () => {
    expect(propiedad(accion, 'tiempo').enum).toEqual(['pasado', 'presente', 'futuro'])
    expect(propiedad(accion, 'confianza').type).toBe('number')
    expect(propiedad(accion, 'fraseExacta').type).toBe('string')
  })

  it('el monto es entero (dinero en COP, entero)', () => {
    expect(propiedad(accion, 'monto').type).toBe('integer')
  })

  it('declara los campos opcionales de Accion sin exigirlos', () => {
    for (const campo of ['animalCodigo', 'medicamento', 'cantidad', 'unidad', 'monto', 'nota']) {
      expect(accion.properties).toHaveProperty(campo)
      expect(accion.required).not.toContain(campo)
    }
  })
})

describe('ESQUEMA_COMPROBANTE', () => {
  it('exige tipo y legible; monto puede ser null', () => {
    expect(ESQUEMA_COMPROBANTE.type).toBe('object')
    expect(ESQUEMA_COMPROBANTE.required).toEqual(expect.arrayContaining(['tipo', 'legible']))
    expect(propiedad(ESQUEMA_COMPROBANTE, 'tipo').enum).toEqual(['factura', 'transferencia', 'otro'])
    expect(propiedad(ESQUEMA_COMPROBANTE, 'monto').nullable).toBe(true)
    expect(propiedad(ESQUEMA_COMPROBANTE, 'legible').type).toBe('boolean')
  })

  it('declara los campos opcionales de Comprobante', () => {
    for (const campo of ['fecha', 'clinicaId', 'concepto', 'animalCodigo']) {
      expect(ESQUEMA_COMPROBANTE.properties).toHaveProperty(campo)
      expect(ESQUEMA_COMPROBANTE.required).not.toContain(campo)
    }
  })
})

describe('ESQUEMA_DIARIO', () => {
  it('exige texto y hechosUsados (lista de ids)', () => {
    expect(ESQUEMA_DIARIO.type).toBe('object')
    expect(ESQUEMA_DIARIO.required).toEqual(['texto', 'hechosUsados'])
    expect(propiedad(ESQUEMA_DIARIO, 'texto').type).toBe('string')
    const usados = propiedad(ESQUEMA_DIARIO, 'hechosUsados')
    expect(usados.type).toBe('array')
    expect(usados.items?.type).toBe('string')
  })
})

describe('compatibilidad con Gemini (subconjunto de OpenAPI)', () => {
  const prohibidas = ['$schema', '$ref', 'additionalProperties', 'oneOf', 'anyOf', 'allOf', 'const']

  function claves(valor: unknown, acumulado: string[] = []): string[] {
    if (Array.isArray(valor)) valor.forEach((v) => claves(v, acumulado))
    else if (typeof valor === 'object' && valor !== null) {
      for (const [k, v] of Object.entries(valor)) {
        acumulado.push(k)
        claves(v, acumulado)
      }
    }
    return acumulado
  }

  it.each([
    ['acciones', ESQUEMA_ACCIONES],
    ['comprobante', ESQUEMA_COMPROBANTE],
    ['diario', ESQUEMA_DIARIO],
  ])('el esquema de %s no usa palabras que Gemini rechaza', (_nombre, esquema) => {
    const usadas = claves(esquema)
    for (const palabra of prohibidas) expect(usadas).not.toContain(palabra)
  })
})

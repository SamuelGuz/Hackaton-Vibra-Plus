import { describe, expect, it } from 'vitest'
import { normalizarRespuesta } from '../../src/adopciones-agente/decisiones'
import { ESQUEMA_AGENTE } from '../../src/adopciones-agente/esquema'
import { INTENCIONES, PERMISOS, SI_NO, TIEMPOS, TIPOS_VIVIENDA } from '../../src/adopciones-agente/tipos'
import { crudo } from './ayudas'

describe('esquema de Gemini (responseSchema REST)', () => {
  it('es JSON plano: sobrevive a JSON.stringify sin perder nada y no usa tipos de @google/genai', () => {
    expect(JSON.parse(JSON.stringify(ESQUEMA_AGENTE))).toEqual(ESQUEMA_AGENTE)
    expect(JSON.stringify(ESQUEMA_AGENTE)).not.toMatch(/"type":"(OBJECT|STRING|NUMBER|ARRAY|BOOLEAN)"/)
  })

  it('cada campo que normalizarRespuesta lee está declarado y es obligatorio', () => {
    const campos = Object.keys(crudo())
    expect(Object.keys(ESQUEMA_AGENTE.properties ?? {}).sort()).toEqual([...campos].sort())
    expect([...(ESQUEMA_AGENTE.required ?? [])].sort()).toEqual([...campos].sort())
    const ev = ESQUEMA_AGENTE.properties?.evaluacion
    const camposEv = Object.keys((crudo().evaluacion as object))
    expect(Object.keys(ev?.properties ?? {}).sort()).toEqual([...camposEv].sort())
    expect([...(ev?.required ?? [])].sort()).toEqual([...camposEv].sort())
  })

  it('los enum coinciden con los valores que el código acepta', () => {
    const p = ESQUEMA_AGENTE.properties
    const ev = p?.evaluacion?.properties
    expect(p?.intencion?.enum).toEqual([...INTENCIONES])
    expect(ev?.vivienda?.properties?.tipo?.enum).toEqual([...TIPOS_VIVIENDA])
    expect(ev?.vivienda?.properties?.permiso_arriendo?.enum).toEqual([...PERMISOS])
    expect(ev?.presupuesto_veterinario?.enum).toEqual([...SI_NO])
    expect(ev?.tiempo_disponible?.enum).toEqual([...TIEMPOS])
  })

  it('el foco puede ser null y los tipos están en minúscula (formato REST)', () => {
    expect(ESQUEMA_AGENTE.properties?.perrito_id_foco).toMatchObject({ type: 'string', nullable: true })
    expect(ESQUEMA_AGENTE.type).toBe('object')
    expect(normalizarRespuesta(crudo({ perrito_id_foco: null })).perritoIdFoco).toBeNull()
  })
})

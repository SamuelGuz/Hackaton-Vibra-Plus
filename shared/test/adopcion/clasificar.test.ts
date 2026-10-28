import { describe, expect, it } from 'vitest'
import { clasificar, montonFinal, ordenarPorCalidad } from '../../src/adopcion/clasificar'
import { solicitud } from './solicitud'

describe('clasificar: 🔴 descarte inmediato (S39)', () => {
  it('regalo para su mamá → rojo, y la razón lo dice en una frase', () => {
    const r = clasificar(solicitud({ paraQuien: 'regalo', destinatario: 'su mamá' }))
    expect(r).toEqual({ monton: 'rojo', razon: 'Dice que es un regalo para su mamá' })
  })

  it('regalo sin decir para quién → rojo con razón general', () => {
    const r = clasificar(solicitud({ paraQuien: 'regalo' }))
    expect(r.monton).toBe('rojo')
    expect(r.razon).toBe('Dice que es un regalo para otra persona')
  })

  it.each([
    ['guardia', 'Lo quiere de perro de guardia'],
    ['amarrado', 'Lo quiere amarrado'],
    ['azotea', 'Lo dejaría en la azotea'],
  ] as const)('dónde vivirá = %s → rojo', (dondeVivira, razon) => {
    expect(clasificar(solicitud({ dondeVivira }))).toEqual({ monton: 'rojo', razon })
  })

  it('no acepta esterilizar → rojo', () => {
    expect(clasificar(solicitud({ aceptaEsterilizar: false }))).toEqual({
      monton: 'rojo',
      razon: 'No acepta esterilizar',
    })
  })

  it('no acepta vacunar → rojo', () => {
    expect(clasificar(solicitud({ aceptaVacunar: false }))).toEqual({ monton: 'rojo', razon: 'No acepta vacunar' })
  })

  it('no acepta esterilizar ni vacunar → una sola frase', () => {
    expect(clasificar(solicitud({ aceptaEsterilizar: false, aceptaVacunar: false })).razon).toBe(
      'No acepta esterilizar ni vacunar',
    )
  })

  it('no acepta el seguimiento → rojo', () => {
    expect(clasificar(solicitud({ aceptaSeguimiento: false }))).toEqual({
      monton: 'rojo',
      razon: 'No acepta que le hagamos seguimiento después de la adopción',
    })
  })

  it('el rojo manda sobre el amarillo: regalo con prisa sigue siendo rojo y dice lo del regalo', () => {
    const r = clasificar(solicitud({ paraQuien: 'regalo', destinatario: 'su hijo', quiereEntregaInmediata: true }))
    expect(r).toEqual({ monton: 'rojo', razon: 'Dice que es un regalo para su hijo' })
  })
})

describe('clasificar: 🟡 señales de devolución (S39)', () => {
  it('prisa por la entrega inmediata → amarillo', () => {
    expect(clasificar(solicitud({ quiereEntregaInmediata: true }))).toEqual({
      monton: 'amarillo',
      razon: 'Tiene afán por llevárselo ya',
    })
  })

  it('no pregunta por el carácter ni la rutina → amarillo', () => {
    expect(clasificar(solicitud({ preguntoPorCaracter: false }))).toEqual({
      monton: 'amarillo',
      razon: 'No preguntó por el carácter ni la rutina',
    })
  })

  it.each([
    ['vacío', ''],
    ['solo espacios', '   '],
    ['no sé', 'No sé'],
    ['ya veremos', 'Ya veremos, eso sería después.'],
    ['nada', 'Nada, eso no pasa'],
    ['no lo he pensado', 'No lo he pensado todavía'],
    ['no tengo', 'No tengo plan'],
    ['ninguno', 'Ninguno'],
  ])('plan de emergencia evasivo (%s) → amarillo', (_nombre, planEmergencia) => {
    expect(clasificar(solicitud({ planEmergencia }))).toEqual({
      monton: 'amarillo',
      razon: 'Fue evasivo con el plan de emergencia',
    })
  })

  it('un plan concreto que contiene la palabra "no" no es evasivo', () => {
    const r = clasificar(solicitud({ planEmergencia: 'No me falta quien me ayude: mi hermana y la clínica 24 horas.' }))
    expect(r.monton).toBe('verde')
  })

  it('varias señales se dicen en una sola frase', () => {
    const r = clasificar(solicitud({ quiereEntregaInmediata: true, planEmergencia: '', preguntoPorCaracter: false }))
    expect(r.monton).toBe('amarillo')
    expect(r.razon).toBe(
      'Tiene afán por llevárselo ya, fue evasivo con el plan de emergencia y no preguntó por el carácter ni la rutina',
    )
  })

  it('si no toda la familia está de acuerdo y nada es rojo → amarillo', () => {
    expect(clasificar(solicitud({ familiaDeAcuerdo: false }))).toEqual({
      monton: 'amarillo',
      razon: 'No toda la familia está de acuerdo',
    })
  })
})

describe('clasificar: 🟢', () => {
  it('nada de lo anterior y toda la familia de acuerdo → verde', () => {
    expect(clasificar(solicitud())).toEqual({
      monton: 'verde',
      razon: 'Toda la familia está de acuerdo y aceptó esterilizar, vacunar y el seguimiento',
    })
  })

  it('para la familia o para él mismo da lo mismo: verde', () => {
    expect(clasificar(solicitud({ paraQuien: 'familia', dondeVivira: 'patio' })).monton).toBe('verde')
  })
})

describe('montonFinal (S38: la sugerencia no decide)', () => {
  it('sin montón manual usa la sugerencia', () => {
    expect(montonFinal(solicitud({ paraQuien: 'regalo' }))).toBe('rojo')
  })

  it('el montón manual manda: una roja rescatada pasa a verde', () => {
    expect(montonFinal(solicitud({ paraQuien: 'regalo', montonManual: 'verde' }))).toBe('verde')
  })

  it('una verde que la coordinadora baja a rojo queda en rojo', () => {
    expect(montonFinal(solicitud({ montonManual: 'rojo' }))).toBe('rojo')
  })

  it('clasificar no cambia por el montón manual (la sugerencia sigue visible)', () => {
    expect(clasificar(solicitud({ paraQuien: 'regalo', montonManual: 'verde' })).monton).toBe('rojo')
  })

  it('no modifica la solicitud', () => {
    const s = solicitud({ paraQuien: 'regalo' })
    const copia = JSON.parse(JSON.stringify(s)) as typeof s
    clasificar(s)
    montonFinal(s)
    expect(s).toEqual(copia)
  })
})

describe('ordenarPorCalidad (S40: por calidad, no por llegada)', () => {
  const ids = (l: { id: string }[]) => l.map((s) => s.id)

  it('verde antes que amarillo antes que rojo, aunque haya llegado después', () => {
    const roja = solicitud({ id: 'roja', fecha: '2026-10-01T08:00:00', paraQuien: 'regalo' })
    const amarilla = solicitud({ id: 'amarilla', fecha: '2026-10-02T08:00:00', quiereEntregaInmediata: true })
    const verde = solicitud({ id: 'verde', fecha: '2026-10-03T08:00:00' })
    expect(ids(ordenarPorCalidad([roja, amarilla, verde]))).toEqual(['verde', 'amarilla', 'roja'])
  })

  it('dentro de un mismo montón, menos señales de alerta primero', () => {
    const dos = solicitud({ id: 'dos', fecha: '2026-10-01T08:00:00', quiereEntregaInmediata: true, planEmergencia: '' })
    const una = solicitud({ id: 'una', fecha: '2026-10-02T08:00:00', quiereEntregaInmediata: true })
    expect(ids(ordenarPorCalidad([dos, una]))).toEqual(['una', 'dos'])
  })

  it('con igual calidad, la más antigua primero', () => {
    const nueva = solicitud({ id: 'nueva', fecha: '2026-10-05T08:00:00' })
    const vieja = solicitud({ id: 'vieja', fecha: '2026-10-01T08:00:00' })
    expect(ids(ordenarPorCalidad([nueva, vieja]))).toEqual(['vieja', 'nueva'])
  })

  it('usa el montón manual: una roja rescatada sube a verde', () => {
    const verde = solicitud({ id: 'verde', fecha: '2026-10-05T08:00:00' })
    const rescatada = solicitud({ id: 'rescatada', fecha: '2026-10-06T08:00:00', paraQuien: 'regalo', montonManual: 'verde' })
    const amarilla = solicitud({ id: 'amarilla', fecha: '2026-10-01T08:00:00', familiaDeAcuerdo: false })
    expect(ids(ordenarPorCalidad([amarilla, rescatada, verde]))).toEqual(['verde', 'rescatada', 'amarilla'])
  })

  it('devuelve una lista nueva y no toca la original', () => {
    const lista = [solicitud({ id: 'b', fecha: '2026-10-02T08:00:00' }), solicitud({ id: 'a', fecha: '2026-10-01T08:00:00' })]
    const orden = ordenarPorCalidad(lista)
    expect(ids(lista)).toEqual(['b', 'a'])
    expect(orden).not.toBe(lista)
  })
})


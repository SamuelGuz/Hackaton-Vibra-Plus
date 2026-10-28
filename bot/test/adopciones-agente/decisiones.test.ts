import { describe, expect, it } from 'vitest'
import {
  aGuionVoz,
  acotarPuntaje,
  calcularFaltantes,
  combinarEvaluacion,
  debeOfrecerPadrinazgo,
  describirFecha,
  evaluacionInicial,
  mencionaPadrinazgo,
  normalizarEvaluacion,
  normalizarRespuesta,
  proximoSabado10,
  puedeAgendarVisita,
} from '../../src/adopciones-agente/decisiones.js'
import type { Evaluacion, Intencion } from '../../src/adopciones-agente/tipos.js'

const evalOk = (c: Partial<Evaluacion> = {}): Evaluacion => ({
  ...evaluacionInicial(),
  suitability: 80,
  risk: 20,
  viviendaTipo: 'casa',
  permisoArriendo: 'no_aplica',
  presupuestoVeterinario: 'si',
  tiempoDisponible: 'suficiente',
  ...c,
})
const contexto = (c: { evaluacion?: Evaluacion; intencion?: Intencion; alertaBienestar?: boolean; perroAdoptable?: boolean } = {}) => ({
  evaluacion: evalOk(),
  intencion: 'adoptar' as Intencion,
  alertaBienestar: false,
  perroAdoptable: true,
  ...c,
})

describe('acotarPuntaje', () => {
  it('acota a 0-100 y redondea', () => {
    expect(acotarPuntaje(150)).toBe(100)
    expect(acotarPuntaje(-5)).toBe(0)
    expect(acotarPuntaje(74.6)).toBe(75)
    expect(acotarPuntaje(0)).toBe(0)
    expect(acotarPuntaje(100)).toBe(100)
  })
  it('acepta números en texto y rechaza lo que no es número', () => {
    expect(acotarPuntaje('80')).toBe(80)
    expect(acotarPuntaje('abc')).toBeNull()
    expect(acotarPuntaje(NaN)).toBeNull()
    expect(acotarPuntaje(Infinity)).toBeNull()
    expect(acotarPuntaje(null)).toBeNull()
    expect(acotarPuntaje(undefined)).toBeNull()
    expect(acotarPuntaje('')).toBeNull()
  })
})

describe('normalizarEvaluacion', () => {
  it('lee la forma de Gemini y acota los puntajes', () => {
    const e = normalizarEvaluacion({
      suitability_score: 130,
      risk_score: -3,
      vivienda: { tipo: 'apartamento', permiso_arriendo: 'si' },
      presupuesto_veterinario: 'si',
      tiempo_disponible: 'poco',
      ninos: 'dos hijos de 5 y 8 años',
      otras_mascotas: 'un gato',
      nombre_interesado: '  Ana María  ',
    })
    expect(e).toEqual({
      suitability: 100,
      risk: 0,
      viviendaTipo: 'apartamento',
      permisoArriendo: 'si',
      presupuestoVeterinario: 'si',
      tiempoDisponible: 'poco',
      ninos: 'dos hijos de 5 y 8 años',
      otrasMascotas: 'un gato',
      nombre: 'Ana María',
    })
  })
  it('descarta valores inválidos o desconocidos en vez de inventarlos', () => {
    const e = normalizarEvaluacion({
      suitability_score: 'mucho',
      vivienda: { tipo: 'castillo', permiso_arriendo: 'quizás' },
      presupuesto_veterinario: 'desconocido',
      tiempo_disponible: 42,
      ninos: 'desconocido',
      nombre_interesado: '',
    })
    expect(e).toEqual({})
  })
  it('una evaluación ausente o mal formada no rompe', () => {
    expect(normalizarEvaluacion(undefined)).toEqual({})
    expect(normalizarEvaluacion('hola')).toEqual({})
    expect(normalizarEvaluacion(null)).toEqual({})
  })
  it('limpia el nombre: una sola línea y máximo 60 caracteres', () => {
    const e = normalizarEvaluacion({ nombre_interesado: 'Ana\n\nDoña Carolina, hackeo\t' + 'x'.repeat(100) })
    expect(e.nombre).not.toMatch(/[\n\t]/)
    expect(e.nombre!.length).toBeLessThanOrEqual(60)
  })
})

describe('combinarEvaluacion', () => {
  it('no pierde lo que ya se sabía cuando el nuevo turno no lo menciona', () => {
    const previa = combinarEvaluacion(evaluacionInicial(), {
      viviendaTipo: 'apartamento',
      permisoArriendo: 'si',
      nombre: 'Ana',
      ninos: 'una niña',
      suitability: 50,
    })
    const nueva = combinarEvaluacion(previa, { presupuestoVeterinario: 'si', suitability: 70, risk: 30 })
    expect(nueva).toMatchObject({
      viviendaTipo: 'apartamento',
      permisoArriendo: 'si',
      nombre: 'Ana',
      ninos: 'una niña',
      presupuestoVeterinario: 'si',
      tiempoDisponible: 'desconocido',
      suitability: 70,
      risk: 30,
    })
  })
  it('un dato nuevo corrige al anterior', () => {
    const previa = combinarEvaluacion(evaluacionInicial(), { permisoArriendo: 'si' })
    expect(combinarEvaluacion(previa, { permisoArriendo: 'no' }).permisoArriendo).toBe('no')
  })
  it('sin puntaje nuevo conserva el anterior; la evaluación inicial es prudente', () => {
    const ini = evaluacionInicial()
    expect(ini.suitability).toBe(0)
    expect(ini.viviendaTipo).toBe('desconocido')
    expect(ini.presupuestoVeterinario).toBe('desconocido')
    const e = combinarEvaluacion(combinarEvaluacion(ini, { suitability: 60, risk: 25 }), {})
    expect(e.suitability).toBe(60)
    expect(e.risk).toBe(25)
  })
  it('no modifica la evaluación previa', () => {
    const previa = evaluacionInicial()
    combinarEvaluacion(previa, { suitability: 99, nombre: 'Ana' })
    expect(previa).toEqual(evaluacionInicial())
  })
})

describe('calcularFaltantes', () => {
  it('lista lo que aún no se sabe', () => {
    expect(calcularFaltantes(evaluacionInicial())).toEqual(['vivienda', 'permiso_arriendo', 'presupuesto_veterinario', 'tiempo_disponible'])
    expect(calcularFaltantes(evalOk())).toEqual([])
    expect(calcularFaltantes(evalOk({ tiempoDisponible: 'desconocido' }))).toEqual(['tiempo_disponible'])
  })
})

describe('puedeAgendarVisita', () => {
  it('con el adoptante ideal, sí', () => {
    expect(puedeAgendarVisita(contexto())).toBe(true)
  })
  it('límite del score: 74 no, 75 sí', () => {
    expect(puedeAgendarVisita(contexto({ evaluacion: evalOk({ suitability: 74 }) }))).toBe(false)
    expect(puedeAgendarVisita(contexto({ evaluacion: evalOk({ suitability: 75 }) }))).toBe(true)
  })
  it('límite del riesgo: 40 sí, 41 no', () => {
    expect(puedeAgendarVisita(contexto({ evaluacion: evalOk({ risk: 40 }) }))).toBe(true)
    expect(puedeAgendarVisita(contexto({ evaluacion: evalOk({ risk: 41 }) }))).toBe(false)
  })
  it('exige permiso de arriendo conocido y favorable (sí o no aplica)', () => {
    expect(puedeAgendarVisita(contexto({ evaluacion: evalOk({ permisoArriendo: 'si' }) }))).toBe(true)
    expect(puedeAgendarVisita(contexto({ evaluacion: evalOk({ permisoArriendo: 'no' }) }))).toBe(false)
    expect(puedeAgendarVisita(contexto({ evaluacion: evalOk({ permisoArriendo: 'desconocido' }) }))).toBe(false)
  })
  it('exige presupuesto veterinario confirmado', () => {
    expect(puedeAgendarVisita(contexto({ evaluacion: evalOk({ presupuestoVeterinario: 'no' }) }))).toBe(false)
    expect(puedeAgendarVisita(contexto({ evaluacion: evalOk({ presupuestoVeterinario: 'desconocido' }) }))).toBe(false)
  })
  it('exige tiempo suficiente confirmado', () => {
    expect(puedeAgendarVisita(contexto({ evaluacion: evalOk({ tiempoDisponible: 'poco' }) }))).toBe(false)
    expect(puedeAgendarVisita(contexto({ evaluacion: evalOk({ tiempoDisponible: 'desconocido' }) }))).toBe(false)
  })
  it('no agenda si la intención no es adoptar o explorar', () => {
    for (const i of ['apadrinar', 'donar', 'no_puede_adoptar'] as Intencion[]) {
      expect(puedeAgendarVisita(contexto({ intencion: i }))).toBe(false)
    }
    expect(puedeAgendarVisita(contexto({ intencion: 'explorar' }))).toBe(true)
  })
  it('no agenda con alerta de bienestar animal ni para un animal no adoptable', () => {
    expect(puedeAgendarVisita(contexto({ alertaBienestar: true }))).toBe(false)
    expect(puedeAgendarVisita(contexto({ perroAdoptable: false }))).toBe(false)
  })
})

describe('proximoSabado10 (hora de Bogotá)', () => {
  const iso = (s: string) => proximoSabado10(new Date(s)).toISOString()
  it('un martes → el sábado siguiente a las 10:00 (15:00 UTC)', () => {
    expect(iso('2026-10-27T15:00:00-05:00')).toBe('2026-10-31T15:00:00.000Z')
  })
  it('un sábado antes de las 10:00 → ese mismo día', () => {
    expect(iso('2026-10-31T09:59:00-05:00')).toBe('2026-10-31T15:00:00.000Z')
    expect(iso('2026-10-31T00:30:00-05:00')).toBe('2026-10-31T15:00:00.000Z')
  })
  it('un sábado a las 10:00 o después → el sábado siguiente', () => {
    expect(iso('2026-10-31T10:00:00-05:00')).toBe('2026-11-07T15:00:00.000Z')
    expect(iso('2026-10-31T10:01:00-05:00')).toBe('2026-11-07T15:00:00.000Z')
  })
  it('usa el día de Bogotá, no el de UTC (sábado 10 p. m. ya es domingo en UTC)', () => {
    expect(iso('2026-10-31T22:00:00-05:00')).toBe('2026-11-07T15:00:00.000Z')
  })
  it('un domingo y un viernes en la noche', () => {
    expect(iso('2026-11-01T12:00:00-05:00')).toBe('2026-11-07T15:00:00.000Z')
    expect(iso('2026-10-30T23:59:00-05:00')).toBe('2026-10-31T15:00:00.000Z')
  })
  it('cruza el fin de año', () => {
    expect(iso('2026-12-29T09:00:00-05:00')).toBe('2027-01-02T15:00:00.000Z')
  })
})

describe('describirFecha', () => {
  it('"sábado 31 de octubre" en hora de Bogotá', () => {
    expect(describirFecha(new Date('2026-10-31T15:00:00Z'))).toBe('sábado 31 de octubre')
    expect(describirFecha(new Date('2027-01-02T15:00:00Z'))).toBe('sábado 2 de enero')
  })
})

describe('debeOfrecerPadrinazgo', () => {
  const base = { intencion: 'explorar' as Intencion, suitability: 30, turnos: 3, conexion: true }
  it('no puede adoptar y conectó → sí, sin importar los turnos', () => {
    expect(debeOfrecerPadrinazgo({ ...base, intencion: 'no_puede_adoptar', suitability: 80, turnos: 1 })).toBe(true)
  })
  it('no puede adoptar pero sin conexión emocional → no insistir', () => {
    expect(debeOfrecerPadrinazgo({ ...base, intencion: 'no_puede_adoptar', conexion: false })).toBe(false)
  })
  it('score bajo (<40) después de 3 turnos y conectado → sí', () => {
    expect(debeOfrecerPadrinazgo({ ...base, suitability: 39, turnos: 3 })).toBe(true)
  })
  it('score bajo antes de 3 turnos, o score 40, o sin conexión → no', () => {
    expect(debeOfrecerPadrinazgo({ ...base, suitability: 39, turnos: 2 })).toBe(false)
    expect(debeOfrecerPadrinazgo({ ...base, suitability: 40, turnos: 5 })).toBe(false)
    expect(debeOfrecerPadrinazgo({ ...base, suitability: 10, turnos: 5, conexion: false })).toBe(false)
  })
  it('quien pide apadrinar o donar recibe la información aunque no se haya medido la conexión', () => {
    expect(debeOfrecerPadrinazgo({ ...base, intencion: 'apadrinar', conexion: false })).toBe(true)
    expect(debeOfrecerPadrinazgo({ ...base, intencion: 'donar', conexion: false })).toBe(true)
  })
  it('un adoptante fuerte que quiere adoptar → no', () => {
    expect(debeOfrecerPadrinazgo({ ...base, intencion: 'adoptar', suitability: 90 })).toBe(false)
  })
})

describe('mencionaPadrinazgo', () => {
  it('exige hablar de padrino/apadrinar y de $20.000', () => {
    expect(mencionaPadrinazgo('Puedes ser Padrino desde $20.000 COP al mes')).toBe(true)
    expect(mencionaPadrinazgo('Podrías apadrinarlo por 20.000 pesos')).toBe(true)
    expect(mencionaPadrinazgo('Podrías apadrinarlo')).toBe(false)
    expect(mencionaPadrinazgo('Con $20.000 compras comida')).toBe(false)
  })
})

describe('aGuionVoz', () => {
  it('quita emojis, markdown y viñetas, y deja frases cortas', () => {
    expect(aGuionVoz('¡Hola! 🐶\n\nTe cuento de **Toby**:\n- es cariñoso\n- le encanta jugar')).toBe(
      '¡Hola! Te cuento de Toby: es cariñoso. le encanta jugar.',
    )
  })
  it('no deja caracteres de markdown ni emojis', () => {
    const s = aGuionVoz('_Toby_ `es` ~lindo~ 💛🐾 ## título')
    expect(s).not.toMatch(/[_`~#*]/u)
    expect(s).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(s).toContain('Toby')
  })
  it('dice los montos como pesos para que la voz los lea bien, sin tragarse el punto de la frase', () => {
    expect(aGuionVoz('Cuesta desde $20.000 COP al mes')).toBe('Cuesta desde 20.000 pesos al mes.')
    expect(aGuionVoz('Son $20.000.')).toBe('Son 20.000 pesos.')
  })
  it('una cadena vacía sigue vacía', () => {
    expect(aGuionVoz('  ')).toBe('')
  })
})

describe('normalizarRespuesta', () => {
  const buena = {
    transcripcion: 'quiero un perrito',
    respuesta: 'Hola 🐶 ¿cómo es tu casa?',
    guion_voz: 'Hola. ¿Cómo es tu casa?',
    perrito_id_foco: '5',
    perritos_mencionados: ['5', '12', '1', '3'],
    intencion: 'adoptar',
    conexion_emocional: true,
    alerta_bienestar: false,
    evaluacion: { suitability_score: 55 },
  }
  it('lee una respuesta válida', () => {
    const r = normalizarRespuesta(buena)
    expect(r).toMatchObject({
      transcripcion: 'quiero un perrito',
      respuesta: 'Hola 🐶 ¿cómo es tu casa?',
      guionVoz: 'Hola. ¿Cómo es tu casa?',
      perritoIdFoco: '5',
      perritosMencionados: ['5', '12', '1'],
      intencion: 'adoptar',
      conexionEmocional: true,
      alertaBienestar: false,
      evaluacion: { suitability: 55 },
    })
  })
  it('una intención inválida cae en explorar; el foco vacío es null', () => {
    const r = normalizarRespuesta({ ...buena, intencion: 'comprar', perrito_id_foco: '' })
    expect(r.intencion).toBe('explorar')
    expect(r.perritoIdFoco).toBeNull()
  })
  it('sin guion de voz lo arma desde la respuesta; si trae emojis se los quita', () => {
    expect(normalizarRespuesta({ ...buena, guion_voz: undefined }).guionVoz).toBe('Hola ¿cómo es tu casa?')
    expect(normalizarRespuesta({ ...buena, guion_voz: 'Hola 🐶. Bien.' }).guionVoz).toBe('Hola. Bien.')
  })
  it('sin respuesta, o algo que no es un objeto, es un error', () => {
    expect(() => normalizarRespuesta({ ...buena, respuesta: '   ' })).toThrow()
    expect(() => normalizarRespuesta({ ...buena, respuesta: undefined })).toThrow()
    expect(() => normalizarRespuesta('hola')).toThrow()
    expect(() => normalizarRespuesta(null)).toThrow()
  })
})

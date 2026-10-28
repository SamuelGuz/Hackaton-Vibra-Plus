import { describe, expect, it } from 'vitest'
import { dosisDelDia } from '../../src/domain/dosis'
import { accionesAEventos, autoconfirmables } from '../../src/domain/reglas'
import type { Registro } from '../../src/registro'
import type { Accion } from '../../src/vistas'
import { COMPROMISO_TOB_14, FECHA, comida, registro, semilla } from '../fixtures/semilla'

const AHORA = `${FECHA}T14:01:00-05:00`

type Contexto = Parameters<typeof accionesAEventos>[1]

function accion(parcial: Partial<Accion> = {}): Accion {
  return { tipo: 'comida', tiempo: 'pasado', fraseExacta: 'ya comió', confianza: 0.9, ...parcial }
}

function ctx(parcial: Partial<Contexto> = {}): Contexto {
  return {
    agenteId: 'p-andrea',
    animalId: 'TOB',
    dosisHoy: dosisDelDia(semilla().tratamientos, FECHA),
    eventosHoy: [],
    ahoraIso: AHORA,
    registroIaId: 'ia-1',
    ...parcial,
  }
}

describe('accionesAEventos', () => {
  it('toda acción nace por_confirmar con la fraseExacta copiada', () => {
    const acciones = [
      accion({ tipo: 'comida', fraseExacta: 'ya comió' }),
      accion({ tipo: 'observacion', nota: 'cojea', fraseExacta: 'cojea de la pata' }),
      accion({ tipo: 'avance', nota: 'ya camina solo', fraseExacta: 'ya camina solito' }),
      accion({ tipo: 'dosis', medicamento: 'anticonvulsivo', fraseExacta: 'ya le di el anticonvulsivo' }),
    ]
    const { eventos } = accionesAEventos(acciones, ctx())
    expect(eventos).toHaveLength(4)
    expect(eventos.map((e) => e.estado)).toEqual(['por_confirmar', 'por_confirmar', 'por_confirmar', 'por_confirmar'])
    expect(eventos.map((e) => e.fraseExacta)).toEqual(acciones.map((a) => a.fraseExacta))
  })

  it('copia agente, hora, origen, confianza, grupo de la IA y media a cada registro', () => {
    const { eventos } = accionesAEventos([accion({ confianza: 0.77 })], ctx({ mediaUrl: 'https://media.test/a.ogg' }))
    expect(eventos[0]).toMatchObject({
      agenteId: 'p-andrea',
      fechaHora: AHORA,
      origen: 'audio',
      confianza: 0.77,
      registroIaId: 'ia-1',
      mediaUrl: 'https://media.test/a.ogg',
    })
  })

  it('usa el origen que le pasen', () => {
    const { eventos } = accionesAEventos([accion()], ctx({ origen: 'foto' }))
    expect(eventos[0]?.origen).toBe('foto')
  })

  it('da ids distintos y repetibles a los registros de una misma llamada', () => {
    const acciones = [accion(), accion({ tipo: 'observacion', nota: 'x' })]
    const a = accionesAEventos(acciones, ctx()).eventos.map((e) => e.id)
    const b = accionesAEventos(acciones, ctx()).eventos.map((e) => e.id)
    expect(new Set(a).size).toBe(2)
    expect(a).toEqual(b)
  })

  it('convierte cada tipo en su propuesta', () => {
    const { eventos } = accionesAEventos(
      [
        accion({ tipo: 'comida', nota: 'comió todo' }),
        accion({ tipo: 'observacion', nota: 'cojea' }),
        accion({ tipo: 'avance', nota: 'ya camina solo' }),
        accion({ tipo: 'nota', nota: 'le gusta la pelota' }),
      ],
      ctx(),
    )
    expect(eventos.map((e) => e.propuesta)).toEqual([
      { tipo: 'comida', animalId: 'TOB', texto: 'comió todo' },
      { tipo: 'observacion', animalId: 'TOB', texto: 'cojea' },
      { tipo: 'avance', animalId: 'TOB', texto: 'ya camina solo' },
      { tipo: 'nota', animalId: 'TOB', texto: 'le gusta la pelota' },
    ])
  })

  it('sin nota usa la fraseExacta como texto', () => {
    const { eventos } = accionesAEventos([accion({ tipo: 'avance', fraseExacta: 'ya camina solito' })], ctx())
    expect(eventos[0]?.propuesta).toEqual({ tipo: 'avance', animalId: 'TOB', texto: 'ya camina solito' })
  })

  describe('dosis', () => {
    it('una dosis en futuro produce una nota sin compromisoId', () => {
      const { eventos, duplicados } = accionesAEventos(
        [accion({ tipo: 'dosis', medicamento: 'anticonvulsivo', tiempo: 'futuro', fraseExacta: 'ahorita se la doy' })],
        ctx(),
      )
      expect(duplicados).toEqual([])
      expect(eventos).toHaveLength(1)
      expect(eventos[0]?.propuesta).toEqual({ tipo: 'nota', animalId: 'TOB', texto: 'ahorita se la doy' })
      expect(eventos[0]?.compromisoId).toBeUndefined()
      expect(eventos[0]?.estado).toBe('por_confirmar')
    })

    it('una dosis dicha a las 19:01Z (14:01 en Bogotá) recibe el compromiso de las 14:00 y guarda la hora de Bogotá', () => {
      const { eventos } = accionesAEventos(
        [accion({ tipo: 'dosis', medicamento: 'Anticonvulsivo', fraseExacta: 'ya le di el anticonvulsivo' })],
        ctx({ ahoraIso: `${FECHA}T19:01:00Z` }),
      )
      expect(eventos[0]?.compromisoId).toBe(COMPROMISO_TOB_14)
      expect(eventos[0]?.fechaHora).toBe(AHORA)
    })

    it('una dosis en pasado a las 14:01 recibe el compromisoId de la de las 14:00', () => {
      const { eventos } = accionesAEventos(
        [accion({ tipo: 'dosis', medicamento: 'Anticonvulsivo ', fraseExacta: 'ya le di el anticonvulsivo' })],
        ctx(),
      )
      expect(eventos[0]?.compromisoId).toBe(COMPROMISO_TOB_14)
      expect(eventos[0]?.propuesta).toEqual({ tipo: 'dosis', animalId: 'TOB', tratamientoId: 't-tob-anticonvulsivo', hora: '14:00' })
    })

    it('una dosis en presente también cuenta como dada', () => {
      const { eventos } = accionesAEventos([accion({ tipo: 'dosis', medicamento: 'anticonvulsivo', tiempo: 'presente' })], ctx())
      expect(eventos[0]?.compromisoId).toBe(COMPROMISO_TOB_14)
    })

    it('una dosis de un medicamento que no está programado queda como nota sin compromisoId', () => {
      const { eventos } = accionesAEventos([accion({ tipo: 'dosis', medicamento: 'ibuprofeno', fraseExacta: 'le di ibuprofeno' })], ctx())
      expect(eventos[0]?.propuesta).toEqual({ tipo: 'nota', animalId: 'TOB', texto: 'le di ibuprofeno' })
      expect(eventos[0]?.compromisoId).toBeUndefined()
    })

    it.each(['por_confirmar', 'confirmado', 'corregido'] as const)(
      'si ya hay un registro %s con ese compromisoId, va a duplicados y no a eventos',
      (estado) => {
        const existente = registro({ id: 'r-1', estado })
        const res = accionesAEventos([accion({ tipo: 'dosis', medicamento: 'anticonvulsivo' })], ctx({ eventosHoy: [existente] }))
        expect(res.eventos).toEqual([])
        expect(res.duplicados).toHaveLength(1)
        expect(res.duplicados[0]?.existente).toBe(existente)
        expect(res.duplicados[0]?.accion.tipo).toBe('dosis')
      },
    )

    it('un registro anulado no cuenta como duplicado', () => {
      const res = accionesAEventos(
        [accion({ tipo: 'dosis', medicamento: 'anticonvulsivo' })],
        ctx({ eventosHoy: [registro({ id: 'r-1', estado: 'anulado' })] }),
      )
      expect(res.duplicados).toEqual([])
      expect(res.eventos).toHaveLength(1)
    })

    it('dos dosis iguales en el mismo audio dejan un registro y un duplicado', () => {
      const dosis = accion({ tipo: 'dosis', medicamento: 'anticonvulsivo' })
      const res = accionesAEventos([dosis, dosis], ctx())
      expect(res.eventos).toHaveLength(1)
      expect(res.duplicados).toHaveLength(1)
      expect(res.duplicados[0]?.existente.id).toBe(res.eventos[0]?.id)
    })
  })

  describe('inventario y plata', () => {
    it('inventario: toma la especie del texto y la cantidad como cambio', () => {
      const { eventos } = accionesAEventos(
        [accion({ tipo: 'inventario', cantidad: -1, unidad: 'bulto', nota: 'abrí un bulto de gato' })],
        ctx({ animalId: undefined }),
      )
      expect(eventos[0]?.propuesta).toEqual({ tipo: 'inventario', especie: 'gato', cambio: -1 })
    })

    it('inventario: si el texto no dice la especie usa la del contexto', () => {
      const { eventos } = accionesAEventos(
        [accion({ tipo: 'inventario', cantidad: 3, unidad: 'bulto', nota: 'llegaron 3 bultos' })],
        ctx({ animalId: undefined, especie: 'perro' }),
      )
      expect(eventos[0]?.propuesta).toEqual({ tipo: 'inventario', especie: 'perro', cambio: 3 })
    })

    it('factura: sube la deuda con la clínica (deuda)', () => {
      const { eventos } = accionesAEventos(
        [accion({ tipo: 'factura', monto: 850_000, nota: 'cirugía de Mateo' })],
        ctx({ animalId: undefined, contraparteId: 'cl-general' }),
      )
      expect(eventos[0]?.propuesta).toEqual({ tipo: 'deuda', clinicaId: 'cl-general', monto: 850_000, nota: 'cirugía de Mateo' })
    })

    it('abono: es un gasto que baja la deuda (movimiento con abonoDeuda)', () => {
      const { eventos } = accionesAEventos(
        [accion({ tipo: 'abono', monto: 500_000, nota: 'abono' })],
        ctx({ animalId: undefined, contraparteId: 'cl-general', mediaUrl: 'https://media.test/f.jpg' }),
      )
      expect(eventos[0]?.propuesta).toEqual({
        tipo: 'movimiento',
        movimiento: {
          tipo: 'gasto',
          monto: 500_000,
          categoria: 'veterinaria',
          clinicaId: 'cl-general',
          abonoDeuda: true,
          foto: 'https://media.test/f.jpg',
          nota: 'abono',
        },
      })
    })

    it('donación: es un ingreso (movimiento)', () => {
      const { eventos } = accionesAEventos(
        [accion({ tipo: 'donacion', monto: 100_000, fraseExacta: 'donaron cien mil' })],
        ctx({ animalId: undefined }),
      )
      expect(eventos[0]?.propuesta).toEqual({
        tipo: 'movimiento',
        movimiento: { tipo: 'ingreso', monto: 100_000, categoria: 'donacion', clinicaId: null, abonoDeuda: false, foto: null, nota: 'donaron cien mil' },
      })
    })

    it('el dinero también nace por_confirmar', () => {
      const { eventos } = accionesAEventos([accion({ tipo: 'donacion', monto: 100_000 })], ctx({ animalId: undefined }))
      expect(eventos[0]?.estado).toBe('por_confirmar')
    })
  })

  describe('lo que no se puede convertir', () => {
    it('una acción de un animal sin animalId en el contexto queda en sinResolver', () => {
      const res = accionesAEventos([accion({ tipo: 'comida' })], ctx({ animalId: undefined }))
      expect(res.eventos).toEqual([])
      expect(res.sinResolver).toHaveLength(1)
      expect(res.sinResolver[0]?.accion.tipo).toBe('comida')
      expect(res.sinResolver[0]?.motivo).toBe('Falta el animal')
    })

    it('una factura sin clínica, un inventario sin especie o sin cantidad y un monto sin valor quedan en sinResolver', () => {
      const res = accionesAEventos(
        [
          accion({ tipo: 'factura', monto: 1000 }),
          accion({ tipo: 'inventario', cantidad: 1, nota: 'un bulto' }),
          accion({ tipo: 'inventario', nota: 'un bulto de perro' }),
          accion({ tipo: 'donacion' }),
        ],
        ctx({ animalId: undefined }),
      )
      expect(res.eventos).toEqual([])
      expect(res.sinResolver.map((s) => s.motivo)).toEqual(['Falta la clínica', 'Falta la especie', 'Falta la cantidad', 'Falta el monto'])
    })

    it('un monto de cero, negativo o con decimales queda en sinResolver como Monto inválido', () => {
      const res = accionesAEventos(
        [
          accion({ tipo: 'donacion', monto: 0 }),
          accion({ tipo: 'factura', monto: -500 }),
          accion({ tipo: 'abono', monto: 1000.5 }),
          accion({ tipo: 'donacion', monto: 1000 }),
        ],
        ctx({ animalId: undefined, contraparteId: 'cl-general' }),
      )
      expect(res.sinResolver.map((s) => s.motivo)).toEqual(['Monto inválido', 'Monto inválido', 'Monto inválido'])
      expect(res.eventos).toHaveLength(1)
    })

    it('lo resoluble sale aunque otra acción del mismo audio no se pueda resolver', () => {
      const res = accionesAEventos(
        [accion({ tipo: 'donacion' }), accion({ tipo: 'inventario', cantidad: 1, nota: 'perro' })],
        ctx({ animalId: undefined }),
      )
      expect(res.eventos).toHaveLength(1)
      expect(res.sinResolver).toHaveLength(1)
    })
  })
})

describe('autoconfirmables', () => {
  const cfg = semilla().config
  const viejo = (id: string, propuesta: Registro['propuesta'], parcial: Partial<Registro> = {}): Registro =>
    registro({ id, propuesta, compromisoId: undefined, fechaHora: `${FECHA}T14:00:00-05:00`, confianza: 0.9, ...parcial })
  const ahora = `${FECHA}T14:30:00-05:00`
  const comidaTob = { tipo: 'comida', animalId: 'TOB', texto: 'comió' } as const

  it('devuelve comida, observación, avance e inventario con confianza ≥ 0,85 y 30 min o más', () => {
    const eventos = [
      viejo('c', comidaTob),
      viejo('o', { tipo: 'observacion', animalId: 'TOB', texto: 'cojea' }),
      viejo('a', { tipo: 'avance', animalId: 'TOB', texto: 'camina' }),
      viejo('i', { tipo: 'inventario', especie: 'perro', cambio: -1 }),
    ]
    expect(autoconfirmables(eventos, ahora, cfg)).toEqual(['c', 'o', 'a', 'i'])
  })

  it('nunca devuelve dosis, deuda ni movimientos (factura, abono, donación) ni notas', () => {
    const eventos = [
      viejo('d', { tipo: 'dosis', animalId: 'TOB', tratamientoId: 't', hora: '14:00' }, { confianza: 1 }),
      viejo('f', { tipo: 'deuda', clinicaId: 'cl-general', monto: 1, nota: '' }, { confianza: 1 }),
      viejo(
        'm',
        { tipo: 'movimiento', movimiento: { tipo: 'ingreso', monto: 1, categoria: 'donacion', clinicaId: null, abonoDeuda: false, foto: null, nota: '' } },
        { confianza: 1 },
      ),
      viejo('n', { tipo: 'nota', animalId: 'TOB', texto: 'x' }, { confianza: 1 }),
    ]
    expect(autoconfirmables(eventos, ahora, cfg)).toEqual([])
  })

  it('no devuelve un registro de 29 min, pero sí uno de 30', () => {
    const de29 = viejo('29', comidaTob, { fechaHora: `${FECHA}T14:01:00-05:00` })
    const de30 = viejo('30', comidaTob, { fechaHora: `${FECHA}T14:00:00-05:00` })
    expect(autoconfirmables([de29, de30], ahora, cfg)).toEqual(['30'])
  })

  it('no devuelve lo que tiene confianza menor a 0,85 ni lo que no tiene confianza', () => {
    const bajo = viejo('bajo', comidaTob, { confianza: 0.84 })
    const justo = viejo('justo', comidaTob, { confianza: 0.85 })
    const sin = viejo('sin', comidaTob, { confianza: undefined })
    expect(autoconfirmables([bajo, justo, sin], ahora, cfg)).toEqual(['justo'])
  })

  it('no devuelve lo que ya no está por confirmar', () => {
    const c = viejo('c', comidaTob, { estado: 'confirmado' })
    const a = comida('a', 'TOB', { estado: 'anulado', fechaHora: `${FECHA}T14:00:00-05:00` })
    expect(autoconfirmables([c, a], ahora, cfg)).toEqual([])
  })

  it('respeta los minutos y el umbral de la configuración', () => {
    const c = viejo('c', comidaTob, { confianza: 0.8 })
    expect(autoconfirmables([c], `${FECHA}T14:10:00-05:00`, { ...cfg, minutosAutoconfirmar: 10, umbralAutoconfirmar: 0.8 })).toEqual(['c'])
  })
})

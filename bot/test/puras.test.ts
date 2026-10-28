import { describe, expect, it } from 'vitest'
import { armarHoy, dosisHablada, horasDelDia, type FilasHoy } from '../src/api/hoy.js'
import { validarCambioEstado, validarEvento } from '../src/api/eventos.js'
import { buscarAnimal } from '../src/conversacion/animal.js'
import { parsearCantidad, parsearMonto } from '../src/conversacion/numeros.js'
import { convertir } from '../src/ia/esquema.js'
import { quitarDatosSensibles } from '../src/ia/redactar.js'
import { cuerpoMensaje } from '../src/wa/cliente.js'
import { normalizarTelefono } from '../src/wa/telefono.js'
import { AHORA, datosDePrueba } from './fakes.js'

describe('parsearMonto', () => {
  it.each([
    ['50 mil', 50_000],
    ['50mil', 50_000],
    ['50000', 50_000],
    ['$150.000', 150_000],
    ['150.000 pesos', 150_000],
    ['1.500.000', 1_500_000],
    ['un millón', 1_000_000],
    ['1,5 millones', 1_500_000],
    ['un millón y medio', 1_500_000],
    ['medio millón', 500_000],
    ['1 millón 200 mil', 1_200_000],
    ['ciento cincuenta mil', 150_000],
    ['cincuenta mil pesos', 50_000],
    ['20 lucas', 20_000],
    ['80k', 80_000],
  ])('"%s" → %d', (texto, esperado) => {
    expect(parsearMonto(texto)).toBe(esperado)
  })

  it.each(['no sé', '', 'mañana', '0'])('"%s" no es un monto', (texto) => {
    expect(parsearMonto(texto)).toBeNull()
  })
})

describe('parsearCantidad', () => {
  it('lee cifras y palabras', () => {
    expect(parsearCantidad('llegaron 6')).toBe(6)
    expect(parsearCantidad('tres bultos')).toBe(3)
    expect(parsearCantidad('ninguno')).toBeNull()
  })
})

describe('quitarDatosSensibles', () => {
  it('quita teléfonos y cédulas pero deja los montos', () => {
    const t = quitarDatosSensibles('Llamar a Laura al 300 123 4567, cédula 1.098.765.432, donó $1.500.000')
    expect(t).not.toContain('4567')
    expect(t).not.toContain('765')
    expect(t).toContain('[teléfono]')
    expect(t).toContain('cédula [documento]')
    expect(t).toContain('$1.500.000')
  })

  it('quita números largos sin formato', () => {
    expect(quitarDatosSensibles('su número es 3001234567')).toBe('su número es [teléfono]')
    expect(quitarDatosSensibles('cuenta 12345678901')).toBe('cuenta [número]')
  })
})

describe('convertir lo que devuelve la IA', () => {
  const d = datosDePrueba()

  it('descarta lo que todavía no pasó y lo cuenta', () => {
    const e = convertir(
      { transcripcion: 'le voy a dar la pastilla', confianza: 0.9, acciones: [{ tipo: 'dosis', ya_ocurrio: false, tratamiento_id: '100', hora: '14:00' }] },
      d,
      AHORA,
    )
    expect(e.acciones).toEqual([])
    expect(e.futuras).toBe(1)
  })

  it('descarta ids inventados', () => {
    const e = convertir(
      {
        transcripcion: '',
        confianza: 1,
        acciones: [
          { tipo: 'dosis', ya_ocurrio: true, tratamiento_id: '999' },
          { tipo: 'observacion', ya_ocurrio: true, animal_id: '999', texto: 'x' },
          { tipo: 'movimiento', ya_ocurrio: true, movimiento: 'abono', monto: 1000, clinica_id: '999' },
        ],
      },
      d,
      AHORA,
    )
    expect(e.acciones).toEqual([])
  })

  it('si no dice la hora de la dosis, toma la programada más cercana', () => {
    const e = convertir({ transcripcion: '', confianza: 1, acciones: [{ tipo: 'dosis', ya_ocurrio: true, tratamiento_id: '101' }] }, d, AHORA)
    // A las 3:00 p. m., entre 8:00 a. m. y 8:00 p. m., la más cercana es la de las 8:00 p. m.
    expect(e.acciones).toEqual([{ tipo: 'dosis', animalId: '11', tratamientoId: '101', hora: '20:00' }])
  })

  it('una captura de Nequi queda como ingreso con categoría válida', () => {
    const e = convertir(
      { transcripcion: 'Nequi', confianza: 0.8, acciones: [{ tipo: 'movimiento', ya_ocurrio: true, movimiento: 'ingreso', monto: 150000.4, categoria: 'veterinaria' }] },
      d,
      AHORA,
    )
    expect(e.acciones[0]).toMatchObject({ tipo: 'movimiento', movimiento: { tipo: 'ingreso', monto: 150_000, categoria: 'otro' } })
  })

  it('si la IA no pone el monto, lo saca de lo que dijo la persona', () => {
    // Respuesta real de Gemini a un audio de WhatsApp: entendió el ingreso pero dejó el monto vacío
    const e = convertir(
      {
        transcripcion: 'No, no tengo foto. Me acaba de llegar otros 5000 pesos.',
        confianza: 0.9,
        acciones: [{ tipo: 'movimiento', ya_ocurrio: true, movimiento: 'ingreso', texto: 'Llegaron 5000 pesos', tratamiento_id: 'null' }],
      },
      d,
      AHORA,
    )
    expect(e.acciones[0]).toMatchObject({ tipo: 'movimiento', movimiento: { tipo: 'ingreso', monto: 5000 } })
  })

  it('con dos movimientos sin monto no adivina cuál número es de cuál', () => {
    const e = convertir(
      {
        transcripcion: 'Entraron 30 mil por Nequi y 40 mil por la llave',
        confianza: 0.9,
        acciones: [
          { tipo: 'movimiento', ya_ocurrio: true, movimiento: 'ingreso' },
          { tipo: 'movimiento', ya_ocurrio: true, movimiento: 'ingreso' },
        ],
      },
      d,
      AHORA,
    )
    expect(e.acciones).toEqual([])
  })

  it('una factura sin clínica queda a medias para preguntarla', () => {
    const e = convertir({ transcripcion: '', confianza: 1, acciones: [{ tipo: 'factura', ya_ocurrio: true, monto: 320000 }] }, d, AHORA)
    expect(e.acciones).toEqual([])
    expect(e.factura).toEqual({ monto: 320_000, clinicaId: null, concepto: '' })
  })
})

describe('buscarAnimal', () => {
  const d = datosDePrueba()
  it.each([
    ['Tobías', 'Tobías'],
    ['tobias', 'Tobías'],
    ['Tobi', 'Tobías'],
    ['a mateo', 'Mateo'],
    ['Mateoo', 'Mateo'],
    ['lun', 'Luna'],
  ])('"%s" → %s', (q, nombre) => {
    expect(buscarAnimal(d, q).map((a) => a.nombre)).toEqual([nombre])
  })
})

describe('mapeo a la forma del panel', () => {
  it('horasDelDia reparte desde la primera hora sin pasar de medianoche', () => {
    expect(horasDelDia('08:00', 12)).toEqual(['08:00', '20:00'])
    expect(horasDelDia('08:00', 6)).toEqual(['08:00', '14:00', '20:00'])
    expect(horasDelDia('14:00', 24)).toEqual(['14:00'])
  })

  it('dosisHablada', () => {
    expect(dosisHablada(0.5, 'pastilla')).toBe('media pastilla')
    expect(dosisHablada(3, 'ml')).toBe('3 ml')
    expect(dosisHablada(1.25, 'ml')).toBe('1,25 ml')
  })

  it('armarHoy convierte las filas de Postgres', () => {
    const f: FilasHoy = {
      usuarios: [{ id: 1, nombre: 'Don Luis', rol: 'cuidador' }],
      animales: [
        { id: 10, nombre: 'Tobías', especie: 'perro', estado: 'tratamiento', foto_url: null, fecha_ingreso: '2026-01-01', alias: ['Tobi'], advertencias: ['No saltar'], caracter: null, padrino: 'Familia Ríos' },
      ],
      tratamientos: [
        { id: 100, animal_id: 10, medicamento: 'Fenobarbital', dosis: 1, unidad: 'pastilla', frecuencia_horas: 24, hora_inicio: '14:00', fecha_inicio: '2026-10-01', fecha_fin: null },
      ],
      dosis: [{ id: 7, tratamiento_id: 100, valor: '14:00', fecha_hora: '2026-10-27T14:01', creado_por: 1, canal: 'whatsapp' }],
      inventario: [{ id: 8, especie: 'perro', cantidad: -1, fecha_hora: '2026-10-27T06:35', creado_por: 1, origen: 'panel' }],
      movimientos: [
        { id: 9, tipo: 'abono', monto: 200_000, categoria: 'veterinaria', entidad_id: 50, soporte_url: null, concepto: null, fecha_hora: '2026-10-27T10:00', creado_por: 3 },
        { id: 10, tipo: 'ingreso', monto: 50_000, categoria: 'raro', entidad_id: null, soporte_url: null, concepto: 'Nequi', fecha_hora: '2026-10-27T11:00', creado_por: 3 },
      ],
      clinicas: [{ id: 50, nombre: 'San Roque', limite_credito: 2_500_000, deuda: 1_350_000 }],
      registros: [{ id: 3, fecha_hora: '2026-10-27T08:12', tipo_entrada: 'imagen', usuario_id: 1, transcripcion: 'Nequi', acciones_json: [], estado: 'anulado' }],
      notas: [],
      config: { caja_inicial_fecha: '2026-10-24', caja_inicial_monto: '1050000', conteo_fecha: '2026-10-25', conteo_bultos_perro: '5', dias_urgente: '4' },
      catalogo: [{ especie: 'perro', kg_por_unidad: 25, consumo_diario_kg_por_animal: 0.375 }],
      aCargo: [{ especie: 'perro', n: 45 }],
      adopciones: 3,
    }
    const d = armarHoy(f)
    expect(d.personas[0]).toMatchObject({ id: '1', cargo: 'Cuidador' })
    expect(d.animales[0]).toMatchObject({ id: '10', caracter: '', padrino: 'Familia Ríos', advertencias: ['No saltar'] })
    expect(d.tratamientos[0]).toEqual({ id: '100', animalId: '10', medicamento: 'Fenobarbital', dosis: '1 pastilla', horas: ['14:00'], inicio: '2026-10-01', fin: '9999-12-31' })
    expect(d.dosisDadas[0]).toMatchObject({ tratamientoId: '100', hora: '14:00', quien: '1', origen: 'bot' })
    expect(d.inventario[0]).toMatchObject({ tipo: 'perro', cambio: -1, origen: 'panel' })
    expect(d.movimientos[0]).toMatchObject({ tipo: 'gasto', abonoDeuda: true, clinicaId: '50' })
    expect(d.movimientos[1]).toMatchObject({ tipo: 'ingreso', categoria: 'otro', nota: 'Nequi' })
    expect(d.porConfirmar[0]).toMatchObject({ origen: 'foto', estado: 'descartado' })
    expect(d.cajaInicial).toEqual({ fecha: '2026-10-24', monto: 1_050_000 })
    expect(d.conteoInicial.bultos).toEqual({ perro: 5, gato: 0 })
    expect(d.configComida).toEqual({ kgPorBulto: { perro: 25, gato: 0 }, consumoDiarioKg: { perro: 16.875, gato: 0 }, diasAviso: 6, diasUrgente: 4 })
    expect(d.vidasCambiadas).toBe(3)
  })
})

describe('validar lo que manda el panel', () => {
  const uuid = '0b9f5d3e-4c1a-4e2b-9a7f-1d2c3b4a5e6f'
  it('acepta un evento bien formado', () => {
    expect(validarEvento({ id: uuid, tipo: 'inventario', especie: 'perro', cambio: -1 })).toEqual({
      ok: { id: uuid, tipo: 'inventario', especie: 'perro', cambio: -1 },
    })
  })
  it('rechaza sin uuid o con datos raros', () => {
    expect(validarEvento({ id: '1', tipo: 'inventario', especie: 'perro', cambio: -1 })).toHaveProperty('error')
    expect(validarEvento({ id: uuid, tipo: 'dosis', animalId: '1', tratamientoId: '2', hora: '8' })).toHaveProperty('error')
    expect(validarEvento({ id: uuid, tipo: 'movimiento', movimiento: { tipo: 'ingreso', monto: -5, categoria: 'otro' } })).toHaveProperty('error')
  })
  it('cambio de estado', () => {
    expect(validarCambioEstado({ ids: ['3', uuid], estado: 'confirmado' })).toEqual({ ids: ['3', uuid], estado: 'confirmado' })
    expect(validarCambioEstado({ ids: ['3'], estado: 'por_confirmar' })).toBeNull()
    expect(validarCambioEstado({ ids: ["3'; DROP"], estado: 'anulado' })).toBeNull()
  })
})

describe('WhatsApp', () => {
  it('normaliza teléfonos de Colombia', () => {
    expect(normalizarTelefono('300 123 4567')).toBe('573001234567')
    expect(normalizarTelefono('+57 300-123-4567')).toBe('573001234567')
  })

  it('recorta títulos largos para que Meta no rechace el mensaje', () => {
    const b = cuerpoMensaje('57300', {
      tipo: 'lista',
      texto: 'x',
      boton: 'Un texto de botón demasiado largo',
      filas: Array.from({ length: 12 }, (_, i) => ({ id: `f${i}`, titulo: 'Contar algo de un animalito querido' })),
    }) as any
    expect(b.interactive.action.button.length).toBeLessThanOrEqual(20)
    expect(b.interactive.action.sections[0].rows).toHaveLength(10)
    expect(b.interactive.action.sections[0].rows[0].title.length).toBeLessThanOrEqual(24)
  })
})

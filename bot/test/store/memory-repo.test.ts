import { beforeEach, describe, expect, it } from 'vitest'
import type { Seguimiento, Solicitud } from '@huellitas/shared/adopcion/tipos'
import type { Registro } from '@huellitas/shared/registro'
import type { Persona } from '@huellitas/shared/tipos'
import { MemoryRepo } from '../../src/store/memory-repo'
import { semillaMini } from '../fixtures/semilla-mini'

function dosis(id: string, fechaHora: string, animalId: string, extra: Partial<Registro> = {}): Registro {
  return {
    id,
    fechaHora,
    agenteId: 'p-andrea',
    origen: 'audio',
    estado: 'por_confirmar',
    propuesta: { tipo: 'dosis', animalId, tratamientoId: 't-tob-anticonvulsivo', hora: '14:00' },
    ...extra,
  }
}

let repo: MemoryRepo
beforeEach(() => {
  repo = new MemoryRepo(semillaMini())
})

describe('MemoryRepo: registros', () => {
  it('registrosDelDia devuelve solo los de ese día y animal', async () => {
    await repo.agregarRegistros([
      dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB'),
      dosis('r2', '2026-10-27T08:00:00-05:00', 'MAT'),
      dosis('r3', '2026-10-26T14:01:00-05:00', 'TOB'),
      {
        id: 'r4',
        fechaHora: '2026-10-27T06:35:00-05:00',
        agenteId: 'p-carlos',
        origen: 'panel',
        estado: 'confirmado',
        propuesta: { tipo: 'inventario', especie: 'perro', cambio: -1 },
      },
    ])
    expect((await repo.registrosDelDia('2026-10-27', 'TOB')).map((r) => r.id)).toEqual(['r1'])
    expect((await repo.registrosDelDia('2026-10-27')).map((r) => r.id)).toEqual(['r1', 'r2', 'r4'])
    expect(await repo.registrosDelDia('2026-10-28')).toEqual([])
  })

  it('registrosEntre incluye ambos extremos y filtra por animal', async () => {
    await repo.agregarRegistros([
      dosis('r1', '2026-10-25T10:00:00-05:00', 'TOB'),
      dosis('r2', '2026-10-26T10:00:00-05:00', 'TOB'),
      dosis('r3', '2026-10-27T23:59:00-05:00', 'TOB'),
      dosis('r4', '2026-10-28T00:00:00-05:00', 'TOB'),
      dosis('r5', '2026-10-26T11:00:00-05:00', 'MAT'),
    ])
    expect((await repo.registrosEntre('2026-10-26', '2026-10-27')).map((r) => r.id)).toEqual(['r2', 'r3', 'r5'])
    expect((await repo.registrosEntre('2026-10-26', '2026-10-27', 'TOB')).map((r) => r.id)).toEqual(['r2', 'r3'])
  })

  it('agregarRegistros devuelve los ids nuevos e ignora un id repetido sin pisar el original', async () => {
    const primero = await repo.agregarRegistros([dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB', { fraseExacta: 'original' })])
    expect(primero).toEqual(['r1'])

    const segundo = await repo.agregarRegistros([
      dosis('r1', '2026-10-27T14:05:00-05:00', 'TOB', { fraseExacta: 'repetido' }),
      dosis('r2', '2026-10-27T14:06:00-05:00', 'TOB'),
    ])
    expect(segundo).toEqual(['r2'])
    expect(await repo.registrosDelDia('2026-10-27')).toHaveLength(2)
    expect((await repo.registroPorId('r1'))?.fraseExacta).toBe('original')
  })

  it('un id repetido dentro del mismo lote se agrega una sola vez', async () => {
    const ids = await repo.agregarRegistros([dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB'), dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB')])
    expect(ids).toEqual(['r1'])
    expect(await repo.registrosDelDia('2026-10-27')).toHaveLength(1)
  })

  it('cambiarEstado pone estado, confirmadoPor y confirmadoEn y devuelve cuántos cambió', async () => {
    await repo.agregarRegistros([dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB'), dosis('r2', '2026-10-27T14:02:00-05:00', 'TOB')])
    const cambiados = await repo.cambiarEstado(['r1', 'no-existe'], 'confirmado', 'p-carlos', '2026-10-27T15:00:00-05:00')
    expect(cambiados).toBe(1)

    const r1 = await repo.registroPorId('r1')
    expect(r1?.estado).toBe('confirmado')
    expect(r1?.confirmadoPor).toBe('p-carlos')
    expect(r1?.confirmadoEn).toBe('2026-10-27T15:00:00-05:00')

    const r2 = await repo.registroPorId('r2')
    expect(r2?.estado).toBe('por_confirmar')
    expect(r2?.confirmadoPor).toBeUndefined()
  })

  it('registroPorId es null si no existe; registrosPorIa y registrosPorEstado agrupan', async () => {
    await repo.agregarRegistros([
      dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB', { registroIaId: 'ia-1' }),
      dosis('r2', '2026-10-27T14:01:00-05:00', 'MAT', { registroIaId: 'ia-1' }),
      dosis('r3', '2026-10-27T14:02:00-05:00', 'TOB', { registroIaId: 'ia-2' }),
    ])
    expect(await repo.registroPorId('nope')).toBeNull()
    expect((await repo.registrosPorIa('ia-1')).map((r) => r.id)).toEqual(['r1', 'r2'])
    await repo.cambiarEstado(['r3'], 'anulado', 'p-carlos', '2026-10-27T15:00:00-05:00')
    expect((await repo.registrosPorEstado('por_confirmar')).map((r) => r.id)).toEqual(['r1', 'r2'])
    expect((await repo.registrosPorEstado('anulado')).map((r) => r.id)).toEqual(['r3'])
  })

  it('no comparte memoria con lo que recibe ni con lo que devuelve', async () => {
    const original = dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB')
    await repo.agregarRegistros([original])
    original.estado = 'anulado'
    const leido = await repo.registroPorId('r1')
    expect(leido?.estado).toBe('por_confirmar')
    if (leido) leido.estado = 'anulado'
    expect((await repo.registroPorId('r1'))?.estado).toBe('por_confirmar')
  })
})

describe('MemoryRepo: personas, animales y configuración', () => {
  it('busca animales por código sin distinguir mayúsculas y por id', async () => {
    expect((await repo.animalPorCodigo('tob01'))?.nombre).toBe('Tobías')
    expect((await repo.animalPorCodigo('BRU01'))?.advertencias).toEqual(['No pisos lisos'])
    expect(await repo.animalPorCodigo('XXX99')).toBeNull()
    expect((await repo.animalPorId('LUN'))?.especie).toBe('gato')
    expect(await repo.animales()).toHaveLength(4)
  })

  it('devuelve los tratamientos de un animal o todos', async () => {
    expect(await repo.tratamientos()).toHaveLength(1)
    const tob = await repo.tratamientos('TOB')
    expect(tob[0]?.horas).toEqual(['02:00', '14:00'])
    expect(tob[0]?.critico).toBe(true)
    expect(await repo.tratamientos('MAT')).toEqual([])
  })

  it('busca personas por id y por teléfono, y crearPersona agrega una nueva', async () => {
    expect((await repo.personaPorTelefono('573001110001'))?.nombre).toBe('Andrea')
    expect((await repo.personaPorId('p-carlos'))?.rol).toBe('cuidador')
    expect(await repo.personaPorTelefono('573009999999')).toBeNull()

    const nueva: Persona = {
      id: 'p-nueva',
      nombre: 'Sofía',
      cargo: 'Voluntaria',
      rol: 'voluntario',
      color: '#000',
      foto: null,
      telefono: '573009999999',
      activo: true,
    }
    await repo.crearPersona(nueva)
    expect((await repo.personaPorTelefono('573009999999'))?.nombre).toBe('Sofía')
    expect(await repo.personas()).toHaveLength(4)
  })

  it('expone clínicas, configuración, base, catálogo y padrinos de la semilla', async () => {
    expect((await repo.clinicas()).map((c) => c.limite)).toEqual([3_000_000, 3_000_000])
    expect((await repo.config()).umbralAutoconfirmar).toBe(0.85)
    expect((await repo.configComida()).kgPorBulto).toEqual({ perro: 25, gato: 10 })
    expect((await repo.base()).vidasCambiadas).toBe(214)
    expect(await repo.catalogo()).toHaveLength(2)
    expect(await repo.padrinazgosActivos()).toHaveLength(1)
  })
})

describe('MemoryRepo: adopciones', () => {
  const solicitud: Solicitud = {
    id: 's-1',
    fecha: '2026-10-27T09:00:00-05:00',
    nombre: 'Ana',
    telefono: '573001234567',
    cedula: '1098765432',
    direccion: 'Calle 1 # 2-3',
    animalId: 'BRU',
    familiaDeAcuerdo: true,
    paraQuien: 'yo',
    vivienda: 'casa',
    viviendaConMallas: true,
    dondeVivira: 'dentro_casa',
    aceptaEsterilizar: true,
    aceptaVacunar: true,
    aceptaSeguimiento: true,
    quiereEntregaInmediata: false,
    preguntoPorCaracter: true,
    planEmergencia: 'Mi hermana lo cuida',
    mascotasAnteriores: 'Un perro 12 años',
    motivo: 'Compañía',
    montonManual: null,
    nota: '',
    llamadaAgendada: null,
  }

  it('guardarSolicitud crea y luego reemplaza por id', async () => {
    expect(await repo.solicitudes()).toEqual([])
    await repo.guardarSolicitud(solicitud)
    await repo.guardarSolicitud({ ...solicitud, montonManual: 'amarillo', nota: 'Llamar el lunes' })
    const todas = await repo.solicitudes()
    expect(todas).toHaveLength(1)
    expect(todas[0]?.montonManual).toBe('amarillo')
    expect((await repo.solicitudPorId('s-1'))?.nota).toBe('Llamar el lunes')
    expect(await repo.solicitudPorId('s-2')).toBeNull()
  })

  it('guardarSeguimiento crea y luego reemplaza por id', async () => {
    const seg: Seguimiento = {
      id: 'seg-1',
      solicitudId: 's-1',
      adoptanteNombre: 'Ana',
      adoptanteTelefono: '573001234567',
      animalId: 'BRU',
      fechaEntrega: '2026-10-25',
      dia: 2,
      fecha: '2026-10-27',
      resultado: null,
      nota: '',
    }
    await repo.guardarSeguimiento(seg)
    await repo.guardarSeguimiento({ ...seg, resultado: 'verde', nota: 'Todo bien' })
    const todos = await repo.seguimientos()
    expect(todos).toHaveLength(1)
    expect(todos[0]?.resultado).toBe('verde')
  })
})

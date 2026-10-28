import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Seguimiento, Solicitud } from '@huellitas/shared/adopcion/tipos'
import { programarSeguimientos, registrarResultado } from '@huellitas/shared/adopcion/clasificar'
import type { Registro } from '@huellitas/shared/registro'
import type { Persona } from '@huellitas/shared/tipos'
import { marcarEnviados, marcarFallo, migrar, pendientesSheets, PgRepo, sembrar } from '../../src/store/pg-repo'
import { sqlDesdePg, sqlDesdePglite, type Sql } from '../../src/store/sql'
import type { Pool } from 'pg'
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

const TABLAS = [
  'personas',
  'animales',
  'tratamientos',
  'clinicas',
  'config',
  'catalogo',
  'padrinazgos',
  'registros',
  'solicitudes',
  'seguimientos',
  'kv',
  'sheets_pendientes',
]

let sql: Sql
let repo: PgRepo

beforeAll(async () => {
  sql = sqlDesdePglite(new PGlite())
  await migrar(sql)
})

afterAll(async () => {
  await sql.cerrar()
})

beforeEach(async () => {
  await sql.query(`TRUNCATE ${TABLAS.join(', ')} RESTART IDENTITY`)
  await sembrar(sql, semillaMini())
  repo = new PgRepo(sql)
})

describe('migrar', () => {
  it('es idempotente: correrla otra vez no pierde datos ni falla', async () => {
    await repo.agregarRegistros([dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB')])
    await migrar(sql)
    expect(await repo.registroPorId('r1')).not.toBeNull()
    expect(await repo.animales()).toHaveLength(4)
  })

  it('agrega las columnas nuevas a una base creada antes de ellas', async () => {
    await sql.query(`ALTER TABLE solicitudes DROP COLUMN destinatario`)
    await sql.query(`ALTER TABLE seguimientos DROP COLUMN llamada_humana`)
    await migrar(sql)
    const { rows } = await sql.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name IN ('solicitudes', 'seguimientos') AND column_name IN ('destinatario', 'llamada_humana')`,
    )
    expect(rows.map((r) => r.column_name).sort()).toEqual(['destinatario', 'llamada_humana'])
  })

  it('crea las tablas del servidor', async () => {
    const { rows } = await sql.query<{ table_name: string }>(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`)
    const nombres = rows.map((r) => r.table_name)
    for (const t of TABLAS) expect(nombres).toContain(t)
  })
})

describe('PgRepo: registros', () => {
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

  it('el mismo id enviado dos veces a la vez se agrega una sola vez', async () => {
    const resultados = await Promise.all([
      repo.agregarRegistros([dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB')]),
      repo.agregarRegistros([dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB')]),
    ])
    expect(resultados.flat()).toEqual(['r1'])
    expect(await pendientesSheets(sql, 10)).toHaveLength(1)
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

  it('cambiarEstado con una lista vacía o con ids desconocidos no cambia nada', async () => {
    await repo.agregarRegistros([dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB')])
    expect(await repo.cambiarEstado([], 'anulado', 'p-carlos', '2026-10-27T15:00:00-05:00')).toBe(0)
    expect(await repo.cambiarEstado(['nope'], 'anulado', 'p-carlos', '2026-10-27T15:00:00-05:00')).toBe(0)
    expect((await repo.registroPorId('r1'))?.estado).toBe('por_confirmar')
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

  it('devuelve el registro completo tal como entró, con todos sus campos opcionales', async () => {
    const completo: Registro = {
      id: 'r-full',
      fechaHora: '2026-10-27T14:01:30-05:00',
      agenteId: 'p-andrea',
      origen: 'foto',
      estado: 'por_confirmar',
      propuesta: {
        tipo: 'movimiento',
        movimiento: { tipo: 'gasto', monto: 150_000, categoria: 'veterinaria', clinicaId: 'cl-general', abonoDeuda: false, foto: null, nota: 'Consulta' },
      },
      fraseExacta: 'pagué 150 mil en la clínica',
      confianza: 0.92,
      registroIaId: 'ia-9',
      mediaUrl: 'https://media.test/abc.jpg',
      compromisoId: 't-tob-anticonvulsivo@2026-10-27T14:00',
      confirmadoPor: 'p-admin',
      confirmadoEn: '2026-10-27T15:30:45-05:00',
    }
    await repo.agregarRegistros([completo])
    expect(await repo.registroPorId('r-full')).toStrictEqual(completo)
  })

  it('un registro sin campos opcionales vuelve sin esas claves', async () => {
    const minimo = dosis('r-min', '2026-10-27T14:01:00-05:00', 'TOB')
    await repo.agregarRegistros([minimo])
    expect(await repo.registroPorId('r-min')).toStrictEqual(minimo)
  })

  it('el día de un registro es el de Bogotá aunque llegue en UTC', async () => {
    // 03:30Z del 28 es las 22:30 del 27 en Bogotá
    await repo.agregarRegistros([dosis('r1', '2026-10-28T03:30:00Z', 'TOB')])
    expect((await repo.registrosDelDia('2026-10-27')).map((r) => r.id)).toEqual(['r1'])
    expect(await repo.registrosDelDia('2026-10-28')).toEqual([])
    expect((await repo.registroPorId('r1'))?.fechaHora).toBe('2026-10-27T22:30:00-05:00')
  })

  it('guarda las columnas tipadas de la bitácora', async () => {
    await repo.agregarRegistros([dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB', { confianza: 0.9, compromisoId: 'c-1', registroIaId: 'ia-1' })])
    const { rows } = await sql.query<Record<string, unknown>>(
      `SELECT dia::text AS dia, tipo, animal_id, confianza, compromiso_id, registro_ia_id, origen, estado FROM registros WHERE id = 'r1'`,
    )
    expect(rows).toEqual([{ dia: '2026-10-27', tipo: 'dosis', animal_id: 'TOB', confianza: 0.9, compromiso_id: 'c-1', registro_ia_id: 'ia-1', origen: 'audio', estado: 'por_confirmar' }])
  })
})

describe('PgRepo: cola de Sheets (outbox)', () => {
  it('encola una fila en Eventos por cada registro nuevo y ninguna por un id repetido', async () => {
    await repo.agregarRegistros([dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB'), dosis('r2', '2026-10-27T14:02:00-05:00', 'MAT')])
    await repo.agregarRegistros([dosis('r1', '2026-10-27T14:09:00-05:00', 'TOB'), dosis('r1', '2026-10-27T14:09:00-05:00', 'TOB')])

    const pendientes = await pendientesSheets(sql, 10)
    expect(pendientes.map((p) => [p.tab, p.operacion, p.fila['id'], p.intentos])).toEqual([
      ['Eventos', 'agregar', 'r1', 0],
      ['Eventos', 'agregar', 'r2', 0],
    ])
  })

  it('la fila encolada lleva el registro completo para que el cron lo escriba en Sheets', async () => {
    const r = dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB', { fraseExacta: 'ya le di el anticonvulsivo' })
    await repo.agregarRegistros([r])
    const [pendiente] = await pendientesSheets(sql, 10)
    expect(pendiente?.fila).toEqual(r)
    expect(pendiente?.creadoEn).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('cambiarEstado encola una fila de actualización por cada registro cambiado', async () => {
    await repo.agregarRegistros([dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB'), dosis('r2', '2026-10-27T14:02:00-05:00', 'TOB')])
    await repo.cambiarEstado(['r1', 'no-existe'], 'confirmado', 'p-carlos', '2026-10-27T15:00:00-05:00')

    const pendientes = await pendientesSheets(sql, 10)
    expect(pendientes.map((p) => p.operacion)).toEqual(['agregar', 'agregar', 'actualizar'])
    expect(pendientes[2]?.tab).toBe('Eventos')
    expect(pendientes[2]?.fila).toEqual({ id: 'r1', estado: 'confirmado', confirmadoPor: 'p-carlos', confirmadoEn: '2026-10-27T15:00:00-05:00' })
  })

  it('cambiarEstado sin registros que cambiar no encola nada', async () => {
    await repo.cambiarEstado(['nope'], 'anulado', 'p-carlos', '2026-10-27T15:00:00-05:00')
    expect(await pendientesSheets(sql, 10)).toEqual([])
  })

  it('Review Focus 5: los registros siguen visibles aunque nada vacíe la cola', async () => {
    await repo.agregarRegistros([dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB'), dosis('r2', '2026-10-27T14:02:00-05:00', 'TOB')])
    // Sheets caído: el cron nunca marca nada como enviado
    expect((await repo.registrosDelDia('2026-10-27')).map((r) => r.id)).toEqual(['r1', 'r2'])
    expect(await pendientesSheets(sql, 10)).toHaveLength(2)
  })

  it('pendientesSheets respeta el límite y el orden de llegada', async () => {
    await repo.agregarRegistros([dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB'), dosis('r2', '2026-10-27T14:02:00-05:00', 'TOB'), dosis('r3', '2026-10-27T14:03:00-05:00', 'TOB')])
    expect((await pendientesSheets(sql, 2)).map((p) => p.fila['id'])).toEqual(['r1', 'r2'])
  })

  it('marcarFallo suma un intento y deja la fila en la cola', async () => {
    await repo.agregarRegistros([dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB'), dosis('r2', '2026-10-27T14:02:00-05:00', 'TOB')])
    const [a] = await pendientesSheets(sql, 10)
    if (!a) throw new Error('falta la fila encolada')
    await marcarFallo(sql, [a.id])
    await marcarFallo(sql, [a.id])
    const despues = await pendientesSheets(sql, 10)
    expect(despues.map((p) => p.intentos)).toEqual([2, 0])
  })

  it('marcarEnviados saca de la cola solo esas filas', async () => {
    await repo.agregarRegistros([dosis('r1', '2026-10-27T14:01:00-05:00', 'TOB'), dosis('r2', '2026-10-27T14:02:00-05:00', 'TOB')])
    const [a] = await pendientesSheets(sql, 10)
    if (!a) throw new Error('falta la fila encolada')
    await marcarEnviados(sql, [a.id])
    expect((await pendientesSheets(sql, 10)).map((p) => p.fila['id'])).toEqual(['r2'])
    await marcarEnviados(sql, [])
    expect(await pendientesSheets(sql, 10)).toHaveLength(1)
    // Los registros no se tocan al vaciar la cola
    expect(await repo.registrosDelDia('2026-10-27')).toHaveLength(2)
  })
})

describe('PgRepo: personas, animales y configuración', () => {
  it('busca animales por código sin distinguir mayúsculas y por id', async () => {
    expect((await repo.animalPorCodigo('tob01'))?.nombre).toBe('Tobías')
    expect((await repo.animalPorCodigo('BRU01'))?.advertencias).toEqual(['No pisos lisos'])
    expect(await repo.animalPorCodigo('XXX99')).toBeNull()
    expect((await repo.animalPorId('LUN'))?.especie).toBe('gato')
    expect(await repo.animalPorId('XXX')).toBeNull()
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
    expect(await repo.personaPorId('nope')).toBeNull()

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

  it('crearPersona con un id que ya existe la reemplaza sin cambiar su lugar', async () => {
    await repo.crearPersona({ id: 'p-andrea', nombre: 'Andrea P.', cargo: 'Voluntaria', rol: 'bienestar', color: '#111', foto: null, telefono: '573001110001', activo: false })
    const todas = await repo.personas()
    expect(todas.map((p) => p.id)).toEqual(['p-andrea', 'p-carlos', 'p-admin'])
    expect(todas[0]?.nombre).toBe('Andrea P.')
    expect(todas[0]?.activo).toBe(false)
  })

  it('expone clínicas, configuración, base, catálogo y padrinos de la semilla', async () => {
    expect((await repo.clinicas()).map((c) => c.limite)).toEqual([3_000_000, 3_000_000])
    expect((await repo.config()).umbralAutoconfirmar).toBe(0.85)
    expect((await repo.configComida()).kgPorBulto).toEqual({ perro: 25, gato: 10 })
    expect((await repo.base()).vidasCambiadas).toBe(214)
    expect(await repo.catalogo()).toHaveLength(2)
    expect(await repo.padrinazgosActivos()).toHaveLength(1)
  })

  it('padrinazgosActivos deja fuera los inactivos', async () => {
    await sql.query(`UPDATE padrinazgos SET activo = false`)
    expect(await repo.padrinazgosActivos()).toEqual([])
  })

  it('devuelve exactamente lo que cargó la semilla', async () => {
    const s = semillaMini()
    expect(await repo.personas()).toStrictEqual(s.personas)
    expect(await repo.animales()).toStrictEqual(s.animales)
    expect(await repo.tratamientos()).toStrictEqual(s.tratamientos)
    expect(await repo.clinicas()).toStrictEqual(s.clinicas)
    expect(await repo.configComida()).toStrictEqual(s.configComida)
    expect(await repo.config()).toStrictEqual(s.config)
    expect(await repo.catalogo()).toStrictEqual(s.catalogo)
    expect(await repo.base()).toStrictEqual(s.base)
    expect(await repo.padrinazgosActivos()).toStrictEqual(s.padrinazgos)
  })

  it('una configuración corrupta falla con un error claro en vez de devolver basura', async () => {
    await sql.query(`UPDATE config SET value = '{"umbralPreguntar": "mucho"}'::jsonb WHERE key = 'servidor'`)
    await expect(repo.config()).rejects.toThrow(/config/i)
  })

  it('una fila con un valor fuera de lo permitido falla al leerla', async () => {
    await sql.query(`ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_rol_check`)
    await sql.query(`UPDATE personas SET rol = 'jefe' WHERE id = 'p-andrea'`)
    await expect(repo.personas()).rejects.toThrow(/rol/)
  })
})

describe('PgRepo: adopciones', () => {
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

  it('devuelve la solicitud completa tal como entró, con animal y llamada vacíos o llenos', async () => {
    await repo.guardarSolicitud({ ...solicitud, id: 's-a', animalId: null })
    await repo.guardarSolicitud({ ...solicitud, id: 's-b', llamadaAgendada: '2026-10-29T10:00:00-05:00', montonManual: 'rojo', paraQuien: 'regalo', dondeVivira: 'azotea', vivienda: 'apartamento' })
    expect(await repo.solicitudPorId('s-a')).toStrictEqual({ ...solicitud, id: 's-a', animalId: null })
    expect((await repo.solicitudPorId('s-b'))?.llamadaAgendada).toBe('2026-10-29T10:00:00-05:00')
    expect((await repo.solicitudes()).map((s) => s.id)).toEqual(['s-a', 's-b'])
  })

  it('el destinatario de una solicitud ("su mamá") sobrevive al guardar y leer', async () => {
    await repo.guardarSolicitud({ ...solicitud, id: 's-d', paraQuien: 'regalo', destinatario: 'su mamá' })
    expect((await repo.solicitudPorId('s-d'))?.destinatario).toBe('su mamá')
    expect(await repo.solicitudPorId('s-1')).toBeNull()
    await repo.guardarSolicitud(solicitud)
    expect(await repo.solicitudPorId('s-1')).not.toHaveProperty('destinatario')
  })

  it('un seguimiento con resultado rojo conserva llamadaHumana: true al leerlo', async () => {
    const [primero] = programarSeguimientos('s-1', { nombre: 'Ana', telefono: '573001234567' }, 'BRU', '2026-10-25')
    if (!primero) throw new Error('sin seguimientos')
    await repo.guardarSeguimiento(registrarResultado(primero, 'rojo'))
    const [leido] = await repo.seguimientos()
    expect(leido?.resultado).toBe('rojo')
    expect(leido?.llamadaHumana).toBe(true)
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
    expect(todos[0]?.dia).toBe(2)
    await repo.guardarSeguimiento({ ...seg, id: 'seg-2', solicitudId: null, dia: 90 })
    expect((await repo.seguimientos()).map((s) => [s.id, s.solicitudId, s.dia])).toEqual([
      ['seg-1', 's-1', 2],
      ['seg-2', null, 90],
    ])
  })
})

describe('sembrar', () => {
  it('no hace nada si las tablas ya tienen datos y no pisa lo cambiado', async () => {
    await repo.crearPersona({ id: 'p-nueva', nombre: 'Sofía', cargo: 'Voluntaria', rol: 'voluntario', color: '#000', foto: null })
    const cargada = await sembrar(sql, semillaMini())
    expect(cargada).toBe(false)
    expect(await repo.personas()).toHaveLength(4)
    expect(await repo.animales()).toHaveLength(4)
  })

  it('en una base vacía carga todo y avisa que cargó', async () => {
    await sql.query(`TRUNCATE ${TABLAS.join(', ')} RESTART IDENTITY`)
    expect(await sembrar(sql, semillaMini())).toBe(true)
    expect(await repo.animales()).toHaveLength(4)
    // la semilla no manda nada a Sheets: eso lo hace el script de carga
    expect(await pendientesSheets(sql, 10)).toEqual([])
  })

  it('carga también los registros, solicitudes y seguimientos opcionales de la semilla', async () => {
    await sql.query(`TRUNCATE ${TABLAS.join(', ')} RESTART IDENTITY`)
    const semilla = semillaMini()
    const registro = dosis('r-semilla', '2026-10-27T14:01:00-05:00', 'TOB', { estado: 'confirmado' })
    await sembrar(sql, { ...semilla, registros: [registro] })
    expect(await repo.registroPorId('r-semilla')).toStrictEqual(registro)
    expect(await pendientesSheets(sql, 10)).toEqual([])
  })
})

describe('sqlDesdePg', () => {
  it('acepta un Pool de pg', () => {
    const desdePool: (pool: Pool) => Sql = sqlDesdePg
    expect(typeof desdePool).toBe('function')
  })

  it('pasa el texto y los parámetros al pool y devuelve las filas', async () => {
    const llamadas: unknown[][] = []
    let cerrado = false
    const sqlPg = sqlDesdePg({
      query: async (texto: string, params?: unknown[]) => {
        llamadas.push([texto, params])
        return { rows: [{ n: 1 }] }
      },
      end: async () => {
        cerrado = true
      },
    })
    expect(await sqlPg.query('SELECT $1::int AS n', [1])).toEqual({ rows: [{ n: 1 }] })
    expect(llamadas).toEqual([['SELECT $1::int AS n', [1]]])
    await sqlPg.cerrar()
    expect(cerrado).toBe(true)
  })

  it('rechaza filas que no son objetos en vez de convertirlas a la fuerza', async () => {
    const sqlPg = sqlDesdePg({ query: async () => ({ rows: [42] }), end: async () => {} })
    await expect(sqlPg.query('SELECT 1')).rejects.toThrow(/fila/)
  })
})

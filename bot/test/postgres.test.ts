// Contra un Postgres real con db/sql/*.sql aplicados. Se salta si no hay TEST_DATABASE_URL.
// OJO: borra todo y vuelve a sembrar. Nunca apuntarla a la base de verdad.
import { execFileSync } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { crearPool, type Pool } from '../src/datos/db.js'
import { crearRepoPg, type RepoPg } from '../src/datos/repo-pg.js'
import { diasDeComida, dosisDeHoy, vacunasPorVencer } from '../src/datos/calculos.js'
import { pendientesDeHoy } from '../src/adopcion/seguimientos.js'
import { metaDelDia } from '../src/api/publico.js'

const URL_PRUEBA = process.env.TEST_DATABASE_URL

describe.skipIf(!URL_PRUEBA)('repositorio sobre Postgres', () => {
  let pool: Pool
  let repo: RepoPg
  const ahora = new Date()

  beforeAll(() => {
    execFileSync(process.execPath, ['--import', 'tsx', 'scripts/semilla.ts', '--borrar'], {
      env: { ...process.env, DATABASE_URL: URL_PRUEBA, EQUIPO: 'Don Luis:cuidador:573000000001,Andrea:bienestar:3000000002,Carolina:admin:573000000003' },
      stdio: 'pipe',
    })
    pool = crearPool(URL_PRUEBA!)
    repo = crearRepoPg(pool)
  }, 60_000)

  afterAll(() => pool?.end())

  it('encuentra a la persona por su número, escrito como sea', async () => {
    expect((await repo.usuarioPorTelefono('573000000001'))?.nombre).toBe('Don Luis')
    expect((await repo.usuarioPorTelefono('+57 300 000 0002'))?.nombre).toBe('Andrea')
    expect(await repo.usuarioPorTelefono('573119999999')).toBeNull()
  })

  it('el buzón guarda un mensaje una sola vez y lo cierra o lo deja para después', async () => {
    const m = { id: 'wamid.1', de: '573000000001', nombre: 'Luis', entrada: { tipo: 'texto' as const, texto: 'hola' } }
    const ahora = new Date()
    expect(await repo.guardarEntrante(m, ahora)).toBe(true)
    expect(await repo.guardarEntrante(m, ahora)).toBe(false)
    expect(await repo.entrantesPendientes(ahora, 10)).toMatchObject([{ ...m, intentos: 0 }])
    await repo.reintentarEntrante(m.id, new Date(ahora.getTime() + 60_000), 'sin red')
    expect(await repo.entrantesPendientes(ahora, 10)).toHaveLength(0)
    expect(await repo.entrantesPendientes(new Date(ahora.getTime() + 61_000), 10)).toMatchObject([{ intentos: 1 }])
    await repo.cerrarEntrante(m.id, 'atendido')
    expect(await repo.entrantesPendientes(new Date(ahora.getTime() + 61_000), 10)).toHaveLength(0)
  })

  it('guarda y lee el paso de la conversación', async () => {
    await repo.guardarEstado(1, { paso: 'plata_categoria', tipo: 'ingreso', monto: 50_000 })
    await repo.guardarEstado(1, { paso: 'comida_cantidad', especie: 'gato' })
    expect((await repo.leerEstado(1))?.estado).toEqual({ paso: 'comida_cantidad', especie: 'gato' })
  })

  it('/api/hoy trae la semilla en la forma del panel', async () => {
    const d = await repo.hoy(ahora)
    // 70 a cargo del refugio y 2 ya adoptados (los de los seguimientos)
    expect(d.animales).toHaveLength(72)
    expect(d.animales.filter((a) => a.estado !== 'adoptado')).toHaveLength(70)
    expect(d.clinicas.map((k) => k.deuda)).toEqual([1_550_000, 2_600_000])
    expect(d.porConfirmar.filter((p) => p.estado === 'pendiente')).toHaveLength(2)
    const tobias = d.animales.find((a) => a.nombre === 'Tobías')!
    expect(d.tratamientos.find((t) => t.animalId === tobias.id)).toMatchObject({ horas: ['14:00'], dosis: '1 pastilla' })
    expect(d.configComida.consumoDiarioKg.perro).toBeGreaterThan(0)
  })

  it('una dosis por audio: por confirmar, luego confirmada y visible como dada', async () => {
    const d = await repo.hoy(ahora)
    const tobias = d.animales.find((a) => a.nombre === 'Tobías')!
    const t = d.tratamientos.find((x) => x.animalId === tobias.id)!
    const id = await repo.crearRegistro({
      usuarioId: 1,
      canal: 'whatsapp',
      tipoEntrada: 'audio',
      mediaUrl: '/archivos/x.ogg',
      transcripcion: 'Le di el anticonvulsivo a Tobías',
      acciones: [{ tipo: 'dosis', animalId: tobias.id, tratamientoId: t.id, hora: '14:00' }],
      estado: 'por_confirmar',
    })

    let hoy = await repo.hoy(ahora)
    let x = dosisDeHoy(hoy, ahora).find((y) => y.tratamiento.id === t.id)!
    expect(x.dada).toBeNull()
    expect(x.reporte?.id).toBe(id)

    expect(await repo.cambiarEstado([id], 'confirmado')).toBe(1)
    hoy = await repo.hoy(ahora)
    x = dosisDeHoy(hoy, ahora).find((y) => y.tratamiento.id === t.id)!
    expect(x.dada).toMatchObject({ hora: '14:00', quien: '1', origen: 'bot' })
    // Confirmar dos veces no hace nada
    expect(await repo.cambiarEstado([id], 'confirmado')).toBe(0)
  })

  it('un bulto que se anula deja de contar en la bodega', async () => {
    const antes = (await repo.hoy(ahora)).inventario.length
    const id = await repo.crearRegistro({
      usuarioId: 1,
      canal: 'whatsapp',
      tipoEntrada: 'boton',
      transcripcion: 'Abrí un bulto de perro',
      acciones: [{ tipo: 'inventario', especie: 'perro', cambio: -1 }],
      estado: 'por_confirmar',
    })
    await repo.cambiarEstado([id], 'confirmado')
    expect((await repo.hoy(ahora)).inventario).toHaveLength(antes + 1)
    await repo.cambiarEstado([id], 'anulado')
    expect((await repo.hoy(ahora)).inventario).toHaveLength(antes)
    // Lo anulado no revive
    expect(await repo.cambiarEstado([id], 'confirmado')).toBe(0)
  })

  it('15 kilos de carne: se guardan en kilos, llegan también en bultos equivalentes y alargan los días de comida', async () => {
    const antes = await repo.hoy(ahora)
    const diasAntes = diasDeComida(antes, 'perro')
    const kgPorBulto = antes.configComida.kgPorBulto.perro
    // El ítem en kilos no cambia lo que pesa un bulto
    expect(kgPorBulto).toBe(25)
    const id = await repo.crearRegistro({
      usuarioId: 1, canal: 'whatsapp', tipoEntrada: 'audio', transcripcion: 'llegaron 15 kilos de carne', estado: 'por_confirmar',
      acciones: [{ tipo: 'inventario', especie: 'perro', cambio: 15, unidad: 'kg', producto: 'carne' }],
    })
    await repo.cambiarEstado([id], 'confirmado')
    const d = await repo.hoy(ahora)
    const carne = d.inventario.find((m) => m.unidad === 'kg')!
    expect(carne).toMatchObject({ tipo: 'perro', kg: 15, unidad: 'kg', cambio: 15 / kgPorBulto })
    expect(diasDeComida(d, 'perro') - diasAntes).toBeCloseTo(15 / d.configComida.consumoDiarioKg.perro, 5)
    const fila = await pool.query(
      `SELECT m.cantidad, c.unidad FROM inventario_movimientos m JOIN catalogo_items c ON c.id = m.item_id WHERE m.registro_id = $1`,
      [id],
    )
    expect(fila.rows).toEqual([{ cantidad: 15, unidad: 'kg' }])
  })

  it('seguimientos: las adopciones entregadas salen el día que toca; anotar una llamada la quita y se puede volver a anotar', async () => {
    const hoy = pendientesDeHoy(await repo.seguimientosAdopcion(), ahora)
    expect(hoy.map((s) => [s.animalNombre, s.dia, s.adoptanteNombre, s.adoptanteTelefono])).toEqual([
      ['Firulais', 5, 'Juan Gómez', '573115550101'],
      ['Canelita', 30, 'María López', '573105550202'],
    ])
    const firulais = hoy[0]
    expect(await repo.registrarSeguimiento(firulais.adopcionId, 5, 'amarillo', 1, ahora)).toBe(true)
    // Se corrige el resultado: no duplica la fila
    expect(await repo.registrarSeguimiento(firulais.adopcionId, 5, 'verde', 1, ahora)).toBe(true)
    const despues = await repo.seguimientosAdopcion()
    expect(despues.find((s) => s.adopcionId === firulais.adopcionId && s.dia === 5)).toMatchObject({ resultado: 'verde', llamadaHumana: false })
    expect(pendientesDeHoy(despues, ahora).map((s) => s.animalNombre)).toEqual(['Canelita'])
    const filas = await pool.query(`SELECT riesgo, programado_para FROM checkins WHERE adopcion_id = $1 AND dia = 5`, [firulais.adopcionId])
    expect(filas.rows).toEqual([{ riesgo: 'verde', programado_para: firulais.fecha }])
    expect(await repo.registrarSeguimiento('99999999', 5, 'verde', 1, ahora)).toBe(false)
    expect(await repo.registrarSeguimiento('no-es-id', 5, 'verde', 1, ahora)).toBe(false)
  })

  it('vacunas: llega la última de cada una y la alerta de la semana trae la de Rocky y la vencida de Kira', async () => {
    const d = await repo.hoy(ahora)
    expect(d.vacunas).toHaveLength(3)
    expect(vacunasPorVencer(d, ahora).map((v) => [v.animal, v.vencida])).toEqual([
      ['Kira', true],
      ['Rocky', false],
    ])
  })

  it('la meta del día sale de config (por defecto 25 kg y $150.000) y los kilos de hoy cuentan como recaudado', async () => {
    const d = await repo.hoy(ahora)
    expect(d.metaDelDia).toEqual({ kg: 25, pesos: 150_000 })
    // Los 15 kg de carne confirmados en la prueba de kilos son de hoy
    expect(metaDelDia(d, ahora).recaudadoKg).toBeGreaterThanOrEqual(15)
    expect(JSON.stringify(metaDelDia(d, ahora))).not.toMatch(/Don Luis|Andrea|Carolina/)
  })

  it('el resumen de la mañana se reclama una sola vez por día', async () => {
    expect(await repo.reclamarDia('prueba_dia', '2026-10-27')).toBe(true)
    expect(await repo.reclamarDia('prueba_dia', '2026-10-27')).toBe(false)
    expect(await repo.reclamarDia('prueba_dia', '2026-10-26')).toBe(false)
    expect(await repo.reclamarDia('prueba_dia', '2026-10-28')).toBe(true)
  })

  it('una factura con foto sube la deuda de la clínica al confirmarse', async () => {
    const d = await repo.hoy(ahora)
    const k = d.clinicas[0]
    const id = await repo.crearRegistro({
      usuarioId: 3,
      canal: 'whatsapp',
      tipoEntrada: 'imagen',
      mediaUrl: '/archivos/factura.jpg',
      transcripcion: 'Factura',
      acciones: [{ tipo: 'deuda', clinicaId: k.id, monto: 320_000, nota: 'Consulta' }],
      estado: 'por_confirmar',
    })
    await repo.cambiarEstado([id], 'confirmado')
    expect((await repo.hoy(ahora)).clinicas[0].deuda).toBe(k.deuda + 320_000)
    const soporte = await pool.query(`SELECT soporte_url FROM movimientos_financieros WHERE registro_id = $1`, [id])
    expect(soporte.rows[0].soporte_url).toBe('/archivos/factura.jpg')
  })

  it('el panel reenvía el mismo uuid y no se duplica', async () => {
    const uuid = '0b9f5d3e-4c1a-4e2b-9a7f-1d2c3b4a5e6f'
    const r = {
      usuarioId: 3,
      canal: 'panel' as const,
      tipoEntrada: 'boton' as const,
      transcripcion: 'Registrado en el panel',
      acciones: [{ tipo: 'movimiento' as const, movimiento: { tipo: 'ingreso' as const, monto: 40_000, categoria: 'padrino' as const, clinicaId: null, abonoDeuda: false, foto: null, nota: '' } }],
      estado: 'confirmado' as const,
      clienteId: uuid,
    }
    const a = await repo.crearRegistro(r)
    const b = await repo.crearRegistro(r)
    expect(a).toBe(b)
    const n = await pool.query(`SELECT count(*)::int AS n FROM movimientos_financieros WHERE registro_id = $1`, [a])
    expect(n.rows[0].n).toBe(1)
    // "Deshacer" del panel con el mismo uuid
    expect(await repo.cambiarEstado([uuid], 'anulado')).toBe(1)
  })

  it('un cambio de estado desde la ficha se aplica, queda en el historial y se deshace', async () => {
    const tobias = (await repo.hoy(ahora)).animales.find((a) => a.nombre === 'Tobías')!
    const uuid = '7c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f'
    await repo.crearRegistro({
      usuarioId: 2,
      canal: 'panel',
      tipoEntrada: 'boton',
      transcripcion: 'Registrado en el panel',
      acciones: [{ tipo: 'estado_animal', animalId: tobias.id, estado: 'adoptable' }],
      estado: 'confirmado',
      clienteId: uuid,
    })
    const estadoDe = async () => (await repo.hoy(ahora)).animales.find((a) => a.id === tobias.id)!.estado
    expect(await estadoDe()).toBe('adoptable')
    const h = await pool.query(`SELECT estado_anterior, estado_nuevo FROM historial_estados WHERE animal_id = $1`, [tobias.id])
    expect(h.rows.at(-1)).toEqual({ estado_anterior: tobias.estado, estado_nuevo: 'adoptable' })

    expect(await repo.cambiarEstado([uuid], 'anulado')).toBe(1)
    expect(await estadoDe()).toBe(tobias.estado)
  })

  it('si una acción apunta a algo que no existe, no se guarda nada del registro', async () => {
    const antes = await pool.query(`SELECT count(*)::int AS n FROM registros_ia`)
    await expect(
      repo.crearRegistro({
        usuarioId: 1,
        canal: 'whatsapp',
        tipoEntrada: 'audio',
        transcripcion: 'x',
        acciones: [
          { tipo: 'inventario', especie: 'perro', cambio: -1 },
          { tipo: 'dosis', animalId: '1', tratamientoId: '99999', hora: '08:00' },
        ],
        estado: 'por_confirmar',
      }),
    ).rejects.toThrow()
    const despues = await pool.query(`SELECT count(*)::int AS n FROM registros_ia`)
    expect(despues.rows[0].n).toBe(antes.rows[0].n)
  })

  it('las sesiones del panel identifican a la persona', async () => {
    const token = await repo.crearSesion(3)
    expect((await repo.usuarioPorSesion(token))?.nombre).toBe('Carolina')
    expect(await repo.usuarioPorSesion('inventado')).toBeNull()
  })

  it('reconoce los recibos de plata y quién los subió; un audio de nota no es recibo', async () => {
    const luis = (await repo.usuarioPorTelefono('573000000001'))!
    const gastoPanel = { tipo: 'gasto' as const, monto: 1000, categoria: 'comida' as const, clinicaId: null, abonoDeuda: false, foto: '/archivos/recibo-pg.jpg', nota: '' }
    await repo.crearRegistro({ usuarioId: luis.id, canal: 'panel', tipoEntrada: 'boton', transcripcion: 'x', estado: 'confirmado', acciones: [{ tipo: 'movimiento', movimiento: gastoPanel }] })
    await repo.crearRegistro({ usuarioId: luis.id, canal: 'whatsapp', tipoEntrada: 'audio', transcripcion: 'nota', estado: 'por_confirmar', mediaUrl: '/archivos/nota-pg.ogg', acciones: [{ tipo: 'nota', animalId: String((await pool.query(`SELECT min(id) AS id FROM animales`)).rows[0].id), texto: 'comió' }] })
    expect(await repo.duenoDeRecibo('/archivos/recibo-pg.jpg')).toEqual({ usuarioId: luis.id })
    expect(await repo.duenoDeRecibo('/archivos/nota-pg.ogg')).toBeNull()
    expect(await repo.duenoDeRecibo('/archivos/no-existe.jpg')).toBeNull()

    // leerRegistro también lo encuentra por el uuid del panel (lo usa el permiso de /api/eventos/estado)
    const uuid = '0b9f5d3e-4c1a-4e2b-9a7f-00000000abcd'
    const id = await repo.crearRegistro({ usuarioId: luis.id, canal: 'panel', tipoEntrada: 'boton', transcripcion: 'x', estado: 'confirmado', clienteId: uuid, acciones: [{ tipo: 'movimiento', movimiento: { ...gastoPanel, foto: null } }] })
    expect((await repo.leerRegistro(uuid))?.id).toBe(id)
    expect(await repo.leerRegistro('no-es-id')).toBeNull()
  })

  it('solicitudes de adopción: una por clave, lo humano no se pisa y la persona queda como adoptante', async () => {
    const animal = String((await pool.query(`SELECT min(id) AS id FROM animales`)).rows[0].id)
    const respuestas = {
      nombre: 'Laura Gómez', telefono: '300 555 1234', cedula: '1020304050', direccion: 'Cra 10 # 20-30', animalId: animal,
      familiaDeAcuerdo: true, paraQuien: 'yo' as const, vivienda: 'apartamento' as const, viviendaConMallas: true,
      dondeVivira: 'dentro_casa' as const, aceptaEsterilizar: true, aceptaVacunar: true, aceptaSeguimiento: true,
      quiereEntregaInmediata: false, preguntoPorCaracter: true, planEmergencia: 'Mi hermana', mascotasAnteriores: 'Una perrita', motivo: 'Compañía',
    }
    const nueva = { origen: 'formulario' as const, claveOrigen: 'formulario:pg-1', respuestas }
    const a = await repo.guardarSolicitudAdopcion(nueva, ahora)
    expect(a.nueva).toBe(true)
    expect(await repo.cambiarSolicitudAdopcion(a.id, { montonManual: 'amarillo', nota: 'llamar el jueves' })).toBe(true)
    expect(await repo.guardarSolicitudAdopcion({ ...nueva, respuestas: { ...respuestas, motivo: 'Otro motivo' } }, ahora)).toEqual({ id: a.id, nueva: false })

    const guardadas = (await repo.solicitudesAdopcion()).filter((s) => s.id === a.id)
    expect(guardadas).toHaveLength(1)
    expect(guardadas[0]).toMatchObject({
      nombre: 'Laura Gómez', cedula: '1020304050', animalId: animal, motivo: 'Otro motivo', origen: 'formulario',
      montonManual: 'amarillo', nota: 'llamar el jueves', llamadaAgendada: null, visitaPropuesta: null,
    })
    const p = await pool.query(`SELECT es_adoptante FROM personas WHERE telefono = '573005551234'`)
    expect(p.rows).toEqual([{ es_adoptante: true }])
    expect(await repo.cambiarSolicitudAdopcion('999999999', { nota: 'x' })).toBe(false)

    // Del agente, sin teléfono (web) y con un animal que no existe: queda sin animal, con su visita propuesta
    const web = await repo.guardarSolicitudAdopcion(
      { origen: 'agente', claveOrigen: 'web:pg-sesion', respuestas: { ...respuestas, telefono: '', animalId: '99999999' }, visitaPropuesta: new Date('2026-10-31T15:00:00Z'), puntajeIdoneidad: 80, puntajeRiesgo: 30 },
      ahora,
    )
    const delAgente = (await repo.solicitudesAdopcion()).find((s) => s.id === web.id)
    expect(delAgente).toMatchObject({ origen: 'agente', animalId: null, visitaEstado: 'propuesta', visitaPropuesta: '2026-10-31T15:00:00.000Z', puntajeIdoneidad: 80 })
  })
})

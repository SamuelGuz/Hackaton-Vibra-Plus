// Contra un Postgres real con db/sql/*.sql aplicados. Se salta si no hay TEST_DATABASE_URL.
// OJO: borra todo y vuelve a sembrar. Nunca apuntarla a la base de verdad.
import { execFileSync } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { crearPool, type Pool } from '../src/datos/db.js'
import { crearRepoPg, type RepoPg } from '../src/datos/repo-pg.js'
import { dosisDeHoy } from '../src/datos/calculos.js'

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

  it('un mensaje de Meta se marca una sola vez', async () => {
    expect(await repo.marcarMensaje('wamid.1')).toBe(true)
    expect(await repo.marcarMensaje('wamid.1')).toBe(false)
  })

  it('guarda y lee el paso de la conversación', async () => {
    await repo.guardarEstado(1, { paso: 'plata_categoria', tipo: 'ingreso', monto: 50_000 })
    await repo.guardarEstado(1, { paso: 'comida_cantidad', especie: 'gato' })
    expect((await repo.leerEstado(1))?.estado).toEqual({ paso: 'comida_cantidad', especie: 'gato' })
  })

  it('/api/hoy trae la semilla en la forma del panel', async () => {
    const d = await repo.hoy(ahora)
    expect(d.animales).toHaveLength(70)
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
})

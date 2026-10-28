import { describe, expect, it } from 'vitest'
import { crearDatosDemo } from '../data/demo'
import {
  cambiarEstado,
  confirmarDosisReportada,
  confirmarPorConfirmar,
  darDosis,
  descartarPorConfirmar,
  deshacer,
  moverBultos,
  registrarMovimiento,
} from './acciones'
import { bultosEnBodega, dosisDeHoy, plataEnCaja } from './calculos'

const AHORA = new Date(2026, 9, 27, 9, 30)

describe('moverBultos', () => {
  it('abrir un bulto lo descuenta de la bodega y queda a nombre de quien lo tocó', () => {
    const antes = crearDatosDemo(AHORA)
    const { datos, id } = moverBultos(antes, 'perro', -1, 'p-luis', AHORA)
    expect(bultosEnBodega(datos, 'perro')).toBe(bultosEnBodega(antes, 'perro') - 1)
    expect(datos.inventario.find((m) => m.id === id)).toMatchObject({
      tipo: 'perro',
      cambio: -1,
      quien: 'p-luis',
      origen: 'panel',
      fechaHora: '2026-10-27T09:30',
    })
  })

  it('deshacer lo devuelve a como estaba', () => {
    const antes = crearDatosDemo(AHORA)
    const { datos, id } = moverBultos(antes, 'gato', 4, 'p-luis', AHORA)
    expect(bultosEnBodega(datos, 'gato')).toBe(7)
    expect(bultosEnBodega(deshacer(datos, id), 'gato')).toBe(3)
  })
})

describe('darDosis', () => {
  it('marca la dosis de hoy como dada, con hora y quién', () => {
    const antes = crearDatosDemo(AHORA)
    const { datos, id } = darDosis(antes, 't-2', '08:00', 'p-luis', AHORA)
    const dosis = dosisDeHoy(datos, AHORA).find((d) => d.tratamiento.id === 't-2')!
    expect(dosis.estado).toBe('dada')
    expect(dosis.dada).toMatchObject({ id, quien: 'p-luis', fechaHora: '2026-10-27T09:30' })
    expect(dosisDeHoy(deshacer(datos, id), AHORA).find((d) => d.tratamiento.id === 't-2')!.estado).toBe('atrasada')
  })
})

describe('dosis reportadas por el bot', () => {
  it('una dosis que llegó por audio sin confirmar aparece como reportada, no como pendiente de dar', () => {
    const datos = crearDatosDemo(AHORA)
    const mateo = dosisDeHoy(datos, AHORA).find((d) => d.tratamiento.id === 't-1' && d.hora === '08:00')!
    expect(mateo.reporte).toMatchObject({ id: 'c-1', quien: 'p-luis' })
  })

  it('confirmarla registra la dosis con la hora y la persona del audio, y la saca de la bandeja', () => {
    const antes = crearDatosDemo(AHORA)
    const datos = confirmarDosisReportada(antes, 'c-1', 't-1', '08:00')
    const mateo = dosisDeHoy(datos, AHORA).find((d) => d.tratamiento.id === 't-1' && d.hora === '08:00')!
    expect(mateo.estado).toBe('dada')
    expect(mateo.dada).toMatchObject({ quien: 'p-luis', origen: 'bot', fechaHora: antes.porConfirmar[0].fechaHora })
    expect(mateo.reporte).toBeNull()
    // El resto del audio (la nota y el bulto) sigue esperando confirmación
    const item = datos.porConfirmar.find((p) => p.id === 'c-1')!
    expect(item.estado).toBe('pendiente')
    expect(item.propuestas.map((p) => p.tipo)).toEqual(['nota', 'inventario'])
  })
})

describe('registrarMovimiento', () => {
  it('un gasto sale de la caja', () => {
    const antes = crearDatosDemo(AHORA)
    const datos = registrarMovimiento(
      antes,
      { tipo: 'gasto', monto: 150_000, categoria: 'limpieza', clinicaId: null, abonoDeuda: false, foto: null, nota: '' },
      'p-carolina',
      AHORA,
    )
    expect(plataEnCaja(datos)).toBe(plataEnCaja(antes) - 150_000)
    expect(datos.movimientos.at(-1)).toMatchObject({ quien: 'p-carolina', fechaHora: '2026-10-27T09:30' })
  })

  it('un abono a la clínica sale de la caja y baja la deuda con esa clínica', () => {
    const antes = crearDatosDemo(AHORA)
    const datos = registrarMovimiento(
      antes,
      { tipo: 'gasto', monto: 600_000, categoria: 'veterinaria', clinicaId: 'cl-24h', abonoDeuda: true, foto: null, nota: '' },
      'p-carolina',
      AHORA,
    )
    expect(plataEnCaja(datos)).toBe(plataEnCaja(antes) - 600_000)
    expect(datos.clinicas.find((c) => c.id === 'cl-24h')!.deuda).toBe(2_000_000)
    expect(datos.clinicas.find((c) => c.id === 'cl-general')!.deuda).toBe(1_550_000)
  })
})

describe('bandeja Por confirmar', () => {
  it('confirmar el audio de Don Luis guarda la dosis, la nota y el bulto', () => {
    const antes = crearDatosDemo(AHORA)
    const item = antes.porConfirmar.find((p) => p.id === 'c-1')!
    const datos = confirmarPorConfirmar(antes, 'c-1', item.propuestas)
    expect(datos.porConfirmar.find((p) => p.id === 'c-1')!.estado).toBe('confirmado')
    expect(dosisDeHoy(datos, AHORA).find((d) => d.tratamiento.id === 't-1' && d.hora === '08:00')!.estado).toBe('dada')
    expect(bultosEnBodega(datos, 'perro')).toBe(bultosEnBodega(antes, 'perro') - 1)
    expect(datos.notas.at(-1)).toMatchObject({ animalId: 'perro-1', texto: 'Ya camina solito.', quien: 'p-luis' })
  })

  it('confirmar una captura de Nequi suma a la caja', () => {
    const antes = crearDatosDemo(AHORA)
    const item = antes.porConfirmar.find((p) => p.id === 'c-2')!
    expect(plataEnCaja(confirmarPorConfirmar(antes, 'c-2', item.propuestas))).toBe(plataEnCaja(antes) + 150_000)
  })

  it('confirmar una factura a crédito sube la deuda con la clínica, no toca la caja', () => {
    const antes = crearDatosDemo(AHORA)
    const item = antes.porConfirmar.find((p) => p.id === 'c-3')!
    const datos = confirmarPorConfirmar(antes, 'c-3', item.propuestas)
    expect(datos.clinicas.find((c) => c.id === 'cl-24h')!.deuda).toBe(2_920_000)
    expect(plataEnCaja(datos)).toBe(plataEnCaja(antes))
  })

  it('si se corrige, se guarda lo corregido y queda marcado como corregido', () => {
    const antes = crearDatosDemo(AHORA)
    const item = antes.porConfirmar.find((p) => p.id === 'c-1')!
    const soloBulto = item.propuestas.filter((p) => p.tipo === 'inventario')
    const datos = confirmarPorConfirmar(antes, 'c-1', soloBulto)
    expect(datos.porConfirmar.find((p) => p.id === 'c-1')!.estado).toBe('corregido')
    expect(dosisDeHoy(datos, AHORA).find((d) => d.tratamiento.id === 't-1' && d.hora === '08:00')!.estado).not.toBe('dada')
  })

  it('descartar no guarda nada', () => {
    const antes = crearDatosDemo(AHORA)
    const datos = descartarPorConfirmar(antes, 'c-2')
    expect(datos.porConfirmar.find((p) => p.id === 'c-2')!.estado).toBe('descartado')
    expect(plataEnCaja(datos)).toBe(plataEnCaja(antes))
  })
})

describe('cambiarEstado', () => {
  it('cambia el estado del animal', () => {
    const datos = cambiarEstado(crearDatosDemo(AHORA), 'perro-9', 'adoptable')
    expect(datos.animales.find((a) => a.id === 'perro-9')!.estado).toBe('adoptable')
  })
})

describe('ids sin conexión segura', () => {
  it('funciona en el celular por http en la red local, donde no existe crypto.randomUUID', () => {
    const original = crypto.randomUUID
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
    try {
      const antes = crearDatosDemo(AHORA)
      const a = moverBultos(antes, 'perro', -1, 'p-luis', AHORA)
      const b = moverBultos(a.datos, 'perro', -1, 'p-luis', AHORA)
      expect(a.id).toBeTruthy()
      expect(b.id).not.toBe(a.id)
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true })
    }
  })
})

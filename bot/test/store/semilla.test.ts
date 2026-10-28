import { describe, expect, it } from 'vitest'
import { HOJAS } from '../../src/store/hojas'
import {
  filaAAnimal,
  filaAClinica,
  filaAItem,
  filaAPadrinazgo,
  filaAPersona,
  filaATratamiento,
  filasAConfig,
  sinEncabezado,
} from '../../src/store/mappers'
import { MemoryRepo } from '../../src/store/memory-repo'
import { cargarSemilla, generarSemilla, semillaAFilas } from '../../src/store/semilla'

const semilla = generarSemilla()

describe('generarSemilla: animales', () => {
  it('genera 70 animales: 45 perros y 25 gatos', () => {
    expect(semilla.animales).toHaveLength(70)
    expect(semilla.animales.filter((a) => a.especie === 'perro')).toHaveLength(45)
    expect(semilla.animales.filter((a) => a.especie === 'gato')).toHaveLength(25)
  })

  it('los códigos son únicos y tienen la forma AAA00; los ids también son únicos', () => {
    const codigos = semilla.animales.map((a) => a.codigo)
    expect(new Set(codigos).size).toBe(70)
    for (const c of codigos) expect(c).toMatch(/^[A-Z]{3}\d{2}$/)
    expect(new Set(semilla.animales.map((a) => a.id)).size).toBe(70)
  })

  it('están Mateo, Bruno, Tobías, Luna y Manchas, con sus códigos y advertencias', () => {
    const por = (nombre: string) => semilla.animales.find((a) => a.nombre === nombre)
    expect(por('Tobías')?.codigo).toBe('TOB01')
    expect(por('Mateo')?.codigo).toBe('MAT01')
    expect(por('Bruno')?.codigo).toBe('BRU01')
    expect(por('Luna')?.codigo).toBe('LUN01')
    expect(por('Manchas')?.codigo).toBe('MAN01')
    for (const n of ['Tobías', 'Mateo', 'Bruno', 'Luna', 'Manchas']) {
      expect(por(n)?.advertencias.length, `${n} sin advertencias`).toBeGreaterThan(0)
    }
    expect(por('Bruno')?.advertencias.join(' ')).toContain('NO pisos lisos')
    expect(por('Tobías')?.alias).toEqual(['Tobi'])
    expect(por('Luna')?.especie).toBe('gato')
  })

  it('Max y Manchas son animales distintos (nombres parecidos de los evals)', () => {
    const nombres = semilla.animales.map((a) => a.nombre)
    expect(nombres).toContain('Max')
    expect(nombres).toContain('Manchas')
  })

  it('es determinista: dos llamadas dan exactamente lo mismo', () => {
    expect(generarSemilla()).toEqual(semilla)
  })

  it('con un n menor conserva a los cinco de los casos y respeta la proporción', () => {
    const chica = generarSemilla(20)
    expect(chica.animales).toHaveLength(20)
    for (const codigo of ['TOB01', 'MAT01', 'BRU01', 'LUN01', 'MAN01']) {
      expect(chica.animales.map((a) => a.codigo)).toContain(codigo)
    }
    expect(new Set(chica.animales.map((a) => a.codigo)).size).toBe(20)
    const ids = new Set(chica.animales.map((a) => a.id))
    expect(chica.tratamientos.every((t) => ids.has(t.animalId))).toBe(true)
    expect(chica.padrinazgos.every((p) => ids.has(p.animalId))).toBe(true)
  })

  it('un n mayor que 70 lanza un error (no hay nombres para más)', () => {
    expect(() => generarSemilla(71)).toThrow('70')
  })
})

describe('generarSemilla: tratamientos, clínicas, catálogo y equipo', () => {
  it('3 tratamientos activos, uno solo crítico: el anticonvulsivo de Tobías a las 02:00 y 14:00', () => {
    expect(semilla.tratamientos).toHaveLength(3)
    expect(semilla.tratamientos.every((t) => t.activo === true)).toBe(true)
    const criticos = semilla.tratamientos.filter((t) => t.critico === true)
    expect(criticos).toHaveLength(1)

    const tobias = semilla.animales.find((a) => a.nombre === 'Tobías')
    expect(criticos[0]?.animalId).toBe(tobias?.id)
    expect(criticos[0]?.medicamento).toBe('Anticonvulsivo')
    expect(criticos[0]?.horas).toEqual(['02:00', '14:00'])
    for (const t of semilla.tratamientos) expect(semilla.animales.some((a) => a.id === t.animalId)).toBe(true)
  })

  it('2 clínicas con los ids de la demo del panel; la deuda total (base + registros) está entre 3.800.000 y 4.200.000', () => {
    expect(semilla.clinicas.map((c) => c.id)).toEqual(['cl-general', 'cl-24h'])
    // Decisión documentada: la deuda vive en la base de cada clínica y la semilla no trae registros de deuda ni abonos.
    const deudaBase = semilla.clinicas.reduce((suma, c) => suma + c.deuda, 0)
    const deudaRegistros = (semilla.registros ?? []).reduce((suma, r) => {
      if (r.propuesta.tipo === 'deuda') return suma + r.propuesta.monto
      if (r.propuesta.tipo === 'movimiento' && r.propuesta.movimiento.abonoDeuda) return suma - r.propuesta.movimiento.monto
      return suma
    }, 0)
    const total = deudaBase + deudaRegistros
    expect(total).toBeGreaterThanOrEqual(3_800_000)
    expect(total).toBeLessThanOrEqual(4_200_000)
    expect(semilla.registros ?? []).toEqual([])
    for (const c of semilla.clinicas) expect(c.limite).toBeGreaterThan(c.deuda)
  })

  it('catálogo: perro 25 kg con 0,375 kg/día y gato 10 kg con 0,065 kg/día', () => {
    const perro = semilla.catalogo.find((i) => i.especieObjetivo === 'perro')
    const gato = semilla.catalogo.find((i) => i.especieObjetivo === 'gato')
    expect(perro).toMatchObject({ kgPorUnidad: 25, consumoDiarioKgPorAnimal: 0.375 })
    expect(gato).toMatchObject({ kgPorUnidad: 10, consumoDiarioKgPorAnimal: 0.065 })
    expect(semilla.configComida.kgPorBulto).toEqual({ perro: 25, gato: 10 })
    expect(semilla.configComida.consumoDiarioKg.perro).toBeCloseTo(45 * 0.375, 9)
    expect(semilla.configComida.consumoDiarioKg.gato).toBeCloseTo(25 * 0.065, 9)
    expect(semilla.configComida.diasUrgente).toBe(4)
    expect(semilla.config).toMatchObject({ umbralPreguntar: 0.7, umbralAutoconfirmar: 0.85, minutosAutoconfirmar: 30, diasAlertaComida: 4 })
  })

  it('el equipo trae los ids de la demo del panel, cada uno con teléfono E.164 sin + y activo', () => {
    const ids = semilla.personas.map((p) => p.id)
    for (const id of ['p-luis', 'p-andres', 'p-carolina', 'p-marcela']) expect(ids).toContain(id)
    for (const p of semilla.personas) {
      expect(p.telefono, p.id).toMatch(/^57\d{10}$/)
      expect(p.activo, p.id).toBe(true)
    }
    expect(new Set(semilla.personas.map((p) => p.telefono)).size).toBe(semilla.personas.length)
    expect(semilla.personas.find((p) => p.id === 'p-carolina')?.rol).toBe('admin')
    expect(semilla.personas.find((p) => p.id === 'p-marcela')?.rol).toBe('adopciones')
  })

  it('hay padrinazgos activos de animales que existen', () => {
    expect(semilla.padrinazgos.length).toBeGreaterThanOrEqual(3)
    for (const p of semilla.padrinazgos) {
      expect(p.activo).toBe(true)
      expect(semilla.animales.some((a) => a.id === p.animalId)).toBe(true)
    }
  })

  it('sirve para arrancar un MemoryRepo', async () => {
    const repo = new MemoryRepo(semilla)
    expect(await repo.animales()).toHaveLength(70)
    expect((await repo.animalPorCodigo('tob01'))?.nombre).toBe('Tobías')
    expect((await repo.tratamientos()).filter((t) => t.critico)).toHaveLength(1)
    expect(await repo.clinicas()).toHaveLength(2)
    expect((await repo.personaPorTelefono('573001110001'))?.id).toBeTruthy()
    expect(await repo.padrinazgosActivos()).toHaveLength(semilla.padrinazgos.length)
  })
})

describe('semillaAFilas', () => {
  const filas = semillaAFilas(semilla)

  it('trae todas las pestañas de HOJAS y cada fila tiene la misma longitud que su header', () => {
    expect(Object.keys(filas).sort()).toEqual(Object.keys(HOJAS).sort())
    for (const [tab, lista] of Object.entries(filas)) {
      for (const fila of lista) expect(fila, `fila de ${tab}`).toHaveLength(HOJAS[tab]?.length ?? -1)
    }
  })

  it('una fila por cada animal, tratamiento, persona, clínica, ítem y padrinazgo', () => {
    expect(filas.Animales).toHaveLength(70)
    expect(filas.Tratamientos).toHaveLength(3)
    expect(filas.Usuarios).toHaveLength(semilla.personas.length)
    expect(filas.Entidades).toHaveLength(2)
    expect(filas.Catalogo).toHaveLength(semilla.catalogo.length)
    expect(filas.Padrinazgos).toHaveLength(semilla.padrinazgos.length)
    expect(filas.Eventos).toHaveLength(0)
  })

  it('las filas se leen de vuelta como los mismos objetos de la semilla', () => {
    expect((filas.Animales ?? []).map(filaAAnimal)).toEqual(semilla.animales)
    expect((filas.Tratamientos ?? []).map(filaATratamiento)).toEqual(semilla.tratamientos)
    expect((filas.Usuarios ?? []).map(filaAPersona)).toEqual(semilla.personas)
    expect((filas.Entidades ?? []).map(filaAClinica)).toEqual(semilla.clinicas)
    expect((filas.Catalogo ?? []).map(filaAItem)).toEqual(semilla.catalogo)
    expect((filas.Padrinazgos ?? []).map(filaAPadrinazgo)).toEqual(semilla.padrinazgos)
    expect(filasAConfig(filas.Config ?? [])).toEqual({ config: semilla.config, configComida: semilla.configComida, base: semilla.base })
  })
})

describe('cargarSemilla', () => {
  /** Libro en memoria con las pestañas ya creadas (encabezado en la fila 1). */
  function libro() {
    const tabs = new Map(Object.entries(HOJAS).map(([tab, cabecera]) => [tab, [cabecera]]))
    return {
      tabs,
      cliente: {
        leer: async (tab: string) => tabs.get(tab) ?? [],
        agregar: async (tab: string, nuevas: string[][]) => void tabs.set(tab, [...(tabs.get(tab) ?? []), ...nuevas]),
      },
    }
  }

  it('agrega las filas de la semilla debajo de los encabezados', async () => {
    const { tabs, cliente } = libro()
    const resultado = await cargarSemilla(cliente, semilla)

    expect(resultado.omitidas).toEqual([])
    expect(resultado.cargadas.sort()).toEqual(['Animales', 'Catalogo', 'Config', 'Entidades', 'Padrinazgos', 'Tratamientos', 'Usuarios'])
    expect(tabs.get('Animales')).toHaveLength(71)
    expect(tabs.get('Animales')?.[0]).toEqual(HOJAS.Animales)
    expect(sinEncabezado(tabs.get('Animales') ?? []).map(filaAAnimal)).toEqual(semilla.animales)
    expect(tabs.get('Eventos')).toEqual([HOJAS.Eventos])
  })

  it('una pestaña que ya tiene datos no se duplica al correr la carga otra vez', async () => {
    const { tabs, cliente } = libro()
    await cargarSemilla(cliente, semilla)
    const segunda = await cargarSemilla(cliente, semilla)

    expect(segunda.cargadas).toEqual([])
    expect(segunda.omitidas.sort()).toEqual(['Animales', 'Catalogo', 'Config', 'Entidades', 'Padrinazgos', 'Tratamientos', 'Usuarios'])
    expect(tabs.get('Animales')).toHaveLength(71)
  })

  it('una pestaña vacía (sin encabezados) recibe primero los encabezados', async () => {
    const tabs = new Map<string, string[][]>()
    const cliente = {
      leer: async (tab: string) => tabs.get(tab) ?? [],
      agregar: async (tab: string, nuevas: string[][]) => void tabs.set(tab, [...(tabs.get(tab) ?? []), ...nuevas]),
    }
    await cargarSemilla(cliente, semilla)
    expect(tabs.get('Entidades')?.[0]).toEqual(HOJAS.Entidades)
    expect(tabs.get('Entidades')).toHaveLength(3)
  })
})

import { describe, expect, it } from 'vitest'
import type { Seguimiento, Solicitud } from '@huellitas/shared/adopcion/tipos'
import type { ItemCatalogo, Padrinazgo, Registro } from '@huellitas/shared/registro'
import type { Animal, Clinica, Persona, Tratamiento } from '@huellitas/shared/tipos'
import { HOJAS } from '../../src/store/hojas'
import {
  aplicarCambioEstado,
  cambioEstadoDePendiente,
  clinicaAFila,
  configAFilas,
  filaAAnimal,
  filaAClinica,
  filaAItem,
  filaAPadrinazgo,
  filaAPersona,
  filaARegistro,
  filaASeguimiento,
  filaASolicitud,
  filaATratamiento,
  filasAConfig,
  itemAFila,
  padrinazgoAFila,
  personaAFila,
  registroAFila,
  registroDePendiente,
  seguimientoAFila,
  sinEncabezado,
  solicitudAFila,
  tratamientoAFila,
  animalAFila,
  type ConfigHoja,
} from '../../src/store/mappers'

const columna = (tab: string, nombre: string): number => {
  const i = HOJAS[tab]?.indexOf(nombre) ?? -1
  if (i < 0) throw new Error(`La hoja ${tab} no tiene la columna ${nombre}`)
  return i
}

const animalCompleto: Animal = {
  id: 'perro-15',
  nombre: 'Tobías',
  especie: 'perro',
  estado: 'tratamiento',
  foto: 'https://fotos.test/tobias.jpg',
  fechaIngreso: '2026-03-14',
  advertencias: ['No juntar con machos', 'Dieta especial: comida húmeda'],
  caracter: 'Tranquilo, le gusta que lo acaricien despacio.',
  padrino: 'Familia Ríos',
  codigo: 'TOB01',
  alias: ['Tobi', 'Tobito'],
  canil: 'Canil 1',
}
const animalMinimo: Animal = {
  id: 'gato-2',
  nombre: 'Misu',
  especie: 'gato',
  estado: 'adoptable',
  foto: null,
  fechaIngreso: '2026-01-02',
  advertencias: [],
  caracter: '',
  padrino: null,
}

const tratamientoCompleto: Tratamiento = {
  id: 't-tob-1',
  animalId: 'perro-15',
  medicamento: 'Anticonvulsivo',
  dosis: '1 pastilla',
  horas: ['02:00', '14:00'],
  inicio: '2026-10-01',
  fin: '2026-12-31',
  critico: true,
  activo: true,
}
const tratamientoMinimo: Tratamiento = { id: 't-2', animalId: 'perro-1', medicamento: 'Vitaminas', dosis: '5 ml', horas: ['12:00'], inicio: '2026-10-01', fin: '2026-10-30' }

const personaCompleta: Persona = { id: 'p-luis', nombre: 'Don Luis', cargo: 'Cuidador', rol: 'cuidador', color: '#2f6b3b', foto: null, telefono: '573001110001', activo: false }
const personaMinima: Persona = { id: 'p-marcela', nombre: 'Marcela', cargo: 'Adopciones', rol: 'adopciones', color: '#595449', foto: 'https://fotos.test/m.jpg' }

const registroCompleto: Registro = {
  id: 'r-1',
  fechaHora: '2026-10-27T14:01:00-05:00',
  agenteId: 'p-andrea',
  origen: 'audio',
  estado: 'confirmado',
  propuesta: { tipo: 'dosis', animalId: 'perro-15', tratamientoId: 't-tob-1', hora: '14:00' },
  fraseExacta: 'ya le di el anticonvulsivo, "con comida"',
  confianza: 0.93,
  registroIaId: 'ia-1',
  mediaUrl: 'https://media.test/a.ogg',
  compromisoId: 't-tob-1@2026-10-27T14:00',
  confirmadoPor: 'p-carlos',
  confirmadoEn: '2026-10-27T14:30:00-05:00',
}
const registroMinimo: Registro = {
  id: 'r-2',
  fechaHora: '2026-10-27T08:00:00-05:00',
  agenteId: 'p-luis',
  origen: 'panel',
  estado: 'por_confirmar',
  propuesta: { tipo: 'inventario', especie: 'perro', cambio: -1 },
}

const clinica: Clinica = { id: 'cl-24h', nombre: 'Clínica Veterinaria 24 Horas', deuda: 2_600_000, limite: 3_000_000 }
const itemCompleto: ItemCatalogo = { id: 'cat-perro', nombre: 'Concentrado de perro', tipo: 'alimento', kgPorUnidad: 25, especieObjetivo: 'perro', consumoDiarioKgPorAnimal: 0.375 }
const itemMinimo: ItemCatalogo = { id: 'cat-x', nombre: 'Guantes', tipo: 'insumo', kgPorUnidad: 0 }
const padrinazgo: Padrinazgo = { id: 'pad-1', personaTelefono: '573009990001', personaNombre: 'Valentina G.', animalId: 'gato-1', activo: true }

const solicitud: Solicitud = {
  id: 's-1',
  fecha: '2026-10-26T09:30:00-05:00',
  nombre: 'Ana María Pérez',
  telefono: '573101234567',
  cedula: '1098765432',
  direccion: 'Cra 10 # 20-30, Bucaramanga',
  animalId: 'perro-2',
  familiaDeAcuerdo: true,
  paraQuien: 'regalo',
  destinatario: 'su mamá',
  vivienda: 'apartamento',
  viviendaConMallas: false,
  dondeVivira: 'dentro_casa',
  aceptaEsterilizar: true,
  aceptaVacunar: true,
  aceptaSeguimiento: false,
  quiereEntregaInmediata: true,
  preguntoPorCaracter: false,
  planEmergencia: 'Lo llevo a "la clínica" | del barrio',
  mascotasAnteriores: 'Tuve un perro 10 años',
  motivo: 'Quiero compañía',
  montonManual: 'amarillo',
  nota: 'Llamar en la tarde',
  llamadaAgendada: '2026-10-29T15:00:00-05:00',
}
const solicitudSinOpcionales: Solicitud = {
  ...solicitud,
  id: 's-2',
  animalId: null,
  paraQuien: 'yo',
  montonManual: null,
  llamadaAgendada: null,
}
delete solicitudSinOpcionales.destinatario

const seguimiento: Seguimiento = {
  id: 'sg-1',
  solicitudId: 's-1',
  adoptanteNombre: 'Ana María Pérez',
  adoptanteTelefono: '573101234567',
  animalId: 'perro-2',
  fechaEntrega: '2026-10-20',
  dia: 5,
  fecha: '2026-10-25',
  resultado: 'rojo',
  llamadaHumana: true,
  nota: 'No contesta',
}
const seguimientoPendiente: Seguimiento = { ...seguimiento, id: 'sg-2', solicitudId: null, dia: 90, resultado: null }
delete seguimientoPendiente.llamadaHumana

describe('HOJAS', () => {
  it('define las 11 pestañas, cada una con encabezados sin repetir', () => {
    expect(Object.keys(HOJAS).sort()).toEqual(
      ['Animales', 'Catalogo', 'Config', 'Entidades', 'Eventos', 'Padrinazgos', 'RegistrosIA', 'Seguimientos', 'Solicitudes', 'Tratamientos', 'Usuarios'].sort(),
    )
    for (const [tab, cabecera] of Object.entries(HOJAS)) {
      expect(new Set(cabecera).size, `encabezados repetidos en ${tab}`).toBe(cabecera.length)
      expect(cabecera.length, `${tab} sin columnas`).toBeGreaterThan(0)
    }
  })

  it('las columnas de Eventos son exactamente los campos de Registro', () => {
    expect(HOJAS.Eventos).toEqual(Object.keys(registroCompleto))
  })

  it('cada pestaña tiene las columnas de su tipo', () => {
    expect(HOJAS.Animales).toEqual(Object.keys(animalCompleto))
    expect(HOJAS.Tratamientos).toEqual(Object.keys(tratamientoCompleto))
    expect(HOJAS.Usuarios).toEqual(Object.keys({ ...personaCompleta }))
    expect(HOJAS.Entidades).toEqual(Object.keys(clinica))
    expect(HOJAS.Catalogo).toEqual(Object.keys(itemCompleto))
    expect(HOJAS.Padrinazgos).toEqual(Object.keys(padrinazgo))
    expect(HOJAS.Solicitudes).toEqual(Object.keys(solicitud))
    expect(HOJAS.Seguimientos).toEqual(Object.keys(seguimiento))
  })
})

describe('ida y vuelta de cada mapper', () => {
  it('animal completo y mínimo', () => {
    expect(filaAAnimal(animalAFila(animalCompleto))).toStrictEqual(animalCompleto)
    expect(filaAAnimal(animalAFila(animalMinimo))).toStrictEqual(animalMinimo)
  })

  it('tratamiento completo y mínimo', () => {
    expect(filaATratamiento(tratamientoAFila(tratamientoCompleto))).toStrictEqual(tratamientoCompleto)
    expect(filaATratamiento(tratamientoAFila(tratamientoMinimo))).toStrictEqual(tratamientoMinimo)
  })

  it('persona (agente) completa y mínima', () => {
    expect(filaAPersona(personaAFila(personaCompleta))).toStrictEqual(personaCompleta)
    expect(filaAPersona(personaAFila(personaMinima))).toStrictEqual(personaMinima)
  })

  it('registro (evento) completo y mínimo: filaARegistro(registroAFila(r)) es igual a r', () => {
    expect(filaARegistro(registroAFila(registroCompleto))).toStrictEqual(registroCompleto)
    expect(filaARegistro(registroAFila(registroMinimo))).toStrictEqual(registroMinimo)
  })

  it('clínica (entidad)', () => {
    expect(filaAClinica(clinicaAFila(clinica))).toStrictEqual(clinica)
  })

  it('ítem del catálogo completo y mínimo', () => {
    expect(filaAItem(itemAFila(itemCompleto))).toStrictEqual(itemCompleto)
    expect(filaAItem(itemAFila(itemMinimo))).toStrictEqual(itemMinimo)
  })

  it('padrinazgo', () => {
    expect(filaAPadrinazgo(padrinazgoAFila(padrinazgo))).toStrictEqual(padrinazgo)
  })

  it('solicitud completa y sin opcionales', () => {
    expect(filaASolicitud(solicitudAFila(solicitud))).toStrictEqual(solicitud)
    expect(filaASolicitud(solicitudAFila(solicitudSinOpcionales))).toStrictEqual(solicitudSinOpcionales)
  })

  it('seguimiento pendiente y ya llamado', () => {
    expect(filaASeguimiento(seguimientoAFila(seguimiento))).toStrictEqual(seguimiento)
    expect(filaASeguimiento(seguimientoAFila(seguimientoPendiente))).toStrictEqual(seguimientoPendiente)
  })

  it('config: los tres bloques de la hoja Config', () => {
    const config: ConfigHoja = {
      config: {
        umbralPreguntar: 0.7,
        umbralAutoconfirmar: 0.85,
        minutosAutoconfirmar: 30,
        diasAlertaComida: 4,
        horaCierre: '18:30',
        telefonoAlbergue: '573000000000',
        baseUrl: 'https://huellitas.test',
      },
      configComida: { kgPorBulto: { perro: 25, gato: 10 }, consumoDiarioKg: { perro: 16.875, gato: 1.625 }, diasAviso: 6, diasUrgente: 4 },
      base: { conteoInicial: { fecha: '2026-10-25', bultos: { perro: 5, gato: 3 } }, cajaInicial: { fecha: '2026-10-24', monto: 1_050_000 }, vidasCambiadas: 214 },
    }
    const filas = configAFilas(config)
    expect(filas.every((f) => f.length === HOJAS.Config?.length)).toBe(true)
    expect(filasAConfig(filas)).toStrictEqual(config)
  })
})

describe('formato de las celdas', () => {
  it('las listas (alias, advertencias, horas) se separan con |', () => {
    const fila = animalAFila(animalCompleto)
    expect(fila[columna('Animales', 'alias')]).toBe('Tobi|Tobito')
    expect(fila[columna('Animales', 'advertencias')]).toBe('No juntar con machos|Dieta especial: comida húmeda')
    expect(tratamientoAFila(tratamientoCompleto)[columna('Tratamientos', 'horas')]).toBe('02:00|14:00')
  })

  it('un | dentro de un elemento de la lista se cambia por / para no partirlo en dos', () => {
    const fila = animalAFila({ ...animalCompleto, advertencias: ['No A|B'] })
    expect(filaAAnimal(fila).advertencias).toEqual(['No A/B'])
  })

  it('la propuesta del registro va como JSON en una sola columna', () => {
    const fila = registroAFila(registroCompleto)
    expect(fila[columna('Eventos', 'propuesta')]).toBe(JSON.stringify(registroCompleto.propuesta))
    expect(fila).toHaveLength(HOJAS.Eventos?.length ?? -1)
    expect(fila.every((c) => typeof c === 'string')).toBe(true)
  })

  it('los campos opcionales ausentes quedan como celda vacía', () => {
    const fila = registroAFila(registroMinimo)
    for (const c of ['fraseExacta', 'confianza', 'registroIaId', 'mediaUrl', 'compromisoId', 'confirmadoPor', 'confirmadoEn']) {
      expect(fila[columna('Eventos', c)], c).toBe('')
    }
  })

  it('booleanos como TRUE/FALSE y números con punto decimal', () => {
    expect(tratamientoAFila(tratamientoCompleto)[columna('Tratamientos', 'critico')]).toBe('TRUE')
    expect(itemAFila(itemCompleto)[columna('Catalogo', 'consumoDiarioKgPorAnimal')]).toBe('0.375')
    expect(clinicaAFila(clinica)[columna('Entidades', 'deuda')]).toBe('2600000')
  })

  it('Sheets recorta las celdas vacías del final: una fila corta se lee igual', () => {
    const fila = animalAFila(animalMinimo)
    while (fila.length > 0 && fila[fila.length - 1] === '') fila.pop()
    expect(fila.length).toBeLessThan(HOJAS.Animales?.length ?? 0)
    expect(filaAAnimal(fila)).toStrictEqual(animalMinimo)
  })

  it('un número con coma decimal escrito a mano se entiende', () => {
    const fila = itemAFila(itemCompleto)
    fila[columna('Catalogo', 'consumoDiarioKgPorAnimal')] = '0,375'
    expect(filaAItem(fila).consumoDiarioKgPorAnimal).toBe(0.375)
  })
})

describe('filas inválidas', () => {
  it('una especie desconocida lanza un error que dice la columna y el valor', () => {
    const fila = animalAFila(animalCompleto)
    fila[columna('Animales', 'especie')] = 'conejo'
    expect(() => filaAAnimal(fila)).toThrow('especie')
    expect(() => filaAAnimal(fila)).toThrow('conejo')
  })

  it('un número ilegible lanza un error con la columna', () => {
    const fila = clinicaAFila(clinica)
    fila[columna('Entidades', 'deuda')] = 'mucho'
    expect(() => filaAClinica(fila)).toThrow('deuda')
  })

  it('una propuesta que no es JSON lanza un error', () => {
    const fila = registroAFila(registroCompleto)
    fila[columna('Eventos', 'propuesta')] = '{roto'
    expect(() => filaARegistro(fila)).toThrow('propuesta')
  })

  it('una propuesta con un tipo desconocido lanza un error', () => {
    const fila = registroAFila(registroCompleto)
    fila[columna('Eventos', 'propuesta')] = '{"tipo":"volar"}'
    expect(() => filaARegistro(fila)).toThrow('volar')
  })

  it('una clave que falta en Config lanza un error que la nombra', () => {
    expect(() => filasAConfig([['umbralPreguntar', '0.7']])).toThrow('umbralAutoconfirmar')
  })
})

describe('puente con la cola de Sheets (outbox de pg-repo)', () => {
  it("'agregar': el payload es el Registro completo y se convierte en la misma fila que registroAFila", () => {
    const payload: Record<string, unknown> = JSON.parse(JSON.stringify(registroCompleto))
    expect(registroDePendiente(payload)).toStrictEqual(registroCompleto)
    expect(registroAFila(registroDePendiente(payload))).toEqual(registroAFila(registroCompleto))

    const minimo: Record<string, unknown> = JSON.parse(JSON.stringify(registroMinimo))
    expect(registroDePendiente(minimo)).toStrictEqual(registroMinimo)
  })

  it("'agregar' con un payload incompleto lanza un error con el campo", () => {
    const { agenteId: _agenteId, ...sinAgente } = JSON.parse(JSON.stringify(registroCompleto)) as Record<string, unknown>
    expect(() => registroDePendiente(sinAgente)).toThrow('agenteId')
  })

  it("'actualizar': { id, estado, confirmadoPor, confirmadoEn } cambia solo esas tres columnas de la fila existente", () => {
    const cambio = cambioEstadoDePendiente({ id: 'r-2', estado: 'anulado', confirmadoPor: 'p-admin', confirmadoEn: '2026-10-27T09:00:00-05:00' })
    expect(cambio).toEqual({ id: 'r-2', estado: 'anulado', confirmadoPor: 'p-admin', confirmadoEn: '2026-10-27T09:00:00-05:00' })

    const antes = registroAFila(registroMinimo)
    const despues = aplicarCambioEstado(antes, cambio)
    expect(despues).not.toBe(antes)
    expect(filaARegistro(despues)).toStrictEqual({ ...registroMinimo, estado: 'anulado', confirmadoPor: 'p-admin', confirmadoEn: '2026-10-27T09:00:00-05:00' })
    expect(antes[columna('Eventos', 'estado')]).toBe('por_confirmar')
  })

  it("'actualizar' con un estado desconocido lanza un error", () => {
    expect(() => cambioEstadoDePendiente({ id: 'r-2', estado: 'borrado', confirmadoPor: 'p', confirmadoEn: 'x' })).toThrow('borrado')
  })

  it('aplicarCambioEstado rechaza una fila de otro registro', () => {
    const otra = registroAFila(registroCompleto)
    expect(() => aplicarCambioEstado(otra, { id: 'r-2', estado: 'anulado', confirmadoPor: 'p', confirmadoEn: 'x' })).toThrow('r-1')
  })

  it('aplicarCambioEstado completa una fila que Sheets devolvió recortada', () => {
    const corta = registroAFila(registroMinimo).slice(0, columna('Eventos', 'estado') + 2)
    const despues = aplicarCambioEstado(corta, { id: 'r-2', estado: 'confirmado', confirmadoPor: 'p-admin', confirmadoEn: '2026-10-27T09:00:00-05:00' })
    expect(despues).toHaveLength(HOJAS.Eventos?.length ?? -1)
    expect(filaARegistro(despues).estado).toBe('confirmado')
  })
})

describe('sinEncabezado', () => {
  it('quita la primera fila (los encabezados que devuelve leer)', () => {
    expect(sinEncabezado([['id'], ['a'], ['b']])).toEqual([['a'], ['b']])
    expect(sinEncabezado([])).toEqual([])
  })
})

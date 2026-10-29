// El despertador: a las 7:00 a. m. el bot le manda a Yesenia la foto con lo del día, sin que ella lo pida.
import { beforeEach, describe, expect, it } from 'vitest'
import { citasDeHoy, enviarResumenMatutino } from '../src/conversacion/informe.js'
import { vacunasPorVencer } from '../src/datos/calculos.js'
import { atender } from '../src/conversacion/atender.js'
import { revisarDespertador, revisarRecordatorioTarde, telefonosDelResumen, tocaResumen } from '../src/scheduler.js'
import { AHORA, ANDREA, CAROLINA, crearDeps, datosDePrueba, LUIS } from './fakes.js'

/** Martes 27 de octubre, a la hora que se pida (Bogotá) */
const a = (hhmm: string, dia = '27') => new Date(`2026-10-${dia}T${hhmm}:00-05:00`)

const SOLICITUD = {
  id: '5', fecha: '2026-10-20T10:00:00Z', nombre: 'Juan Gómez', telefono: '573115550101', cedula: '1', direccion: 'x',
  animalId: '12', familiaDeAcuerdo: true, paraQuien: 'yo' as const, vivienda: 'casa' as const, viviendaConMallas: true,
  dondeVivira: 'dentro_casa' as const, aceptaEsterilizar: true, aceptaVacunar: true, aceptaSeguimiento: true,
  quiereEntregaInmediata: false, preguntoPorCaracter: true, planEmergencia: 'mi hermana', mascotasAnteriores: '', motivo: '',
  montonManual: null, nota: '', llamadaAgendada: null, origen: 'agente' as const, visitaPropuesta: null, visitaEstado: null,
  puntajeIdoneidad: null, puntajeRiesgo: null,
}

describe('vacunas por vencer', () => {
  it('avisa las que vencen esta semana y las vencidas; no las lejanas ni las de animales que ya no están', () => {
    const d = datosDePrueba()
    d.animales.push({ ...d.animales[0], id: '13', nombre: 'Rocky', estado: 'adoptado' })
    d.vacunas = [
      { animalId: '10', vacuna: 'Rabia', vence: '2026-10-30' },
      { animalId: '11', vacuna: 'Moquillo', vence: '2026-10-20' },
      { animalId: '12', vacuna: 'Triple felina', vence: '2026-11-20' },
      { animalId: '13', vacuna: 'Rabia', vence: '2026-10-28' },
    ]
    expect(vacunasPorVencer(d, AHORA).map((v) => [v.animal, v.vacuna, v.vencida])).toEqual([
      ['Mateo', 'Moquillo', true],
      ['Tobías', 'Rabia', false],
    ])
  })
})

describe('citas del día', () => {
  it('visitas propuestas y llamadas agendadas de hoy, en orden; las de otros días no', () => {
    const citas = citasDeHoy(
      [
        { ...SOLICITUD, visitaPropuesta: '2026-10-27T20:00:00.000Z' },
        { ...SOLICITUD, id: '6', nombre: 'María López', animalId: null, llamadaAgendada: '2026-10-27T09:30:00-05:00' },
        { ...SOLICITUD, id: '7', visitaPropuesta: '2026-10-28T15:00:00.000Z' },
      ],
      datosDePrueba(),
      AHORA,
      true,
    )
    expect(citas).toEqual([
      { hora: '09:30', tipo: 'llamada', quien: 'María', animal: null },
      { hora: '15:00', tipo: 'visita', quien: 'Juan', animal: 'Luna' },
    ])
  })

  it('quien no ve adoptantes recibe la cita sin el nombre', () => {
    const [cita] = citasDeHoy([{ ...SOLICITUD, visitaPropuesta: '2026-10-27T20:00:00.000Z' }], datosDePrueba(), AHORA, false)
    expect(cita.quien).toBe('Un interesado')
  })
})

describe('enviarResumenMatutino(deps, telefono)', () => {
  let t: ReturnType<typeof crearDeps>
  beforeEach(() => {
    t = crearDeps()
    t.repo.ahora = a('07:00')
    t.repo.datos.vacunas = [{ animalId: '10', vacuna: 'Rabia', vence: '2026-10-30' }]
    t.repo.adopcion.push({ ...SOLICITUD, claveOrigen: 'wa:1', visitaPropuesta: '2026-10-27T20:00:00.000Z', visitaEstado: 'propuesta' })
    t.repo.entregas = [{
      adopcionId: '1', solicitudId: null, animalId: '20', animalNombre: 'Firulais', fechaEntrega: '2026-10-22',
      adoptanteNombre: 'Juan Gómez', adoptanteTelefono: '573115550101',
    }]
    t.repo.resultadosSeguimiento = [{ adopcionId: '1', dia: 2, resultado: 'verde', nota: '' }]
  })

  it('manda la foto con medicinas, comida, vacunas, visitas y seguimientos, sin que nadie la pida', async () => {
    expect(await enviarResumenMatutino(t.deps, CAROLINA.telefono)).toBe(true)
    const [foto, ...resto] = t.wa.enviados
    expect(foto.telefono).toBe(CAROLINA.telefono)
    expect(foto.salida.tipo).toBe('imagen')
    expect(foto.salida.texto).toContain('Buenos días, Carolina')
    const html = t.dibujos[0]
    for (const parte of ['Medicinas de hoy', 'Fenobarbital', 'comida', 'Vacunas por vencer', 'Rabia', 'Tobías', 'Visitas y llamadas', 'Juan', 'Seguimientos', 'Firulais']) {
      expect(html).toContain(parte)
    }
    const textos = resto.map((x) => x.salida.texto).join('\n')
    expect(textos).toContain('💉 Vacunas que vencen esta semana:\n• Tobías · Rabia · vence el 30 de octubre')
    expect(textos).toContain('• Firulais (Día 5) — Adoptante: Juan Gómez (311 555 0101)')
    expect(t.wa.opciones()).toEqual(['sg:1:5:verde', 'sg:1:5:amarillo', 'sg:1:5:rojo'])
  })

  it('a un número que no es del equipo no le manda nada', async () => {
    expect(await enviarResumenMatutino(t.deps, '573119999999')).toBe(false)
    expect(t.wa.enviados).toHaveLength(0)
  })

  it('si la foto no se puede dibujar, igual manda lo del día por escrito', async () => {
    t.deps.dibujar = async () => {
      throw new Error('sin navegador')
    }
    expect(await enviarResumenMatutino(t.deps, CAROLINA.telefono)).toBe(true)
    expect(t.wa.enviados[0].salida.tipo).toBe('texto')
    expect(t.wa.enviados[0].salida.texto).toContain('Medicinas de hoy: 3')
  })

  it('a quien no es de administración no le muestra plata ni teléfonos de adoptantes', async () => {
    await enviarResumenMatutino(t.deps, LUIS.telefono)
    const todo = [...t.dibujos, ...t.wa.enviados.map((x) => x.salida.texto)].join('\n')
    expect(todo).not.toContain('311 555')
    expect(todo).not.toContain('caja')
    expect(todo).toContain('Un interesado')
  })
})

describe('la lista "Para hoy" de la mañana', () => {
  it('le recuerda dar de comer a los animales que hay, las medicinas con su hora y mandar audios', async () => {
    const t = crearDeps()
    t.repo.ahora = a('07:00')
    await enviarResumenMatutino(t.deps, CAROLINA.telefono)
    const lista = t.wa.enviados.map((x) => x.salida.texto).find((x) => x.includes('Para hoy')) ?? ''
    // En los datos de prueba: Tobías y Mateo (perros) y Luna (gata) están a cargo del refugio
    expect(lista).toContain('Servir la comida: 2 perros y 1 gato')
    expect(lista).toContain('8:00 a. m. Mateo · Amoxicilina 3 ml')
    expect(lista).toContain('2:00 p. m. Tobías · Fenobarbital 1 pastilla')
    // Perro: 3 bultos × 25 kg / 16,875 kg al día ≈ 4 días: toca pedir
    expect(lista).toMatch(/comida de perro alcanza para \*4 días\*.*toca pedir/i)
    expect(lista).toMatch(/mándame un audio/i)
  })
})

describe('el recordatorio de la tarde', () => {
  it('a las 7:00 p. m., a quien no ha contado nada hoy le pide la actualización y le dice qué medicinas faltan', async () => {
    const t = crearDeps()
    t.repo.ahora = a('18:59')
    expect(await revisarRecordatorioTarde(t.deps, async () => [CAROLINA.telefono])).toBe(0)
    t.repo.ahora = a('19:05')
    expect(await revisarRecordatorioTarde(t.deps, async () => [CAROLINA.telefono])).toBe(1)
    const m = t.wa.ultimoTexto()
    expect(m).toMatch(/hoy no me has contado nada/i)
    expect(m).toContain('8:00 p. m. Mateo · Amoxicilina')
    expect(t.wa.opciones()).toEqual(['menu'])
    // Una sola vez por día
    t.repo.ahora = a('19:30')
    expect(await revisarRecordatorioTarde(t.deps, async () => [CAROLINA.telefono])).toBe(0)
  })

  it('si ya contó cosas hoy pero faltan medicinas, solo le recuerda esas', async () => {
    const t = crearDeps()
    t.repo.ahora = a('14:05')
    await atender(t.deps, CAROLINA, { tipo: 'boton', id: 'd:100:14:00', titulo: '' })
    await atender(t.deps, CAROLINA, { tipo: 'boton', id: 'si:1', titulo: '' })
    t.repo.ahora = a('19:05')
    t.wa.limpiar()
    await revisarRecordatorioTarde(t.deps, async () => [CAROLINA.telefono])
    const m = t.wa.ultimoTexto()
    expect(m).not.toMatch(/no me has contado nada/i)
    expect(m).toMatch(/faltan estas medicinas/i)
    expect(m).not.toContain('Tobías')
  })

  it('si ya contó cosas y no falta nada, no la molesta', async () => {
    const t = crearDeps()
    t.repo.datos.tratamientos = []
    t.repo.ahora = a('10:00')
    t.ia.responder({ transcripcion: 'Luna comió bien', acciones: [{ tipo: 'nota', animalId: '12', texto: 'Comió bien' }], confianza: 0.95 })
    await atender(t.deps, CAROLINA, { tipo: 'audio', mediaId: 'a1', mime: 'audio/ogg' })
    t.repo.ahora = a('19:05')
    t.wa.limpiar()
    expect(await revisarRecordatorioTarde(t.deps, async () => [CAROLINA.telefono])).toBe(0)
    expect(t.wa.enviados).toHaveLength(0)
  })
})

describe('el despertador', () => {
  it('toca entre las 7:00 y las 11:00 a. m. (si el bot estaba apagado a las 7, lo manda al prender)', () => {
    expect(tocaResumen(a('06:59'))).toBe(false)
    expect(tocaResumen(a('07:00'))).toBe(true)
    expect(tocaResumen(a('10:59'))).toBe(true)
    expect(tocaResumen(a('11:00'))).toBe(false)
  })

  it('manda una sola vez por día a cada teléfono, aunque revise cada minuto', async () => {
    const t = crearDeps()
    const telefonos = async () => [CAROLINA.telefono, ANDREA.telefono]
    t.repo.ahora = a('06:59')
    expect(await revisarDespertador(t.deps, telefonos)).toBe(0)
    t.repo.ahora = a('07:01')
    expect(await revisarDespertador(t.deps, telefonos)).toBe(2)
    t.repo.ahora = a('07:02')
    expect(await revisarDespertador(t.deps, telefonos)).toBe(0)
    expect(new Set(t.wa.enviados.filter((x) => x.salida.tipo === 'imagen').map((x) => x.telefono))).toEqual(new Set([CAROLINA.telefono, ANDREA.telefono]))
    t.repo.ahora = a('07:00', '28')
    expect(await revisarDespertador(t.deps, telefonos)).toBe(2)
  })

  it('si a un teléfono no le llega (ventana de 24 h de WhatsApp), sigue con los demás', async () => {
    const t = crearDeps()
    t.repo.ahora = a('07:00')
    const enviar = t.wa.enviar.bind(t.wa)
    t.wa.enviar = async (tel, s) => {
      if (tel === CAROLINA.telefono) throw new Error('(#131047) Re-engagement message')
      return enviar(tel, s)
    }
    expect(await revisarDespertador(t.deps, async () => [CAROLINA.telefono, ANDREA.telefono])).toBe(1)
  })

  it('los teléfonos salen de RESUMEN_MATUTINO_TELEFONOS o, si no está, de la administración activa', async () => {
    const t = crearDeps()
    expect(await telefonosDelResumen({ RESUMEN_MATUTINO_TELEFONOS: '+57 300 000 0002, 573000000001' }, t.deps.repo)).toEqual(['573000000002', '573000000001'])
    expect(await telefonosDelResumen({}, t.deps.repo)).toEqual([CAROLINA.telefono])
  })
})

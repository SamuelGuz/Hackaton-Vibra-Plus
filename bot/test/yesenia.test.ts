// Un día de Yesenia, de punta a punta, como ella usa el bot de verdad:
// manos mojadas, audios cortos uno tras otro, o un solo mensaje largo en la noche con todo lo del día.
// La IA es falsa pero se equivoca como la real (toma kilos por bultos, se cae, oye ruido).
import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import { crearApp } from '../src/app.js'
import { atender } from '../src/conversacion/atender.js'
import { kgEnBodega } from '../src/datos/calculos.js'
import { revisarDespertador } from '../src/scheduler.js'
import type { Accion, Entendido, Entrada, Usuario } from '../src/tipos.js'
import { ANDREA, crearDeps } from './fakes.js'

const YESENIA: Usuario = { id: 7, nombre: 'Yesenia', rol: 'admin', telefono: '573001112233' }
const SARA: Usuario = { id: 9, nombre: 'Sara', rol: 'voluntario', telefono: '573000000009' }
const SECRETO = 'secreto'

const texto = (t: string): Entrada => ({ tipo: 'texto', texto: t })
const boton = (id: string): Entrada => ({ tipo: 'boton', id, titulo: '' })
const audio = (id: string): Entrada => ({ tipo: 'audio', mediaId: id, mime: 'audio/ogg; codecs=opus' })
const a = (hhmm: string, dia = '27') => new Date(`2026-10-${dia}T${hhmm}:00-05:00`)

const DOSIS_TOBIAS: Accion = { tipo: 'dosis', animalId: '10', tratamientoId: '100', hora: '14:00' }
const DOSIS_MATEO_8: Accion = { tipo: 'dosis', animalId: '11', tratamientoId: '101', hora: '08:00' }
const donacion = (monto: number): Accion => ({
  tipo: 'movimiento',
  movimiento: { tipo: 'ingreso', monto, categoria: 'donacion', clinicaId: null, abonoDeuda: false, foto: null, nota: 'Nequi' },
})

let t: ReturnType<typeof crearDeps>
/** Lo que la IA "entiende" de cada audio (por su id) o de cada texto (por el texto) */
let guion: Record<string, Partial<Entendido> | Error>

const decir = (e: Entrada, u: Usuario = YESENIA) => atender(t.deps, u, e)
const paso = (u: Usuario = YESENIA) => t.repo.estados.get(u.id)?.estado.paso
const mensajes = (u: Usuario = YESENIA) => t.wa.enviados.filter((x) => x.telefono === u.telefono).map((x) => x.salida)
const confirmados = () => t.repo.porEstado('confirmado')

beforeEach(async () => {
  t = crearDeps()
  t.repo.usuarios.push(YESENIA, SARA)
  t.repo.datos.personas.push({ id: '7', nombre: 'Yesenia', cargo: 'Directora', rol: 'admin', color: '#000', foto: null })
  for (const u of [YESENIA, SARA, ANDREA]) await t.repo.guardarEstado(u.id, { paso: 'menu' })
  guion = {}
  t.deps.ia = {
    async entender(e) {
      const clave = e.media ? e.media.datos.toString().replace(/^archivo /, '') : (e.texto ?? '')
      const r = guion[clave]
      if (r instanceof Error) throw r
      // Lo que no está en el guion suena a ruido: nada que anotar y poca confianza
      return { transcripcion: '', acciones: [], confianza: 0.2, futuras: 0, ...r }
    },
  }
})

describe('Yesenia escribe UNA sola vez en la noche con todo lo del día', () => {
  const RESUMEN =
    'Hola, hoy le di la pastilla a Tobías, a Mateo le di la amoxicilina de las 8, don Carlos trajo 20 kilos de carne, ' +
    'abrimos un bulto de perro, Luna no quiso comer y entraron 50 mil de una donación por Nequi'

  beforeEach(() => {
    t.repo.ahora = a('19:30')
  })

  it('todo queda en un solo "¿Está bien?", los 20 kilos no se vuelven 20 bultos, y un "sí" lo guarda todo', async () => {
    guion[RESUMEN] = {
      transcripcion: RESUMEN,
      confianza: 0.92,
      acciones: [
        DOSIS_TOBIAS,
        DOSIS_MATEO_8,
        // La IA se equivoca como la real: toma los kilos por bultos
        { tipo: 'inventario', especie: 'perro', cambio: 20 },
        { tipo: 'inventario', especie: 'perro', cambio: -1 },
        { tipo: 'nota', animalId: '12', texto: 'No quiso comer' },
        donacion(50_000),
      ],
    }
    await decir(texto(RESUMEN))
    // Un texto no se guarda solo, aunque la IA esté segura: se revisa antes
    expect(t.repo.registros).toHaveLength(1)
    expect(t.repo.registros[0].estadoActual).toBe('por_confirmar')
    expect(t.repo.registros[0].acciones[2]).toEqual({ tipo: 'inventario', especie: 'perro', cambio: 20, unidad: 'kg', producto: 'carne' })
    const pregunta = t.wa.ultimoTexto()
    for (const linea of ['1. 💊 *Tobías*', '2. 💊 *Mateo*', '3. 🥩 Llegaron *20 kg* de carne', '4. 🍖 Abriste *1 bulto*', '5. 📝 *Luna*', '6. 💵 Entró *$50.000*']) {
      expect(pregunta).toContain(linea)
    }
    expect(t.wa.opciones()).toEqual(['si:1', 'corregir:1', 'borrar:1'])

    await decir(texto('Sí'))
    expect(confirmados()).toHaveLength(1)
    expect(t.repo.datos.dosisDadas.map((d) => d.tratamientoId).sort()).toEqual(['100', '101'])
    // 3 bultos × 25 kg + 20 kg − 25 kg = 70 kg ÷ 16,875 kg al día
    expect(kgEnBodega(t.repo.datos, 'perro')).toBe(70)
    expect(t.wa.ultimoTexto()).toContain('Quedan *4 días* de comida de perro')
    expect(t.wa.ultimoTexto()).toContain('En caja quedan *$1.050.000*')
  })

  it('si Gemini está caído, se rescatan los kilos y se le dice que el resto no se entendió (no se inventa nada)', async () => {
    guion[RESUMEN] = new Error('cuota agotada')
    await decir(texto(RESUMEN))
    expect(t.repo.registros).toHaveLength(1)
    expect(t.repo.registros[0].acciones).toEqual([{ tipo: 'inventario', especie: 'perro', cambio: 20, unidad: 'kg', producto: 'carne' }])
    expect(t.wa.ultimoTexto()).toContain('No alcancé a entender el resto')
  })

  it('si una dosis del resumen ya la dio Andrea, no la repite y deja confirmar lo demás', async () => {
    t.repo.ahora = a('14:05')
    await decir(boton('d:100:14:00'), ANDREA)
    await decir(boton('si:1'), ANDREA)
    t.repo.ahora = a('19:30')
    guion[RESUMEN] = { transcripcion: RESUMEN, confianza: 0.95, acciones: [DOSIS_TOBIAS, DOSIS_MATEO_8] }
    await decir(texto(RESUMEN))
    expect(t.wa.ultimoTexto()).toContain('ya la reportó Andrea')
    // La de Tobías no se repite; los 20 kilos que nombra el resumen sí se leen
    expect(t.repo.registros[1].acciones).toEqual([DOSIS_MATEO_8, { tipo: 'inventario', especie: 'perro', cambio: 20, unidad: 'kg', producto: 'carne' }])
    await decir(texto('sí'))
    expect(t.repo.datos.dosisDadas.filter((d) => d.tratamientoId === '100')).toHaveLength(1)
  })

  it('aunque haya algo esperando el "¿Está bien?", "Sí, hoy le di…" largo es un registro nuevo, no la confirmación', async () => {
    guion['abrí un bulto de gato'] = { transcripcion: 'abrí un bulto de gato', confianza: 0.6, acciones: [{ tipo: 'inventario', especie: 'gato', cambio: -1 }] }
    await decir(texto('abrí un bulto de gato'))
    const largo = 'Sí, hoy le di la pastilla a Tobías y todo bien con los demás perritos del refugio'
    guion[largo] = { transcripcion: largo, confianza: 0.9, acciones: [DOSIS_TOBIAS] }
    await decir(texto(largo))
    expect(t.repo.registros.map((r) => r.estadoActual)).toEqual(['por_confirmar', 'por_confirmar'])
  })
})

describe('Yesenia manda muchos audios cortos, con las manos mojadas', () => {
  it('seis audios seguidos por WhatsApp: cada uno se guarda solo, en orden, sin tocar la pantalla', async () => {
    t.repo.ahora = a('08:10')
    guion = {
      a1: { transcripcion: 'Le di la amoxicilina a Mateo', confianza: 0.96, acciones: [DOSIS_MATEO_8] },
      a2: { transcripcion: 'llegaron quince kilos de carne', confianza: 0.94, acciones: [] },
      a3: { transcripcion: 'y un kilo y medio de huesos', confianza: 0.93, acciones: [] },
      a4: { transcripcion: 'Luna ya come solita', confianza: 0.95, acciones: [{ tipo: 'nota', animalId: '12', texto: 'Ya come solita' }] },
      a5: { transcripcion: 'abrí un bulto de gato', confianza: 0.97, acciones: [{ tipo: 'inventario', especie: 'gato', cambio: -1 }] },
      a6: { transcripcion: 'se gastaron 3 kilos de carne', confianza: 0.91, acciones: [{ tipo: 'inventario', especie: 'perro', cambio: -3 }] },
    }
    const app = crearApp({
      deps: t.deps,
      usuarioPorSesion: async () => null,
      eventos: async () => ({ dosis: [], inventario: [], movimientos: [], notas: [] }),
      leerArchivo: async () => null,
      verifyToken: 'v',
      appSecret: SECRETO,
    })
    // Llegan casi al tiempo: Meta los manda uno detrás de otro
    for (const id of ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']) {
      const cuerpo = JSON.stringify({
        entry: [{ changes: [{ value: { messages: [{ id: `wamid.${id}`, from: YESENIA.telefono, type: 'audio', audio: { id, mime_type: 'audio/ogg; codecs=opus' } }] } }] }],
      })
      const firma = `sha256=${createHmac('sha256', SECRETO).update(cuerpo).digest('hex')}`
      expect((await app.request('/wa', { method: 'POST', body: cuerpo, headers: { 'x-hub-signature-256': firma } })).status).toBe(200)
    }
    await app.ociosa()
    expect(t.repo.registros.map((r) => r.estadoActual)).toEqual(Array(6).fill('confirmado'))
    // En el mismo orden en que los mandó
    expect(t.repo.registros.map((r) => r.transcripcion)).toEqual([
      'Le di la amoxicilina a Mateo',
      'llegaron quince kilos de carne',
      'y un kilo y medio de huesos',
      'Luna ya come solita',
      'abrí un bulto de gato',
      'se gastaron 3 kilos de carne',
    ])
    expect(mensajes().filter((s) => s.texto.includes('✅ Anotado'))).toHaveLength(6)
    expect(t.repo.porEstado('por_confirmar')).toHaveLength(0)
    // 75 + 15 + 1,5 − 3 = 88,5 kg de comida de perro; el gato abrió uno de 3
    expect(kgEnBodega(t.repo.datos, 'perro')).toBe(88.5)
    expect(t.repo.datos.inventario.filter((m) => m.tipo === 'gato').map((m) => m.cambio)).toEqual([-1])
    // Los "−3 kilos" no se tomaron como 3 bultos
    expect(t.repo.registros[5].acciones).toEqual([{ tipo: 'inventario', especie: 'perro', cambio: -3, unidad: 'kg', producto: 'carne' }])
  })

  it('el mismo audio dos veces por error: la segunda no repite la dosis y pregunta; "no" en audio lo deja así', async () => {
    t.repo.ahora = a('14:02')
    guion.p1 = { transcripcion: 'le di la pastilla a Tobías', confianza: 0.97, acciones: [DOSIS_TOBIAS] }
    guion.p2 = guion.p1
    guion.no = { transcripcion: 'no, ya está', confianza: 0.95 }
    await decir(audio('p1'))
    await decir(audio('p2'))
    expect(t.wa.opciones()).toEqual(['dup:si', 'dup:no'])
    await decir(audio('no'))
    expect(t.repo.registros).toHaveLength(1)
    expect(t.repo.datos.dosisDadas).toHaveLength(1)
    expect(t.wa.ultimoTexto()).toContain('no la repito')
  })

  it('Meta reenvía el mismo audio (mismo id): se atiende una sola vez', async () => {
    guion.r1 = { transcripcion: 'le di la pastilla a Tobías', confianza: 0.97, acciones: [DOSIS_TOBIAS] }
    const app = crearApp({
      deps: t.deps, usuarioPorSesion: async () => null, eventos: async () => ({ dosis: [], inventario: [], movimientos: [], notas: [] }),
      leerArchivo: async () => null, verifyToken: 'v', appSecret: SECRETO,
    })
    const cuerpo = JSON.stringify({
      entry: [{ changes: [{ value: { messages: [{ id: 'wamid.r1', from: YESENIA.telefono, type: 'audio', audio: { id: 'r1' } }] } }] }],
    })
    const firma = `sha256=${createHmac('sha256', SECRETO).update(cuerpo).digest('hex')}`
    for (let i = 0; i < 3; i++) await app.request('/wa', { method: 'POST', body: cuerpo, headers: { 'x-hub-signature-256': firma } })
    await app.ociosa()
    expect(t.repo.registros).toHaveLength(1)
  })

  it('la frase cortada en dos audios ("le di la pastilla a…" + "Tobías") termina en una sola dosis', async () => {
    t.repo.ahora = a('14:10')
    guion.c1 = { transcripcion: 'le di la pastilla a', confianza: 0.6, acciones: [] }
    guion.c2 = { transcripcion: 'Tobías', confianza: 0.7, acciones: [] }
    guion.si = { transcripcion: 'sí', confianza: 0.9 }
    await decir(audio('c1'))
    expect(paso()).toBe('medicina')
    await decir(audio('c2'))
    expect(t.wa.ultimoTexto()).toContain('¿Está bien?')
    await decir(audio('si'))
    expect(confirmados()).toHaveLength(1)
    expect(t.repo.datos.dosisDadas).toHaveLength(1)
  })

  it('después de un audio guardado solo, "corregir" dicho en audio lo deshace', async () => {
    t.repo.ahora = a('14:05')
    guion.ok = { transcripcion: 'le di la pastilla a Tobías', confianza: 0.95, acciones: [DOSIS_TOBIAS] }
    guion.corr = { transcripcion: 'corregir', confianza: 0.9 }
    await decir(audio('ok'))
    expect(t.repo.datos.dosisDadas).toHaveLength(1)
    await decir(audio('corr'))
    expect(t.repo.registros[0].estadoActual).toBe('corregido')
    expect(t.repo.datos.dosisDadas).toHaveLength(0)
  })

  it('un audio de puro ruido (perros ladrando) no guarda nada', async () => {
    await decir(audio('ruido'))
    expect(t.repo.registros).toHaveLength(0)
    expect(t.wa.ultimo().tipo).toBe('lista')
  })

  it('si Gemini se cae a mitad de "¿cuántos kilos?", no pierde el paso', async () => {
    await decir(boton('m:llego'))
    await decir(boton('e:1:perro'))
    await decir(boton('n:perro:kg'))
    guion.caido = new Error('503')
    await decir(audio('caido'))
    expect(paso()).toBe('comida_cantidad')
    expect(t.wa.ultimoTexto()).toContain('No pude escuchar bien')
    guion.k = { transcripcion: 'doce kilos', confianza: 0.9 }
    await decir(audio('k'))
    expect(t.repo.registros[0].acciones).toEqual([{ tipo: 'inventario', especie: 'perro', cambio: 12, unidad: 'kg', producto: 'carne' }])
  })

  it('"mañana va a traer 20 kilos don Carlos" no se anota: todavía no pasa', async () => {
    guion.f = { transcripcion: 'mañana va a traer 20 kilos de carne don Carlos', confianza: 0.95, acciones: [], futuras: 1 }
    await decir(audio('f'))
    expect(t.repo.registros).toHaveLength(0)
  })

  it('dos personas reportan la misma dosis por audio casi al tiempo: queda una sola', async () => {
    t.repo.ahora = a('14:03')
    guion.y = { transcripcion: 'le di la pastilla a Tobías', confianza: 0.96, acciones: [DOSIS_TOBIAS] }
    await Promise.all([decir(audio('y')), decir(audio('y'), ANDREA)])
    expect(t.repo.datos.dosisDadas.filter((d) => d.tratamientoId === '100')).toHaveLength(1)
  })
})

describe('dos personas tocan la misma dosis de la lista al mismo tiempo', () => {
  it('solo queda una; a la segunda le avisa que ya la reportaron', async () => {
    t.repo.ahora = a('14:01')
    await Promise.all([decir(boton('d:100:14:00')), decir(boton('d:100:14:00'), ANDREA)])
    expect(t.repo.registros).toHaveLength(1)
    const avisos = [...mensajes(), ...mensajes(ANDREA)].filter((s) => s.texto.includes('ya la reportó'))
    expect(avisos).toHaveLength(1)
  })
})

describe('el día completo de Yesenia', () => {
  it('7:00 le llega el resumen, anota las llamadas con un toque, trabaja con audios y la página de las tiendas lo muestra', async () => {
    t.repo.datos.vacunas = [{ animalId: '10', vacuna: 'Rabia', vence: '2026-10-29' }]
    t.repo.entregas = [{
      adopcionId: '1', solicitudId: null, animalId: '20', animalNombre: 'Firulais', fechaEntrega: '2026-10-22',
      adoptanteNombre: 'Juan Gómez', adoptanteTelefono: '573115550101',
    }]
    t.repo.resultadosSeguimiento = [{ adopcionId: '1', dia: 2, resultado: 'verde', nota: '' }]

    // 7:00: sin escribir nada, le llega la foto y la alerta de la vacuna de Tobías
    t.repo.ahora = a('07:00')
    expect(await revisarDespertador(t.deps, async () => [YESENIA.telefono])).toBe(1)
    expect(mensajes()[0].tipo).toBe('imagen')
    expect(mensajes().map((s) => s.texto).join('\n')).toContain('Tobías · Rabia · vence el 29 de octubre')

    // Llama al adoptante de Firulais y toca 🟢
    t.repo.ahora = a('07:20')
    await decir(boton('sg:1:5:verde'))
    expect(t.wa.ultimoTexto()).toContain('a *Firulais* le va bien')

    // Mañana con las manos ocupadas
    t.repo.ahora = a('08:05')
    guion.m1 = { transcripcion: 'Le di la amoxicilina a Mateo', confianza: 0.95, acciones: [DOSIS_MATEO_8] }
    await decir(audio('m1'))
    t.repo.ahora = a('09:15')
    guion.m2 = { transcripcion: 'llegaron 15 kilos de carne de don Carlos', confianza: 0.93, acciones: [] }
    await decir(audio('m2'))
    t.repo.ahora = a('10:30')
    guion.m3 = { transcripcion: 'le curé la herida a Mateo', confianza: 0.94, acciones: [{ tipo: 'nota', animalId: '11', texto: 'Curación de la herida' }] }
    await decir(audio('m3'))
    t.repo.ahora = a('11:00')
    guion.m4 = { transcripcion: 'entraron 110 mil de donación', confianza: 0.95, acciones: [donacion(110_000)] }
    await decir(audio('m4'))
    // La plata la confirma ella con un "sí" en audio
    guion.si = { transcripcion: 'sí, está bien', confianza: 0.95 }
    await decir(audio('si'))

    // Lo que ve un vecino que escanea el QR de la tienda
    const app = crearApp({
      deps: t.deps, usuarioPorSesion: async () => null, eventos: async () => ({ dosis: [], inventario: [], movimientos: [], notas: [] }),
      leerArchivo: async () => null, verifyToken: 'v', appSecret: 's',
    })
    const publico = await (await app.request('/api/publico/meta-del-dia')).json()
    expect(publico).toMatchObject({ metaKg: 25, recaudadoKg: 15, metaPesos: 150_000, recaudadoPesos: 110_000 })
    expect(publico.ultimasAcciones.map((x: { texto: string }) => x.texto)).toEqual([
      'Llegó un aporte de $110.000',
      'Cuidaron a Mateo y anotaron cómo sigue',
      'Llegaron 15 kg de carne para los perros',
      'Mateo recibió su Amoxicilina',
    ])
    expect(JSON.stringify(publico)).not.toMatch(/Yesenia|Carlos|Juan/)

    // Al día siguiente el resumen vuelve a llegar, una sola vez
    t.repo.ahora = a('07:00', '28')
    expect(await revisarDespertador(t.deps, async () => [YESENIA.telefono])).toBe(1)
    t.repo.ahora = a('07:01', '28')
    expect(await revisarDespertador(t.deps, async () => [YESENIA.telefono])).toBe(0)
  })
})

describe('la voluntaria también manda audios', () => {
  it('un audio clarito con plata de una voluntaria no registra la plata; lo demás sí', async () => {
    t.repo.ahora = a('14:05')
    guion.v = {
      transcripcion: 'le di la pastilla a Tobías y me dieron 20 mil de donación',
      confianza: 0.95,
      acciones: [DOSIS_TOBIAS, donacion(20_000)],
    }
    await decir(audio('v'), SARA)
    expect(t.repo.registros.flatMap((r) => r.acciones.map((x) => x.tipo))).toEqual(['dosis'])
    expect(mensajes(SARA).map((s) => s.texto).join('\n')).toContain('Lo de la plata lo registra la administradora')
  })
})

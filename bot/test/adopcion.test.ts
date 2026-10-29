// Solicitudes de adopción por API: solo adopciones y administración; importar dos veces no duplica; lo humano gana.
import { beforeEach, describe, expect, it } from 'vitest'
import { crearApp } from '../src/app.js'
import type { Usuario } from '../src/tipos.js'
import { CAROLINA, crearDeps, LUIS } from './fakes.js'

const MARCELA: Usuario = { id: 4, nombre: 'Marcela', rol: 'adopciones', telefono: '573000000004' }
const RUTA = '/api/adopciones/solicitudes'

/** Una respuesta del formulario, completa y sin señales de alerta */
const formulario = (cambios: Record<string, unknown> = {}) => ({
  id: 'form-001',
  nombre: 'Laura Gómez',
  telefono: '300 555 1234',
  cedula: '1020304050',
  direccion: 'Cra 10 # 20-30',
  animalId: '10',
  familiaDeAcuerdo: true,
  paraQuien: 'yo',
  vivienda: 'apartamento',
  viviendaConMallas: true,
  dondeVivira: 'dentro_casa',
  aceptaEsterilizar: true,
  aceptaVacunar: true,
  aceptaSeguimiento: true,
  quiereEntregaInmediata: false,
  preguntoPorCaracter: true,
  planEmergencia: 'Lo dejo con mi hermana, que vive cerca',
  mascotasAnteriores: 'Tuve una perrita 12 años',
  motivo: 'Vivo sola y quiero compañía',
  ...cambios,
})

let t: ReturnType<typeof crearDeps>
let app: ReturnType<typeof crearApp>
const token: Record<string, string> = {}

beforeEach(async () => {
  t = crearDeps()
  t.repo.usuarios.push(MARCELA)
  for (const u of [LUIS, CAROLINA, MARCELA]) token[u.nombre] = await t.repo.crearSesion(u.id)
  app = crearApp({
    deps: t.deps,
    usuarioPorSesion: async (tk) => {
      const id = t.repo.sesiones.get(tk)
      return id ? t.repo.usuarioPorId(id) : null
    },
    eventos: async () => ({ dosis: [], inventario: [], movimientos: [], notas: [] }),
    leerArchivo: async () => null,
    verifyToken: 'verificar',
    appSecret: 'secreto',
  })
})

const como = (u: Usuario) => ({ Authorization: `Bearer ${token[u.nombre]}`, 'content-type': 'application/json' })
const listar = (u: Usuario = MARCELA) => app.request(RUTA, { headers: como(u) })
const importar = (cuerpo: unknown, u: Usuario = MARCELA) => app.request(RUTA, { method: 'POST', body: JSON.stringify(cuerpo), headers: como(u) })
const cambiar = (id: string, cuerpo: unknown, u: Usuario = MARCELA) =>
  app.request(`${RUTA}/${id}`, { method: 'POST', body: JSON.stringify(cuerpo), headers: como(u) })
type Lista = { solicitudes: Record<string, unknown>[] }

describe('quién puede ver y cambiar solicitudes', () => {
  it('sin sesión: 401', async () => {
    expect((await app.request(RUTA)).status).toBe(401)
  })

  it('un cuidador no las ve ni las cambia: 403', async () => {
    expect((await listar(LUIS)).status).toBe(403)
    expect((await importar(formulario(), LUIS)).status).toBe(403)
    expect((await cambiar('1', { nota: 'x' }, LUIS)).status).toBe(403)
    expect(t.repo.adopcion).toHaveLength(0)
  })

  it('adopciones y administración sí', async () => {
    expect((await listar(MARCELA)).status).toBe(200)
    expect((await listar(CAROLINA)).status).toBe(200)
  })
})

describe('importar del formulario', () => {
  it('guarda la solicitud y la devuelve con su sugerencia', async () => {
    const r = await importar(formulario())
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ id: '1', nueva: true })
    const { solicitudes } = (await (await listar()).json()) as Lista
    expect(solicitudes).toHaveLength(1)
    expect(solicitudes[0]).toMatchObject({
      id: '1', nombre: 'Laura Gómez', cedula: '1020304050', animalId: '10', origen: 'formulario',
      montonManual: null, nota: '', llamadaAgendada: null, visitaPropuesta: null,
      sugerencia: { monton: 'verde' },
    })
  })

  it('importar la misma respuesta dos veces no la duplica', async () => {
    await importar(formulario())
    const r = await importar(formulario({ motivo: 'Cambié el motivo' }))
    expect(await r.json()).toEqual({ id: '1', nueva: false })
    const { solicitudes } = (await (await listar()).json()) as Lista
    expect(solicitudes).toHaveLength(1)
    expect(solicitudes[0].motivo).toBe('Cambié el motivo')
  })

  it('la regla roja se ve en la sugerencia con su razón', async () => {
    await importar(formulario({ paraQuien: 'regalo', destinatario: 'su mamá' }))
    const { solicitudes } = (await (await listar()).json()) as Lista
    expect(solicitudes[0].sugerencia).toMatchObject({ monton: 'rojo' })
    expect(String((solicitudes[0].sugerencia as { razon: string }).razon)).toContain('regalo')
  })

  it('rechaza lo incompleto con un mensaje claro y no guarda nada', async () => {
    const sinId = await importar(formulario({ id: '' }))
    expect(sinId.status).toBe(400)
    expect(((await sinId.json()) as { error: string }).error).toContain('"id"')
    const malVivienda = await importar(formulario({ vivienda: 'castillo' }))
    expect(malVivienda.status).toBe(400)
    expect(((await malVivienda.json()) as { error: string }).error).toContain('"vivienda"')
    expect(t.repo.adopcion).toHaveLength(0)
  })
})

describe('lo que decide la coordinación', () => {
  beforeEach(() => importar(formulario({ paraQuien: 'regalo' })))

  it('mover de montón, nota y llamada quedan guardados; la sugerencia sigue visible', async () => {
    const r = await cambiar('1', { montonManual: 'verde', nota: 'Hablé con ella: es para su mamá que vive con ella', llamadaAgendada: '2026-10-30T15:00:00-05:00' })
    expect(r.status).toBe(200)
    const s = ((await (await listar()).json()) as Lista).solicitudes[0]
    expect(s).toMatchObject({ montonManual: 'verde', nota: 'Hablé con ella: es para su mamá que vive con ella', llamadaAgendada: '2026-10-30T15:00:00-05:00' })
    expect(s.sugerencia).toMatchObject({ monton: 'rojo' })
  })

  it('solo cambia lo que viene, y mandar lo mismo dos veces deja lo mismo', async () => {
    await cambiar('1', { nota: 'primera' })
    await cambiar('1', { montonManual: 'amarillo' })
    await cambiar('1', { montonManual: 'amarillo' })
    expect(((await (await listar()).json()) as Lista).solicitudes[0]).toMatchObject({ nota: 'primera', montonManual: 'amarillo' })
  })

  it('volver a importar del formulario no borra lo que decidió la coordinación', async () => {
    await cambiar('1', { montonManual: 'verde', nota: 'ya la llamé' })
    await importar(formulario({ paraQuien: 'regalo', motivo: 'otro' }))
    expect(((await (await listar()).json()) as Lista).solicitudes[0]).toMatchObject({ montonManual: 'verde', nota: 'ya la llamé', motivo: 'otro' })
  })

  it('montón que no existe, cuerpo vacío o id que no existe se rechazan', async () => {
    expect((await cambiar('1', { montonManual: 'azul' })).status).toBe(400)
    expect((await cambiar('1', {})).status).toBe(400)
    expect((await cambiar('1', { llamadaAgendada: 'mañana' })).status).toBe(400)
    expect((await cambiar('999', { nota: 'x' })).status).toBe(404)
  })
})

describe('solicitudes que armó el agente', () => {
  it('se sugieren por sus puntajes y muestran la visita como propuesta', async () => {
    await t.repo.guardarSolicitudAdopcion(
      {
        origen: 'agente', claveOrigen: 'wa:573009998877', visitaPropuesta: new Date('2026-10-31T15:00:00Z'),
        puntajeIdoneidad: 82, puntajeRiesgo: 20,
        respuestas: { ...formulario(), nombre: 'Pedro', telefono: '573009998877', cedula: '', direccion: '' } as never,
      },
      t.repo.ahora,
    )
    const s = ((await (await listar()).json()) as Lista).solicitudes[0]
    expect(s).toMatchObject({ origen: 'agente', visitaEstado: 'propuesta', visitaPropuesta: '2026-10-31T15:00:00.000Z', puntajeIdoneidad: 82 })
    expect(s.sugerencia).toMatchObject({ monton: 'verde' })
    expect(String((s.sugerencia as { razon: string }).razon)).toContain('Pre-evaluación del agente')
  })
})

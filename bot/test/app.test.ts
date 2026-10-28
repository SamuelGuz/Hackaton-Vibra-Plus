import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import { crearApp } from '../src/app.js'
import { CAROLINA, crearDeps, LUIS } from './fakes.js'

const SECRETO = 'secreto-de-prueba'
const UUID = '0b9f5d3e-4c1a-4e2b-9a7f-1d2c3b4a5e6f'

let t: ReturnType<typeof crearDeps>
let app: ReturnType<typeof crearApp>

beforeEach(() => {
  t = crearDeps()
  app = crearApp({
    deps: t.deps,
    usuarioPorSesion: async (token) => {
      const id = t.repo.sesiones.get(token)
      return id ? t.repo.usuarioPorId(id) : null
    },
    eventos: async () => ({ dosis: [], inventario: [], movimientos: [], notas: [] }),
    leerArchivo: async (n) => (n === 'a.ogg' ? { datos: Buffer.from('x'), mime: 'audio/ogg' } : null),
    verifyToken: 'verificar',
    appSecret: SECRETO,
  })
})

function webhook(de: string, id: string, texto: string, firma?: string) {
  const cuerpo = JSON.stringify({
    entry: [{ changes: [{ value: { contacts: [{ wa_id: de, profile: { name: 'X' } }], messages: [{ id, from: de, type: 'text', text: { body: texto } }] } }] }],
  })
  const sig = firma ?? `sha256=${createHmac('sha256', SECRETO).update(cuerpo).digest('hex')}`
  return app.request('/wa', { method: 'POST', body: cuerpo, headers: { 'x-hub-signature-256': sig, 'content-type': 'application/json' } })
}

describe('webhook de WhatsApp', () => {
  it('responde el reto de verificación de Meta', async () => {
    const r = await app.request('/wa?hub.mode=subscribe&hub.verify_token=verificar&hub.challenge=123')
    expect(await r.text()).toBe('123')
    expect((await app.request('/wa?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=1')).status).toBe(403)
  })

  it('rechaza un cuerpo sin la firma de Meta', async () => {
    const r = await webhook(LUIS.telefono, 'w1', 'hola', 'sha256=00')
    expect(r.status).toBe(401)
    await app.ociosa()
    expect(t.wa.enviados).toHaveLength(0)
  })

  it('atiende a alguien del equipo', async () => {
    expect((await webhook(LUIS.telefono, 'w1', 'hola')).status).toBe(200)
    await app.ociosa()
    expect(t.wa.enviados.at(-1)?.telefono).toBe(LUIS.telefono)
    expect(t.wa.ultimo().tipo).toBe('lista')
  })

  it('un mensaje repetido por Meta se atiende una sola vez', async () => {
    await webhook(LUIS.telefono, 'w1', 'hola')
    await webhook(LUIS.telefono, 'w1', 'hola')
    await app.ociosa()
    const listas = t.wa.enviados.filter((e) => e.salida.tipo === 'lista')
    expect(listas).toHaveLength(1)
  })

  it('a un número desconocido no le guarda nada y le avisa una sola vez', async () => {
    await webhook('573119999999', 'w1', 'le di la pastilla a Tobías')
    await webhook('573119999999', 'w2', 'hola?')
    await app.ociosa()
    expect(t.wa.enviados).toHaveLength(1)
    expect(t.wa.ultimoTexto()).toContain('no te tengo en la lista')
    expect(t.repo.registros).toHaveLength(0)
    expect(t.repo.estados.size).toBe(0)
    expect(t.ia.llamadas).toHaveLength(0)
    expect(t.repo.solicitudes).toMatchObject([{ telefono: '573119999999', nombre: 'X', mensajes: 2 }])
  })

  it('los mensajes de una persona se atienden en orden', async () => {
    await t.repo.guardarEstado(LUIS.id, { paso: 'menu' })
    t.repo.ahora = new Date(t.repo.ahora)
    const b = (id: string, boton: string) =>
      JSON.stringify({
        entry: [{ changes: [{ value: { messages: [{ id, from: LUIS.telefono, type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: boton, title: '' } } }] } }] }],
      })
    for (const [id, boton] of [['b1', 'm:entro'], ['b2', 'menu']]) {
      const cuerpo = b(id, boton)
      await app.request('/wa', {
        method: 'POST',
        body: cuerpo,
        headers: { 'x-hub-signature-256': `sha256=${createHmac('sha256', SECRETO).update(cuerpo).digest('hex')}` },
      })
    }
    await app.ociosa()
    expect(t.repo.estados.get(LUIS.id)?.estado.paso).toBe('menu')
  })
})

describe('API del panel', () => {
  const conToken = async () => ({ Authorization: `Bearer ${await t.repo.crearSesion(LUIS.id)}` })

  it('sin sesión responde 401', async () => {
    expect((await app.request('/api/hoy')).status).toBe(401)
    expect((await app.request('/api/hoy', { headers: { Authorization: 'Bearer falso' } })).status).toBe(401)
  })

  it('GET /api/hoy devuelve los datos del albergue y quién soy', async () => {
    const r = await app.request('/api/hoy', { headers: await conToken() })
    const d = await r.json()
    expect(d.yo).toBe('1')
    expect(d.animales).toHaveLength(3)
    expect(d.configComida.kgPorBulto.perro).toBe(25)
  })

  it('POST /api/eventos guarda confirmado y no repite el mismo uuid', async () => {
    const h = { ...(await conToken()), 'content-type': 'application/json' }
    const cuerpo = JSON.stringify([{ id: UUID, tipo: 'inventario', especie: 'perro', cambio: -1 }])
    const r1 = await (await app.request('/api/eventos', { method: 'POST', body: cuerpo, headers: h })).json()
    const r2 = await (await app.request('/api/eventos', { method: 'POST', body: cuerpo, headers: h })).json()
    expect(r1.guardados[0].registroId).toBe(r2.guardados[0].registroId)
    expect(t.repo.registros).toHaveLength(1)
    expect(t.repo.registros[0]).toMatchObject({ canal: 'panel', estadoActual: 'confirmado', usuarioId: LUIS.id })
  })

  it('POST /api/eventos guarda la foto del recibo como archivo y en la base solo queda su ruta', async () => {
    const h = { ...(await conToken()), 'content-type': 'application/json' }
    const foto = `data:image/webp;base64,${Buffer.from('foto-del-recibo').toString('base64')}`
    const evento = {
      id: UUID,
      tipo: 'movimiento',
      movimiento: { tipo: 'gasto', monto: 150000, categoria: 'limpieza', clinicaId: null, abonoDeuda: false, foto, nota: '' },
    }
    const r = await app.request('/api/eventos', { method: 'POST', body: JSON.stringify([evento]), headers: h })
    expect(r.status).toBe(200)
    expect(t.repo.registros[0].acciones[0]).toMatchObject({ movimiento: { foto: expect.stringMatching(/^\/archivos\//) } })
  })

  it('POST /api/eventos rechaza eventos inválidos', async () => {
    const h = { ...(await conToken()), 'content-type': 'application/json' }
    const r = await app.request('/api/eventos', { method: 'POST', body: JSON.stringify([{ id: 'x', tipo: 'nada' }]), headers: h })
    expect(r.status).toBe(400)
    expect(t.repo.registros).toHaveLength(0)
  })

  it('POST /api/eventos/estado confirma lo que mandó el bot', async () => {
    await t.repo.crearRegistro({ usuarioId: 2, canal: 'whatsapp', tipoEntrada: 'audio', transcripcion: 'x', acciones: [], estado: 'por_confirmar' })
    const h = { ...(await conToken()), 'content-type': 'application/json' }
    const r = await app.request('/api/eventos/estado', { method: 'POST', body: JSON.stringify({ ids: ['1'], estado: 'confirmado' }), headers: h })
    expect(await r.json()).toEqual({ cambiados: 1 })
    expect(t.repo.registros[0].estadoActual).toBe('confirmado')
  })

  it('GET /api/eventos valida las fechas y el tipo', async () => {
    const h = await conToken()
    expect((await app.request('/api/eventos?desde=ayer', { headers: h })).status).toBe(400)
    expect((await app.request('/api/eventos?tipo=otro', { headers: h })).status).toBe(400)
    const r = await app.request('/api/eventos?desde=2026-10-20&hasta=2026-10-27&tipo=dosis', { headers: h })
    expect(await r.json()).toEqual({ dosisDadas: [] })
  })

  it('el CORS deja pasar solo al panel', async () => {
    const r = await app.request('/api/hoy', { method: 'OPTIONS', headers: { Origin: 'https://panel.huellitas.test', 'Access-Control-Request-Method': 'GET' } })
    expect(r.headers.get('access-control-allow-origin')).toBe('https://panel.huellitas.test')
  })

  it('GET /api/hoy le cuenta a la administradora cuántos quieren entrar al equipo', async () => {
    await webhook('573119999999', 'w1', 'hola')
    await app.ociosa()
    const admin = { Authorization: `Bearer ${await t.repo.crearSesion(CAROLINA.id)}` }
    expect((await (await app.request('/api/hoy', { headers: admin })).json()).solicitudesEquipo).toBe(1)
    expect((await (await app.request('/api/hoy', { headers: await conToken() })).json()).solicitudesEquipo).toBe(0)
  })

  it('los archivos piden sesión (también por ?t= para las etiquetas <img> y <audio>)', async () => {
    expect((await app.request('/archivos/a.ogg')).status).toBe(401)
    const token = await t.repo.crearSesion(LUIS.id)
    const r = await app.request(`/archivos/a.ogg?t=${token}`)
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('audio/ogg')
  })
})

describe('Equipo', () => {
  const comoAdmin = async () => ({
    Authorization: `Bearer ${await t.repo.crearSesion(CAROLINA.id)}`,
    'content-type': 'application/json',
  })
  const post = async (ruta: string, cuerpo: unknown, headers?: Record<string, string>) =>
    app.request(ruta, { method: 'POST', body: JSON.stringify(cuerpo), headers: headers ?? (await comoAdmin()) })

  it('solo la administradora lo ve y lo cambia', async () => {
    const luis = { Authorization: `Bearer ${await t.repo.crearSesion(LUIS.id)}`, 'content-type': 'application/json' }
    expect((await app.request('/api/equipo', { headers: luis })).status).toBe(403)
    expect((await post('/api/equipo', { nombre: 'Samuel', rol: 'admin', telefono: '573001112233' }, luis)).status).toBe(403)
    expect((await post(`/api/equipo/${LUIS.id}/activo`, { activo: false }, luis)).status).toBe(403)
    expect(t.repo.usuarios).toHaveLength(3)
  })

  it('quien escribió sin estar aparece en la lista; al agregarlo el bot le avisa y ya lo atiende', async () => {
    await webhook('573001112233', 'w1', 'Hola')
    await app.ociosa()
    const lista = await (await app.request('/api/equipo', { headers: await comoAdmin() })).json()
    expect(lista.solicitudes).toMatchObject([{ telefono: '573001112233', nombre: 'X' }])
    expect(lista.personas).toHaveLength(3)

    const r = await post('/api/equipo', { nombre: '  Samuel ', rol: 'voluntario', telefono: '573001112233' })
    expect(await r.json()).toMatchObject({ persona: { nombre: 'Samuel', rol: 'voluntario', telefono: '573001112233' }, avisado: true })
    expect(t.repo.solicitudes).toHaveLength(0)
    expect(t.wa.ultimoTexto()).toContain('Ya estás en el equipo')

    await webhook('573001112233', 'w2', 'hola')
    await app.ociosa()
    expect(t.wa.ultimo().tipo).toBe('lista')
  })

  it('acepta el número sin el 57 y no duplica a alguien que ya existía', async () => {
    await post('/api/equipo', { nombre: 'Don Luis Pérez', rol: 'cuidador', telefono: '300 000 0001' })
    expect(t.repo.usuarios).toHaveLength(3)
    expect(t.repo.usuarios[0].nombre).toBe('Don Luis Pérez')
  })

  it('si el aviso por WhatsApp no sale, la persona igual queda agregada', async () => {
    t.wa.enviar = async () => {
      throw new Error('fuera de la ventana de 24 h')
    }
    const r = await post('/api/equipo', { nombre: 'Samuel', rol: 'voluntario', telefono: '573001112233' })
    expect(await r.json()).toMatchObject({ avisado: false })
    expect(await t.repo.usuarioPorTelefono('573001112233')).toMatchObject({ nombre: 'Samuel' })
  })

  it('rechaza datos incompletos', async () => {
    expect((await post('/api/equipo', { nombre: '', rol: 'voluntario', telefono: '573001112233' })).status).toBe(400)
    expect((await post('/api/equipo', { nombre: 'Samuel', rol: 'jefe', telefono: '573001112233' })).status).toBe(400)
    expect((await post('/api/equipo', { nombre: 'Samuel', rol: 'voluntario', telefono: '123' })).status).toBe(400)
    expect(t.repo.usuarios).toHaveLength(3)
  })

  it('quitar a alguien hace que el bot deje de atenderlo; no se puede quitar a sí misma', async () => {
    expect((await post(`/api/equipo/${LUIS.id}/activo`, { activo: false })).status).toBe(200)
    await webhook(LUIS.telefono, 'w1', 'hola')
    await app.ociosa()
    expect(t.wa.ultimoTexto()).toContain('no te tengo en la lista')

    expect((await post(`/api/equipo/${CAROLINA.id}/activo`, { activo: false })).status).toBe(400)
    expect((await post('/api/equipo/99/activo', { activo: true })).status).toBe(404)
  })

  it('descartar una solicitud la saca de la lista', async () => {
    await webhook('573119999999', 'w1', 'hola')
    await app.ociosa()
    await post('/api/equipo/solicitudes/descartar', { telefono: '573119999999' })
    expect(t.repo.solicitudes).toHaveLength(0)
  })
})

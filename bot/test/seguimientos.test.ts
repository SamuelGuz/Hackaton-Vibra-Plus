// Seguimientos de adopción (días 2, 5, 15, 30 y 90): a quién llamar hoy, anotarlo con un toque y la ruta del panel.
import { beforeEach, describe, expect, it } from 'vitest'
import { armarSeguimientos, pendientesDeHoy, type Entrega } from '../src/adopcion/seguimientos.js'
import { crearApp } from '../src/app.js'
import { atender } from '../src/conversacion/atender.js'
import type { Entrada, Usuario } from '../src/tipos.js'
import { AHORA, ANDREA, CAROLINA, crearDeps, LUIS } from './fakes.js'

const texto = (t: string): Entrada => ({ tipo: 'texto', texto: t })
const boton = (id: string): Entrada => ({ tipo: 'boton', id, titulo: '' })
const VOLUNTARIA: Usuario = { id: 9, nombre: 'Sara', rol: 'voluntario', telefono: '573009' }

/** Entregado hace 5 días (27 oct − 5 = 22 oct) y hace 30 días (27 sep) */
const FIRULAIS: Entrega = {
  adopcionId: '1', solicitudId: null, animalId: '20', animalNombre: 'Firulais', fechaEntrega: '2026-10-22',
  adoptanteNombre: 'Juan Gómez', adoptanteTelefono: '573115550101',
}
const CANELITA: Entrega = {
  adopcionId: '2', solicitudId: '7', animalId: '21', animalNombre: 'Canelita', fechaEntrega: '2026-09-27',
  adoptanteNombre: 'María López', adoptanteTelefono: '573105550202',
}

describe('quién toca hoy', () => {
  it('un animal entregado hace 5 días aparece en seguimientosDeHoy()', () => {
    const lista = armarSeguimientos([FIRULAIS], [{ adopcionId: '1', dia: 2, resultado: 'verde', nota: '' }])
    expect(pendientesDeHoy(lista, AHORA).map((s) => [s.animalNombre, s.dia, s.fecha])).toEqual([['Firulais', 5, '2026-10-27']])
  })

  it('lo atrasado sale primero y lo ya llamado no sale', () => {
    const lista = armarSeguimientos([FIRULAIS, CANELITA], [
      { adopcionId: '2', dia: 2, resultado: 'verde', nota: '' },
      { adopcionId: '2', dia: 5, resultado: 'amarillo', nota: '' },
    ])
    expect(pendientesDeHoy(lista, AHORA).map((s) => `${s.animalNombre}/${s.dia}`)).toEqual(['Canelita/15', 'Firulais/2', 'Firulais/5', 'Canelita/30'])
  })
})

describe('por WhatsApp', () => {
  let t: ReturnType<typeof crearDeps>
  const decir = (e: Entrada, u: Usuario = CAROLINA) => atender(t.deps, u, e)
  const textos = () => t.wa.enviados.map((x) => x.salida.texto).join('\n---\n')

  beforeEach(async () => {
    t = crearDeps()
    t.repo.entregas = [FIRULAIS, CANELITA]
    t.repo.resultadosSeguimiento = [2, 5, 15].map((dia) => ({ adopcionId: '2', dia, resultado: 'verde' as const, nota: '' }))
    t.repo.resultadosSeguimiento.push({ adopcionId: '1', dia: 2, resultado: 'verde', nota: '' })
    for (const u of [LUIS, ANDREA, CAROLINA, VOLUNTARIA]) await t.repo.guardarEstado(u.id, { paso: 'menu' })
  })

  it('"seguimientos": la lista de hoy con el teléfono, y un mensaje con 3 botones por cada llamada', async () => {
    await decir(texto('seguimientos'))
    expect(t.ia.llamadas).toHaveLength(0)
    expect(textos()).toContain(
      '📞 Hoy toca llamar a los adoptantes de:\n• Firulais (Día 5) — Adoptante: Juan Gómez (311 555 0101)\n• Canelita (Día 30) — Adoptante: María López (310 555 0202)',
    )
    const conBotones = t.wa.enviados.map((x) => x.salida).filter((s) => s.tipo === 'botones')
    expect(conBotones.map((s) => s.botones.map((b) => b.id))).toEqual([
      ['sg:1:5:verde', 'sg:1:5:amarillo', 'sg:1:5:rojo'],
      ['sg:2:30:verde', 'sg:2:30:amarillo', 'sg:2:30:rojo'],
    ])
    expect(conBotones[0].botones.map((b) => b.titulo)).toEqual(['🟢 Todo bien', '🟡 Ojo / Revisar', '🔴 Problemas'])
  })

  it('un toque en 🟢 lo anota y ya no sale en la lista', async () => {
    await decir(boton('sg:1:5:verde'))
    expect(t.repo.resultadosSeguimiento).toContainEqual({ adopcionId: '1', dia: 5, resultado: 'verde', nota: '' })
    expect(t.wa.ultimoTexto()).toContain('Firulais')
    t.wa.limpiar()
    await decir(texto('a quién toca llamar hoy'))
    expect(textos()).not.toContain('Firulais')
    expect(textos()).toContain('Canelita (Día 30)')
  })

  it('🔴 avisa que una persona tiene que llamar y revisar si toca rescatarlo', async () => {
    await decir(boton('sg:2:30:rojo'))
    expect(t.repo.resultadosSeguimiento).toContainEqual({ adopcionId: '2', dia: 30, resultado: 'rojo', nota: '' })
    expect(t.wa.ultimoTexto()).toMatch(/rescat/i)
  })

  it('un botón de un seguimiento que no existe no se cae', async () => {
    await decir(boton('sg:99:5:verde'))
    expect(t.wa.ultimoTexto()).toContain('Se me perdió el hilo')
  })

  it('una voluntaria ve a quién toca llamar, pero sin el teléfono del adoptante', async () => {
    await decir(texto('seguimientos'), VOLUNTARIA)
    expect(textos()).toContain('• Firulais (Día 5) — Adoptante: Juan Gómez')
    expect(textos()).not.toContain('311')
  })

  it('"Ver lo de hoy" trae los seguimientos del día', async () => {
    await decir(boton('m:hoy'))
    expect(t.wa.ultimoTexto()).toContain('📞 Hoy toca llamar a los adoptantes de:')
    expect(t.wa.ultimoTexto()).toContain('• Firulais (Día 5) — Adoptante: Juan Gómez (311 555 0101)')
  })

  it('sin seguimientos pendientes lo dice', async () => {
    t.repo.entregas = []
    await decir(texto('seguimientos'))
    expect(t.wa.ultimoTexto()).toContain('Hoy no toca llamar a ningún adoptante')
  })
})

describe('GET /api/seguimientos/hoy', () => {
  let t: ReturnType<typeof crearDeps>
  let app: ReturnType<typeof crearApp>
  beforeEach(() => {
    t = crearDeps()
    t.repo.entregas = [FIRULAIS]
    app = crearApp({
      deps: t.deps,
      usuarioPorSesion: async (token) => {
        const id = t.repo.sesiones.get(token)
        return id ? t.repo.usuarioPorId(id) : null
      },
      eventos: async () => ({ dosis: [], inventario: [], movimientos: [], notas: [] }),
      leerArchivo: async () => null,
      verifyToken: 'v',
      appSecret: 's',
    })
  })
  const pedir = async (u?: Usuario) => {
    const headers: Record<string, string> = u ? { authorization: `Bearer ${await t.repo.crearSesion(u.id)}` } : {}
    return app.request('/api/seguimientos/hoy', { headers })
  }

  it('la administración recibe la lista con el teléfono', async () => {
    const r = await pedir(CAROLINA)
    expect(r.status).toBe(200)
    const j = await r.json()
    expect(j.fecha).toBe('2026-10-27')
    expect(j.seguimientos.map((s: { animalNombre: string; dia: number; adoptanteTelefono: string | null; atrasado: boolean }) => [s.animalNombre, s.dia, s.adoptanteTelefono, s.atrasado])).toEqual([
      ['Firulais', 2, '573115550101', true],
      ['Firulais', 5, '573115550101', false],
    ])
  })

  it('un cuidador la recibe sin teléfonos; sin sesión, 401', async () => {
    const j = await (await pedir(LUIS)).json()
    expect(j.seguimientos).toHaveLength(2)
    expect(j.seguimientos.every((s: { adoptanteTelefono: string | null }) => s.adoptanteTelefono === null)).toBe(true)
    expect((await pedir()).status).toBe(401)
  })
})

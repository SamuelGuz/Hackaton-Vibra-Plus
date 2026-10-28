// El panel conectado al servidor: entra con el enlace del bot y manda cada toque a /api/*.
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import Dexie from 'dexie'
import { App } from '../app/App'
import { crearDatosDemo } from './demo'

type Pedido = { url: string; metodo: string; auth: string | null; cuerpo: any }
let pedidos: Pedido[]
let respuestaHoy: { estado: number; cuerpo: unknown }

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 27, 9, 30))
  vi.stubEnv('VITE_API_URL', 'http://api.prueba')
  localStorage.clear()
  await Dexie.delete('huellitas')
  pedidos = []
  respuestaHoy = { estado: 200, cuerpo: { ...crearDatosDemo(new Date(2026, 9, 27, 9, 30)), yo: 'p-luis' } }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const auth = new Headers(init.headers).get('Authorization')
      pedidos.push({ url, metodo: init.method ?? 'GET', auth, cuerpo: init.body ? JSON.parse(String(init.body)) : null })
      if (url.endsWith('/api/hoy')) return new Response(JSON.stringify(respuestaHoy.cuerpo), { status: respuestaHoy.estado })
      if (url.endsWith('/api/eventos')) return new Response(JSON.stringify({ guardados: [], errores: [] }))
      return new Response(JSON.stringify({ cambiados: 1 }))
    }),
  )
  window.history.pushState({}, '', '/?t=token-de-luis')
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const posts = (ruta: string) => pedidos.filter((p) => p.metodo === 'POST' && p.url.endsWith(ruta))

describe('panel conectado al servidor', () => {
  it('entra con el enlace del bot sin preguntar quién es, y guarda el token', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: /Don Luis/ })).toBeTruthy()
    expect(pedidos[0]).toMatchObject({ url: 'http://api.prueba/api/hoy', auth: 'Bearer token-de-luis' })
    expect(window.location.search).toBe('')
    expect(localStorage.getItem('huellitas.token')).toBe('token-de-luis')
  })

  it('carga también con el modo estricto de React (en desarrollo monta todo dos veces)', async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    expect(await screen.findByRole('heading', { level: 1, name: /Don Luis/ })).toBeTruthy()
  })

  it('abrir un bulto lo manda como evento, y Deshacer lo anula por su id', async () => {
    render(<App />)
    const perro = await screen.findByRole('region', { name: 'Comida de perro' })
    fireEvent.click(within(perro).getByRole('button', { name: 'Abrí un bulto' }))
    await waitFor(() => expect(posts('/api/eventos').length).toBe(1))
    const [evento] = posts('/api/eventos')[0].cuerpo.eventos
    expect(evento).toMatchObject({ tipo: 'inventario', especie: 'perro', cambio: -1 })
    expect(evento.id).toMatch(/^[0-9a-f-]{36}$/)

    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    await waitFor(() => expect(posts('/api/eventos/estado').length).toBe(1))
    expect(posts('/api/eventos/estado')[0].cuerpo).toEqual({ ids: [evento.id], estado: 'anulado' })
  })

  it('"Ya se la di" manda la dosis con el animal, el tratamiento y la hora', async () => {
    render(<App />)
    const dosis = await screen.findByRole('article', { name: 'Mateo · Meloxicam (dolor) · 8:00 a. m.' })
    fireEvent.click(within(dosis).getByRole('button', { name: 'Ya se la di' }))
    await waitFor(() => expect(posts('/api/eventos').length).toBe(1))
    expect(posts('/api/eventos')[0].cuerpo.eventos[0]).toMatchObject({
      tipo: 'dosis',
      animalId: 'perro-1',
      tratamientoId: 't-2',
      hora: '08:00',
    })
  })

  it('confirmar un audio desde Hoy lo confirma en el servidor', async () => {
    render(<App />)
    const dosis = await screen.findByRole('article', { name: 'Mateo · Amoxicilina · 8:00 a. m.' })
    fireEvent.click(within(dosis).getByRole('button', { name: 'Confirmar todo' }))
    await waitFor(() => expect(posts('/api/eventos/estado').length).toBe(1))
    expect(posts('/api/eventos/estado')[0].cuerpo).toEqual({ ids: ['c-1'], estado: 'confirmado' })
  })

  it('la administradora ve quién quiere entrar al equipo y lo agrega con su rol', async () => {
    respuestaHoy.cuerpo = { ...(respuestaHoy.cuerpo as object), yo: 'p-carolina', solicitudesEquipo: 1 }
    const equipo = {
      personas: [{ id: 3, nombre: 'Carolina', rol: 'admin', telefono: '573000000003', activo: true }],
      solicitudes: [{ telefono: '573001112233', nombre: 'Samuel', mensajes: 1, ultimoMensajeEn: '2026-10-28T17:36:00Z' }],
    }
    const fetchBase = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (String(url).endsWith('/api/equipo') && init?.method === 'GET') return new Response(JSON.stringify(equipo))
      if (String(url).endsWith('/api/equipo')) {
        await fetchBase(url, init)
        return new Response(JSON.stringify({ persona: { id: 4, nombre: 'Samuel', rol: 'voluntario' }, avisado: true }))
      }
      return fetchBase(url, init)
    })
    window.history.pushState({}, '', '/equipo?t=token-de-carolina')
    render(<App />)

    fireEvent.click(await screen.findByRole('link', { name: /Equipo/ }))
    const samuel = await screen.findByRole('listitem', { name: 'Samuel' })
    expect(within(samuel).getByText('+57 300 111 2233')).toBeTruthy()
    const agregar = within(samuel).getByRole('button', { name: 'Agregar al equipo' }) as HTMLButtonElement
    expect(agregar.disabled).toBe(true)
    fireEvent.click(within(samuel).getByRole('button', { name: 'Voluntario' }))
    fireEvent.click(agregar)

    await waitFor(() => expect(posts('/api/equipo').length).toBe(1))
    expect(posts('/api/equipo')[0].cuerpo).toEqual({ nombre: 'Samuel', rol: 'voluntario', telefono: '573001112233' })
    expect(await screen.findByText(/Samuel ya está en el equipo/)).toBeTruthy()
  })

  it('con el enlace vencido pide uno nuevo al bot', async () => {
    respuestaHoy = { estado: 401, cuerpo: { error: 'Falta iniciar sesión' } }
    render(<App />)
    expect(await screen.findByText(/Pídele al bot un enlace nuevo/)).toBeTruthy()
    expect(localStorage.getItem('huellitas.token')).toBeNull()
  })
})

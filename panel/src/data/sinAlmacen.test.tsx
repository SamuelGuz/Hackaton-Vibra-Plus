// Si el almacenamiento del celular (IndexedDB) no responde, el panel igual muestra los datos del servidor.
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { App } from '../app/App'
import { crearDatosDemo } from './demo'

vi.mock('./cola', () => {
  const nunca = () => new Promise<never>(() => {})
  return { crearCola: () => ({ encolar: nunca, procesar: nunca, pendientes: nunca, cerrar: nunca }) }
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 27, 9, 30))
  vi.stubEnv('VITE_API_URL', 'http://api.prueba')
  localStorage.clear()
  const datos = { ...crearDatosDemo(new Date(2026, 9, 27, 9, 30)), yo: 'p-luis' }
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(datos))))
  window.history.pushState({}, '', '/?t=token-de-luis')
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('si el almacenamiento del celular no responde, igual muestra los datos', async () => {
  render(<App />)
  expect(await screen.findByRole('heading', { level: 1, name: /Don Luis/ })).toBeTruthy()
})

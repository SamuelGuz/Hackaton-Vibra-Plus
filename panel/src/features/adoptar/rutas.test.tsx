import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { App } from '../../app/App'
import { esVistaAdoptar } from './Adoptar'
import { json, listaEjemplo } from './ejemplos'

const fetchFalso = vi.fn()

beforeEach(() => {
  fetchFalso.mockReset()
  fetchFalso.mockImplementation(async () => json(listaEjemplo()))
  vi.stubGlobal('fetch', fetchFalso)
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  window.history.pushState({}, '', '/')
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((e) => e.remove())
})

describe('rutas de la landing pública', () => {
  it.each(['/adoptar', '/adoptar/', '/?vista=adoptar'])('%s muestra la landing sin pedir sesión', async (ruta) => {
    window.history.pushState({}, '', ruta)
    const abrirBase = vi.spyOn(indexedDB, 'open')

    render(<App />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Adopta un perrito')
    await screen.findByRole('heading', { level: 3, name: 'Toby' })
    // Ni login ni base local: la landing vive antes de los proveedores
    expect(screen.queryByText(/Don Luis/)).toBeNull()
    expect(abrirBase).not.toHaveBeenCalled()
    expect(fetchFalso.mock.calls.every((c) => String(c[0]).includes('/api/publico/'))).toBe(true)
  })

  it('la raíz sigue siendo el panel (no la landing)', () => {
    window.history.pushState({}, '', '/')
    render(<App />)
    expect(screen.queryByRole('heading', { level: 1, name: /Adopta un perrito/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Don Luis/ })).toBeTruthy()
  })

  it('esVistaAdoptar solo acepta /adoptar o vista=adoptar', () => {
    expect(esVistaAdoptar({ pathname: '/adoptar', search: '' })).toBe(true)
    expect(esVistaAdoptar({ pathname: '/', search: '?vista=adoptar' })).toBe(true)
    expect(esVistaAdoptar({ pathname: '/', search: '?vista=otra' })).toBe(false)
    expect(esVistaAdoptar({ pathname: '/animales', search: '' })).toBe(false)
    expect(esVistaAdoptar({ pathname: '/adoptarlo', search: '' })).toBe(false)
  })
})

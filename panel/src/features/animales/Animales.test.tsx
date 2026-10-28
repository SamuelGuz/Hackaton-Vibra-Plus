import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { App } from '../../app/App'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 27, 9, 30))
  localStorage.clear()
  window.history.pushState({}, '', '/')
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function entrarComo(nombre: RegExp) {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: nombre }))
  fireEvent.click(screen.getByRole('link', { name: 'Animales' }))
}

describe('Animales', () => {
  it('las cintas cuentan por estado y filtran al tocarlas', () => {
    entrarComo(/Don Luis/)
    expect(screen.getAllByRole('link', { name: /^Ver a / }).length).toBe(70)
    fireEvent.click(screen.getByRole('button', { name: 'Cuarentena 4' }))
    const visibles = screen.getAllByRole('link', { name: /^Ver a / }).map((l) => l.getAttribute('aria-label'))
    expect(visibles).toEqual(['Ver a Negra', 'Ver a Chispa', 'Ver a Nube', 'Ver a Mango'])
  })

  it('la ficha de Bruno pone las advertencias primero y el cuidador no cambia estados', () => {
    entrarComo(/Don Luis/)
    fireEvent.click(screen.getByRole('link', { name: 'Ver a Bruno' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Bruno' })).toBeTruthy()
    const advertencias = screen.getByRole('list', { name: 'Advertencias' })
    expect(advertencias.textContent).toContain('NO pisos lisos')
    expect(screen.getByText('La piel ya casi no se ve roja.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cambiar estado' })).toBeNull()
  })

  it('bienestar cambia el estado con un toque y puede deshacerlo', () => {
    entrarComo(/Andrés/)
    fireEvent.click(screen.getByRole('link', { name: 'Ver a Negra' }))
    expect(screen.getByText('Cuarentena')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar estado' }))
    fireEvent.click(screen.getByRole('button', { name: 'Listo para adoptar' }))
    expect(screen.getByText('Listo para adoptar')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(screen.getByText('Cuarentena')).toBeTruthy()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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
}

describe('Hoy del cuidador', () => {
  it('el cuidador entra a Hoy y solo ve 2 pestañas', () => {
    entrarComo(/Don Luis/)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Don Luis')
    const pestanas = within(screen.getByRole('navigation', { name: 'Pantallas' })).getAllByRole('link')
    expect(pestanas.map((p) => p.textContent)).toEqual(['Hoy', 'Animales'])
  })

  it('abrir un bulto baja el costal a urgente y se puede deshacer', () => {
    entrarComo(/Don Luis/)
    const perro = screen.getByRole('region', { name: 'Comida de perro' })
    expect(within(perro).getByText('4')).toBeTruthy()
    expect(within(perro).getByText('Ojo')).toBeTruthy()

    fireEvent.click(within(perro).getByRole('button', { name: 'Abrí un bulto' }))
    expect(within(perro).getByText('2')).toBeTruthy()
    expect(within(perro).getByText('Urgente')).toBeTruthy()
    expect(screen.getByText('Quedan 2 días de comida de perro. Toca pedir hoy.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(within(perro).getByText('4')).toBeTruthy()
  })

  it('cuando llegan bultos pregunta cuántos', () => {
    entrarComo(/Don Luis/)
    const gato = screen.getByRole('region', { name: 'Comida de gato' })
    fireEvent.click(within(gato).getByRole('button', { name: 'Llegaron bultos' }))
    fireEvent.click(within(gato).getByRole('button', { name: '2' }))
    expect(within(gato).getByText('30')).toBeTruthy()
  })

  it('"Ya se la di" pone el sello con la hora y el nombre', () => {
    entrarComo(/Don Luis/)
    const dosis = screen.getByRole('article', { name: 'Mateo · Meloxicam (dolor) · 8:00 a. m.' })
    expect(within(dosis).getByText('Atrasada')).toBeTruthy()
    fireEvent.click(within(dosis).getByRole('button', { name: 'Ya se la di' }))
    expect(within(dosis).getByText('Dada ✓')).toBeTruthy()
    expect(within(dosis).getByText('9:30 a. m. · Don Luis')).toBeTruthy()
  })

  it('una dosis que ya llegó por audio no se puede dar dos veces: se confirma', () => {
    entrarComo(/Don Luis/)
    const dosis = screen.getByRole('article', { name: 'Mateo · Amoxicilina · 8:00 a. m.' })
    expect(within(dosis).queryByRole('button', { name: 'Ya se la di' })).toBeNull()
    expect(within(dosis).getByText('Reportada a las 8:12 a. m. por Don Luis')).toBeTruthy()
    fireEvent.click(within(dosis).getByRole('button', { name: 'Confirmar' }))
    expect(within(dosis).getByText('8:12 a. m. · Don Luis')).toBeTruthy()
  })
})

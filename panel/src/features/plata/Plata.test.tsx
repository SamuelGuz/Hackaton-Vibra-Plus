import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { App } from '../../app/App'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 27, 9, 30))
  localStorage.clear()
  window.history.pushState({}, '', '/')
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /Carolina/ }))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const tocar = (nombre: string | RegExp) => fireEvent.click(screen.getByRole('button', { name: nombre }))
const caja = () => screen.getByRole('heading', { level: 1 }).textContent

describe('Plata', () => {
  it('la administradora entra a Plata y ve la caja y la deuda de cada clínica', () => {
    expect(caja()).toContain('$1.240.000')
    expect(screen.getByText('Te faltan $400.000 para el límite')).toBeTruthy()
    expect(screen.getByText('Te faltan $950.000 para el límite')).toBeTruthy()
  })

  it('anotar un gasto en 4 pasos: salió → cuánto → para qué → revisar y guardar', () => {
    tocar('Salió plata')
    expect(screen.getByText('Paso 2 de 4')).toBeTruthy()
    for (const t of ['1', '5', '0', '000']) tocar(t)
    expect(screen.getByText('$150.000')).toBeTruthy()
    tocar('Siguiente')
    tocar('Limpieza')
    expect(screen.getByText('Paso 4 de 4')).toBeTruthy()
    expect(screen.getByText('Salió $150.000')).toBeTruthy()
    tocar('Guardar')
    expect(caja()).toContain('$1.090.000')
    expect(screen.getByText('Listo, quedó guardado')).toBeTruthy()
  })

  it('sin monto no deja seguir', () => {
    tocar('Entró plata')
    expect((screen.getByRole('button', { name: 'Siguiente' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('un abono a la clínica baja su deuda', () => {
    tocar('Salió plata')
    tocar('+100 mil')
    tocar('Siguiente')
    tocar('Veterinaria')
    tocar(/Abono a Clínica Veterinaria 24 Horas/)
    tocar('Guardar')
    expect(caja()).toContain('$1.140.000')
    expect(screen.getByText('Te faltan $500.000 para el límite')).toBeTruthy()
  })

  it('Atrás vuelve al paso anterior y desde el primero cancela', () => {
    tocar('Entró plata')
    tocar('Atrás')
    expect(caja()).toContain('$1.240.000')
  })
})

describe('Comida (administración)', () => {
  it('muestra los costales y lo que se movió en la semana', () => {
    fireEvent.click(screen.getByRole('link', { name: 'Comida' }))
    expect(screen.getByRole('region', { name: 'Comida de perro' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Esta semana' })).toBeTruthy()
    expect(screen.getAllByText(/Se abrió 1 bulto de perro/).length).toBe(2)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { App } from '../../app/App'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 27, 9, 30))
  localStorage.clear()
  window.history.pushState({}, '', '/')
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /Andrés/ }))
  fireEvent.click(screen.getByRole('link', { name: /Por confirmar/ }))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const tarjetas = () => screen.queryAllByRole('article')
const audioDeLuis = () => screen.getByRole('article', { name: 'Audio de Don Luis · 8:12 a. m.' })

describe('Por confirmar', () => {
  it('muestra lo que entendió el bot con las cantidades en grande y lo original', () => {
    expect(tarjetas().length).toBe(3)
    const t = audioDeLuis()
    expect(within(t).getByText('3 ml')).toBeTruthy()
    expect(within(t).getByText('Amoxicilina a Mateo · dosis de las 8:00 a. m.')).toBeTruthy()
    expect(within(t).getByText('−1 bulto')).toBeTruthy()
    expect(within(t).getByText(/Le di la amoxicilina a Mateo/)).toBeTruthy()
  })

  it('confirmar la saca de la bandeja y baja el contador', () => {
    fireEvent.click(within(audioDeLuis()).getByRole('button', { name: 'Confirmar' }))
    expect(tarjetas().length).toBe(2)
    expect(screen.getByLabelText('2 sin confirmar')).toBeTruthy()
  })

  it('corregir deja quitar lo que la IA entendió mal', () => {
    const t = audioDeLuis()
    fireEvent.click(within(t).getByRole('button', { name: 'Corregir' }))
    fireEvent.click(within(t).getAllByRole('button', { name: 'Quitar' })[1])
    expect(within(t).queryByText(/Ya camina solito/)).toBeNull()
    fireEvent.click(within(t).getByRole('button', { name: 'Guardar corregido' }))
    expect(tarjetas().length).toBe(2)
  })

  it('corregir deja cambiar un monto mal leído', () => {
    const t = screen.getByRole('article', { name: /Foto de Carolina/ })
    fireEvent.click(within(t).getByRole('button', { name: 'Corregir' }))
    fireEvent.click(within(t).getByRole('button', { name: 'Cambiar monto' }))
    fireEvent.click(within(t).getByRole('button', { name: 'Borrar' }))
    fireEvent.click(within(t).getByRole('button', { name: 'Listo' }))
    expect(within(t).getByText('+$15.000')).toBeTruthy()
  })

  it('descartar todo la saca sin guardar nada', () => {
    const t = screen.getByRole('article', { name: /Foto de Andrés/ })
    fireEvent.click(within(t).getByRole('button', { name: 'Corregir' }))
    fireEvent.click(within(t).getByRole('button', { name: 'Descartar todo' }))
    expect(tarjetas().length).toBe(2)
  })
})

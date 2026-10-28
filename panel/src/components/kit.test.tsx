import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Boton } from './Boton'
import { Cinta } from './Cinta'
import { Costal, rellenoCostal } from './Costal'
import { FotoInstantanea } from './FotoInstantanea'
import { Nivel } from './Nivel'
import { Sello } from './Sello'

afterEach(cleanup)

describe('Boton', () => {
  it('muestra ícono y palabra, y responde al toque', async () => {
    const alTocar = vi.fn()
    render(<Boton icono="menos" onClick={alTocar}>Abrí un bulto</Boton>)
    const boton = screen.getByRole('button', { name: 'Abrí un bulto' })
    expect(boton.querySelector('svg')).not.toBeNull()
    await userEvent.click(boton)
    expect(alTocar).toHaveBeenCalledOnce()
  })
})

describe('Nivel', () => {
  it('nunca es solo color: dice la palabra con su signo', () => {
    render(<Nivel nivel="urgente" />)
    expect(screen.getByText('Urgente')).toBeTruthy()
    expect(screen.getByText('✕')).toBeTruthy()
  })
})

describe('Cinta', () => {
  it('muestra el estado y su forma de cinta es la misma en cada render', () => {
    const { container, rerender } = render(<Cinta>Cuarentena</Cinta>)
    const forma = (container.firstChild as HTMLElement).style.clipPath
    expect(screen.getByText('Cuarentena')).toBeTruthy()
    expect(forma).toMatch(/^polygon\(/)
    rerender(<Cinta>Cuarentena</Cinta>)
    expect((container.firstChild as HTMLElement).style.clipPath).toBe(forma)
  })
})

describe('FotoInstantanea', () => {
  it('sin foto muestra la silueta dibujada y el nombre', () => {
    render(<FotoInstantanea animal={{ id: 'perro-1', nombre: 'Mateo', especie: 'perro', foto: null }} />)
    expect(screen.getByText('Mateo')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Mateo, perro sin foto' })).toBeTruthy()
  })

  it('con foto la muestra con el nombre como texto alternativo', () => {
    render(<FotoInstantanea animal={{ id: 'gato-1', nombre: 'Luna', especie: 'gato', foto: '/luna.webp' }} />)
    expect(screen.getByRole('img', { name: 'Luna' }).getAttribute('src')).toBe('/luna.webp')
  })
})

describe('Sello', () => {
  it('dice qué se hizo, a qué hora y quién', () => {
    render(<Sello texto="Dada" hora="07:12" quien="Don Luis" />)
    expect(screen.getByText('Dada ✓')).toBeTruthy()
    expect(screen.getByText('7:12 a. m. · Don Luis')).toBeTruthy()
  })

  it('al caer vibra 40 ms', () => {
    const vibrar = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrar, configurable: true })
    render(<Sello texto="Dada" hora="07:12" quien="Don Luis" animar />)
    expect(vibrar).toHaveBeenCalledWith(40)
  })
})

describe('Costal', () => {
  it('se llena según los días: 10 o más es lleno, 0 es vacío', () => {
    expect(rellenoCostal(12)).toBe(1)
    expect(rellenoCostal(5)).toBe(0.5)
    expect(rellenoCostal(0)).toBe(0)
  })

  it('dice los días que quedan y el nivel en palabras', () => {
    render(<Costal especie="perro" dias={2.9} nivel="urgente" />)
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('días')).toBeTruthy()
    expect(screen.getByText('Urgente')).toBeTruthy()
    expect(screen.getByRole('img', { name: /Costal de comida de perro/ })).toBeTruthy()
  })
})

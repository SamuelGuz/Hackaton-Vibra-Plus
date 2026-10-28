import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AvisoDeshacer } from './AvisoDeshacer'
import { EstadoConexion } from './EstadoConexion'
import { PasoAPaso } from './PasoAPaso'
import { TecladoMonto, teclear } from './TecladoMonto'
import { Termometro } from './Termometro'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Termometro', () => {
  it('dice cuánto falta para el límite de la clínica', () => {
    render(<Termometro nombre="Clínica 24 Horas" deuda={2_600_000} limite={3_000_000} />)
    expect(screen.getByText('Te faltan $400.000 para el límite')).toBeTruthy()
    expect(screen.getByText('Urgente')).toBeTruthy()
  })

  it('avisa cuando ya se pasó del límite', () => {
    render(<Termometro nombre="San Roque" deuda={2_700_000} limite={2_500_000} />)
    expect(screen.getByText('Se pasó del límite por $200.000')).toBeTruthy()
  })
})

describe('teclear', () => {
  it('arma el monto con dígitos y con 000', () => {
    let m = 0
    for (const t of ['1', '5', '0', '000'] as const) m = teclear(m, t)
    expect(m).toBe(150_000)
  })

  it('borrar quita el último dígito', () => {
    expect(teclear(150_000, 'borrar')).toBe(15_000)
  })

  it('los atajos suman', () => {
    expect(teclear(20_000, '+50000')).toBe(70_000)
  })

  it('no deja pasar de 99 millones', () => {
    expect(teclear(99_000_000, '000')).toBe(99_000_000)
  })
})

describe('TecladoMonto', () => {
  it('muestra el monto con separador de miles mientras se escribe', () => {
    const alCambiar = vi.fn()
    render(<TecladoMonto monto={15_000} alCambiar={alCambiar} />)
    expect(screen.getByText('$15.000')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    expect(alCambiar).toHaveBeenCalledWith(150_000)
    fireEvent.click(screen.getByRole('button', { name: '+10 mil' }))
    expect(alCambiar).toHaveBeenLastCalledWith(25_000)
  })
})

describe('AvisoDeshacer', () => {
  it('ofrece deshacer y se cierra solo a los 6 segundos', () => {
    vi.useFakeTimers()
    const alDeshacer = vi.fn()
    const alCerrar = vi.fn()
    render(<AvisoDeshacer mensaje="Listo, quedó guardado" alDeshacer={alDeshacer} alCerrar={alCerrar} />)
    expect(screen.getByText('Listo, quedó guardado')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(alDeshacer).toHaveBeenCalledOnce()
    act(() => vi.advanceTimersByTime(6000))
    expect(alCerrar).toHaveBeenCalledOnce()
  })
})

describe('EstadoConexion', () => {
  it('con señal y nada pendiente dice que todo se envió', () => {
    render(<EstadoConexion enLinea pendientes={0} />)
    expect(screen.getByText('Todo enviado')).toBeTruthy()
  })

  it('con registros pendientes dice cuántos esperan', () => {
    render(<EstadoConexion enLinea pendientes={3} />)
    expect(screen.getByText('3 registros esperando señal')).toBeTruthy()
  })

  it('sin señal tranquiliza en vez de mostrar un error', () => {
    render(<EstadoConexion enLinea={false} pendientes={1} />)
    expect(screen.getByText('Sin señal: lo que anotes se guarda y se envía solo')).toBeTruthy()
  })
})

describe('PasoAPaso', () => {
  it('muestra en qué paso va y deja volver atrás', () => {
    const alVolver = vi.fn()
    render(
      <PasoAPaso paso={2} total={4} pregunta="¿Cuánto?" alVolver={alVolver}>
        <p>contenido</p>
      </PasoAPaso>,
    )
    expect(screen.getByRole('heading', { name: '¿Cuánto?' })).toBeTruthy()
    expect(screen.getByText('Paso 2 de 4')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
    expect(alVolver).toHaveBeenCalledOnce()
  })
})

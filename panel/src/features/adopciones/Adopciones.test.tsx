import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DatosProvider } from '../../data/DatosProvider'
import { SesionProvider } from '../../app/sesion'
import { Adopciones } from './Adopciones'
import { guardarCambios, leerCambios } from './persistencia'
import { PESTANAS } from '../../app/pestanas'
import { crearDatosDemo } from '../../data/demo'

function montar(rol = 'adopciones', ruta = '/adopciones') {
  window.history.replaceState({}, '', '/?demo=1')
  localStorage.clear()
  localStorage.setItem('huellitas.persona', rol === 'admin' ? 'p-carolina' : rol === 'cuidador' ? 'p-luis' : 'p-marcela')
  return render(
    <DatosProvider><SesionProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes><Route path="/adopciones/*" element={<Adopciones />} /></Routes>
      </MemoryRouter>
    </SesionProvider></DatosProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('slice visible de adopciones', () => {
  it('muestra tres montones con conteos y una razón por solicitud', () => {
    montar()
    expect(screen.getByRole('heading', { name: /para llamar/i })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /revisar/i })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /descartadas/i })).toBeTruthy()
    expect(screen.getAllByText(/Dice que es un regalo/i).length).toBeGreaterThan(0)
  })

  it('ordena cada montón por calidad compartida antes de antigüedad', () => {
    montar()
    const pilaRevisar = screen.getByRole('heading', { name: /revisar/i }).closest('section')
    const detalle = Array.from(pilaRevisar?.querySelectorAll('a[href^="/adopciones/sol-"]') ?? [])
      .map((enlace) => enlace.getAttribute('href'))
    expect(detalle.indexOf('/adopciones/sol-12')).toBeLessThan(detalle.indexOf('/adopciones/sol-17'))
  })

  it('deniega roles distintos a admin/adopciones', () => {
    montar('cuidador')
    expect(screen.getByRole('alert').textContent).toMatch(/no tienes permiso/i)
  })

  it('permite mover manualmente una solicitud y revertirla; persiste cambios', () => {
    const vista = montar()
    const enlaceBruno = vista.container.querySelector('a[href="/adopciones/sol-09"]')
    if (!enlaceBruno) throw new Error('No aparece la solicitud de Bruno')
    fireEvent.click(enlaceBruno)
    fireEvent.click(screen.getByRole('button', { name: /Mover a Para llamar/i }))
    expect(screen.getByText(/Decisión humana:/i)).toBeTruthy()
    expect(localStorage.getItem('huellitas.adopciones.demo.v1')).toContain('verde')
    fireEvent.click(screen.getByRole('button', { name: /Quitar decisión manual/i }))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('muestra el fallo de guardado en el detalle y mantiene el cambio provisional claramente advertido', () => {
    const vista = montar()
    const enlaceBruno = vista.container.querySelector('a[href="/adopciones/sol-09"]')
    if (!enlaceBruno) throw new Error('No aparece la solicitud de Bruno')
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError') })
    fireEvent.click(enlaceBruno)
    fireEvent.click(screen.getByRole('button', { name: /Mover a Para llamar/i }))
    expect(screen.getByRole('alert').textContent).toMatch(/no se pudo guardar.*provisional/i)
    setItem.mockRestore()
  })

  it('muestra advertencias y prepara enlace WhatsApp sin enviar mensaje', () => {
    const bruno = crearDatosDemo().animales.find((a) => a.nombre === 'Bruno')
    montar('admin', `/adopciones/pasaporte/${bruno?.id}`)
    expect(screen.getByText(/NO pisos lisos/i)).toBeTruthy()
    const tratamiento = crearDatosDemo().tratamientos.find((t) => t.animalId === bruno?.id)
    const compartir = screen.getByRole('link', { name: /Preparar WhatsApp/i })
    const href = compartir.getAttribute('href') ?? ''
    expect(href).toContain('wa.me')
    expect(href).toContain('10%3A00')
    expect(decodeURIComponent(href)).toContain('NO pisos lisos')
    expect(decodeURIComponent(href)).toContain(tratamiento?.medicamento)
    expect(decodeURIComponent(href)).toContain(tratamiento?.dosis)
    expect(compartir.getAttribute('target')).toBe('_blank')
  })

  it('mantiene las pestañas principales del admin y da entrada a adopciones a Marcela', () => {
    expect(PESTANAS.admin.map((p) => p.texto)).toEqual(['Plata', 'Comida', 'Por confirmar', 'Animales'])
    expect(PESTANAS.adopciones[0]?.ruta).toBe('/adopciones')
    expect(crearDatosDemo().personas.find((p) => p.id === 'p-marcela')?.rol).toBe('adopciones')
  })

  it('reutiliza el botón visual del kit para las acciones de decisión', () => {
    const vista = montar()
    const enlaceBruno = vista.container.querySelector('a[href="/adopciones/sol-09"]')
    if (!enlaceBruno) throw new Error('No aparece la solicitud de Bruno')
    fireEvent.click(enlaceBruno)
    const mover = screen.getByRole('button', { name: /Mover a Para llamar/i })
    expect(mover.querySelector('svg')).toBeTruthy()
  })

  it('avisa si el almacenamiento local no está disponible', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(guardarCambios({ 'sol-01': { nota: 'nota' } })).toBe(false)
    setItem.mockRestore()
    expect(leerCambios()).toEqual({})
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Adoptar } from './Adoptar'
import { busquedaEjemplo, json, listaEjemplo, LUNA } from './ejemplos'
import { enlaceWhatsapp } from './enlaces'

const fetchFalso = vi.fn()

function urlsLlamadas(): string[] {
  return fetchFalso.mock.calls.map((c) => String(c[0]))
}
function busquedas(): string[] {
  return urlsLlamadas().filter((u) => u.includes('/api/publico/rag/buscar'))
}

beforeEach(() => {
  fetchFalso.mockReset()
  fetchFalso.mockImplementation(async (url: string) => {
    if (String(url).includes('/rag/buscar')) return json(busquedaEjemplo('x'))
    return json(listaEjemplo())
  })
  vi.stubGlobal('fetch', fetchFalso)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((e) => e.remove())
})

describe('Landing de adopción', () => {
  it('se ve sin sesión: carga la lista pública sin Authorization y pinta las tarjetas', async () => {
    render(<Adoptar />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Adopta un perrito')
    expect(screen.getByRole('main')).toBeTruthy()
    await screen.findByRole('heading', { level: 3, name: 'Toby' })
    expect(screen.getAllByRole('article')).toHaveLength(2)

    const [url, init] = fetchFalso.mock.calls[0]
    expect(String(url)).toContain('/api/publico/rag/perritos')
    expect(JSON.stringify(init?.headers ?? {})).not.toContain('Authorization')
    expect(screen.getByRole('status').textContent).toContain('2 peluditos esperan un hogar')
  })

  it('pone el SEO: título, descripción, canonical, Open Graph y JSON-LD con los animales', async () => {
    render(<Adoptar />)
    await screen.findByRole('heading', { level: 3, name: 'Toby' })

    expect(document.title).toBe('Adoptar perrito - Fundación Huellitas')
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toContain('Huellitas')
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toMatch(/\/adoptar$/)
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      'Adoptar perrito - Fundación Huellitas',
    )
    const ld = JSON.parse(document.getElementById('jsonld-adoptar')!.textContent!)
    const tipos = ld['@graph'].map((n: { '@type': string }) => n['@type'])
    expect(tipos).toEqual(['AnimalShelter', 'ItemList'])
    expect(ld['@graph'][1].itemListElement.map((e: { name: string }) => e.name)).toEqual(['Toby', 'Luna'])
  })

  it('al salir deja el título como estaba y quita el JSON-LD', async () => {
    document.title = 'Huellitas'
    const { unmount } = render(<Adoptar />)
    await screen.findByRole('heading', { level: 3, name: 'Toby' })
    unmount()
    expect(document.title).toBe('Huellitas')
    expect(document.getElementById('jsonld-adoptar')).toBeNull()
  })

  it('la tarjeta muestra lo de hoy, la barra de apadrinamiento y la invitación a apadrinar', async () => {
    render(<Adoptar />)
    const toby = (await screen.findByRole('heading', { level: 3, name: 'Toby' })).closest('article')!
    const t = within(toby)

    expect(t.getByText('Perro · 3 años')).toBeTruthy()
    expect(t.getByText('juguetón')).toBeTruthy()
    expect(t.getByText(/patica herida/)).toBeTruthy()
    expect(t.getByText('Ya comió hoy')).toBeTruthy()
    expect(t.getByText('Medicinas tomadas 1 de 2')).toBeTruthy()
    expect(t.getByText(/Estuvo muy juguetón/)).toBeTruthy()
    expect(t.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('40')
    expect(t.getByText('Apadrina desde $20.000/mes')).toBeTruthy()
  })

  it('una tarjeta sin registros de hoy no inventa estado', async () => {
    render(<Adoptar />)
    const luna = (await screen.findByRole('heading', { level: 3, name: 'Luna' })).closest('article')!
    expect(within(luna).queryByText(/Hoy en el albergue/)).toBeNull()
    expect(within(luna).getByText('Gato · 8 meses')).toBeTruthy()
  })

  it('el botón de WhatsApp lleva el número y el mensaje con el nombre', async () => {
    render(<Adoptar />)
    const toby = (await screen.findByRole('heading', { level: 3, name: 'Toby' })).closest('article')!
    const enlace = within(toby).getByRole('link', { name: /conocer a Toby/ })
    expect(enlace.getAttribute('href')).toBe(
      `https://wa.me/573001112233?text=${encodeURIComponent('Hola Huellitas, quiero conocer a Toby')}`,
    )
    expect(enlace.getAttribute('target')).toBe('_blank')
    expect(enlace.getAttribute('rel')).toContain('noopener')
  })

  it('sin número de WhatsApp no hay enlace y se explica con amabilidad', async () => {
    fetchFalso.mockImplementation(async () => json(listaEjemplo(null)))
    render(<Adoptar />)
    await screen.findByRole('heading', { level: 3, name: 'Toby' })
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).toBeNull()
    expect(screen.getAllByText(/no está disponible ahora/)).toHaveLength(2)
  })

  it('enlaceWhatsapp limpia el número y devuelve null si no hay', () => {
    expect(enlaceWhatsapp('+57 300 111 2233', 'Luna')).toContain('https://wa.me/573001112233?text=')
    expect(enlaceWhatsapp(null, 'Luna')).toBeNull()
    expect(enlaceWhatsapp('   ', 'Luna')).toBeNull()
  })
})

describe('Buscador en vivo', () => {
  it('espera ~300 ms: varias teclas seguidas hacen una sola búsqueda con el texto final', async () => {
    render(<Adoptar />)
    await screen.findByRole('heading', { level: 3, name: 'Toby' })
    const campo = screen.getByRole('searchbox')

    for (const q of ['p', 'pe', 'per', 'perro tranquilo']) fireEvent.change(campo, { target: { value: q } })

    expect(busquedas()).toHaveLength(0)
    await waitFor(() => expect(busquedas()).toHaveLength(1))
    const url = new URL(busquedas()[0], 'http://localhost')
    expect(url.pathname).toBe('/api/publico/rag/buscar')
    expect(url.searchParams.get('q')).toBe('perro tranquilo')
  })

  it('muestra los resultados con el motivo y reemplaza la lista completa', async () => {
    render(<Adoptar />)
    await screen.findByRole('heading', { level: 3, name: 'Toby' })

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'tranquilo' } })

    await screen.findByText('Es tranquila y vive bien en apartamento')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.queryByRole('heading', { level: 3, name: 'Toby' })).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('1 resultado para “tranquilo”')
  })

  it('al borrar el texto vuelve a la lista completa de /rag/perritos', async () => {
    render(<Adoptar />)
    await screen.findByRole('heading', { level: 3, name: 'Toby' })
    const campo = screen.getByRole('searchbox')
    fireEvent.change(campo, { target: { value: 'tranquilo' } })
    await screen.findByText('Es tranquila y vive bien en apartamento')

    fireEvent.change(campo, { target: { value: '' } })

    await screen.findByRole('heading', { level: 3, name: 'Toby' })
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(urlsLlamadas().filter((u) => u.includes('/rag/perritos'))).toHaveLength(2)
  })

  it('cancela la búsqueda vieja y no pinta su respuesta tarde', async () => {
    const pendientes: { q: string; signal: AbortSignal; responder: () => void }[] = []
    fetchFalso.mockImplementation((url: string, init?: RequestInit) => {
      const u = new URL(String(url), 'http://localhost')
      if (!u.pathname.endsWith('/rag/buscar')) return Promise.resolve(json(listaEjemplo()))
      const q = u.searchParams.get('q')!
      return new Promise<Response>((resolve) => {
        pendientes.push({
          q,
          signal: init!.signal!,
          responder: () => resolve(json({ ...busquedaEjemplo(q), resultados: [{ perrito: { ...LUNA, id: q, nombre: q }, puntaje: 1, motivo: `por ${q}` }] })),
        })
      })
    })
    render(<Adoptar />)
    await screen.findByRole('heading', { level: 3, name: 'Toby' })
    const campo = screen.getByRole('searchbox')

    fireEvent.change(campo, { target: { value: 'viejo' } })
    await waitFor(() => expect(pendientes).toHaveLength(1))
    fireEvent.change(campo, { target: { value: 'nuevo' } })
    await waitFor(() => expect(pendientes).toHaveLength(2))

    expect(pendientes[0].signal.aborted).toBe(true)
    expect(pendientes[1].signal.aborted).toBe(false)
    pendientes[1].responder()
    await screen.findByText('por nuevo')
    pendientes[0].responder()
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByText('por viejo')).toBeNull()
    expect(screen.getByText('por nuevo')).toBeTruthy()
  })

  it('si el servidor falla avisa con amabilidad', async () => {
    fetchFalso.mockImplementation(async () => json({ error: 'caído' }, 500))
    render(<Adoptar />)
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('No pudimos cargar')
  })

  it('si nada encaja lo dice y sugiere al agente de voz', async () => {
    fetchFalso.mockImplementation(async (url: string) =>
      String(url).includes('/rag/buscar') ? json({ ...busquedaEjemplo('zzz'), resultados: [] }) : json(listaEjemplo()),
    )
    render(<Adoptar />)
    await screen.findByRole('heading', { level: 3, name: 'Toby' })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
    await screen.findByText(/No encontramos a alguien/)
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })
})

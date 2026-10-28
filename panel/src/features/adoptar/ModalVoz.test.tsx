import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Adoptar } from './Adoptar'
import { json, listaEjemplo, respuestaVozEjemplo } from './ejemplos'

// --- Voz falsa del navegador ---

class FalsoReconocimiento {
  static todos: FalsoReconocimiento[] = []
  lang = ''
  continuous = true
  interimResults = true
  maxAlternatives = 0
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  iniciado = false
  start = vi.fn(() => {
    this.iniciado = true
  })
  stop = vi.fn()
  abort = vi.fn()
  constructor() {
    FalsoReconocimiento.todos.push(this)
  }
  /** La persona dice algo y el navegador termina de escuchar */
  decir(texto: string) {
    this.onresult?.({ results: [[{ transcript: texto }]] })
    this.onend?.()
  }
}

class FalsoEnunciado {
  lang = ''
  rate = 1
  pitch = 1
  voice: unknown = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(public text: string) {}
}

const hablado: FalsoEnunciado[] = []
const sintesis = {
  speak: vi.fn((u: FalsoEnunciado) => {
    hablado.push(u)
  }),
  cancel: vi.fn(),
  getVoices: vi.fn(() => [
    { lang: 'en-US', name: 'Inglés' },
    { lang: 'es-ES', name: 'España' },
    { lang: 'es-CO', name: 'Colombia' },
  ]),
}

const fetchFalso = vi.fn()
const w = window as unknown as Record<string, unknown>

function llamadasAlAgente() {
  return fetchFalso.mock.calls.filter((c) => String(c[0]).includes('/api/publico/agente-voz'))
}
function cuerpo(i: number) {
  return JSON.parse(llamadasAlAgente()[i][1].body as string)
}
const ultimoReconocimiento = () => FalsoReconocimiento.todos[FalsoReconocimiento.todos.length - 1]

function conVoz() {
  w.SpeechRecognition = FalsoReconocimiento
  w.speechSynthesis = sintesis
  w.SpeechSynthesisUtterance = FalsoEnunciado
}

async function abrirModal() {
  render(<Adoptar />)
  const boton = await screen.findByRole('button', { name: /Llamar al Agente de Voz de Huellitas/ })
  boton.focus() // en el navegador, al tocar el botón también recibe el foco
  fireEvent.click(boton)
  return { boton, dialogo: screen.getByRole('dialog') }
}

beforeEach(() => {
  FalsoReconocimiento.todos = []
  hablado.length = 0
  sintesis.speak.mockClear()
  sintesis.cancel.mockClear()
  fetchFalso.mockReset()
  fetchFalso.mockImplementation(async (url: string) => {
    if (String(url).includes('/agente-voz')) return json(respuestaVozEjemplo())
    return json(listaEjemplo())
  })
  vi.stubGlobal('fetch', fetchFalso)
  conVoz()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  for (const k of ['SpeechRecognition', 'webkitSpeechRecognition', 'speechSynthesis', 'SpeechSynthesisUtterance']) delete w[k]
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((e) => e.remove())
})

describe('Modal del agente de voz', () => {
  it('el botón abre un diálogo accesible y ESC lo cierra devolviendo el foco', async () => {
    const { boton, dialogo } = await abrirModal()
    expect(dialogo.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByRole('heading', { name: 'Agente de Voz de Huellitas' })).toBeTruthy()
    expect(dialogo.contains(document.activeElement)).toBe(true)

    fireEvent.keyDown(dialogo, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(boton)
  })

  it('el foco queda atrapado: Tab desde el último vuelve al primero y Shift+Tab al revés', async () => {
    const { dialogo } = await abrirModal()
    const enfocables = Array.from(dialogo.querySelectorAll<HTMLElement>('button:not([disabled])'))
    const primero = enfocables[0]
    const ultimo = enfocables[enfocables.length - 1]

    ultimo.focus()
    fireEvent.keyDown(ultimo, { key: 'Tab' })
    expect(document.activeElement).toBe(primero)

    fireEvent.keyDown(primero, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(ultimo)
  })

  it('escucha en es-CO, manda lo que dijo al agente y lee el guion de voz', async () => {
    await abrirModal()

    fireEvent.click(screen.getByRole('button', { name: /Tocar para hablar/ }))
    const rec = ultimoReconocimiento()
    expect(rec.start).toHaveBeenCalledTimes(1)
    expect(rec.lang).toBe('es-CO')

    await act(async () => rec.decir('Vivo en apartamento y busco un perro tranquilo'))

    await waitFor(() => expect(llamadasAlAgente()).toHaveLength(1))
    const [url, init] = llamadasAlAgente()[0]
    expect(String(url)).toContain('/api/publico/agente-voz')
    expect(init.method).toBe('POST')
    expect(JSON.stringify(init.headers)).not.toContain('Authorization')
    expect(cuerpo(0)).toEqual({ texto: 'Vivo en apartamento y busco un perro tranquilo' })

    const conversacion = await screen.findByRole('list', { name: 'Conversación con el agente' })
    expect(conversacion.textContent).toContain('Vivo en apartamento y busco un perro tranquilo')
    expect(conversacion.textContent).toContain('Mira, te cuento la historia de Toby.')
    expect(screen.getByText(/Toby · 3 años/)).toBeTruthy()

    expect(sintesis.speak).toHaveBeenCalledTimes(1)
    const dicho = hablado[0]
    expect(dicho.text).toBe(respuestaVozEjemplo().guionVoz)
    expect(dicho.lang).toBe('es-CO')
    expect(dicho.rate).toBeLessThan(1)
    expect(dicho.voice).toEqual({ lang: 'es-CO', name: 'Colombia' })
  })

  it('guarda el sesionId y lo manda en el siguiente turno; al terminar de hablar vuelve a escuchar', async () => {
    await abrirModal()
    fireEvent.click(screen.getByRole('button', { name: /Tocar para hablar/ }))
    await act(async () => ultimoReconocimiento().decir('hola'))
    await waitFor(() => expect(sintesis.speak).toHaveBeenCalled())
    expect(FalsoReconocimiento.todos).toHaveLength(1)

    // El agente termina de hablar: como es una llamada, queda escuchando otra vez
    await act(async () => hablado[0].onend?.())
    expect(FalsoReconocimiento.todos).toHaveLength(2)
    expect(ultimoReconocimiento().start).toHaveBeenCalled()

    await act(async () => ultimoReconocimiento().decir('me gusta Toby'))
    await waitFor(() => expect(llamadasAlAgente()).toHaveLength(2))
    expect(cuerpo(1)).toEqual({ texto: 'me gusta Toby', sesionId: 's1' })
  })

  it('Colgar corta la voz, deja de escuchar y no reabre el micrófono', async () => {
    await abrirModal()
    expect(screen.queryByRole('button', { name: 'Colgar' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Tocar para hablar/ }))
    await act(async () => ultimoReconocimiento().decir('hola'))
    await waitFor(() => expect(sintesis.speak).toHaveBeenCalled())

    const antes = sintesis.cancel.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Colgar' }))

    expect(sintesis.cancel.mock.calls.length).toBeGreaterThan(antes)
    expect(screen.queryByRole('button', { name: 'Colgar' })).toBeNull()
    await act(async () => hablado[0].onend?.())
    expect(FalsoReconocimiento.todos).toHaveLength(1)
  })

  it('si la persona empieza a hablar mientras el agente habla, se cancela la voz', async () => {
    await abrirModal()
    fireEvent.click(screen.getByRole('button', { name: /Tocar para hablar/ }))
    await act(async () => ultimoReconocimiento().decir('hola'))
    await waitFor(() => expect(sintesis.speak).toHaveBeenCalled())

    const antes = sintesis.cancel.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Interrumpir y hablar' }))

    expect(sintesis.cancel.mock.calls.length).toBeGreaterThan(antes)
    expect(FalsoReconocimiento.todos).toHaveLength(2)
  })

  it('al cerrar el modal también se calla al agente', async () => {
    const { dialogo } = await abrirModal()
    fireEvent.click(screen.getByRole('button', { name: /Tocar para hablar/ }))
    await act(async () => ultimoReconocimiento().decir('hola'))
    await waitFor(() => expect(sintesis.speak).toHaveBeenCalled())

    const antes = sintesis.cancel.mock.calls.length
    fireEvent.keyDown(dialogo, { key: 'Escape' })

    expect(sintesis.cancel.mock.calls.length).toBeGreaterThan(antes)
    expect(ultimoReconocimiento().abort).toHaveBeenCalled()
  })

  it('con el sonido apagado no lee en voz alta pero sí muestra la respuesta', async () => {
    await abrirModal()
    fireEvent.click(screen.getByRole('button', { name: /Con sonido/ }))
    expect(screen.getByRole('button', { name: /Sin sonido/ }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: /Tocar para hablar/ }))
    await act(async () => ultimoReconocimiento().decir('hola'))

    await screen.findByText('Mira, te cuento la historia de Toby.')
    expect(sintesis.speak).not.toHaveBeenCalled()
  })

  it('avisa cuando se agenda una visita', async () => {
    fetchFalso.mockImplementation(async (url: string) =>
      String(url).includes('/agente-voz') ? json(respuestaVozEjemplo({ accion: 'visita_agendada' })) : json(listaEjemplo()),
    )
    await abrirModal()
    fireEvent.click(screen.getByRole('button', { name: /Tocar para hablar/ }))
    await act(async () => ultimoReconocimiento().decir('quiero visitarlo'))
    await screen.findByText(/Quedó agendada tu visita/)
  })

  it('un error 429 se explica con amabilidad y se puede volver a intentar', async () => {
    fetchFalso.mockImplementation(async (url: string) =>
      String(url).includes('/agente-voz') ? json({ error: 'limite' }, 429) : json(listaEjemplo()),
    )
    await abrirModal()
    fireEvent.click(screen.getByRole('button', { name: /Tocar para hablar/ }))
    await act(async () => ultimoReconocimiento().decir('hola'))

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('Espera un minuto')
    expect(sintesis.speak).not.toHaveBeenCalled()
    expect((screen.getByRole('button', { name: /Tocar para hablar/ }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('si el micrófono está bloqueado pasa a escribir', async () => {
    await abrirModal()
    fireEvent.click(screen.getByRole('button', { name: /Tocar para hablar/ }))
    act(() => ultimoReconocimiento().onerror?.({ error: 'not-allowed' }))

    expect((await screen.findByRole('alert')).textContent).toContain('micrófono')
    expect(screen.getByLabelText('Tu mensaje')).toBeTruthy()
  })
})

describe('Modal sin reconocimiento de voz (Firefox)', () => {
  beforeEach(() => {
    delete w.SpeechRecognition
    delete w.webkitSpeechRecognition
  })

  it('explica con amabilidad y deja escribir; la respuesta se lee igual', async () => {
    await abrirModal()
    expect(screen.getByText(/no permite hablar por micrófono/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Tocar para hablar/ })).toBeNull()

    fireEvent.change(screen.getByLabelText('Tu mensaje'), { target: { value: 'Busco un gato' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    await waitFor(() => expect(llamadasAlAgente()).toHaveLength(1))
    expect(cuerpo(0)).toEqual({ texto: 'Busco un gato' })
    await screen.findByText('Mira, te cuento la historia de Toby.')
    expect(hablado[0].text).toBe(respuestaVozEjemplo().guionVoz)
    expect((screen.getByLabelText('Tu mensaje') as HTMLInputElement).value).toBe('')
  })

  it('sin síntesis tampoco se rompe: muestra el texto', async () => {
    delete w.speechSynthesis
    delete w.SpeechSynthesisUtterance
    await abrirModal()
    fireEvent.change(screen.getByLabelText('Tu mensaje'), { target: { value: 'Busco un gato' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await screen.findByText('Mira, te cuento la historia de Toby.')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

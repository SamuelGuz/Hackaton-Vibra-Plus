// Prueba de punta a punta contra el servidor y la base reales (no corre por defecto).
//
//   cd bot && npm run dev                       (servidor en http://localhost:8787)
//   cd bot && npm run enlace -- "Don Luis"      (copiar el token después de ?t=)
//   cd panel && PANEL_API=http://localhost:8787 PANEL_TOKEN=<token> npx vitest run src/data/integracion.test.tsx
//
// Ojo: escribe en esa base (abre un bulto y lo anula enseguida).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import Dexie from 'dexie'
import { App } from '../app/App'

const API = process.env.PANEL_API
const TOKEN = process.env.PANEL_TOKEN

async function bultosDePerroEnServidor(): Promise<number> {
  const r = await fetch(`${API}/api/hoy`, { headers: { Authorization: `Bearer ${TOKEN}` } })
  const d = await r.json()
  const desde = d.conteoInicial.fecha
  return d.inventario
    .filter((m: { tipo: string; fechaHora: string }) => m.tipo === 'perro' && m.fechaHora >= desde)
    .reduce((s: number, m: { cambio: number }) => s + m.cambio, d.conteoInicial.bultos.perro)
}

describe.skipIf(!API || !TOKEN)('panel contra el servidor real', () => {
  beforeEach(async () => {
    vi.stubEnv('VITE_API_URL', API!)
    localStorage.clear()
    await Dexie.delete('huellitas')
    window.history.pushState({}, '', `/?t=${TOKEN}`)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it('abre con datos del servidor, un bulto llega a la base y Deshacer lo anula', async () => {
    const antes = await bultosDePerroEnServidor()
    render(<App />)
    const perro = await screen.findByRole('region', { name: 'Comida de perro' }, { timeout: 10_000 })

    fireEvent.click(within(perro).getByRole('button', { name: 'Abrí un bulto' }))
    await waitFor(async () => expect(await bultosDePerroEnServidor()).toBe(antes - 1), { timeout: 10_000 })

    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    await waitFor(async () => expect(await bultosDePerroEnServidor()).toBe(antes), { timeout: 10_000 })
  }, 40_000)
})

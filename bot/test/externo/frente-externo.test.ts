// Frente externo de punta a punta sobre las piezas de master: buzón durable, trabajador, MemoryRepo, Kv y rutas Hono.
// Solo Gemini y WhatsApp son falsos.
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { crearFrenteExterno } from '../../src/adopciones-agente/index'
import { MemoryRepo } from '../../src/store/memory-repo'
import { crearBuzonMemoria } from '../../src/wa/buzon'
import { enviarSalientes, procesadorCrudo, trabajarEntrantes } from '../../src/wa/trabajador'
import type { InboundMessage } from '../../src/wa/tipos'
import { ANDREA, AHORA, CAROLINA, crudo, excelente, MARIA, montar, TEL } from '../adopciones-agente/ayudas'
import { semillaMini } from '../fixtures/semilla-mini'

async function armar() {
  const t = await montar({ personas: [ANDREA, CAROLINA, MARIA] })
  // La semilla mini solo trae a Tobías en tratamiento: se suma un gato adoptable para poder agendar una visita
  const base = semillaMini()
  t.deps.repo = new MemoryRepo({
    ...base,
    personas: [ANDREA, CAROLINA, MARIA],
    animales: [
      ...base.animales,
      { id: 'a-luna', nombre: 'Luna', especie: 'gato', estado: 'adoptable', foto: null, fechaIngreso: '2026-01-01', advertencias: [], caracter: 'Tranquila y cariñosa.', padrino: null, codigo: 'LUN01' },
    ],
  })
  t.deps.env = { ...t.deps.env, WA_NUMERO_BOT: '+57 300 111 2233', PANEL_URL: 'https://panel.huellitas.test' }
  const frente = crearFrenteExterno({ deps: t.deps, llm: t.llm, envCorreo: {} })
  const buzon = crearBuzonMemoria()
  const perro = (await t.deps.repo.animales()).find((a) => a.estado === 'adoptable')
  if (!perro) throw new Error('la semilla no trae un animal adoptable')

  const mensaje = (de: string, id: string, texto: string): InboundMessage => ({
    id,
    from: de,
    tipo: 'texto',
    texto,
    timestamp: Math.floor(AHORA.getTime() / 1000),
  })
  /** El webhook guarda, el trabajador procesa y el despachador manda: el camino real de master */
  async function recibir(de: string, id: string, texto: string) {
    await buzon.guardarEntrantes([mensaje(de, id, texto)], AHORA)
    await trabajarEntrantes({ buzon, ahora: () => AHORA, procesador: frente.procesador(procesadorCrudo()) })
    const enviados: { telefono: string; cuerpo: string }[] = []
    await enviarSalientes({
      buzon,
      ahora: () => AHORA,
      maximo: 10,
      enviar: async (r) => {
        enviados.push({ telefono: r.telefono, cuerpo: r.cuerpo })
      },
    })
    return enviados
  }
  return { ...t, frente, buzon, perro, recibir }
}

describe('número que no es del equipo, por el buzón de master', () => {
  it('lo atiende el agente: respuesta cálida por el buzón y nada en la bitácora del equipo', async () => {
    const t = await armar()
    t.llm.responder(crudo({ respuesta: 'Qué alegría que escribas. Mira, te cuento la historia de Toby...', perrito_id_foco: t.perro.id }))
    const enviados = await t.recibir(TEL, 'wamid.e1', 'hola, busco un perrito tranquilo')
    expect(enviados).toEqual([{ telefono: TEL, cuerpo: expect.stringContaining('historia de Toby') }])
    expect(await t.buzon.registros()).toHaveLength(0)
    expect(t.wa.textos).toHaveLength(0)
  })

  it('un mensaje del equipo sigue el camino de siempre: nota cruda por confirmar y Gemini del agente sin tocar', async () => {
    const t = await armar()
    const enviados = await t.recibir(ANDREA.telefono, 'wamid.e2', 'le di la pastilla a Tobías')
    expect(enviados).toEqual([])
    expect(t.llm.llamadas).toHaveLength(0)
    const registros = await t.buzon.registros()
    expect(registros).toHaveLength(1)
    expect(registros[0]).toMatchObject({ id: 'wamid.e2', agenteId: ANDREA.telefono, estado: 'por_confirmar', origen: 'texto' })
  })

  it('un adoptante excelente agenda la visita y avisa a las administradoras (admin y adopciones)', async () => {
    const t = await armar()
    t.llm.responder(excelente({ respuesta: 'Qué hermoso hogar para Toby 🐶', perrito_id_foco: t.perro.id, nombre: 'Laura' }))
    const enviados = await t.recibir(TEL, 'wamid.e3', 'vivo en casa propia, tengo tiempo y presupuesto para el veterinario')
    expect(enviados).toHaveLength(1)
    expect(enviados[0]?.cuerpo).toContain('sábado')
    for (const admin of [CAROLINA, MARIA]) {
      expect(t.avisos(admin.telefono)).toEqual([
        expect.stringContaining(`Doña ${admin.nombre}, filtré a un adoptante excelente para ${t.perro.nombre} (Score 82%). Viene el sábado a las 10 AM`),
      ])
    }
    expect(t.avisos(ANDREA.telefono)).toEqual([])
    // El buzón reintenta el mismo mensaje: no se vuelve a avisar ni a llamar a Gemini
    const llamadas = t.llm.llamadas.length
    await t.recibir(TEL, 'wamid.e3', 'vivo en casa propia, tengo tiempo y presupuesto para el veterinario')
    expect(t.llm.llamadas).toHaveLength(llamadas)
    expect(t.avisos(CAROLINA.telefono)).toHaveLength(1)
  })
})

describe('rutas públicas /api/publico/*', () => {
  async function conApp() {
    const t = await armar()
    const app = new Hono()
    t.frente.montarRutas(app)
    return { ...t, app }
  }

  it('el RAG responde sin sesión y entrega el número del bot para los botones de WhatsApp', async () => {
    const { app, perro } = await conApp()
    const r = await app.request('/api/publico/rag/perritos')
    expect(r.status).toBe(200)
    const cuerpo = (await r.json()) as { contacto: { whatsapp: string | null }; perritos: { nombre: string }[] }
    expect(cuerpo.contacto.whatsapp).toBe('573001112233')
    expect(cuerpo.perritos.map((p) => p.nombre)).toContain(perro.nombre)
  })

  it('la búsqueda pasa por los datos reales del repo y no filtra nada del equipo', async () => {
    const { app, perro } = await conApp()
    const r = await app.request(`/api/publico/rag/buscar?q=${encodeURIComponent(perro.nombre)}`)
    expect(r.status).toBe(200)
    const texto = JSON.stringify(await r.json())
    expect(texto).toContain(perro.nombre)
    for (const p of [ANDREA, CAROLINA, MARIA]) {
      expect(texto).not.toContain(p.telefono)
      expect(texto).not.toContain(p.id)
    }
  })

  it('el agente de voz y la campaña funcionan sin sesión; la campaña solo hace vista previa', async () => {
    const { app, llm, perro } = await conApp()
    llm.responder(crudo({ guion_voz: 'Mira, te cuento la historia de Toby.', perrito_id_foco: perro.id }))
    const voz = await app.request('/api/publico/agente-voz', {
      method: 'POST',
      body: JSON.stringify({ texto: 'hola' }),
      headers: { 'content-type': 'application/json' },
    })
    expect(voz.status).toBe(200)
    expect(await voz.json()).toMatchObject({ guionVoz: expect.stringContaining('Toby'), accion: 'ninguna' })

    llm.responder({ asunto: 'Toby te espera', preheader: 'p', saludo: 'Hola', parrafos: ['Ayúdanos'], llamado_texto: 'Apadrinar' })
    const campana = await app.request('/api/publico/campanas/enviar', {
      method: 'POST',
      body: JSON.stringify({ objetivo: 'padrinos' }),
      headers: { 'content-type': 'application/json' },
    })
    expect(campana.status).toBe(200)
    expect(await campana.json()).toMatchObject({ modo: 'preview', html: expect.stringContaining('<html') })
  })

  it('el CORS de /api/publico/* es abierto para GET y POST', async () => {
    const { app } = await conApp()
    for (const metodo of ['GET', 'POST']) {
      const r = await app.request('/api/publico/agente-voz', {
        method: 'OPTIONS',
        headers: { Origin: 'https://huellitas.test', 'Access-Control-Request-Method': metodo },
      })
      expect(r.headers.get('access-control-allow-origin')).toBe('*')
    }
  })
})

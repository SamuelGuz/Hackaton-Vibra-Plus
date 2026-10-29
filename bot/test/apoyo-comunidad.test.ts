import { describe, expect, it } from 'vitest'
import { atenderOfertaComida, atenderAyudaInterna, esOfertaComida } from '../src/comunidad/apoyo.js'
import { crearDeps, CAROLINA, LUIS } from './fakes.js'
import { atender } from '../src/conversacion/atender.js'

describe('apoyo comunitario que ejecuta operaciones', () => {
  it('el mensaje de Yesenia entra por el bot real y abre el flujo de ayuda', async () => {
    const t = crearDeps()
    await atender(t.deps, CAROLINA, { tipo: 'texto', texto: 'Se acabó la comida, necesito pedir ayuda a la comunidad' })
    const m = t.wa.ultimo()
    expect(m.tipo === 'botones' && m.botones.some(b => b.id.startsWith('apoyo:estado:'))).toBe(true)
  })
  it('guarda la oferta futura y avisa al equipo sin sumar comida ni pedir padrinazgo', async () => {
    const t = crearDeps(), salidas: any[] = []
    expect(await atenderOfertaComida(t.deps, '573115559991', 'Soy el carnicero, mañana puedo donar 20 kilos de carne', async s => { salidas.push(s) })).toBe(true)
    expect(t.repo.datos.inventario).toHaveLength(0)
    expect(t.repo.datos.movimientos).toHaveLength(0)
    expect(t.repo.registros).toHaveLength(1)
    expect(t.wa.enviados.some(x => x.telefono === CAROLINA.telefono && /carne|alimento/i.test(x.salida.texto))).toBe(true)
    expect(salidas.map(s => s.texto).join(' ')).not.toMatch(/padrin|20\.000/i)
    expect(salidas).toHaveLength(3)
  })
  it('si falla el aviso conserva la oferta y dice que no lo entregó', async () => {
    const t = crearDeps(), salidas: any[] = []
    t.deps.wa.enviar = async () => { throw new Error('sin ventana') }
    await atenderOfertaComida(t.deps, '573115559991', 'Tengo 2 bultos para donar', async s => { salidas.push(s) })
    expect(salidas.map(s => s.texto).join(' ')).toMatch(/no pude avisar/i)
    expect(salidas.map(s => s.texto).join(' ')).not.toMatch(/le avis[eé]/i)
    expect(t.repo.registros).toHaveLength(1)
  })
  it('un reintento de la misma oferta no duplica ni registro ni aviso', async () => {
    const t = crearDeps()
    const run = () => atenderOfertaComida(t.deps, '573115559991', 'Mañana dono 20 kilos de carne', async () => {})
    await run(); await run()
    expect(t.repo.registros).toHaveLength(1)
    expect(t.wa.enviados).toHaveLength(1)
  })
  it('prepara un estado y genera su imagen, sin fingir publicación en Meta', async () => {
    const t = crearDeps()
    await atenderAyudaInterna(t.deps, CAROLINA, { tipo: 'texto', texto: 'Se acabó la comida, necesito pedir ayuda a la comunidad' })
    const opciones = t.wa.ultimo()
    expect(opciones.tipo).toBe('botones')
    const id = opciones.tipo === 'botones' ? opciones.botones.find(b => b.id.startsWith('apoyo:estado:'))!.id : ''
    await atenderAyudaInterna(t.deps, CAROLINA, { tipo: 'boton', id, titulo: 'Preparar estado' })
    expect(t.wa.ultimo().tipo).toBe('imagen')
    expect(t.dibujos).toHaveLength(1)
    expect(t.wa.ultimo().texto).toMatch(/compart|publica.*t[uú]|manualmente/i)
    expect(t.wa.ultimo().texto).not.toMatch(/ya publiqu[eé]/i)
  })
  it('los privados exigen contactos autorizados, vista previa y confirmación; no repiten envíos', async () => {
    const t = crearDeps()
    await atenderAyudaInterna(t.deps, CAROLINA, { tipo: 'texto', texto: 'Necesito pedir apoyo con comida a la comunidad' })
    const m = t.wa.ultimo()
    const id = m.tipo === 'botones' ? m.botones.find(b => b.id.startsWith('apoyo:privados:'))!.id : ''
    await atenderAyudaInterna(t.deps, CAROLINA, { tipo: 'boton', id, titulo: '' })
    await atenderAyudaInterna(t.deps, CAROLINA, { tipo: 'texto', texto: 'Contactos autorizados: 573115559991, 573115559992' })
    expect(t.wa.enviados.filter(x => x.telefono.startsWith('57311555999'))).toHaveLength(0)
    const confirmar = t.wa.ultimo()
    const confirmarId = confirmar.tipo === 'botones' ? confirmar.botones.find(b => b.id.startsWith('apoyo:enviar:'))!.id : ''
    await atenderAyudaInterna(t.deps, CAROLINA, { tipo: 'boton', id: confirmarId, titulo: '' })
    await atenderAyudaInterna(t.deps, CAROLINA, { tipo: 'boton', id: confirmarId, titulo: '' })
    expect(t.wa.enviados.filter(x => x.telefono.startsWith('57311555999'))).toHaveLength(2)
    expect(t.wa.ultimo().texto).toMatch(/2/)
  })
  it('un cuidador puede preparar ayuda pero no despachar una campaña privada', async () => {
    const t = crearDeps()
    await atenderAyudaInterna(t.deps, LUIS, { tipo: 'boton', id: 'apoyo:enviar:inventado', titulo: '' })
    expect(t.wa.ultimo().texto).toMatch(/administraci[oó]n|permis/i)
  })

  describe('qué cuenta como oferta de comida', () => {
    it.each([
      'quiero donar plata para la comida',
      'puedo donar dinero para comprar comida',
      'les hago una transferencia para el concentrado',
      'cómo puedo donar comida',
      'quiero apadrinar y ayudar con la comida',
    ])('no trata como entrega de alimento: %s', (texto) => {
      expect(esOfertaComida(texto)).toBe(false)
    })
    it.each([
      'tengo 20 kilos de carne para donar',
      'puedo llevar un bulto de concentrado mañana',
      'les regalo menudencia que me sobró',
    ])('sí trata como oferta de alimento: %s', (texto) => {
      expect(esOfertaComida(texto)).toBe(true)
    })
  })
})

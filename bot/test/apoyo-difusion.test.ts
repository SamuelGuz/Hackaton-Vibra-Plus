// Envío privado de un pedido de ayuda: fuera de la ventana de 24 h WhatsApp solo admite plantillas aprobadas.
import { afterEach, describe, expect, it } from 'vitest'
import { atenderAyudaInterna } from '../src/comunidad/apoyo.js'
import { cuerpoMensaje } from '../src/wa/cliente.js'
import { CAROLINA, crearDeps } from './fakes.js'

afterEach(() => {
  delete process.env.APOYO_PLANTILLA
})

async function prepararEnvio(t: ReturnType<typeof crearDeps>) {
  await atenderAyudaInterna(t.deps, CAROLINA, { tipo: 'texto', texto: 'Necesito pedir apoyo con comida a la comunidad' })
  const m = t.wa.ultimo()
  const privados = m.tipo === 'botones' ? m.botones.find((b) => b.id.startsWith('apoyo:privados:'))!.id : ''
  await atenderAyudaInterna(t.deps, CAROLINA, { tipo: 'boton', id: privados, titulo: '' })
  await atenderAyudaInterna(t.deps, CAROLINA, { tipo: 'texto', texto: 'Contactos autorizados: 573115559991, 573115559992' })
  const c = t.wa.ultimo()
  return c.tipo === 'botones' ? c.botones.find((b) => b.id.startsWith('apoyo:enviar:'))!.id : ''
}

const aContactos = (t: ReturnType<typeof crearDeps>) => t.wa.enviados.filter((x) => x.telefono.startsWith('57311555999'))

describe('cuerpo de una plantilla de WhatsApp', () => {
  it('se arma con nombre, idioma y un parámetro de texto sin saltos de línea', () => {
    const cuerpo = cuerpoMensaje('573115559991', { tipo: 'plantilla', nombre: 'pedido_ayuda', idioma: 'es_CO', parametros: ['Hola\n\nnos quedamos   sin comida'], texto: 'vista previa' })
    expect(cuerpo).toMatchObject({
      messaging_product: 'whatsapp',
      to: '573115559991',
      type: 'template',
      template: {
        name: 'pedido_ayuda',
        language: { code: 'es_CO' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: 'Hola nos quedamos sin comida' }] }],
      },
    })
  })
})

describe('envío privado del pedido de ayuda', () => {
  it('con plantilla configurada la usa para cada contacto', async () => {
    process.env.APOYO_PLANTILLA = 'pedido_ayuda|es_CO'
    const t = crearDeps()
    const id = await prepararEnvio(t)
    await atenderAyudaInterna(t.deps, CAROLINA, { tipo: 'boton', id, titulo: '' })

    const enviados = aContactos(t)
    expect(enviados).toHaveLength(2)
    for (const e of enviados) {
      expect(e.salida).toMatchObject({ tipo: 'plantilla', nombre: 'pedido_ayuda', idioma: 'es_CO' })
      expect(e.salida.tipo === 'plantilla' && e.salida.parametros[0]).toContain('nos quedamos sin comida')
    }
  })

  it('sin plantilla manda texto y, si falla, explica la ventana de 24 horas sin decir que se entregó', async () => {
    const t = crearDeps()
    const id = await prepararEnvio(t)
    const enviarReal = t.wa.enviar.bind(t.wa)
    t.deps.wa.enviar = async (tel, salida) => {
      if (tel.startsWith('57311555999')) throw new Error('131047 fuera de la ventana')
      return enviarReal(tel, salida)
    }
    await atenderAyudaInterna(t.deps, CAROLINA, { tipo: 'boton', id, titulo: '' })

    const resumen = t.wa.enviados
      .filter((x) => x.telefono === CAROLINA.telefono)
      .slice(-2)
      .map((x) => (x.salida.tipo === 'texto' ? x.salida.texto : ''))
      .join(' ')
    expect(resumen).toMatch(/0 de 2/)
    expect(resumen).toMatch(/24 horas|plantilla/i)
    expect(resumen).not.toMatch(/se entregaron 2/i)
  })

  it('una plantilla mal escrita en la configuración no se usa y avisa', async () => {
    process.env.APOYO_PLANTILLA = 'sin-separador'
    const t = crearDeps()
    const id = await prepararEnvio(t)
    await atenderAyudaInterna(t.deps, CAROLINA, { tipo: 'boton', id, titulo: '' })
    expect(aContactos(t).every((e) => e.salida.tipo === 'texto')).toBe(true)
  })
})

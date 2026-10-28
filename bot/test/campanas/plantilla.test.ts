import { describe, expect, it } from 'vitest'
import { completar, renderHtml } from '../../src/campanas/plantilla.js'
import type { CampanaEstructura } from '../../src/campanas/tipos.js'

const base: CampanaEstructura = {
  asunto: 'Mateo te necesita',
  preheader: 'Una ayuda que cambia su día',
  saludo: 'Hola,',
  parrafos: ['Mateo ya camina solito.'],
  llamado: { texto: 'Quiero apadrinar', url: 'https://huellitas.test/?vista=adoptar' },
  perritos: [{ id: '1', nombre: 'Mateo', edadTexto: '9 años', foto: null, historiaCorta: 'Lo atropellaron en la vía.', urgencia: 0.9 }],
  objetivo: 'padrinos',
}

describe('plantilla de campaña', () => {
  it('escapa todo lo dinámico: Gemini, base o cliente', () => {
    const html = renderHtml({
      ...base,
      asunto: '<b>Ayuda</b>',
      saludo: '<i>hola</i>',
      parrafos: ['<script>alert(1)</script>'],
      llamado: { texto: '<u>ya</u>', url: 'https://huellitas.test/?a="b"' },
      perritos: [{ ...base.perritos[0], nombre: '<img src=x onerror=alert(1)>', edadTexto: '3 "años"', historiaCorta: '<svg onload=alert(1)>' }],
    })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img src=x')
    expect(html).not.toContain('<svg')
    expect(html).not.toContain('<b>Ayuda</b>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('&lt;b&gt;Ayuda&lt;/b&gt;')
    expect(html).toContain('3 &quot;años&quot;')
    expect(html).toContain('&lt;u&gt;ya&lt;/u&gt;')
  })

  it('usa la foto solo si es http(s) y pone un marcador si no', () => {
    const conFoto = renderHtml({ ...base, perritos: [{ ...base.perritos[0], foto: 'https://cdn.huellitas.test/mateo.jpg' }] })
    expect(conFoto).toContain('src="https://cdn.huellitas.test/mateo.jpg"')

    const sinFoto = renderHtml({ ...base, perritos: [{ ...base.perritos[0], foto: 'javascript:alert(1)' }] })
    expect(sinFoto).not.toContain('javascript:')
    expect(sinFoto).toContain('🐾')
  })

  it('deja el botón en # cuando la URL no es http(s)', () => {
    const html = renderHtml({ ...base, llamado: { texto: 'Ayuda', url: 'javascript:alert(1)' } })
    expect(html).toContain('href="#"')
    expect(html).not.toContain('javascript:')
  })

  it('lleva el CTA, el nombre de la fundación y la línea de baja', () => {
    const html = renderHtml(base)
    expect(html).toContain('href="https://huellitas.test/?vista=adoptar"')
    expect(html).toContain('Quiero apadrinar')
    expect(html).toContain('Fundación Huellitas')
    expect(html).toContain('Responde BAJA a este correo para no recibir más.')
    expect(html).toContain('max-width:600px')
  })

  it('el texto plano no lleva etiquetas y trae el llamado con su enlace', () => {
    const { texto } = completar(base)
    expect(texto).toContain('Mateo, 9 años. Lo atropellaron en la vía.')
    expect(texto).toContain('Quiero apadrinar: https://huellitas.test/?vista=adoptar')
    expect(texto).toContain('Responde BAJA a este correo para no recibir más.')
    expect(texto).not.toMatch(/<\w/)
  })

  it('completar agrega html y texto a la estructura', () => {
    const c = completar(base)
    expect(c.asunto).toBe(base.asunto)
    expect(c.html.startsWith('<!doctype html>')).toBe(true)
    expect(c.texto.length).toBeGreaterThan(0)
  })
})

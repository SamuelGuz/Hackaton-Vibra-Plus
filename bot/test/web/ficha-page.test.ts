import { describe, expect, it } from 'vitest'
import type { FichaVM } from '@huellitas/shared/vistas'
import { renderFicha } from '../../src/web/ficha-page'

const REGISTRAR = 'https://wa.me/573009998877?text=' + encodeURIComponent('Registro TOB01 (Tobías): ')

function vm(extra: Partial<FichaVM> = {}): FichaVM {
  return {
    codigo: 'TOB01',
    nombre: 'Tobías',
    canil: 'Canil 3',
    encabezadoPublico: 'Soy Tobías, del albergue Huellitas',
    advertencias: ['No pisos lisos'],
    comida: { estado: 'comio', hora: '8:10 AM', texto: 'Comió a las 8:10 AM' },
    dosis: [{ medicamento: 'anticonvulsivo', hora: '2:00 PM', estado: 'dada' }],
    registrarUrl: REGISTRAR,
    contactoUrl: 'tel:+573000000000',
    vista: 'equipo',
    ...extra,
  }
}

describe('renderFicha', () => {
  it('incluye el viewport y es un documento HTML con idioma', () => {
    const html = renderFicha(vm())
    expect(html).toContain('<meta name="viewport"')
    expect(html).toMatch(/^<!doctype html>/i)
    expect(html).toContain('<html lang="es">')
  })

  it('las advertencias van antes que la comida y los medicamentos', () => {
    const html = renderFicha(vm({ advertencias: ['No pisos lisos'] }))
    const adv = html.indexOf('No pisos lisos')
    const comida = html.indexOf('Comida de hoy')
    const meds = html.indexOf('Medicamentos de hoy')
    expect(adv).toBeGreaterThan(-1)
    expect(comida).toBeGreaterThan(adv)
    expect(meds).toBeGreaterThan(comida)
  })

  it('muestra nombre y canil antes que las advertencias', () => {
    const html = renderFicha(vm())
    expect(html.indexOf('Tobías')).toBeLessThan(html.indexOf('No pisos lisos'))
    expect(html).toContain('Canil 3')
  })

  it('Registrar es un <a href> con el registrarUrl', () => {
    const html = renderFicha(vm())
    expect(html).toMatch(/<a [^>]*href="[^"]+"[^>]*>\s*Registrar\s*<\/a>/)
    expect(html).toContain(`href="${REGISTRAR}"`)
  })

  it('no tiene etiquetas <script>', () => {
    expect(renderFicha(vm())).not.toMatch(/<script/i)
    expect(renderFicha(vm({ vista: 'publica' }))).not.toMatch(/<script/i)
  })

  it('pesa menos de 30 KB con 6 dosis y 5 advertencias', () => {
    const dosis = Array.from({ length: 6 }, (_, i) => ({
      medicamento: `medicina ${i + 1}`,
      hora: `${i + 1}:00 PM`,
      estado: 'por_confirmar' as const,
      texto: 'Andrea dijo: "ya le di el anticonvulsivo" – 2:01 PM, sin confirmar',
      llamarA: 'https://wa.me/573001110001',
    }))
    const html = renderFicha(vm({ dosis, advertencias: ['a', 'b', 'c', 'd', 'e'].map((x) => `Advertencia ${x}`) }))
    expect(Buffer.byteLength(html)).toBeLessThan(30_000)
  })

  it('los textos con <b> salen escapados', () => {
    const html = renderFicha(
      vm({
        nombre: '<b>Tobías</b>',
        advertencias: ['<b>peligro</b>'],
        dosis: [{ medicamento: '<b>x</b>', hora: '2:00 PM', estado: 'por_confirmar', texto: '<b>dijo</b>' }],
      }),
    )
    expect(html).not.toContain('<b>')
    expect(html).toContain('&lt;b&gt;peligro&lt;/b&gt;')
    expect(html).toContain('&lt;b&gt;dijo&lt;/b&gt;')
  })

  it('las URL con comillas no rompen el atributo', () => {
    const html = renderFicha(vm({ registrarUrl: 'https://wa.me/1?text="x" onclick="y' }))
    expect(html).not.toContain('onclick="y')
  })

  it('una URL con esquema peligroso no se vuelve enlace', () => {
    const html = renderFicha(vm({ registrarUrl: 'javascript:alert(1)' }))
    expect(html).not.toContain('javascript:')
  })

  it('la vista pública muestra encabezadoPublico y "Llamar al albergue"', () => {
    const html = renderFicha(vm({ vista: 'publica' }))
    expect(html).toContain('Soy Tobías, del albergue Huellitas')
    expect(html).toMatch(/<a [^>]*href="tel:\+573000000000"[^>]*>\s*Llamar al albergue\s*<\/a>/)
  })

  it('la vista de equipo no muestra el encabezado público ni "Llamar al albergue"', () => {
    const html = renderFicha(vm({ vista: 'equipo' }))
    expect(html).not.toContain('Soy Tobías, del albergue Huellitas')
    expect(html).not.toContain('Llamar al albergue')
  })

  it('la vista de equipo muestra "Llamar" por dosis cuando existe llamarA', () => {
    const html = renderFicha(
      vm({
        dosis: [
          { medicamento: 'anticonvulsivo', hora: '2:00 PM', estado: 'por_confirmar', texto: 'x', llamarA: 'https://wa.me/573001110001' },
          { medicamento: 'antibiótico', hora: '8:00 PM', estado: 'pendiente' },
        ],
      }),
    )
    expect(html).toMatch(/<a [^>]*href="https:\/\/wa\.me\/573001110001"[^>]*>\s*Llamar\s*<\/a>/)
    expect(html.match(/>\s*Llamar\s*</g)).toHaveLength(1)
  })

  it('la vista pública jamás pinta llamarA (teléfonos del equipo)', () => {
    const html = renderFicha(
      vm({
        vista: 'publica',
        dosis: [
          {
            medicamento: 'anticonvulsivo',
            hora: '2:00 PM',
            estado: 'por_confirmar',
            texto: 'Un voluntario reportó la dosis a las 2:01 PM',
            llamarA: 'https://wa.me/573001110001',
          },
        ],
      }),
    )
    expect(html).not.toContain('573001110001')
    expect(html).toContain('Un voluntario reportó la dosis a las 2:01 PM')
  })

  it('cada estado de dosis usa su clase y el CSS inline las define', () => {
    const html = renderFicha(
      vm({
        dosis: [
          { medicamento: 'a', hora: '1:00 PM', estado: 'dada' },
          { medicamento: 'b', hora: '2:00 PM', estado: 'por_confirmar' },
          { medicamento: 'c', hora: '3:00 PM', estado: 'pendiente' },
          { medicamento: 'd', hora: '4:00 PM', estado: 'atrasada' },
        ],
      }),
    )
    for (const clase of ['dada', 'por_confirmar', 'pendiente', 'atrasada']) {
      expect(html).toMatch(new RegExp(`class="[^"]*\\b${clase}\\b[^"]*"`))
      expect(html).toContain(`.${clase}`)
    }
    expect(html).toContain('<style>')
    expect(html).not.toMatch(/<link[^>]+stylesheet/i)
  })

  it('muestra la comida según el estado', () => {
    expect(renderFicha(vm({ comida: { estado: 'comio', hora: '8:10 AM', texto: 'Comió a las 8:10 AM' } }))).toContain('Comió a las 8:10 AM')
    expect(renderFicha(vm({ comida: { estado: 'no_consta' } }))).toContain('No consta que haya comido')
    expect(
      renderFicha(vm({ comida: { estado: 'por_confirmar', texto: 'Andrea dijo: "ya comió" – 8:10 AM, sin confirmar' } })),
    ).toContain('sin confirmar')
  })

  it('sin dosis dice que no hay medicamentos hoy', () => {
    expect(renderFicha(vm({ advertencias: [], dosis: [] }))).toContain('Sin medicamentos hoy')
  })

  it('la foto, si existe, es una imagen pequeña con alt', () => {
    const html = renderFicha(vm({ fotoUrl: 'https://fotos.test/tob.jpg' }))
    expect(html).toMatch(/<img [^>]*src="https:\/\/fotos\.test\/tob\.jpg"[^>]*alt="[^"]*"/)
    expect(renderFicha(vm())).not.toContain('<img')
  })
})

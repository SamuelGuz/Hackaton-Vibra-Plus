import { describe, expect, it } from 'vitest'
import { esc } from '../../src/web/html'

describe('esc', () => {
  it('escapa <, >, &, comillas dobles y simples', () => {
    expect(esc(`<b>"a" & 'b'</b>`)).toBe('&lt;b&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/b&gt;')
  })

  it('escapa & primero para no duplicar entidades', () => {
    expect(esc('&lt;')).toBe('&amp;lt;')
  })

  it('deja intacto el texto sin caracteres especiales', () => {
    expect(esc('Tobías – 2:01 PM')).toBe('Tobías – 2:01 PM')
  })
})

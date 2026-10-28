import { describe, expect, it } from 'vitest'
import { buildFicha } from '../../src/domain/ficha'
import type { Registro } from '../../src/registro'
import type { FichaVM, Vista } from '../../src/vistas'
import { COMPROMISO_TOB_02, FECHA, comida, registro, semilla } from '../fixtures/semilla'

const BOT = '573009998888'

function ficha(eventos: Registro[], vista: Vista, hora = '15:30'): FichaVM {
  const { animales, personas, tratamientos, config } = semilla()
  return buildFicha(animales[0]!, tratamientos, eventos, personas, vista, `${FECHA}T${hora}:00-05:00`, config, BOT)
}

describe('buildFicha — zona horaria', () => {
  it('un ahoraIso en UTC da la misma ficha que el mismo instante en Bogotá (03:30Z del 28 = 22:30 del 27)', () => {
    const { animales, personas, tratamientos, config } = semilla()
    const en = (ahoraIso: string) => buildFicha(animales[0]!, tratamientos, [], personas, 'equipo', ahoraIso, config, BOT)
    const utc = en('2026-10-28T03:30:00Z')
    expect(utc).toEqual(en('2026-10-27T22:30:00-05:00'))
    expect(utc.dosis).toEqual([{ medicamento: 'Anticonvulsivo', hora: '2:00 PM', estado: 'atrasada' }])
  })
})

describe('buildFicha — dosis', () => {
  it('sin eventos y a las 15:30 la dosis de las 14:00 sale atrasada y la de las 02:00 no aparece', () => {
    const f = ficha([], 'equipo')
    expect(f.dosis).toEqual([{ medicamento: 'Anticonvulsivo', hora: '2:00 PM', estado: 'atrasada' }])
  })

  it('antes de que pase una hora de la programada sale pendiente; pasada la hora, atrasada', () => {
    expect(ficha([], 'equipo', '15:00').dosis[0]?.estado).toBe('pendiente')
    expect(ficha([], 'equipo', '15:01').dosis[0]?.estado).toBe('atrasada')
  })

  it('a las 10:00 la de las 02:00 sale atrasada y la de las 14:00 pendiente', () => {
    const f = ficha([], 'equipo', '10:00')
    expect(f.dosis.map((d) => [d.hora, d.estado])).toEqual([
      ['2:00 AM', 'atrasada'],
      ['2:00 PM', 'pendiente'],
    ])
  })

  it('con la dosis de las 14:00 por confirmar, la de la madrugada sin registro tampoco aparece', () => {
    expect(ficha([registro({ id: 'r-1' })], 'equipo').dosis.map((d) => d.hora)).toEqual(['2:00 PM'])
  })

  it('una dosis de la madrugada que sí tiene registro aparece como dada junto a la atrasada', () => {
    const madrugada = registro({ id: 'r-02', estado: 'confirmado', compromisoId: COMPROMISO_TOB_02, fechaHora: `${FECHA}T02:05:00-05:00` })
    const f = ficha([madrugada], 'equipo')
    expect(f.dosis.map((d) => [d.hora, d.estado])).toEqual([
      ['2:00 AM', 'dada'],
      ['2:00 PM', 'atrasada'],
    ])
  })

  it('en vista equipo una dosis por confirmar de Andrea dice quién y cuándo, y se puede llamar', () => {
    const f = ficha([registro({ id: 'r-1' })], 'equipo')
    expect(f.dosis).toHaveLength(1)
    expect(f.dosis[0]?.estado).toBe('por_confirmar')
    expect(f.dosis[0]?.texto).toBe('Andrea dijo: "ya le di el anticonvulsivo" – 2:01 PM, sin confirmar')
    expect(f.dosis[0]?.llamarA).toBe('https://wa.me/573001110001')
  })

  it('en vista pública la misma dosis dice "Un voluntario" y no ofrece llamar', () => {
    const f = ficha([registro({ id: 'r-1' })], 'publica')
    expect(f.dosis[0]?.estado).toBe('por_confirmar')
    expect(f.dosis[0]?.texto).toBe('Un voluntario reportó la dosis a las 2:01 PM')
    expect(f.dosis[0]?.llamarA).toBeUndefined()
  })

  it('la ficha pública no contiene el teléfono ni el nombre de Andrea', () => {
    const json = JSON.stringify(ficha([registro({ id: 'r-1' }), comida('r-2', 'TOB')], 'publica'))
    expect(json).not.toContain('Andrea')
    expect(json).not.toContain('573001110001')
  })

  it('una dosis confirmada sale dada', () => {
    const f = ficha([registro({ id: 'r-1', estado: 'confirmado' })], 'equipo')
    expect(f.dosis[0]?.estado).toBe('dada')
  })

  it('una dosis corregida sale dada', () => {
    expect(ficha([registro({ id: 'r-1', estado: 'corregido' })], 'equipo').dosis[0]?.estado).toBe('dada')
  })

  it('un registro anulado no cuenta: la dosis sigue atrasada', () => {
    expect(ficha([registro({ id: 'r-1', estado: 'anulado' })], 'equipo').dosis[0]?.estado).toBe('atrasada')
  })

  it('si hay uno confirmado y otro por confirmar de la misma dosis, gana el confirmado', () => {
    const f = ficha([registro({ id: 'r-1' }), registro({ id: 'r-2', estado: 'confirmado' })], 'equipo')
    expect(f.dosis[0]?.estado).toBe('dada')
  })

  it('un tratamiento de otro animal no aparece', () => {
    const { animales, personas, tratamientos, config } = semilla()
    const f = buildFicha(animales[1]!, tratamientos, [], personas, 'equipo', `${FECHA}T15:30:00-05:00`, config, BOT)
    expect(f.dosis).toEqual([])
  })
})

describe('buildFicha — comida', () => {
  it('sin registros de comida: no consta', () => {
    expect(ficha([], 'equipo').comida).toEqual({ estado: 'no_consta' })
  })

  it('comida confirmada: comió, con la hora', () => {
    const f = ficha([comida('c-1', 'TOB', { estado: 'confirmado' })], 'equipo')
    expect(f.comida).toEqual({ estado: 'comio', hora: '2:01 PM' })
  })

  it('comida por confirmar: en equipo dice quién; en pública, un voluntario', () => {
    const eventos = [comida('c-1', 'TOB')]
    expect(ficha(eventos, 'equipo').comida).toEqual({
      estado: 'por_confirmar',
      hora: '2:01 PM',
      texto: 'Andrea dijo: "ya comió" – 2:01 PM, sin confirmar',
    })
    expect(ficha(eventos, 'publica').comida).toEqual({
      estado: 'por_confirmar',
      hora: '2:01 PM',
      texto: 'Un voluntario reportó la comida a las 2:01 PM',
    })
  })

  it('la comida de otro animal o anulada no cuenta', () => {
    const eventos = [comida('c-1', 'MAT', { estado: 'confirmado' }), comida('c-2', 'TOB', { estado: 'anulado' })]
    expect(ficha(eventos, 'equipo').comida.estado).toBe('no_consta')
  })

  it('si hay una confirmada y otra por confirmar, comió', () => {
    const eventos = [comida('c-1', 'TOB'), comida('c-2', 'TOB', { estado: 'confirmado', fechaHora: `${FECHA}T09:00:00-05:00` })]
    expect(ficha(eventos, 'equipo').comida.estado).toBe('comio')
  })
})

describe('buildFicha — datos del animal y enlaces', () => {
  it('el encabezado público presenta al animal', () => {
    expect(ficha([], 'publica').encabezadoPublico).toBe('Soy Tobías, del albergue Huellitas')
  })

  it('copia código, nombre, canil, vista y advertencias en orden', () => {
    const f = ficha([], 'equipo')
    expect(f).toMatchObject({ codigo: 'TOB01', nombre: 'Tobías', canil: 'Canil 1', vista: 'equipo' })
    expect(f.advertencias).toEqual(['No juntar con machos', 'Dieta especial: comida húmeda'])
  })

  it('registrarUrl abre el chat del bot con "Registro TOB01 (Tobías): "', () => {
    expect(ficha([], 'publica').registrarUrl).toBe(`https://wa.me/${BOT}?text=` + encodeURIComponent('Registro TOB01 (Tobías): '))
  })

  it('contactoUrl llama al albergue', () => {
    expect(ficha([], 'publica').contactoUrl).toBe('tel:+573000000000')
  })

  it('fotoUrl solo existe si el animal tiene foto', () => {
    expect(ficha([], 'publica').fotoUrl).toBeUndefined()
    const { animales, personas, tratamientos, config } = semilla()
    const conFoto = { ...animales[0]!, foto: 'https://fotos.test/tob.jpg' }
    const f = buildFicha(conFoto, tratamientos, [], personas, 'publica', `${FECHA}T15:30:00-05:00`, config, BOT)
    expect(f.fotoUrl).toBe('https://fotos.test/tob.jpg')
  })
})

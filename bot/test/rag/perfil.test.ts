import { describe, expect, it } from 'vitest'
import { construirPerfil, esVisible } from '../../src/rag/perfil.js'
import { AHORA, PERFILES, datosRag } from './datos.js'

const de = (id: string, perfiles = PERFILES) => {
  const d = datosRag()
  return construirPerfil(d.animales.find((a) => a.id === id)!, d, perfiles, AHORA)
}

describe('construirPerfil con perfil curado', () => {
  it('mezcla los datos de la base con el perfil curado', () => {
    const p = de('1')
    expect(p).toMatchObject({ id: '1', nombre: 'Mateo', especie: 'perro', estado: 'tratamiento', edadAnios: 9, edadTexto: '9 años', tamano: 'mediano', historiaConfirmada: false })
    expect(p.historia).toContain('atropellaron')
    expect(p.personalidad).toEqual(['viejito', 'tranquilo'])
    expect(p.compatibilidad.apartamento).toBe(true)
    expect(p.adoptable).toBe(false) // está en tratamiento: se apadrina pero aún no se adopta
  })

  it('junta necesidades curadas, advertencias de la base y tratamientos activos con dosis y horas', () => {
    const p = de('1')
    expect(p.necesidadesMedicas).toEqual([
      'Evitar escaleras',
      'Todavía no puede subir escaleras ni saltar.',
      'Amoxicilina 3 ml a las 08:00 y 20:00',
    ])
  })

  it('no repite un tratamiento que el perfil curado ya nombra', () => {
    const p = de('1', { mateo: { ...PERFILES.mateo, necesidadesMedicas: ['Amoxicilina 2 veces al día'] } })
    expect(p.necesidadesMedicas.filter((n) => /amoxicilina/i.test(n))).toHaveLength(1)
  })

  it('ignora tratamientos que ya terminaron', () => {
    const d = datosRag()
    d.tratamientos[0].fin = '2026-10-01'
    const p = construirPerfil(d.animales[0], d, PERFILES, AHORA)
    expect(p.necesidadesMedicas.join(' ')).not.toMatch(/amoxicilina/i)
  })

  it('usa la meta curada y cuenta al padrino con el marcador documentado', () => {
    expect(de('1').meta).toEqual({ mensualCOP: 60000, padrinos: 0, cubiertoPct: 0 })
    expect(de('2').meta).toEqual({ mensualCOP: 40000, padrinos: 1, cubiertoPct: 50 })
  })
})

describe('construirPerfil sin perfil curado', () => {
  it('arma un perfil honesto solo con lo que sabe la base', () => {
    const p = de('1', {})
    expect(p.historiaConfirmada).toBe(false)
    expect(p.edadAnios).toBe(10) // "viejito"
    expect(p.personalidad).toEqual(expect.arrayContaining(['viejito', 'tranquilo']))
    expect(p.historia).toContain('Mateo')
    expect(p.historia).toContain('enero de 2026')
    expect(p.historia).toContain('Viejito y calmado')
    expect(p.historia).not.toMatch(/rescat|encontr|abandon|atropell/i)
    expect(p.meta.mensualCOP).toBe(40000)
  })

  it('saca las palabras de carácter de la descripción', () => {
    expect(de('2', {}).personalidad).toContain('enérgico')
    expect(de('3', {}).personalidad).toContain('tranquilo')
    expect(de('4', {}).personalidad).toContain('independiente')
  })

  it('un gato es pequeño y un perro mediano por defecto', () => {
    expect(de('4', {}).tamano).toBe('pequeno')
    expect(de('2', {}).tamano).toBe('mediano')
  })

  it('la compatibilidad desconocida queda en null, no se inventa', () => {
    expect(de('3', {}).compatibilidad).toEqual({ ninos: null, gatos: null, perros: null, apartamento: null })
  })
})

describe('campos derivados', () => {
  it('solo muestra fotos con URL http(s)', () => {
    expect(de('3').foto).toBe('https://fotos.huellitas.co/toby.jpg')
    expect(de('4').foto).toBeNull() // /archivos/* pide sesión
  })

  it('adoptable solo si está adoptable o en hogar temporal', () => {
    expect(de('2').adoptable).toBe(true)
    expect(de('3').adoptable).toBe(true)
    expect(de('1').adoptable).toBe(false)
  })

  it('la urgencia va de 0 a 1 y sube con salud, edad y falta de padrino', () => {
    const mateo = de('1').urgencia
    const rocky = de('2').urgencia
    expect(mateo).toBeGreaterThan(rocky)
    for (const u of [mateo, rocky, de('3').urgencia, de('4').urgencia]) {
      expect(u).toBeGreaterThanOrEqual(0)
      expect(u).toBeLessThanOrEqual(1)
    }
  })

  it('esVisible excluye adoptados y fallecidos', () => {
    expect(esVisible(de('2'))).toBe(true)
    expect(esVisible(de('5'))).toBe(false)
    expect(esVisible(de('6'))).toBe(false)
  })
})

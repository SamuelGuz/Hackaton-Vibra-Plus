import { describe, expect, it } from 'vitest'
import { PERFILES_CURADOS, claveDe } from '../../src/rag/perfiles-data'

// Nombres copiados de scripts/semilla.ts (PERROS y GATOS), sin importar el script.
const PERROS = [
  'Mateo', 'Bruno', 'Canela', 'Pecas', 'Toby', 'Lola', 'Max', 'Manchas', 'Negra', 'Rocky',
  'Chispa', 'Paco', 'Kira', 'Coco', 'Tobías', 'Mona', 'Lucas', 'Princesa', 'Sultán', 'Bombón',
  'Café', 'Nala', 'Zeus', 'Mota', 'Pelusa', 'Rufo', 'Tina', 'Simón', 'Galleta', 'Lupe',
  'Oso', 'Dulce', 'Pancho', 'Tango', 'Frida', 'Benito', 'Sombra', 'Kiara', 'Panela', 'Arepa',
  'Chocolate', 'Bruna', 'Gordo', 'Linda', 'Firulais',
]

const GATOS = [
  'Luna', 'Tigre', 'Misu', 'Nube', 'Tomate', 'Salem', 'Mango', 'Ágata', 'Bigotes', 'Pantera',
  'Kiwi', 'Morris', 'Pimienta', 'Menta', 'Olivia', 'Felipe', 'Copito', 'Sushi', 'Oreo', 'Mía',
  'Lucero', 'Gris', 'Zapatico', 'Jengibre', 'Tito',
]

const TODOS = [...PERROS, ...GATOS]
const TAMANOS = ['pequeno', 'mediano', 'grande']

describe('perfiles curados', () => {
  it('tiene exactamente 70 perfiles, uno por animal de la semilla', () => {
    expect(PERROS).toHaveLength(45)
    expect(GATOS).toHaveLength(25)
    expect(Object.keys(PERFILES_CURADOS)).toHaveLength(70)
  })

  it('cada nombre de la semilla tiene su perfil con clave claveDe(nombre)', () => {
    for (const nombre of TODOS) {
      expect(PERFILES_CURADOS[claveDe(nombre)], nombre).toBeDefined()
    }
  })

  it('cada perfil tiene historia de al menos 60 caracteres', () => {
    for (const [clave, perfil] of Object.entries(PERFILES_CURADOS)) {
      expect(perfil.historia.length, clave).toBeGreaterThanOrEqual(60)
    }
  })

  it('cada perfil tiene al menos una personalidad', () => {
    for (const [clave, perfil] of Object.entries(PERFILES_CURADOS)) {
      expect(perfil.personalidad.length, clave).toBeGreaterThanOrEqual(1)
    }
  })

  it('cada edad está entre 0 (sin incluir) y 18 años', () => {
    for (const [clave, perfil] of Object.entries(PERFILES_CURADOS)) {
      expect(perfil.edadAnios, clave).toBeGreaterThan(0)
      expect(perfil.edadAnios, clave).toBeLessThanOrEqual(18)
    }
  })

  it('cada tamaño es válido', () => {
    for (const [clave, perfil] of Object.entries(PERFILES_CURADOS)) {
      expect(TAMANOS, clave).toContain(perfil.tamano)
    }
  })

  it('los viejitos y calmados tienen al menos 9 años', () => {
    for (const [clave, perfil] of Object.entries(PERFILES_CURADOS)) {
      if (perfil.personalidad.some((p) => /viejit[oa] y calmad[oa]/i.test(p))) {
        expect(perfil.edadAnios, clave).toBeGreaterThanOrEqual(9)
      }
    }
  })

  it('los asustadizos con los perros tienen perros: false', () => {
    for (const [clave, perfil] of Object.entries(PERFILES_CURADOS)) {
      if (perfil.personalidad.some((p) => /asustadiz/i.test(p))) {
        expect(perfil.compatibilidad.perros, clave).toBe(false)
      }
    }
  })

  it('no todas las compatibilidades son true', () => {
    const todasTrue = Object.values(PERFILES_CURADOS).filter((p) =>
      Object.values(p.compatibilidad).every((v) => v === true),
    )
    expect(todasTrue).toHaveLength(0)
  })

  it('no hay dos historias idénticas', () => {
    const historias = Object.values(PERFILES_CURADOS).map((p) => p.historia)
    expect(new Set(historias).size).toBe(historias.length)
  })

  it('Mateo: atropellado, cirugía, sin escaleras y medicinas de la semilla', () => {
    const mateo = PERFILES_CURADOS[claveDe('Mateo')]!
    expect(mateo.historia).toMatch(/atropell/i)
    expect(mateo.historia).toMatch(/cirug/i)
    expect(mateo.historia).toMatch(/escaleras/i)
    expect(mateo.necesidadesMedicas.some((n) => n.includes('Amoxicilina'))).toBe(true)
    expect(mateo.necesidadesMedicas.some((n) => n.includes('Meloxicam'))).toBe(true)
    expect(mateo.necesidadesMedicas.some((n) => n.includes('escaleras'))).toBe(true)
  })

  it('Bruno: ocho meses en el albergue, pisos lisos y baño medicado', () => {
    const bruno = PERFILES_CURADOS[claveDe('Bruno')]!
    expect(bruno.historia).toMatch(/ocho meses/i)
    expect(bruno.necesidadesMedicas.some((n) => n.includes('pisos lisos'))).toBe(true)
    expect(bruno.necesidadesMedicas.some((n) => /champú medicado/i.test(n))).toBe(true)
  })

  it('Tobías: convulsiones controladas y anticonvulsivo a las 2:00 p. m.', () => {
    const tobias = PERFILES_CURADOS[claveDe('Tobías')]!
    expect(tobias.historia).toMatch(/convulsiones controladas/i)
    expect(tobias.necesidadesMedicas.some((n) => n.includes('2:00 p. m.'))).toBe(true)
  })

  it('Negra está en cuarentena y no se junta con otros perros', () => {
    const negra = PERFILES_CURADOS[claveDe('Negra')]!
    expect(negra.necesidadesMedicas.some((n) => /cuarentena/i.test(n))).toBe(true)
  })
})

describe('claveDe', () => {
  it('quita tildes, pasa a minúsculas y recorta espacios', () => {
    expect(claveDe('Tobías')).toBe('tobias')
    expect(claveDe('Ágata')).toBe('agata')
    expect(claveDe('  Sultán ')).toBe('sultan')
    expect(claveDe('MATEO')).toBe('mateo')
  })

  it('genera claves únicas para los 70 nombres', () => {
    const claves = TODOS.map(claveDe)
    expect(new Set(claves).size).toBe(70)
  })
})

import { describe, expect, it } from 'vitest'
import { PERFILES_CURADOS, claveDe } from '../../src/rag/perfiles-data.js'

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
    const mateo = PERFILES_CURADOS[claveDe('Mateo')]
    expect(mateo.historia).toMatch(/atropell/i)
    expect(mateo.historia).toMatch(/cirug/i)
    expect(mateo.historia).toMatch(/escaleras/i)
    expect(mateo.necesidadesMedicas.some((n) => n.includes('Amoxicilina'))).toBe(true)
    expect(mateo.necesidadesMedicas.some((n) => n.includes('Meloxicam'))).toBe(true)
    expect(mateo.necesidadesMedicas.some((n) => n.includes('escaleras'))).toBe(true)
  })

  it('Bruno: ocho meses en el albergue, pisos lisos y baño medicado', () => {
    const bruno = PERFILES_CURADOS[claveDe('Bruno')]
    expect(bruno.historia).toMatch(/ocho meses/i)
    expect(bruno.necesidadesMedicas.some((n) => n.includes('pisos lisos'))).toBe(true)
    expect(bruno.necesidadesMedicas.some((n) => /champú medicado/i.test(n))).toBe(true)
  })

  it('Tobías: convulsiones controladas y anticonvulsivo a las 2:00 p. m.', () => {
    const tobias = PERFILES_CURADOS[claveDe('Tobías')]
    expect(tobias.historia).toMatch(/convulsiones controladas/i)
    expect(tobias.necesidadesMedicas.some((n) => n.includes('2:00 p. m.'))).toBe(true)
  })

  it('Negra está en cuarentena y no se junta con otros perros', () => {
    const negra = PERFILES_CURADOS[claveDe('Negra')]
    expect(negra.necesidadesMedicas.some((n) => /cuarentena/i.test(n))).toBe(true)
  })
})

// Animales de la semilla con caracter "Viejito y calmado" (semilla.ts: indice % 6 === 5 entre los perros)
const VIEJITOS_SEMILLA = ['Lola', 'Paco', 'Princesa', 'Mota', 'Lupe', 'Benito', 'Bruna']
// Animales en cuarentena (semilla.ts: ESTADO_ESPECIAL)
const CUARENTENA = ['Negra', 'Chispa', 'Nube', 'Mango']
// Cachorros o gatitos de 1 año: no esterilizados todavía
const CACHORROS = ['Pecas', 'Nube', 'Kiwi']

const RANGOS_PESO_PERRO: Record<string, [number, number]> = {
  pequeno: [4, 10],
  mediano: [10, 25],
  grande: [25, 40],
}
const RANGOS_PESO_GATO: Record<string, [number, number]> = {
  pequeno: [2, 4.5],
  mediano: [4, 7],
}

const perfil = (nombre: string) => PERFILES_CURADOS[claveDe(nombre)]

describe('datos extra de perfiles curados', () => {
  it('cada uno de los 70 perfiles tiene todos los campos extra completos', () => {
    for (const nombre of TODOS) {
      const p = perfil(nombre)
      expect(typeof p.vacunado, nombre).toBe('boolean')
      expect(typeof p.esterilizado, nombre).toBe('boolean')
      expect(typeof p.desparasitado, nombre).toBe('boolean')
      expect(typeof p.microchip, nombre).toBe('boolean')
      expect(p.pesoKg, nombre).toBeGreaterThan(0)
      expect(p.comidaFavorita?.trim().length, nombre).toBeGreaterThan(0)
      expect(p.rutinaDia?.trim().length, nombre).toBeGreaterThan(0)
      expect(p.cuidadosEspeciales?.length, nombre).toBeGreaterThanOrEqual(1)
      expect(p.curiosidades?.length, nombre).toBeGreaterThanOrEqual(1)
      expect(p.lugarRescate?.trim().length, nombre).toBeGreaterThan(0)
    }
  })

  it('cada fecha de rescate es YYYY-MM-DD válida y de 2025 o 2026', () => {
    for (const nombre of TODOS) {
      const fecha = perfil(nombre).fechaRescate ?? ''
      expect(fecha, nombre).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(`${fecha}T00:00:00Z`).toString(), nombre).not.toBe('Invalid Date')
      expect(['2025', '2026'], nombre).toContain(fecha.slice(0, 4))
    }
  })

  it('el peso encaja con el tamaño en perros', () => {
    for (const nombre of PERROS) {
      const p = perfil(nombre)
      const [min, max] = RANGOS_PESO_PERRO[p.tamano]
      expect(p.pesoKg, nombre).toBeGreaterThanOrEqual(min)
      expect(p.pesoKg, nombre).toBeLessThanOrEqual(max)
    }
  })

  it('el peso encaja con el tamaño en gatos', () => {
    for (const nombre of GATOS) {
      const p = perfil(nombre)
      const [min, max] = RANGOS_PESO_GATO[p.tamano]
      expect(p.pesoKg, nombre).toBeGreaterThanOrEqual(min)
      expect(p.pesoKg, nombre).toBeLessThanOrEqual(max)
    }
  })

  it('Mateo tiene 8 años', () => {
    expect(perfil('Mateo').edadAnios).toBe(8)
  })

  it('los viejitos de la semilla tienen al menos 9 años', () => {
    for (const nombre of VIEJITOS_SEMILLA) {
      expect(perfil(nombre).edadAnios, nombre).toBeGreaterThanOrEqual(9)
    }
  })

  it('los animales en cuarentena no están vacunados ni esterilizados', () => {
    for (const nombre of CUARENTENA) {
      expect(perfil(nombre).vacunado, nombre).toBe(false)
      expect(perfil(nombre).esterilizado, nombre).toBe(false)
    }
  })

  it('los cachorros y gatitos de 1 año no están esterilizados', () => {
    for (const nombre of CACHORROS) {
      expect(perfil(nombre).esterilizado, nombre).toBe(false)
    }
  })

  it('Mateo y Tobías conservan su historia y sus medicinas', () => {
    expect(perfil('Mateo').historia).toMatch(/atropell/i)
    expect(perfil('Tobías').necesidadesMedicas.some((n) => n.includes('2:00 p. m.'))).toBe(true)
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

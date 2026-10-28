// Datos de prueba del RAG: un albergue pequeño con los casos que importan (viejito, juguetón, gato, ocultos).
import type { Animal, DatosAlbergue } from '../../src/panel-tipos.js'
import type { PerfilCurado } from '../../src/rag/tipos.js'
import { AHORA, HOY, datosDePrueba } from '../fakes.js'

export { AHORA, HOY }

const animal = (a: Partial<Animal> & Pick<Animal, 'id' | 'nombre'>): Animal => ({
  especie: 'perro', estado: 'adoptable', foto: null, fechaIngreso: '2026-01-15', advertencias: [], caracter: '', padrino: null, ...a,
})

export function datosRag(): DatosAlbergue {
  const d = datosDePrueba()
  d.animales = [
    animal({ id: '1', nombre: 'Mateo', estado: 'tratamiento', caracter: 'Viejito y calmado, duerme casi todo el día.', advertencias: ['Todavía no puede subir escaleras ni saltar.'] }),
    animal({ id: '2', nombre: 'Rocky', caracter: 'Mucha energía, necesita caminar todos los días.', padrino: 'Ana' }),
    animal({ id: '3', nombre: 'Toby', estado: 'hogar_temporal', caracter: 'Tranquilo, le gusta que lo acaricien despacio.', foto: 'https://fotos.huellitas.co/toby.jpg' }),
    animal({ id: '4', nombre: 'Luna', especie: 'gato', caracter: 'Independiente, se deja cargar poco.', foto: '/archivos/luna.jpg' }),
    animal({ id: '5', nombre: 'Firulais', estado: 'adoptado' }),
    animal({ id: '6', nombre: 'Pepe', estado: 'fallecido' }),
  ]
  d.tratamientos = [{ id: 't1', animalId: '1', medicamento: 'Amoxicilina', dosis: '3 ml', horas: ['08:00', '20:00'], inicio: '2026-10-20', fin: '2026-11-05' }]
  d.dosisDadas = []
  d.notas = []
  return d
}

export const PERFILES: Record<string, PerfilCurado> = {
  mateo: {
    edadAnios: 9, tamano: 'mediano', personalidad: ['viejito', 'tranquilo'],
    historia: 'Lo atropellaron en la vía. Después de la cirugía es el consentido del albergue.',
    compatibilidad: { ninos: true, gatos: null, perros: true, apartamento: true },
    necesidadesMedicas: ['Evitar escaleras'], mensualCOP: 60000,
  },
  rocky: {
    edadAnios: 2, tamano: 'grande', personalidad: ['juguetón', 'enérgico'],
    historia: 'Llegó cachorro a la fundación y no ha dejado de correr desde entonces.',
    compatibilidad: { ninos: true, gatos: false, perros: true, apartamento: false }, necesidadesMedicas: [],
  },
  toby: {
    edadAnios: 3, tamano: 'mediano', personalidad: ['tranquilo', 'cariñoso'],
    historia: 'Lo encontraron bajo un puente, con frío, esperando a alguien. Aun así mueve la cola con todos.',
    compatibilidad: { ninos: true, gatos: null, perros: true, apartamento: true }, necesidadesMedicas: [],
  },
}

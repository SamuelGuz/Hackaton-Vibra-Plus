// Datos de prueba del RAG: un albergue pequeño con los casos que importan (viejito, juguetón, gato, ocultos).
// `datosRag()` es la foto ya cargada (para las funciones puras); `repoRag()` es el mismo albergue en un MemoryRepo
// (para `cargarDatosRag` y `crearRag`).
import type { Padrinazgo, Registro } from '@huellitas/shared/registro'
import type { Animal, Tratamiento } from '@huellitas/shared/tipos'
import type { DatosRag } from '../../src/rag/datos'
import type { PerfilCurado } from '../../src/rag/tipos'
import { MemoryRepo } from '../../src/store/memory-repo'
import type { DatosSemilla, Repo } from '../../src/store/repo'
import { semillaMini } from '../fixtures/semilla-mini'

/** 27 de octubre de 2026, 3 p. m. en Bogotá */
export const AHORA = new Date('2026-10-27T20:00:00Z')
export const HOY = '2026-10-27'

export const animal = (a: Partial<Animal> & Pick<Animal, 'id' | 'nombre'>): Animal => ({
  especie: 'perro', estado: 'adoptable', foto: null, fechaIngreso: '2026-01-15', advertencias: [], caracter: '', padrino: null, ...a,
})

export function animalesRag(): Animal[] {
  return [
    animal({ id: '1', nombre: 'Mateo', estado: 'tratamiento', caracter: 'Viejito y calmado, duerme casi todo el día.', advertencias: ['Todavía no puede subir escaleras ni saltar.'] }),
    animal({ id: '2', nombre: 'Rocky', caracter: 'Mucha energía, necesita caminar todos los días.', padrino: 'Ana' }),
    animal({ id: '3', nombre: 'Toby', estado: 'hogar_temporal', caracter: 'Tranquilo, le gusta que lo acaricien despacio.', foto: 'https://fotos.huellitas.co/toby.jpg' }),
    animal({ id: '4', nombre: 'Luna', especie: 'gato', caracter: 'Independiente, se deja cargar poco.', foto: '/archivos/luna.jpg' }),
    animal({ id: '5', nombre: 'Firulais', estado: 'adoptado' }),
    animal({ id: '6', nombre: 'Pepe', estado: 'fallecido' }),
  ]
}

export function tratamientosRag(): Tratamiento[] {
  return [{ id: 't1', animalId: '1', medicamento: 'Amoxicilina', dosis: '3 ml', horas: ['08:00', '20:00'], inicio: '2026-10-20', fin: '2026-11-05' }]
}

/** La foto de datos del albergue de prueba, sin actividad de hoy */
export function datosRag(): DatosRag {
  return { animales: animalesRag(), tratamientos: tratamientosRag(), dosisDadas: [], notas: [], comieronHoy: new Set(), padrinosPorAnimal: {} }
}

export function semillaRag(extra: { registros?: Registro[]; padrinazgos?: Padrinazgo[] } = {}): DatosSemilla {
  return { ...semillaMini(), animales: animalesRag(), tratamientos: tratamientosRag(), padrinazgos: extra.padrinazgos ?? [], registros: extra.registros ?? [] }
}

export const repoRag = (extra?: Parameters<typeof semillaRag>[0]) => new MemoryRepo(semillaRag(extra))

let contador = 0
/** Un registro de la bitácora; por defecto confirmado, de hoy a las 9 a. m. y de la persona `p-carlos` */
export function registro(propuesta: Registro['propuesta'], extra: Partial<Registro> = {}): Registro {
  return { id: `r${++contador}`, fechaHora: `${HOY}T09:00:00-05:00`, agenteId: 'p-carlos', origen: 'audio', estado: 'confirmado', propuesta, ...extra }
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

/** El mismo repo con `animales()` reemplazada: para contar cargas, simular una base caída o cambiar datos entre cargas */
export function repoConAnimales(base: Repo, animales: () => Promise<Animal[]>): Repo {
  return new Proxy(base, { get: (t, k, r) => (k === 'animales' ? animales : Reflect.get(t, k, r)) })
}

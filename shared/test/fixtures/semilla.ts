// Semilla mínima para probar el dominio de shared (copia reducida de bot/test/fixtures/semilla-mini.ts:
// shared no puede importar del bot). Día de las pruebas: 2026-10-27.
import type { Animal, Persona, Tratamiento } from '../../src/tipos'
import type { ConfigServidor, PropuestaServidor, Registro } from '../../src/registro'
import type { DosisProgramada } from '../../src/vistas'

export const FECHA = '2026-10-27'

function animal(a: Pick<Animal, 'id' | 'nombre' | 'especie' | 'codigo' | 'canil'> & Partial<Animal>): Animal {
  return {
    estado: 'tratamiento',
    foto: null,
    fechaIngreso: '2026-03-14',
    advertencias: [],
    caracter: '',
    padrino: null,
    alias: [],
    ...a,
  }
}

export function semilla(): { animales: Animal[]; personas: Persona[]; tratamientos: Tratamiento[]; config: ConfigServidor } {
  return {
    personas: [
      { id: 'p-andrea', nombre: 'Andrea', cargo: 'Voluntaria', rol: 'voluntario', color: '#a8432c', foto: null, telefono: '573001110001', activo: true },
      { id: 'p-carlos', nombre: 'Carlos', cargo: 'Cuidador', rol: 'cuidador', color: '#2f6b3b', foto: null, telefono: '573001110002', activo: true },
      { id: 'p-admin', nombre: 'Admin', cargo: 'Administración', rol: 'admin', color: '#1f2a44', foto: null, telefono: '573001110003', activo: true },
    ],
    animales: [
      animal({
        id: 'TOB',
        nombre: 'Tobías',
        especie: 'perro',
        codigo: 'TOB01',
        canil: 'Canil 1',
        alias: ['Tobi'],
        advertencias: ['No juntar con machos', 'Dieta especial: comida húmeda'],
      }),
      animal({ id: 'MAT', nombre: 'Mateo', especie: 'perro', codigo: 'MAT01', canil: 'Canil 2' }),
      animal({ id: 'BRU', nombre: 'Bruno', especie: 'perro', codigo: 'BRU01', canil: 'Canil 3', advertencias: ['No pisos lisos'] }),
      animal({ id: 'LUN', nombre: 'Luna', especie: 'gato', codigo: 'LUN01', canil: 'Gatera' }),
    ],
    tratamientos: [
      {
        id: 't-tob-anticonvulsivo',
        animalId: 'TOB',
        medicamento: 'Anticonvulsivo',
        dosis: '1 pastilla',
        // Cada 12 h desde las 14:00
        horas: ['02:00', '14:00'],
        inicio: '2026-10-01',
        fin: '2026-12-31',
        critico: true,
      },
    ],
    config: {
      umbralPreguntar: 0.7,
      umbralAutoconfirmar: 0.85,
      minutosAutoconfirmar: 30,
      diasAlertaComida: 4,
      horaCierre: '18:30',
      telefonoAlbergue: '573000000000',
      baseUrl: 'https://huellitas.test',
    },
  }
}

export const COMPROMISO_TOB_14 = `t-tob-anticonvulsivo@${FECHA}T14:00`
export const COMPROMISO_TOB_02 = `t-tob-anticonvulsivo@${FECHA}T02:00`

/** Registro de prueba: por defecto una dosis de Tobías de las 14:00 reportada por Andrea a las 14:01. */
export function registro(parcial: Partial<Registro> & { id: string }): Registro {
  const propuesta: PropuestaServidor = { tipo: 'dosis', animalId: 'TOB', tratamientoId: 't-tob-anticonvulsivo', hora: '14:00' }
  return {
    fechaHora: `${FECHA}T14:01:00-05:00`,
    agenteId: 'p-andrea',
    origen: 'audio',
    estado: 'por_confirmar',
    propuesta,
    fraseExacta: 'ya le di el anticonvulsivo',
    confianza: 0.9,
    compromisoId: COMPROMISO_TOB_14,
    ...parcial,
  }
}

export function comida(id: string, animalId: string, parcial: Partial<Registro> = {}): Registro {
  return registro({
    id,
    propuesta: { tipo: 'comida', animalId, texto: 'comió' },
    fraseExacta: 'ya comió',
    compromisoId: undefined,
    ...parcial,
  })
}

/** Las dosis que programa la semilla ese día, por si una prueba las necesita sueltas. */
export const DOSIS_TOB: DosisProgramada[] = [
  { compromisoId: COMPROMISO_TOB_02, tratamientoId: 't-tob-anticonvulsivo', animalId: 'TOB', medicamento: 'Anticonvulsivo', hora: '02:00' },
  { compromisoId: COMPROMISO_TOB_14, tratamientoId: 't-tob-anticonvulsivo', animalId: 'TOB', medicamento: 'Anticonvulsivo', hora: '14:00' },
]

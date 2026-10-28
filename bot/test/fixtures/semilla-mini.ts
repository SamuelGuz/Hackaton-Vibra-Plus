// Semilla mínima para las pruebas (placa viva Task 1 Step 4, adaptada a D4 y D11):
// 4 animales, 3 personas del equipo, el anticonvulsivo crítico de Tobías y las 2 clínicas.
import type { Animal, Persona } from '@huellitas/shared/tipos'
import type { DatosSemilla } from '../../src/store/repo'

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

export function semillaMini(): DatosSemilla {
  const personas: Persona[] = [
    { id: 'p-andrea', nombre: 'Andrea', cargo: 'Voluntaria', rol: 'voluntario', color: '#a8432c', foto: null, telefono: '573001110001', activo: true },
    { id: 'p-carlos', nombre: 'Carlos', cargo: 'Cuidador', rol: 'cuidador', color: '#2f6b3b', foto: null, telefono: '573001110002', activo: true },
    { id: 'p-admin', nombre: 'Admin', cargo: 'Administración', rol: 'admin', color: '#1f2a44', foto: null, telefono: '573001110003', activo: true },
  ]

  return {
    personas,
    animales: [
      animal({
        id: 'TOB',
        nombre: 'Tobías',
        especie: 'perro',
        codigo: 'TOB01',
        canil: 'Canil 1',
        alias: ['Tobi'],
        advertencias: ['No juntar con machos', 'Dieta especial: comida húmeda'],
        caracter: 'Tranquilo, le gusta que lo acaricien despacio.',
      }),
      animal({ id: 'MAT', nombre: 'Mateo', especie: 'perro', codigo: 'MAT01', canil: 'Canil 2', caracter: 'Lo atropellaron en la vía. Es el consentido.' }),
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
    // Deuda base 0: la deuda de cada prueba sale de los registros
    clinicas: [
      { id: 'cl-general', nombre: 'Clínica Veterinaria San Roque', deuda: 0, limite: 3_000_000 },
      { id: 'cl-24h', nombre: 'Clínica Veterinaria 24 Horas', deuda: 0, limite: 3_000_000 },
    ],
    configComida: {
      kgPorBulto: { perro: 25, gato: 10 },
      // 3 perros a 0,375 kg/día y 1 gato a 0,065 kg/día
      consumoDiarioKg: { perro: 3 * 0.375, gato: 0.065 },
      diasAviso: 6,
      diasUrgente: 4,
    },
    config: {
      umbralPreguntar: 0.7,
      umbralAutoconfirmar: 0.85,
      minutosAutoconfirmar: 30,
      diasAlertaComida: 4,
      horaCierre: '18:30',
      telefonoAlbergue: '573000000000',
      baseUrl: 'https://huellitas.test',
    },
    catalogo: [
      { id: 'cat-perro', nombre: 'Concentrado de perro', tipo: 'alimento', kgPorUnidad: 25, especieObjetivo: 'perro', consumoDiarioKgPorAnimal: 0.375 },
      { id: 'cat-gato', nombre: 'Concentrado de gato', tipo: 'alimento', kgPorUnidad: 10, especieObjetivo: 'gato', consumoDiarioKgPorAnimal: 0.065 },
    ],
    base: {
      conteoInicial: { fecha: '2026-10-25', bultos: { perro: 5, gato: 3 } },
      cajaInicial: { fecha: '2026-10-24', monto: 1_000_000 },
      vidasCambiadas: 214,
    },
    padrinazgos: [{ id: 'pad-1', personaTelefono: '573009990001', personaNombre: 'Valentina G.', animalId: 'LUN', activo: true }],
  }
}

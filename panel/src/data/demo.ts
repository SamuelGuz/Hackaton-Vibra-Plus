// Datos de demostración basados en la entrevista con Huellitas (docs/Huellitas_Requerimientos_VibraPlus.md).
// Las fechas se calculan desde "ahora" para que la demo siempre se vea del día.
// Fotos: todas en null hasta elegir fotos reales con licencia libre (ver docs/PLAN_PANEL.md, sección 1.1).

import { fechaLocal } from '../lib/formato'
import type { Animal, DatosAlbergue, EstadoAnimal, Persona, PorConfirmar, Tratamiento } from './tipos'

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

const ESTADO_ESPECIAL: Record<string, EstadoAnimal> = {
  Mateo: 'tratamiento', Bruno: 'tratamiento', Pecas: 'tratamiento', Rocky: 'tratamiento', Kira: 'tratamiento',
  Luna: 'tratamiento', Tigre: 'tratamiento', Misu: 'tratamiento', Salem: 'tratamiento',
  Negra: 'cuarentena', Chispa: 'cuarentena', Nube: 'cuarentena', Mango: 'cuarentena',
  Toby: 'hogar_temporal', Lola: 'hogar_temporal', Copito: 'hogar_temporal', Oreo: 'hogar_temporal',
}

const CARACTER_PERRO = [
  'Juguetón, se lleva bien con otros perros.',
  'Tranquilo, le gusta que lo acaricien despacio.',
  'Tímido al principio; hay que dejar que se acerque.',
  'Mucha energía, necesita caminar todos los días.',
  'Cariñoso con la gente, celoso con la comida.',
  'Viejito y calmado, duerme casi todo el día.',
]

const CARACTER_GATO = [
  'Independiente, se deja cargar poco.',
  'Ronronea con cualquiera que se siente cerca.',
  'Asustadizo con los perros, mejor en casa sin perros.',
  'Curioso, se sube a todo.',
]

const ESPECIALES: Record<string, Partial<Animal>> = {
  Mateo: {
    caracter: 'Lo atropellaron en la vía. Después de la cirugía es el consentido del albergue.',
    advertencias: ['Todavía no puede subir escaleras ni saltar.'],
    padrino: 'Familia Ríos',
  },
  Bruno: {
    caracter: 'Lleva 8 meses con nosotros. Noble, se estresa con los cambios bruscos.',
    advertencias: [
      'NO pisos lisos (cerámica, baldosa): se resbala y se lastima la piel.',
      'Está terminando tratamiento de piel: baño con champú medicado cada día.',
    ],
  },
  Luna: { padrino: 'Valentina G.' },
  Negra: { advertencias: ['En cuarentena: no juntar con otros perros todavía.'] },
}

function diasAtras(ahora: Date, dias: number): string {
  const d = new Date(ahora)
  d.setDate(d.getDate() - dias)
  return fechaLocal(d)
}

function diasAdelante(ahora: Date, dias: number): string {
  return diasAtras(ahora, -dias)
}

/** Fecha y hora local ISO sin zona, p. ej. '2026-10-27T06:58' */
function momento(ahora: Date, diasAntes: number, hora: string): string {
  return `${diasAtras(ahora, diasAntes)}T${hora}`
}

function crearAnimales(ahora: Date): Animal[] {
  const lista = [
    ...PERROS.map((nombre, i) => ({ nombre, especie: 'perro' as const, i })),
    ...GATOS.map((nombre, i) => ({ nombre, especie: 'gato' as const, i })),
  ]
  return lista.map(({ nombre, especie, i }) => {
    const caracteres = especie === 'perro' ? CARACTER_PERRO : CARACTER_GATO
    return {
      id: `${especie}-${i + 1}`,
      nombre,
      especie,
      estado: ESTADO_ESPECIAL[nombre] ?? 'adoptable',
      foto: null,
      // Ingresos repartidos en el último año; Bruno lleva 8 meses
      fechaIngreso: nombre === 'Bruno' ? diasAtras(ahora, 240) : diasAtras(ahora, 10 + ((i * 37) % 330)),
      advertencias: [],
      caracter: caracteres[i % caracteres.length],
      padrino: null,
      ...ESPECIALES[nombre],
    }
  })
}

function idDe(animales: Animal[], nombre: string): string {
  const a = animales.find((x) => x.nombre === nombre)
  if (!a) throw new Error(`No existe el animal ${nombre} en los datos demo`)
  return a.id
}

export function crearDatosDemo(ahora: Date = new Date()): DatosAlbergue {
  const animales = crearAnimales(ahora)
  const id = (nombre: string) => idDe(animales, nombre)
  const hoy = fechaLocal(ahora)

  const personas: Persona[] = [
    { id: 'p-luis', nombre: 'Don Luis', cargo: 'Cuidador', rol: 'cuidador', color: '#2f6b3b', foto: null },
    { id: 'p-andres', nombre: 'Andrés', cargo: 'Bienestar animal', rol: 'bienestar', color: '#a8432c', foto: null },
    { id: 'p-carolina', nombre: 'Carolina', cargo: 'Administración', rol: 'admin', color: '#1f2a44', foto: null },
    // Rol del panel de adopción (Daniel)
    { id: 'p-marcela', nombre: 'Marcela', cargo: 'Adopciones', rol: 'adopciones', color: '#595449', foto: null },
  ]

  const tratamientos: Tratamiento[] = [
    { id: 't-1', animalId: id('Mateo'), medicamento: 'Amoxicilina', dosis: '3 ml', horas: ['08:00', '20:00'], inicio: diasAtras(ahora, 4), fin: diasAdelante(ahora, 6) },
    { id: 't-2', animalId: id('Mateo'), medicamento: 'Meloxicam (dolor)', dosis: 'media pastilla', horas: ['08:00'], inicio: diasAtras(ahora, 4), fin: diasAdelante(ahora, 3) },
    { id: 't-3', animalId: id('Bruno'), medicamento: 'Baño con champú medicado', dosis: '1 baño', horas: ['10:00'], inicio: diasAtras(ahora, 20), fin: diasAdelante(ahora, 2) },
    { id: 't-4', animalId: id('Canela'), medicamento: 'Desparasitante', dosis: '1 pastilla', horas: ['07:00'], inicio: hoy, fin: hoy },
    { id: 't-5', animalId: id('Luna'), medicamento: 'Gotas para los ojos', dosis: '2 gotas', horas: ['08:00', '14:00', '20:00'], inicio: diasAtras(ahora, 2), fin: diasAdelante(ahora, 5) },
    { id: 't-6', animalId: id('Tigre'), medicamento: 'Antibiótico', dosis: '1 ml', horas: ['09:00', '21:00'], inicio: diasAtras(ahora, 1), fin: diasAdelante(ahora, 7) },
    { id: 't-7', animalId: id('Pecas'), medicamento: 'Vitaminas', dosis: '5 ml', horas: ['12:00'], inicio: diasAtras(ahora, 10), fin: diasAdelante(ahora, 20) },
  ]

  // Canela ya recibió su desparasitante si ya pasaron las 7 a. m.
  const dosisDadas =
    ahora.getHours() >= 7
      ? [{ id: 'd-1', tratamientoId: 't-4', hora: '07:00', fechaHora: momento(ahora, 0, '06:58'), quien: 'p-luis', origen: 'panel' as const }]
      : []

  const porConfirmar: PorConfirmar[] = [
    {
      id: 'c-1',
      fechaHora: momento(ahora, 0, '08:12'),
      origen: 'audio',
      quien: 'p-luis',
      textoOriginal: 'Le di la amoxicilina a Mateo, ya camina solito, y abrí un bulto de perro.',
      propuestas: [
        { tipo: 'dosis', animalId: id('Mateo'), tratamientoId: 't-1', hora: '08:00' },
        { tipo: 'nota', animalId: id('Mateo'), texto: 'Ya camina solito.' },
        { tipo: 'inventario', especie: 'perro', cambio: -1 },
      ],
      estado: 'pendiente',
    },
    {
      id: 'c-2',
      fechaHora: momento(ahora, 0, '07:40'),
      origen: 'foto',
      quien: 'p-carolina',
      textoOriginal: 'Captura de Nequi: "Recibiste $150.000 de Laura M."',
      propuestas: [
        {
          tipo: 'movimiento',
          movimiento: { tipo: 'ingreso', monto: 150_000, categoria: 'donacion', clinicaId: null, abonoDeuda: false, foto: null, nota: 'Nequi · Laura M.' },
        },
      ],
      estado: 'pendiente',
    },
    {
      id: 'c-3',
      fechaHora: momento(ahora, 1, '18:05'),
      origen: 'foto',
      quien: 'p-andres',
      textoOriginal: 'Factura Clínica Veterinaria 24 Horas: consulta y antibiótico de Tigre, $320.000, a crédito.',
      propuestas: [{ tipo: 'deuda', clinicaId: 'cl-24h', monto: 320_000, nota: 'Consulta y antibiótico de Tigre' }],
      estado: 'pendiente',
    },
  ]

  return {
    personas,
    animales,
    tratamientos,
    dosisDadas,
    // Conteo hace 2 días: 5 bultos de perro y 3 de gato. Desde entonces se abrieron 2 de perro.
    conteoInicial: { fecha: diasAtras(ahora, 2), bultos: { perro: 5, gato: 3 } },
    inventario: [
      { id: 'i-1', fechaHora: momento(ahora, 1, '06:40'), tipo: 'perro', cambio: -1, quien: 'p-luis', origen: 'panel' },
      { id: 'i-2', fechaHora: momento(ahora, 0, '06:35'), tipo: 'perro', cambio: -1, quien: 'p-luis', origen: 'bot' },
    ],
    cajaInicial: { fecha: diasAtras(ahora, 3), monto: 1_050_000 },
    movimientos: [
      { id: 'm-1', fechaHora: momento(ahora, 2, '19:20'), tipo: 'ingreso', monto: 300_000, categoria: 'donacion', clinicaId: null, abonoDeuda: false, foto: null, quien: 'p-carolina', nota: 'Donación por la publicación de Mateo' },
      { id: 'm-2', fechaHora: momento(ahora, 1, '09:10'), tipo: 'ingreso', monto: 40_000, categoria: 'padrino', clinicaId: null, abonoDeuda: false, foto: null, quien: 'p-carolina', nota: 'Padrino de Luna' },
      { id: 'm-3', fechaHora: momento(ahora, 1, '15:30'), tipo: 'gasto', monto: 150_000, categoria: 'limpieza', clinicaId: null, abonoDeuda: false, foto: null, quien: 'p-carolina', nota: 'Varsol, jabón y bolsas' },
    ],
    // Deuda total ≈ $4,15 M (la entrevista dice $3,8–4,2 M con 2 clínicas)
    clinicas: [
      { id: 'cl-general', nombre: 'Clínica Veterinaria San Roque', deuda: 1_550_000, limite: 2_500_000 },
      { id: 'cl-24h', nombre: 'Clínica Veterinaria 24 Horas', deuda: 2_600_000, limite: 3_000_000 },
    ],
    porConfirmar,
    notas: [
      { id: 'n-1', animalId: id('Bruno'), texto: 'La piel ya casi no se ve roja.', fechaHora: momento(ahora, 2, '11:20'), quien: 'p-andres' },
    ],
    // Catálogo de placa viva: perro 25 kg y 0,375 kg/animal/día; gato 10 kg y 0,065 kg/animal/día
    configComida: {
      kgPorBulto: { perro: 25, gato: 10 },
      consumoDiarioKg: { perro: 45 * 0.375, gato: 25 * 0.065 },
      diasAviso: 6,
      diasUrgente: 4,
    },
    vidasCambiadas: 214,
  }
}

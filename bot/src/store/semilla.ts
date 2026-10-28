// Semilla realista del albergue (placa viva Task 17, adaptada a D3, D4 y D11): 70 animales, 5 casos con nombre,
// 3 tratamientos activos, 2 clínicas, catálogo de alimento y el equipo. Usa los ids de personas y clínicas de
// panel/src/data/demo.ts y sus mismos nombres de animales, para que el panel conectado y la demo cuenten la misma historia.
//
// Deuda: vive en la base de cada clínica (`Clinica.deuda`: 1.550.000 + 2.600.000 = 4.150.000, entre 3.800.000 y 4.200.000)
// y la semilla no trae registros de deuda ni abonos. La deuda de hoy es la base más lo que sume la bitácora (Repo.clinicas).
// Las fechas son fijas (determinista); los tratamientos tienen una ventana amplia para que la demo no caduque pronto.
import type { Animal, Especie, EstadoAnimal, Persona, Tratamiento } from '@huellitas/shared/tipos'
import type { SheetsClient } from './sheets'
import { HOJAS } from './hojas'
import {
  animalAFila,
  clinicaAFila,
  configAFilas,
  itemAFila,
  padrinazgoAFila,
  personaAFila,
  registroAFila,
  seguimientoAFila,
  solicitudAFila,
  tratamientoAFila,
} from './mappers'
import type { DatosSemilla } from './repo'

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

/** Los casos del doc de requerimientos: siempre están, y sus códigos se asignan primero (TOB01 es Tobías, no Toby). */
const CASOS = ['Tobías', 'Mateo', 'Bruno', 'Luna', 'Manchas']

const MAXIMO = PERROS.length + GATOS.length
const MINIMO = 5

const ESTADO_ESPECIAL: Record<string, EstadoAnimal> = {
  Mateo: 'tratamiento', Bruno: 'tratamiento', Tobías: 'tratamiento', Pecas: 'tratamiento', Rocky: 'tratamiento', Kira: 'tratamiento',
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
  Tobías: {
    caracter: 'Tranquilo, le gusta que lo acaricien despacio.',
    advertencias: ['No juntar con machos', 'Dieta especial: comida húmeda'],
    alias: ['Tobi'],
    canil: 'Canil 1',
  },
  Mateo: {
    caracter: 'Lo atropellaron en la vía. Después de la cirugía es el consentido del albergue.',
    advertencias: ['Todavía no puede subir escaleras ni saltar.'],
    padrino: 'Familia Ríos',
    canil: 'Canil 2',
  },
  Bruno: {
    caracter: 'Lleva 8 meses con nosotros. Noble, se estresa con los cambios bruscos.',
    advertencias: [
      'NO pisos lisos (cerámica, baldosa): se resbala y se lastima la piel.',
      'Está terminando tratamiento de piel: baño con champú medicado cada día.',
    ],
    padrino: 'Camilo T.',
    canil: 'Canil 3',
  },
  Luna: {
    caracter: 'Dulce, ronronea con cualquiera que se siente cerca.',
    advertencias: ['Asustadiza con los perros: no juntar con perros.'],
    padrino: 'Valentina G.',
    canil: 'Gatera',
  },
  Manchas: {
    caracter: 'Listo y curioso; no confundir con Max, que es más tranquilo.',
    advertencias: ['Se escapa si la puerta del canil queda sin seguro.'],
  },
  Negra: { advertencias: ['En cuarentena: no juntar con otros perros todavía.'] },
}

/** Fecha 'YYYY-MM-DD' que queda `dias` días antes de `base`. */
function diasAntes(base: string, dias: number): string {
  const d = new Date(`${base}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - dias)
  return d.toISOString().slice(0, 10)
}

const HOY = '2026-10-28'

/** Índices de `lista` que entran en la semilla: los obligatorios y, hasta completar `cuantos`, los primeros. */
function elegir(lista: string[], cuantos: number, obligatorios: string[]): number[] {
  const elegidos = new Set(lista.flatMap((nombre, i) => (obligatorios.includes(nombre) ? [i] : [])))
  for (let i = 0; i < lista.length && elegidos.size < cuantos; i++) elegidos.add(i)
  return [...elegidos].sort((a, b) => a - b)
}

function crearAnimal(nombre: string, especie: Especie, i: number): Animal {
  const caracteres = especie === 'perro' ? CARACTER_PERRO : CARACTER_GATO
  return {
    id: `${especie}-${i + 1}`,
    nombre,
    especie,
    estado: ESTADO_ESPECIAL[nombre] ?? 'adoptable',
    foto: null,
    // Ingresos repartidos en el último año; Bruno lleva 8 meses
    fechaIngreso: nombre === 'Bruno' ? diasAntes(HOY, 240) : diasAntes(HOY, 10 + ((i * 37) % 330)),
    advertencias: [],
    caracter: caracteres[i % caracteres.length] ?? '',
    padrino: null,
    canil: especie === 'perro' ? `Canil ${(i % 12) + 1}` : 'Gatera',
    ...ESPECIALES[nombre],
  }
}

const letras = (nombre: string): string =>
  nombre
    .normalize('NFD')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .padEnd(3, 'X')
    .slice(0, 3)

/** Código de placa AAA00: 3 letras del nombre y un número que sube si el prefijo ya existe. Los casos del doc van primero. */
function asignarCodigos(animales: Animal[]): Map<string, string> {
  const orden = [...animales].sort((a, b) => Number(!CASOS.includes(a.nombre)) - Number(!CASOS.includes(b.nombre)))
  const usados = new Map<string, number>()
  const codigos = new Map<string, string>()
  for (const a of orden) {
    const prefijo = letras(a.nombre)
    const n = (usados.get(prefijo) ?? 0) + 1
    usados.set(prefijo, n)
    codigos.set(a.id, `${prefijo}${String(n).padStart(2, '0')}`)
  }
  return codigos
}

const redondear3 = (n: number): number => Math.round(n * 1000) / 1000

/** Genera la semilla. `n` va de 5 a 70; siempre incluye a Tobías, Mateo, Bruno, Luna y Manchas. */
export function generarSemilla(n = 70): DatosSemilla {
  if (!Number.isInteger(n) || n < MINIMO || n > MAXIMO) {
    throw new Error(`La semilla tiene de ${MINIMO} a ${MAXIMO} animales (llegó ${n}): solo hay nombres para ${MAXIMO}`)
  }
  const perrosObligatorios = PERROS.filter((p) => CASOS.includes(p)).length
  const nPerros = Math.max(Math.round((n * PERROS.length) / MAXIMO), perrosObligatorios)
  const nGatos = n - nPerros

  const sinCodigo = [
    ...elegir(PERROS, nPerros, CASOS).map((i) => crearAnimal(PERROS[i] ?? '', 'perro', i)),
    ...elegir(GATOS, nGatos, CASOS).map((i) => crearAnimal(GATOS[i] ?? '', 'gato', i)),
  ]
  const codigos = asignarCodigos(sinCodigo)
  const animales = sinCodigo.map((a) => ({ ...a, codigo: codigos.get(a.id) }))

  const idDe = (nombre: string): string => {
    const a = animales.find((x) => x.nombre === nombre)
    if (!a) throw new Error(`La semilla no incluye a ${nombre}`)
    return a.id
  }

  const ventana = { inicio: '2026-10-01', fin: '2027-12-31' }
  const tratamientos: Tratamiento[] = [
    // Cada 12 h: la de las 14:00 es la dosis crítica de la demo
    { id: 't-tob-1', animalId: idDe('Tobías'), medicamento: 'Anticonvulsivo', dosis: '1 pastilla', horas: ['02:00', '14:00'], ...ventana, critico: true, activo: true },
    { id: 't-mat-1', animalId: idDe('Mateo'), medicamento: 'Amoxicilina', dosis: '3 ml', horas: ['08:00', '20:00'], ...ventana, activo: true },
    { id: 't-bru-1', animalId: idDe('Bruno'), medicamento: 'Baño con champú medicado', dosis: '1 baño', horas: ['10:00'], ...ventana, activo: true },
  ]

  const personas: Persona[] = [
    { id: 'p-luis', nombre: 'Don Luis', cargo: 'Cuidador', rol: 'cuidador', color: '#2f6b3b', foto: null, telefono: '573001110001', activo: true },
    { id: 'p-andres', nombre: 'Andrés', cargo: 'Bienestar animal', rol: 'bienestar', color: '#a8432c', foto: null, telefono: '573001110002', activo: true },
    { id: 'p-carolina', nombre: 'Carolina', cargo: 'Administración', rol: 'admin', color: '#1f2a44', foto: null, telefono: '573001110003', activo: true },
    { id: 'p-marcela', nombre: 'Marcela', cargo: 'Adopciones', rol: 'adopciones', color: '#595449', foto: null, telefono: '573001110004', activo: true },
    { id: 'p-andrea', nombre: 'Andrea', cargo: 'Voluntaria', rol: 'voluntario', color: '#7a4a8c', foto: null, telefono: '573001110005', activo: true },
  ]

  const perros = animales.filter((a) => a.especie === 'perro').length
  const gatos = animales.length - perros

  return {
    personas,
    animales,
    tratamientos,
    clinicas: [
      { id: 'cl-general', nombre: 'Clínica Veterinaria San Roque', deuda: 1_550_000, limite: 2_500_000 },
      { id: 'cl-24h', nombre: 'Clínica Veterinaria 24 Horas', deuda: 2_600_000, limite: 3_000_000 },
    ],
    configComida: {
      kgPorBulto: { perro: 25, gato: 10 },
      consumoDiarioKg: { perro: redondear3(perros * 0.375), gato: redondear3(gatos * 0.065) },
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
      baseUrl: 'http://localhost:8787',
    },
    catalogo: [
      { id: 'cat-perro', nombre: 'Concentrado de perro', tipo: 'alimento', kgPorUnidad: 25, especieObjetivo: 'perro', consumoDiarioKgPorAnimal: 0.375 },
      { id: 'cat-gato', nombre: 'Concentrado de gato', tipo: 'alimento', kgPorUnidad: 10, especieObjetivo: 'gato', consumoDiarioKgPorAnimal: 0.065 },
    ],
    base: {
      // Conteo hace 3 días: 5 bultos de perro y 3 de gato
      conteoInicial: { fecha: diasAntes(HOY, 3), bultos: { perro: 5, gato: 3 } },
      cajaInicial: { fecha: diasAntes(HOY, 4), monto: 1_050_000 },
      vidasCambiadas: 214,
    },
    padrinazgos: [
      { id: 'pad-luna', personaTelefono: '573009990001', personaNombre: 'Valentina G.', animalId: idDe('Luna'), activo: true },
      { id: 'pad-mateo', personaTelefono: '573009990002', personaNombre: 'Familia Ríos', animalId: idDe('Mateo'), activo: true },
      { id: 'pad-bruno', personaTelefono: '573009990003', personaNombre: 'Camilo T.', animalId: idDe('Bruno'), activo: true },
    ],
  }
}

/** Las filas de datos (sin encabezado) de cada pestaña de HOJAS. */
export function semillaAFilas(s: DatosSemilla): Record<string, string[][]> {
  return {
    Usuarios: s.personas.map(personaAFila),
    Config: configAFilas({ config: s.config, configComida: s.configComida, base: s.base }),
    Animales: s.animales.map(animalAFila),
    Tratamientos: s.tratamientos.map(tratamientoAFila),
    Eventos: (s.registros ?? []).map(registroAFila),
    Catalogo: s.catalogo.map(itemAFila),
    Entidades: s.clinicas.map(clinicaAFila),
    Padrinazgos: s.padrinazgos.map(padrinazgoAFila),
    RegistrosIA: [],
    Solicitudes: (s.solicitudes ?? []).map(solicitudAFila),
    Seguimientos: (s.seguimientos ?? []).map(seguimientoAFila),
  }
}

/**
 * Carga la semilla en las pestañas. No duplica: una pestaña que ya tiene filas de datos se omite.
 * Una pestaña vacía recibe primero sus encabezados. Las pestañas sin filas en la semilla no se tocan.
 */
export async function cargarSemilla(
  cliente: Pick<SheetsClient, 'leer' | 'agregar'>,
  semilla: DatosSemilla,
): Promise<{ cargadas: string[]; omitidas: string[] }> {
  const cargadas: string[] = []
  const omitidas: string[] = []
  for (const [tab, filas] of Object.entries(semillaAFilas(semilla))) {
    if (filas.length === 0) continue
    const existentes = await cliente.leer(tab)
    if (existentes.length > 1) {
      omitidas.push(tab)
      continue
    }
    const cabecera = HOJAS[tab] ?? []
    await cliente.agregar(tab, existentes.length === 0 ? [cabecera, ...filas] : filas)
    cargadas.push(tab)
  }
  return { cargadas, omitidas }
}

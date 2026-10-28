// 25 solicitudes de adopción de mentira pero realistas, para trabajar sin servidor (PLAN_INTEGRADO §5):
// 8 que las reglas dejan en 🟢, 9 en 🟡 y 8 en 🔴. Teléfonos y cédulas son ficticios a propósito.
// Los montones salen de `clasificar`; aquí solo están las respuestas del formulario.

import type { Solicitud } from '@huellitas/shared/adopcion/tipos'
import { crearDatosDemo } from '../../data/demo'
import { fechaLocal } from '../../lib/formato'

const PLAN_SOLIDO = 'Tengo la clínica veterinaria del barrio a cinco cuadras y un ahorro aparte para urgencias.'
const MASCOTA_SOLIDA = 'Tuve una perrita criolla 13 años; murió de vieja y la cuidamos hasta el final.'

/** Todo en regla: cada solicitud cambia solo lo que la hace distinta */
const BASE: Omit<Solicitud, 'id' | 'fecha' | 'nombre' | 'telefono' | 'cedula' | 'direccion' | 'animalId'> = {
  familiaDeAcuerdo: true,
  paraQuien: 'yo',
  vivienda: 'casa',
  viviendaConMallas: true,
  dondeVivira: 'dentro_casa',
  aceptaEsterilizar: true,
  aceptaVacunar: true,
  aceptaSeguimiento: true,
  quiereEntregaInmediata: false,
  preguntoPorCaracter: true,
  planEmergencia: PLAN_SOLIDO,
  mascotasAnteriores: MASCOTA_SOLIDA,
  motivo: 'Quiero darle un hogar a un animal que lo necesite.',
  montonManual: null,
  nota: '',
  llamadaAgendada: null,
}

type Respuestas = Partial<Omit<Solicitud, 'id' | 'fecha' | 'telefono' | 'cedula' | 'animalId'>> &
  Pick<Solicitud, 'nombre' | 'direccion'>

/** Una solicitud del formulario: `animal` es el nombre del animal en los datos demo, o null si preguntó en general */
interface Fila {
  animal: string | null
  respuestas: Respuestas
}

const FILAS: Fila[] = [
  // ── 🟢 Para llamar (8) ───────────────────────────────────────────────
  {
    animal: 'Canela',
    respuestas: {
      nombre: 'Camila Rodríguez Peña',
      direccion: 'Cra 15 # 45-20, Chapinero, Bogotá',
      vivienda: 'casa',
      motivo: 'Mis hijos llevan años pidiendo un perro y ya tenemos el patio listo.',
    },
  },
  {
    animal: 'Paco',
    respuestas: {
      nombre: 'Julián Castaño Ospina',
      direccion: 'Cll 10 Sur # 24-15, Envigado, Antioquia',
      vivienda: 'apartamento',
      motivo: 'Trabajo desde la casa y quiero compañía para las caminatas de la tarde.',
      mascotasAnteriores: 'Un gato que adopté hace 6 años y sigue conmigo.',
    },
  },
  {
    animal: 'Mona',
    respuestas: {
      nombre: 'Luz Marina Gómez',
      direccion: 'Mz D Casa 8, Barrio Prados del Este, Cúcuta',
      vivienda: 'casa',
      dondeVivira: 'patio',
      paraQuien: 'familia',
      motivo: 'Se nos murió el perro en enero y la casa quedó muy sola.',
    },
  },
  {
    animal: 'Luna',
    respuestas: {
      nombre: 'Daniela Herrera Vélez',
      direccion: 'Cra 70 # 1-80, Laureles, Medellín',
      vivienda: 'apartamento',
      motivo: 'Vivo con mi mamá y las dos queremos una gata tranquila.',
      mascotasAnteriores: 'Dos gatos que rescatamos de la calle; uno sigue con nosotras.',
    },
  },
  {
    animal: null,
    respuestas: {
      nombre: 'Andrés Felipe Mejía',
      direccion: 'Cll 5 # 38-12, San Fernando, Cali',
      vivienda: 'casa',
      motivo: 'No tengo un favorito: quiero el que lleve más tiempo esperando.',
      planEmergencia: 'Mi hermano es veterinario y me ayuda; además tengo un fondo para emergencias.',
    },
  },
  {
    animal: 'Tobías',
    respuestas: {
      nombre: 'Paola Andrea Ruiz',
      direccion: 'Cll 127 # 20-40, Usaquén, Bogotá',
      vivienda: 'apartamento',
      motivo: 'Busco un perro adulto y calmado, no tengo tiempo para un cachorro.',
      mascotasAnteriores: 'Un schnauzer que vivió 15 años con mi familia.',
    },
  },
  {
    animal: 'Nala',
    respuestas: {
      nombre: 'Sebastián Mora Duarte',
      direccion: 'Cra 27 # 36-14, Cabecera, Bucaramanga',
      vivienda: 'finca',
      dondeVivira: 'patio',
      motivo: 'Tenemos finca cerca de Girón y mucho espacio cercado para que corra.',
      planEmergencia: 'El veterinario de Girón nos atiende a toda hora y tenemos carro para llevarla.',
    },
  },
  {
    animal: 'Kiwi',
    respuestas: {
      nombre: 'Natalia Pérez Cardona',
      direccion: 'Cll 50 # 12-33, Centro, Manizales',
      vivienda: 'apartamento',
      motivo: 'Mi hija de 9 años cuidó gatos con su abuela y está lista para tener uno propio.',
      mascotasAnteriores: 'Una gata de 17 años de mi mamá, la cuidamos hasta que se fue.',
    },
  },

  // ── 🟡 Revisar (9) ───────────────────────────────────────────────────
  {
    // Caso Bruno (requerimientos §4): prisa por llevárselo y ninguna pregunta por su tratamiento
    animal: 'Bruno',
    respuestas: {
      nombre: 'Nicolás Beltrán Cruz',
      direccion: 'Cll 80 # 11-42, Barrios Unidos, Bogotá',
      vivienda: 'apartamento',
      quiereEntregaInmediata: true,
      preguntoPorCaracter: false,
      motivo: 'Vi a Bruno en Instagram y lo quiero para mañana mismo. Mi apartamento es todo en baldosa pero es grande.',
      nota: 'Bruno NO puede pisos lisos y está terminando tratamiento de piel: hay que decírselo en la llamada.',
    },
  },
  {
    animal: 'Max',
    respuestas: {
      nombre: 'Diana Carolina Torres',
      direccion: 'Cra 9 # 63-20, Pereira, Risaralda',
      planEmergencia: 'Ya veremos, esperemos que no pase nada.',
    },
  },
  {
    animal: 'Coco',
    respuestas: {
      nombre: 'Ricardo Alzate Giraldo',
      direccion: 'Cll 33 # 80-15, Belén, Medellín',
      planEmergencia: '',
      motivo: 'Mi señora quiere un perro para que la acompañe.',
    },
  },
  {
    animal: 'Lucas',
    respuestas: {
      nombre: 'Yesenia Quintero Salas',
      direccion: 'Cra 4 # 18-50, Ibagué, Tolima',
      preguntoPorCaracter: false,
      motivo: 'Me gustó la foto, se ve bonito.',
    },
  },
  {
    animal: 'Tigre',
    respuestas: {
      nombre: 'Esteban Vargas Montoya',
      direccion: 'Cll 100 # 15-30, Chicó, Bogotá',
      vivienda: 'apartamento',
      preguntoPorCaracter: false,
      motivo: 'Quiero un gato para el apartamento, el que sea.',
    },
  },
  {
    animal: 'Pelusa',
    respuestas: {
      nombre: 'Marisol Ibáñez Prieto',
      direccion: 'Cra 13 # 22-08, Tunja, Boyacá',
      familiaDeAcuerdo: false,
      motivo: 'Mi esposo todavía no sabe, pero seguro la acepta cuando la vea.',
    },
  },
  {
    animal: 'Zeus',
    respuestas: {
      nombre: 'Gustavo Adolfo Londoño',
      direccion: 'Cll 20 # 45-60, Armenia, Quindío',
      familiaDeAcuerdo: false,
      motivo: 'Mi hija adolescente no quiere, pero yo sí; ella se acostumbra.',
    },
  },
  {
    animal: 'Rufo',
    respuestas: {
      nombre: 'Johana Patricia Salazar',
      direccion: 'Cra 50 # 7-35, Barranquilla, Atlántico',
      quiereEntregaInmediata: true,
      planEmergencia: 'No sé, eso no pasa.',
      motivo: 'Lo necesito esta semana porque me voy a vivir sola.',
    },
  },
  {
    animal: 'Galleta',
    respuestas: {
      nombre: 'Mauricio Zapata Roldán',
      direccion: 'Cll 3 Sur # 10-25, Villavicencio, Meta',
      vivienda: 'casa',
      quiereEntregaInmediata: true,
      planEmergencia: 'Nada, eso no pasa',
      preguntoPorCaracter: false,
      motivo: 'Me urge, ¿puedo pasar hoy mismo por él?',
    },
  },

  // ── 🔴 Descartadas, se pueden rescatar (8) ───────────────────────────
  {
    animal: 'Mía',
    respuestas: {
      nombre: 'Sandra Milena Ochoa',
      direccion: 'Cll 45 # 28-10, Soacha, Cundinamarca',
      paraQuien: 'regalo',
      destinatario: 'su mamá',
      motivo: 'Es para el cumpleaños de mi mamá, que vive sola.',
    },
  },
  {
    animal: 'Oreo',
    respuestas: {
      nombre: 'Fabián Camilo Ríos',
      direccion: 'Cra 8 # 14-70, Neiva, Huila',
      paraQuien: 'regalo',
      destinatario: 'su hijo de 8 años',
      motivo: 'Se lo quiero dar de sorpresa a mi hijo en diciembre.',
    },
  },
  {
    animal: 'Sultán',
    respuestas: {
      nombre: 'Hernán Darío Pineda',
      direccion: 'Km 3 vía Rionegro, vereda La Playa, Antioquia',
      vivienda: 'finca',
      dondeVivira: 'guardia',
      motivo: 'Necesito un perro grande y bravo que cuide la bodega de noche.',
    },
  },
  {
    animal: 'Rocky',
    respuestas: {
      nombre: 'Wilson Arturo Cortés',
      direccion: 'Cll 70 # 100-12, Engativá, Bogotá',
      dondeVivira: 'amarrado',
      motivo: 'Lo dejaría amarrado en el patio mientras salgo a trabajar.',
    },
  },
  {
    animal: 'Frida',
    respuestas: {
      nombre: 'Blanca Nubia Contreras',
      direccion: 'Cra 21 # 9-44, Floridablanca, Santander',
      dondeVivira: 'azotea',
      viviendaConMallas: false,
      motivo: 'Vivo en tercer piso y la dejaría en la azotea, que es amplia.',
    },
  },
  {
    animal: 'Dulce',
    respuestas: {
      nombre: 'Cristian Ferney Arango',
      direccion: 'Cll 12 # 6-18, Popayán, Cauca',
      aceptaEsterilizar: false,
      motivo: 'Me gusta para cruzarla con el perro de un amigo.',
    },
  },
  {
    animal: 'Benito',
    respuestas: {
      nombre: 'Liliana Marcela Guzmán',
      direccion: 'Cra 30 # 55-21, Palmira, Valle del Cauca',
      aceptaVacunar: false,
      motivo: 'No creo en las vacunas, los perros criollos son fuertes.',
    },
  },
  {
    animal: 'Tango',
    respuestas: {
      nombre: 'Óscar Iván Henao',
      direccion: 'Cll 41 # 19-03, Montería, Córdoba',
      aceptaSeguimiento: false,
      motivo: 'Lo quiero, pero no me gusta que me llamen ni que vayan a la casa.',
    },
  },
]

/** Fecha y hora local ISO sin zona, p. ej. '2026-10-27T07:12' (como demo.ts) */
function momento(ahora: Date, diasAntes: number, hora: string): string {
  const d = new Date(ahora)
  d.setDate(d.getDate() - diasAntes)
  return `${fechaLocal(d)}T${hora}`
}

function dos(n: number): string {
  return String(n).padStart(2, '0')
}

/** Las 25 solicitudes demo. Las fechas se calculan desde `ahora` (de hoy a 4 días atrás) para que la demo siempre se vea del día. */
export function crearSolicitudesDemo(ahora: Date = new Date()): Solicitud[] {
  const animales = crearDatosDemo(ahora).animales
  const idDe = (nombre: string): string => {
    const animal = animales.find((a) => a.nombre === nombre)
    if (!animal) throw new Error(`No existe el animal ${nombre} en los datos demo`)
    return animal.id
  }

  return FILAS.map(({ animal, respuestas }, i) => {
    const n = i + 1
    return {
      ...BASE,
      ...respuestas,
      id: `sol-${dos(n)}`,
      // Llegadas mezcladas entre montones: lo bueno no llega siempre primero
      fecha: momento(ahora, (n * 3) % 5, `${dos(6 + (n % 3))}:${dos((n * 13) % 60)}`),
      telefono: `300 000 00${dos(n)}`,
      cedula: `1.000.000.0${dos(n)}`,
      animalId: animal === null ? null : idDe(animal),
    }
  })
}

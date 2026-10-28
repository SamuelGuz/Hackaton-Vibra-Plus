// Pestañas de abajo según el rol (PLAN_PANEL §4). Máximo 4; el cuidador ve solo 2.
import type { NombreIcono } from '../components/Icono'
import type { Rol } from '../data/tipos'

export interface Pestana {
  ruta: string
  texto: string
  icono: NombreIcono
}

const HOY: Pestana = { ruta: '/hoy', texto: 'Hoy', icono: 'hoy' }
const ANIMALES: Pestana = { ruta: '/animales', texto: 'Animales', icono: 'huella' }
const CONFIRMAR: Pestana = { ruta: '/confirmar', texto: 'Por confirmar', icono: 'check' }
const PLATA: Pestana = { ruta: '/plata', texto: 'Plata', icono: 'plata' }
const COMIDA: Pestana = { ruta: '/comida', texto: 'Comida', icono: 'comida' }
const SOLICITUDES: Pestana = { ruta: '/adopciones', texto: 'Solicitudes', icono: 'corazon' }

export const PESTANAS: Record<Rol, Pestana[]> = {
  cuidador: [HOY, ANIMALES],
  voluntario: [HOY, ANIMALES],
  bienestar: [HOY, ANIMALES, CONFIRMAR],
  admin: [PLATA, COMIDA, CONFIRMAR, ANIMALES],
  adopciones: [SOLICITUDES, ANIMALES],
  comunicacion: [ANIMALES],
}

/** Primera pantalla de cada rol al entrar */
export function inicioDe(rol: Rol): string {
  return PESTANAS[rol][0].ruta
}

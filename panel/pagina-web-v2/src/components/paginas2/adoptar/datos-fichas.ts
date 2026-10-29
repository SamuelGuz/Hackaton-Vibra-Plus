import type { SlugBanco } from '../../home2/banco'
import type { SlugImagen } from '../../../contenido/imagenes'

/** Example adoption cards. Nicknames and traits describe ONLY what the photo shows;
 *  real names, ages and temperament are confirmed by Yesenia (rendered as "Por confirmar"). */
export interface FichaAdopcion {
  id: string
  titulo: string
  especie: 'perro' | 'gato'
  rasgo: string
  media:
    | { tipo: 'banco'; slug: SlugBanco; tono: 'crema' | 'verde' }
    | { tipo: 'imagen'; slug: SlugImagen }
}

export const FICHAS: FichaAdopcion[] = [
  { id: 'b-pata-vendada', titulo: 'Pata vendada', especie: 'perro', rasgo: 'Pelo largo blanco y negro. Tiene una pata vendada.', media: { tipo: 'banco', slug: 'perro-abuelo', tono: 'crema' } },
  { id: 'b-orejas-dobladas', titulo: 'Orejas dobladas', especie: 'perro', rasgo: 'Pelo corto negro y café, orejas dobladas.', media: { tipo: 'banco', slug: 'perro-sonrisa', tono: 'verde' } },
  { id: 'b-cabeza-negra', titulo: 'Cabeza negra', especie: 'perro', rasgo: 'Pelo largo blanco, cabeza negra.', media: { tipo: 'banco', slug: 'perro-blanco-sentado', tono: 'crema' } },
  { id: 'b-mancha-blanca', titulo: 'Mancha blanca', especie: 'perro', rasgo: 'Pelo corto café, mancha blanca en la frente.', media: { tipo: 'banco', slug: 'perro-estirandose', tono: 'verde' } },
  { id: 'b-cachorros-cafe', titulo: 'Cachorros café', especie: 'perro', rasgo: 'Varios cachorros café, de orejas caídas.', media: { tipo: 'banco', slug: 'cachorros-durmiendo', tono: 'crema' } },
  // Keeps the id of the previous cat card so an existing favorite still matches.
  { id: 'e2', titulo: 'Gatos atigrados', especie: 'gato', rasgo: 'Dos gatos atigrados, dormidos abrazados.', media: { tipo: 'imagen', slug: 'gatos-abrazados-foto' } },
]

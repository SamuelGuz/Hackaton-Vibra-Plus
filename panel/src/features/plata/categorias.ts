import type { NombreIcono } from '../../components/Icono'
import type { CategoriaGasto, CategoriaIngreso, Movimiento } from '../../data/tipos'

type Categoria = CategoriaGasto | CategoriaIngreso

export const CATEGORIAS: Record<Movimiento['tipo'], { id: Categoria; texto: string; icono: NombreIcono }[]> = {
  gasto: [
    { id: 'comida', texto: 'Comida', icono: 'comida' },
    { id: 'veterinaria', texto: 'Veterinaria', icono: 'medicina' },
    { id: 'limpieza', texto: 'Limpieza', icono: 'balde' },
    { id: 'servicios', texto: 'Agua, luz o arriendo', icono: 'casa' },
    { id: 'transporte', texto: 'Transporte', icono: 'carro' },
    { id: 'otro', texto: 'Otra cosa', icono: 'mas' },
  ],
  ingreso: [
    { id: 'donacion', texto: 'Donación', icono: 'corazon' },
    { id: 'padrino', texto: 'Padrino', icono: 'huella' },
    { id: 'rifa', texto: 'Rifa o evento', icono: 'boleto' },
    { id: 'otro', texto: 'Otra cosa', icono: 'mas' },
  ],
}

export function nombreCategoria(tipo: Movimiento['tipo'], id: Categoria): string {
  return CATEGORIAS[tipo].find((c) => c.id === id)?.texto ?? id
}

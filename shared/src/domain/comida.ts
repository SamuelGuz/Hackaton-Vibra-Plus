// Días de comida que quedan (placa viva, Task 6). Puro: sin E/S.
import type { Animal } from '../tipos'
import type { ItemCatalogo, Registro } from '../registro'

const NO_CUENTAN: Array<Animal['estado']> = ['adoptado', 'fallecido', 'hogar_temporal']

/**
 * Días que alcanza el alimento del catálogo, con 1 decimal. Los bultos son `bultosIniciales` (último conteo)
 * más los registros `confirmado` de inventario de la especie del alimento (−1 al abrir, +N al llegar).
 * Sin animales de esa especie no hay consumo y no hay días que calcular: devuelve `null`.
 */
export function diasDeComida(registros: Registro[], item: ItemCatalogo, animales: Animal[], bultosIniciales = 0): number | null {
  const cambios = registros.reduce((suma, r) => {
    const p = r.propuesta
    if (r.estado !== 'confirmado' || p.tipo !== 'inventario') return suma
    return item.especieObjetivo === undefined || p.especie === item.especieObjetivo ? suma + p.cambio : suma
  }, 0)
  const bultos = Math.max(0, bultosIniciales + cambios)

  const comen = animales.filter((a) => !NO_CUENTAN.includes(a.estado) && (item.especieObjetivo === undefined || a.especie === item.especieObjetivo))
  const kgPorDia = comen.length * (item.consumoDiarioKgPorAnimal ?? 0)
  if (kgPorDia === 0) return null

  return Math.round(((bultos * item.kgPorUnidad) / kgPorDia) * 10) / 10
}

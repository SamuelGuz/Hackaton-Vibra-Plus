import type { AlmacenMedicinas, DatosMedicinas } from './tipos.js'

/** La "base de datos interna" más simple: vive en memoria. Sirve para pruebas y para arrancar sin archivo. */
export function crearAlmacenMemoria(datos?: DatosMedicinas): AlmacenMedicinas {
  let actual: DatosMedicinas = copiar(datos ?? { medicamentos: [], lotes: [], contactos: [] })
  return {
    async leer() {
      return copiar(actual)
    },
    async guardar(nuevos) {
      actual = copiar(nuevos)
    },
  }
}

export function copiar(datos: DatosMedicinas): DatosMedicinas {
  return structuredClone(datos)
}

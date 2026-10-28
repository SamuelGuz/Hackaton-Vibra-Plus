// Cola de envíos en el celular (IndexedDB). Cada toque se guarda aquí primero y se
// manda en orden cuando hay señal. El servidor ignora un id repetido, así que reenviar es seguro.
import Dexie, { type Table } from 'dexie'
import { ErrorApi, type Envio } from './api'

interface Fila {
  n?: number
  envio: Envio
}

class BaseCola extends Dexie {
  envios!: Table<Fila, number>
  constructor() {
    super('huellitas')
    this.version(1).stores({ envios: '++n' })
  }
}

interface Opciones {
  enviar: (e: Envio) => Promise<void>
  /** El servidor rechazó un envío por datos malos: se descarta y se avisa */
  alRechazar?: (mensaje: string) => void
}

export interface Cola {
  encolar(e: Envio): Promise<void>
  /** Manda lo pendiente en orden. Se detiene sin perder nada si no hay señal o venció la sesión. */
  procesar(): Promise<void>
  pendientes(): Promise<number>
  cerrar(borrar?: boolean): Promise<void>
}

export function crearCola({ enviar, alRechazar }: Opciones): Cola {
  const base = new BaseCola()
  let enCurso: Promise<void> | null = null

  async function vaciar() {
    for (;;) {
      const fila = await base.envios.orderBy('n').first()
      if (!fila) return
      try {
        await enviar(fila.envio)
      } catch (e) {
        // 4xx distinto de 401: el dato está malo y reintentar no lo arregla
        const rechazado = e instanceof ErrorApi && e.estado >= 400 && e.estado < 500 && e.estado !== 401
        if (!rechazado) return
        alRechazar?.(e.message)
      }
      await base.envios.delete(fila.n!)
    }
  }

  return {
    async encolar(e) {
      await base.envios.add({ envio: e })
    },
    procesar() {
      enCurso ??= vaciar().finally(() => {
        enCurso = null
      })
      return enCurso
    },
    pendientes: () => base.envios.count(),
    async cerrar(borrar = false) {
      base.close()
      if (borrar) await Dexie.delete('huellitas')
    },
  }
}

// Lo que se puede hacer desde el panel. Cada acción cambia la pantalla al instante y
// manda el mismo cambio al servidor (PLAN_INTEGRADO §3.1). En modo demo solo cambia la pantalla.
import { useSesion } from '../app/sesion'
import {
  cambiarEstado,
  confirmarPorConfirmar,
  darDosis,
  descartarPorConfirmar,
  deshacer,
  mismasPropuestas,
  moverBultos,
  nuevoId,
  registrarMovimiento,
} from '../lib/acciones'
import { useDatos } from './DatosProvider'
import type { Especie, EstadoAnimal, Movimiento, PorConfirmar, Propuesta, Tratamiento } from './tipos'

export function useAcciones() {
  const { cambiar, enviar } = useDatos()
  const { persona } = useSesion()
  const quien = persona?.id ?? ''

  return {
    /** Devuelve el id del registro, para poder deshacerlo */
    moverBultos(especie: Especie, cambio: number): string {
      const id = nuevoId()
      cambiar((d) => moverBultos(d, especie, cambio, quien, new Date(), id).datos)
      enviar({ tipo: 'eventos', eventos: [{ id, tipo: 'inventario', especie, cambio }] })
      return id
    },

    darDosis(t: Tratamiento, hora: string): string {
      const id = nuevoId()
      cambiar((d) => darDosis(d, t.id, hora, quien, new Date(), id).datos)
      enviar({ tipo: 'eventos', eventos: [{ id, tipo: 'dosis', animalId: t.animalId, tratamientoId: t.id, hora }] })
      return id
    },

    deshacer(id: string) {
      cambiar((d) => deshacer(d, id))
      enviar({ tipo: 'estado', ids: [id], estado: 'anulado' })
    },

    registrarMovimiento(movimiento: Omit<Movimiento, 'id' | 'fechaHora' | 'quien'>) {
      const id = nuevoId()
      cambiar((d) => registrarMovimiento(d, movimiento, quien, new Date(), id))
      enviar({ tipo: 'eventos', eventos: [{ id, tipo: 'movimiento', movimiento }] })
    },

    /** Confirma lo que entendió el bot. Si se quitó o cambió algo, se guarda lo corregido. */
    confirmar(item: PorConfirmar, propuestas: Propuesta[]) {
      cambiar((d) => confirmarPorConfirmar(d, item.id, propuestas))
      if (mismasPropuestas(propuestas, item.propuestas)) {
        enviar({ tipo: 'estado', ids: [item.id], estado: 'confirmado' })
        return
      }
      enviar({ tipo: 'eventos', eventos: propuestas.map((p) => ({ ...p, id: nuevoId() })) })
      enviar({ tipo: 'estado', ids: [item.id], estado: 'corregido' })
    },

    descartar(item: PorConfirmar) {
      cambiar((d) => descartarPorConfirmar(d, item.id))
      enviar({ tipo: 'estado', ids: [item.id], estado: 'anulado' })
    },

    cambiarEstado(animalId: string, estado: EstadoAnimal) {
      cambiar((d) => cambiarEstado(d, animalId, estado))
      enviar({ tipo: 'eventos', eventos: [{ id: nuevoId(), tipo: 'estado_animal', animalId, estado }] })
    },
  }
}

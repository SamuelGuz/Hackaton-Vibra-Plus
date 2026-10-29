// Validación de lo que manda el panel en POST /api/eventos y /api/eventos/estado.
import { MAX_KG } from '../conversacion/kilos.js'
import type { EstadoAnimal } from '../panel-tipos.js'
import type { Accion, EstadoRegistro } from '../tipos.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ESTADOS_ANIMAL: EstadoAnimal[] = ['cuarentena', 'tratamiento', 'adoptable', 'hogar_temporal', 'adoptado', 'fallecido', 'devuelto']
const HORA = /^\d{2}:\d{2}$/

export type EventoPanel = Accion & { id: string }

const texto = (v: unknown): v is string => typeof v === 'string'
const idValido = (v: unknown): v is string => texto(v) && /^\d+$/.test(v)
const montoValido = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0

/** Devuelve el evento limpio o un mensaje con lo que está mal. */
export function validarEvento(x: any): { ok: EventoPanel } | { error: string } {
  if (!x || typeof x !== 'object') return { error: 'El evento no es un objeto' }
  if (!texto(x.id) || !UUID.test(x.id)) return { error: 'id debe ser un uuid generado en el celular' }
  switch (x.tipo) {
    case 'dosis':
      if (!idValido(x.animalId) || !idValido(x.tratamientoId) || !texto(x.hora) || !HORA.test(x.hora)) break
      return { ok: { id: x.id, tipo: 'dosis', animalId: x.animalId, tratamientoId: x.tratamientoId, hora: x.hora } }
    case 'inventario':
      if (x.especie !== 'perro' && x.especie !== 'gato') break
      // Kilos sueltos (carne, recortes): admiten decimales
      if (x.unidad === 'kg') {
        if (typeof x.cambio !== 'number' || !Number.isFinite(x.cambio) || x.cambio === 0 || Math.abs(x.cambio) > MAX_KG) break
        const producto = texto(x.producto) && x.producto.trim() ? x.producto.trim().slice(0, 40) : 'carne'
        return { ok: { id: x.id, tipo: 'inventario', especie: x.especie, cambio: Math.round(x.cambio * 10) / 10, unidad: 'kg', producto } }
      }
      if (!Number.isInteger(x.cambio) || x.cambio === 0) break
      return { ok: { id: x.id, tipo: 'inventario', especie: x.especie, cambio: x.cambio } }
    case 'nota':
      if (!idValido(x.animalId) || !texto(x.texto) || !x.texto.trim()) break
      return { ok: { id: x.id, tipo: 'nota', animalId: x.animalId, texto: x.texto.trim() } }
    case 'deuda':
      if (!idValido(x.clinicaId) || !montoValido(x.monto)) break
      return { ok: { id: x.id, tipo: 'deuda', clinicaId: x.clinicaId, monto: x.monto, nota: texto(x.nota) ? x.nota : '' } }
    case 'estado_animal':
      if (!idValido(x.animalId) || !ESTADOS_ANIMAL.includes(x.estado)) break
      return { ok: { id: x.id, tipo: 'estado_animal', animalId: x.animalId, estado: x.estado } }
    case 'movimiento': {
      const m = x.movimiento
      if (!m || (m.tipo !== 'ingreso' && m.tipo !== 'gasto') || !montoValido(m.monto) || !texto(m.categoria)) break
      if (m.abonoDeuda && !idValido(m.clinicaId)) break
      return {
        ok: {
          id: x.id,
          tipo: 'movimiento',
          movimiento: {
            tipo: m.tipo,
            monto: m.monto,
            categoria: m.categoria,
            clinicaId: idValido(m.clinicaId) ? m.clinicaId : null,
            abonoDeuda: Boolean(m.abonoDeuda),
            foto: texto(m.foto) ? m.foto : null,
            nota: texto(m.nota) ? m.nota : '',
          },
        },
      }
    }
  }
  return { error: `Evento de tipo "${x.tipo}" incompleto o con datos inválidos` }
}

export const ESTADOS_PANEL: EstadoRegistro[] = ['confirmado', 'corregido', 'anulado']

export function validarCambioEstado(x: any): { ids: string[]; estado: EstadoRegistro } | null {
  if (!x || !Array.isArray(x.ids) || !ESTADOS_PANEL.includes(x.estado)) return null
  const ids = x.ids.filter((i: unknown) => texto(i) && (/^\d+$/.test(i) || UUID.test(i)))
  if (ids.length === 0 || ids.length !== x.ids.length) return null
  return { ids, estado: x.estado }
}

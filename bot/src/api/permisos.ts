// Quién ve y quién registra plata. Una sola regla para WhatsApp (conversacion/ctx.ts) y para el panel (app.ts):
// el servidor decide, no los botones que el panel muestra u oculta (RF-07: "admin: finanzas").
import type { DatosAlbergue, PorConfirmar, Propuesta, Rol } from '../panel-tipos.js'
import type { Accion } from '../tipos.js'

/** Caja, movimientos, deuda de clínicas y recibos de otros: solo administración */
export const veraPlata = (rol: Rol) => rol === 'admin'

/** Registrar ingresos, gastos y facturas (y confirmarlos o deshacerlos): todos menos voluntarios */
export const manejaPlata = (rol: Rol) => rol !== 'voluntario'

/** La acción mueve plata: un ingreso o gasto, o una factura que sube la deuda */
export const esDePlata = (a: Accion | Propuesta) => a.tipo === 'movimiento' || a.tipo === 'deuda'

/**
 * Lo que ve quien no es administración: todo menos la plata. Las clínicas quedan con su nombre (los formularios
 * lo necesitan) y deuda y límite en 0. De los pendientes de otros se quitan las acciones de plata; los propios quedan
 * completos, para poder confirmarlos o deshacerlos.
 */
export function datosParaRol(d: DatosAlbergue, usuario: { id: number; rol: Rol }): DatosAlbergue {
  if (veraPlata(usuario.rol)) return d
  const yo = String(usuario.id)
  const porConfirmar: PorConfirmar[] = []
  for (const p of d.porConfirmar) {
    if (p.quien === yo) {
      porConfirmar.push(p)
      continue
    }
    const propuestas = p.propuestas.filter((x) => !esDePlata(x))
    if (propuestas.length) porConfirmar.push({ ...p, propuestas })
  }
  return {
    ...d,
    movimientos: [],
    cajaInicial: { ...d.cajaInicial, monto: 0 },
    clinicas: d.clinicas.map((k) => ({ ...k, deuda: 0, limite: 0 })),
    porConfirmar,
  }
}

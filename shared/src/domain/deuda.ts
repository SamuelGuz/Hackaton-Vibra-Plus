// Deuda por clínica y su semáforo (placa viva, Task 6). Puro: sin E/S.
import type { Clinica } from '../tipos'
import type { Registro } from '../registro'
import type { DeudaClinica, Semaforo } from '../vistas'

/** Verde < 60 %, amarillo hasta 85 %, rojo > 85 % (PLAN_INTEGRADO §2). Con enteros, sin redondear antes de comparar. */
function semaforoDe(deuda: number, limite: number): Semaforo {
  if (limite <= 0) return deuda > 0 ? 'rojo' : 'verde'
  if (deuda * 100 < limite * 60) return 'verde'
  if (deuda * 100 <= limite * 85) return 'amarillo'
  return 'rojo'
}

/**
 * Deuda de cada clínica, en el orden recibido: la deuda base de la clínica, más las facturas a crédito (`deuda`)
 * y menos los abonos (`movimiento` con `abonoDeuda`) de los registros `confirmado`.
 */
export function deudaPorClinica(registros: Registro[], clinicas: Clinica[]): DeudaClinica[] {
  const cambios = new Map<string, number>()
  for (const r of registros) {
    if (r.estado !== 'confirmado') continue
    const p = r.propuesta
    if (p.tipo === 'deuda') {
      cambios.set(p.clinicaId, (cambios.get(p.clinicaId) ?? 0) + p.monto)
    } else if (p.tipo === 'movimiento' && p.movimiento.abonoDeuda && p.movimiento.clinicaId !== null) {
      cambios.set(p.movimiento.clinicaId, (cambios.get(p.movimiento.clinicaId) ?? 0) - p.movimiento.monto)
    }
  }

  return clinicas.map((c) => {
    const deuda = c.deuda + (cambios.get(c.id) ?? 0)
    const pct = c.limite > 0 ? Math.round((deuda / c.limite) * 100) : deuda > 0 ? 100 : 0
    return { clinicaId: c.id, nombre: c.nombre, deuda, limite: c.limite, pct, semaforo: semaforoDe(deuda, c.limite) }
  })
}

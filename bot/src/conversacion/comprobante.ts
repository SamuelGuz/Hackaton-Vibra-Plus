// "¿Te llegó la plata?" del comprobante que mandó alguien de afuera (adopciones-agente/comprobantes.ts).
// Botón 'cpb:<si|no>:<registro>'. Solo la administración, que es quien ve la caja.
import { plataEnCaja } from '../datos/calculos.js'
import { pesos } from '../formato.js'
import { textos } from '../textos.js'
import type { Estado } from '../tipos.js'
import { unoALaVez } from './candado.js'
import { preguntarAlgoMas } from './confirmar.js'
import { puedeVerPlata, type Ctx } from './ctx.js'

export function decidirComprobante(c: Ctx, id: string): Promise<Estado> {
  const [, decision, registroId = ''] = id.split(':')
  if (!puedeVerPlata(c)) return preguntarAlgoMas(c, textos.comprobanteSoloAdmin)
  // De a uno: si dos administradoras tocan a la vez, la segunda ve lo que decidió la primera
  return unoALaVez(async () => {
    const r = await c.deps.repo.leerRegistro(registroId)
    const mov = r?.acciones.find((a) => a.tipo === 'movimiento')
    if (!r || mov?.tipo !== 'movimiento') return preguntarAlgoMas(c, textos.seMePerdio)
    if (r.estado === 'confirmado') return preguntarAlgoMas(c, textos.comprobanteYaRegistrado)
    if (r.estado !== 'por_confirmar') return preguntarAlgoMas(c, textos.comprobanteYaDescartado)
    if (decision !== 'si') {
      await c.deps.repo.cambiarEstado([r.id], 'anulado')
      return preguntarAlgoMas(c, textos.comprobanteNoRegistrado)
    }
    await c.deps.repo.cambiarEstado([r.id], 'confirmado')
    const d = await c.datos(true)
    return preguntarAlgoMas(c, `${textos.comprobanteRegistrado(pesos(mov.movimiento.monto))}\n\n${textos.enCaja(plataEnCaja(d))}`)
  })
}

// "Ver lo de hoy": lo urgente arriba, en pocas líneas.
import { diasHablados, horaBonita, pesos } from '../formato.js'
import type { Estado } from '../tipos.js'
import { diasDeComida, dosisDeHoy, nivelClinica, nivelComida, plataEnCaja } from '../datos/calculos.js'
import { puedeVerPlata, type Ctx } from './ctx.js'
import { preguntarAlgoMas } from './confirmar.js'
import { nombreCorto } from './plata.js'

const MAX_DOSIS = 6

export async function verHoy(c: Ctx): Promise<Estado> {
  const d = await c.datos()
  const nombre = (id: string) => d.animales.find((a) => a.id === id)?.nombre ?? '?'
  const lineas: string[] = ['📋 *Lo de hoy*']

  const faltan = dosisDeHoy(d, c.ahora).filter((x) => x.estado !== 'dada')
  if (faltan.length === 0) {
    lineas.push('💊 Todas las medicinas de hoy están dadas 🎉')
  } else {
    lineas.push(`💊 *Medicinas que faltan: ${faltan.length}*`)
    for (const x of faltan.slice(0, MAX_DOSIS)) {
      const marca = x.reporte ? ' (reportada, falta confirmar)' : x.estado === 'atrasada' ? ' ⚠️ atrasada' : ''
      lineas.push(`• ${horaBonita(x.hora)} · ${nombre(x.tratamiento.animalId)} · ${x.tratamiento.medicamento}${marca}`)
    }
    if (faltan.length > MAX_DOSIS) lineas.push(`• …y ${faltan.length - MAX_DOSIS} más`)
  }

  const comida = (['perro', 'gato'] as const)
    .map((e) => ({ e, dias: diasDeComida(d, e) }))
    .filter((x) => Number.isFinite(x.dias))
    .map(({ e, dias }) => `${e} ${diasHablados(dias)}${nivelComida(d, dias) === 'urgente' ? ' ⚠️ toca pedir' : ''}`)
  if (comida.length) lineas.push(`🍖 Comida: ${comida.join(' · ')}`)

  const pendientes = d.porConfirmar.filter((p) => p.estado === 'pendiente').length
  if (pendientes) lineas.push(`⏳ Por confirmar en el panel: ${pendientes}`)

  if (puedeVerPlata(c)) {
    lineas.push(`💵 En caja: *${pesos(plataEnCaja(d))}*`)
    for (const k of d.clinicas) {
      const alerta = nivelClinica(k) === 'urgente' ? ' ⚠️' : ''
      lineas.push(`🏥 ${nombreCorto(k.nombre)}: ${pesos(k.deuda)} de ${pesos(k.limite)}${alerta}`)
    }
  }

  return preguntarAlgoMas(c, lineas.join('\n'))
}

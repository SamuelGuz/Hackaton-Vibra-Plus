// Cómo se lee cada acción en el chat. Montos y dosis van en negrita para revisarlos bien.
import { horaBonita, pesos } from '../formato.js'
import type { DatosAlbergue, EstadoAnimal } from '../panel-tipos.js'
import { NOMBRE_CATEGORIA } from '../textos.js'
import type { Accion } from '../tipos.js'

const NOMBRE_ESTADO: Record<EstadoAnimal, string> = {
  cuarentena: 'cuarentena',
  tratamiento: 'en tratamiento',
  adoptable: 'listo para adoptar',
  hogar_temporal: 'hogar temporal',
  adoptado: 'adoptado',
  fallecido: 'fallecido',
  devuelto: 'devuelto',
}

export function describir(a: Accion, d: DatosAlbergue): string {
  const animal = (id: string) => d.animales.find((x) => x.id === id)?.nombre ?? 'un animal'
  const clinica = (id: string | null) => d.clinicas.find((x) => x.id === id)?.nombre ?? 'la clínica'

  switch (a.tipo) {
    case 'dosis': {
      const t = d.tratamientos.find((x) => x.id === a.tratamientoId)
      return `💊 *${animal(a.animalId)}* · ${t?.medicamento ?? 'medicina'} *${t?.dosis ?? ''}* · la de las ${horaBonita(a.hora)}`
    }
    case 'inventario': {
      const n = Math.abs(a.cambio)
      const bultos = n === 1 ? '1 bulto' : `${n} bultos`
      return a.cambio < 0
        ? `🍖 Abriste *${bultos}* de comida de ${a.especie}`
        : `📦 Llegaron *${bultos}* de comida de ${a.especie}`
    }
    case 'movimiento': {
      const m = a.movimiento
      if (m.abonoDeuda) return `💸 Abono de *${pesos(m.monto)}* a ${clinica(m.clinicaId)}`
      const cat = NOMBRE_CATEGORIA[m.categoria] ?? m.categoria
      const nota = m.nota ? ` · ${m.nota}` : ''
      return m.tipo === 'ingreso'
        ? `💵 Entró *${pesos(m.monto)}* · ${cat}${nota}`
        : `💸 Salió *${pesos(m.monto)}* · ${cat}${m.clinicaId ? ` · ${clinica(m.clinicaId)}` : ''}${nota}`
    }
    case 'deuda':
      return `🧾 Factura de *${pesos(a.monto)}* a crédito con ${clinica(a.clinicaId)}${a.nota ? ` · ${a.nota}` : ''}`
    case 'nota':
      return `📝 *${animal(a.animalId)}*: ${a.texto}`
    case 'estado_animal':
      return `🏷️ *${animal(a.animalId)}* pasa a *${NOMBRE_ESTADO[a.estado]}*`
  }
}

/** Resumen de una línea, para guardarlo como texto del registro cuando no hubo audio */
export function resumenCorto(acciones: Accion[], d: DatosAlbergue): string {
  return acciones.map((a) => describir(a, d).replace(/[*]/g, '').replace(/^\S+\s/, '')).join(' · ')
}

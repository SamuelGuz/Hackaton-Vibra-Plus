import type { DatosAlbergue, Propuesta } from '../../data/tipos'
import { NOMBRE_ESTADO } from '../../lib/calculos'
import { horaBonita, pesos } from '../../lib/formato'
import { nombreCategoria } from '../plata/categorias'

/**
 * Lo que la IA propone guardar, en palabras del equipo. `grande` es la cantidad
 * que hay que revisar con cuidado (3 ml vs. 30 ml, $150.000 vs. $1.500.000).
 */
export function describir(datos: DatosAlbergue, p: Propuesta): { grande: string | null; texto: string } {
  const animal = (id: string) => datos.animales.find((a) => a.id === id)?.nombre ?? 'un animal'
  switch (p.tipo) {
    case 'dosis': {
      const t = datos.tratamientos.find((x) => x.id === p.tratamientoId)
      return {
        grande: t?.dosis ?? null,
        texto: `${t?.medicamento ?? 'Medicina'} a ${animal(p.animalId)} · dosis de las ${horaBonita(p.hora)}`,
      }
    }
    case 'inventario': {
      const n = Math.abs(p.cambio)
      const bultos = `${n} ${n === 1 ? 'bulto' : 'bultos'}`
      return p.cambio < 0
        ? { grande: `−${bultos}`, texto: `Se abrió comida de ${p.especie}` }
        : { grande: `+${bultos}`, texto: `Llegó comida de ${p.especie}` }
    }
    case 'movimiento': {
      const m = p.movimiento
      const signo = m.tipo === 'ingreso' ? '+' : '−'
      const nota = m.nota ? ` · ${m.nota}` : ''
      return { grande: `${signo}${pesos(m.monto)}`, texto: `${nombreCategoria(m.tipo, m.categoria)}${nota}` }
    }
    case 'nota':
      return { grande: null, texto: `Nota de ${animal(p.animalId)}: "${p.texto}"` }
    case 'deuda': {
      const clinica = datos.clinicas.find((c) => c.id === p.clinicaId)?.nombre ?? 'la clínica'
      return { grande: pesos(p.monto), texto: `Factura a crédito con ${clinica}: sube la deuda · ${p.nota}` }
    }
    case 'estado_animal':
      return { grande: null, texto: `${animal(p.animalId)} pasa a "${NOMBRE_ESTADO[p.estado]}"` }
  }
}

/** Monto de una propuesta de plata, o null si no tiene */
export function montoDe(p: Propuesta): number | null {
  if (p.tipo === 'movimiento') return p.movimiento.monto
  if (p.tipo === 'deuda') return p.monto
  return null
}

export function conMonto(p: Propuesta, monto: number): Propuesta {
  if (p.tipo === 'movimiento') return { ...p, movimiento: { ...p.movimiento, monto } }
  if (p.tipo === 'deuda') return { ...p, monto }
  return p
}

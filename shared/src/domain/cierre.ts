// Cierre del día: qué falta y qué sigue por confirmar (placa viva, Task 5). Puro: sin E/S.
import type { Animal, Persona, Tratamiento } from '../tipos'
import { animalIdDe, type PropuestaServidor, type Registro } from '../registro'
import type { Cierre } from '../vistas'
import { dosisDelDia } from './dosis'
import { horaCorta } from './hora'

const NO_CUENTAN: Array<Animal['estado']> = ['adoptado', 'fallecido']

/** Lo que se dice de un registro en la línea de pendientes: 'anticonvulsivo', 'comida'… */
function detalle(p: PropuestaServidor, trats: Tratamiento[]): string {
  switch (p.tipo) {
    case 'dosis':
      return (trats.find((t) => t.id === p.tratamientoId)?.medicamento ?? 'dosis').toLowerCase()
    case 'observacion':
      return 'observación'
    case 'estado_animal':
      return 'cambio de estado'
    case 'comida':
    case 'avance':
    case 'nota':
      return p.tipo
    case 'inventario':
    case 'movimiento':
    case 'deuda':
      // No llegan aquí: solo se listan los registros de un animal
      return p.tipo
  }
}

/**
 * Qué faltó hoy (animales sin comida, dosis sin registro) y qué registros siguen por confirmar.
 * Un registro anulado no cuenta. Los animales adoptados o fallecidos y los tratamientos suspendidos quedan fuera.
 * Los pendientes son solo de animales: la plata no sale en el cierre.
 */
export function buildCierre(animales: Animal[], trats: Tratamiento[], eventosHoy: Registro[], agentes: Persona[], fecha: string): Cierre {
  const vigentes = eventosHoy.filter((r) => r.estado !== 'anulado')
  const activos = animales.filter((a) => !NO_CUENTAN.includes(a.estado))
  const faltantes: string[] = []

  for (const a of activos) {
    const comio = vigentes.some((r) => r.propuesta.tipo === 'comida' && animalIdDe(r.propuesta) === a.id)
    if (!comio) faltantes.push(`${a.nombre} no consta que haya comido`)
  }

  for (const a of activos) {
    for (const d of dosisDelDia(
      trats.filter((t) => t.animalId === a.id),
      fecha,
    )) {
      if (!vigentes.some((r) => r.compromisoId === d.compromisoId)) {
        faltantes.push(`${a.nombre}: dosis de las ${horaCorta(d.hora)} pendiente`)
      }
    }
  }

  const pendientes: Cierre['pendientes'] = []
  for (const r of vigentes) {
    const animalId = animalIdDe(r.propuesta)
    if (r.estado !== 'por_confirmar' || animalId === null) continue
    const animal = animales.find((a) => a.id === animalId)
    const quien = agentes.find((p) => p.id === r.agenteId)?.nombre ?? 'Alguien'
    pendientes.push({
      registroId: r.id,
      linea: `${animal?.nombre ?? animalId} – ${detalle(r.propuesta, trats)} – ${horaCorta(r.fechaHora)} – ${quien}`,
    })
  }

  return { todoBien: faltantes.length === 0, faltantes, pendientes }
}

/** El mensaje del cierre. Con todoBien es la frase de paz mental (más lo que sigue por confirmar, si hay). */
export function textoCierre(c: Cierre, nAnimales: number): string {
  const partes: string[] = []
  if (c.todoBien) {
    partes.push(`Tranquilos: los ${nAnimales} comieron hoy y ninguno se quedó sin su medicina.`)
  } else {
    partes.push(['Antes de cerrar el día, falta revisar:', ...c.faltantes.map((f) => `• ${f}`)].join('\n'))
  }
  if (c.pendientes.length > 0) {
    partes.push(['Por confirmar:', ...c.pendientes.map((p) => `• ${p.linea}`)].join('\n'))
  }
  return partes.join('\n\n')
}

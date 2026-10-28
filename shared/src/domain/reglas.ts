// Reglas de confirmación: todo lo que sale de un audio, foto o IA nace por_confirmar (placa viva, Task 3).
import type { Especie } from '../tipos'
import type { ConfigServidor, OrigenRegistro, PropuestaServidor, Registro } from '../registro'
import type { Accion, DosisProgramada, TipoAccion } from '../vistas'
import { asignarCompromiso } from './dosis'
import { ahoraBogota } from './hora'

export interface ContextoAcciones {
  agenteId: string
  /** Animal del que se habla. Sin él, las acciones que son de un animal quedan en `sinResolver`. */
  animalId?: string
  /** Especie del animal; sirve al inventario cuando el texto no dice "de perro" o "de gato" */
  especie?: Especie
  /** Clínica de la factura o el abono (la resuelve quien llama, p. ej. por la foto) */
  contraparteId?: string
  /** De dónde viene lo que se dijo. Por defecto 'audio'. */
  origen?: OrigenRegistro
  dosisHoy: DosisProgramada[]
  eventosHoy: Registro[]
  /** Instante con zona, p. ej. '2026-10-27T14:01:00-05:00'; si viene en UTC se pasa a Bogotá */
  ahoraIso: string
  registroIaId: string
  mediaUrl?: string
}

export interface ResultadoAcciones {
  eventos: Registro[]
  /** Dosis cuyo compromiso ya tiene un registro no anulado: no se guardan, se le avisa a la persona */
  duplicados: Array<{ accion: Accion; existente: Registro }>
  /** Acciones a las que les falta un dato (animal, clínica, monto…): se le pregunta a la persona */
  sinResolver: Array<{ accion: Accion; motivo: string }>
}

type Conversion = { propuesta: PropuestaServidor; compromisoId?: string } | { motivo: string }

/** Dinero en COP, entero y mayor que cero */
const montoValido = (monto: number): boolean => Number.isInteger(monto) && monto > 0

/** Tipos de acción que siempre se refieren a un animal */
const DE_ANIMAL: TipoAccion[] = ['comida', 'dosis', 'observacion', 'avance', 'nota']

function especieDelTexto(texto: string): Especie | undefined {
  const perro = /perr|canin/i.test(texto)
  const gato = /gat/i.test(texto)
  if (perro === gato) return undefined
  return perro ? 'perro' : 'gato'
}

/**
 * Cómo se guarda cada tipo de acción (Accion.tipo -> PropuestaServidor):
 *   dosis       -> dosis (con compromisoId); en futuro o sin dosis programada -> nota
 *   comida      -> comida
 *   observacion -> observacion
 *   avance      -> avance
 *   inventario  -> inventario (cantidad con signo: -1 al abrir un bulto)
 *   nota        -> nota
 *   factura     -> deuda (factura a crédito: sube la deuda con la clínica, no sale de caja)
 *   abono       -> movimiento gasto de veterinaria con abonoDeuda (sale de caja, baja la deuda)
 *   donacion    -> movimiento ingreso de categoría donacion
 */
function convertir(accion: Accion, ctx: ContextoAcciones): Conversion {
  const texto = accion.nota ?? accion.fraseExacta
  const animalId = ctx.animalId
  if (DE_ANIMAL.includes(accion.tipo) && animalId === undefined) return { motivo: 'Falta el animal' }

  switch (accion.tipo) {
    case 'dosis': {
      const nota: Conversion = { propuesta: { tipo: 'nota', animalId: animalId!, texto: accion.fraseExacta } }
      // "le voy a dar" no cuenta como dosis dada
      if (accion.tiempo === 'futuro') return nota
      const hora = ctx.ahoraIso.slice(11, 16)
      const programada = asignarCompromiso(animalId!, accion.medicamento ?? '', hora, ctx.dosisHoy)
      if (!programada) return nota
      return {
        propuesta: { tipo: 'dosis', animalId: animalId!, tratamientoId: programada.tratamientoId, hora: programada.hora },
        compromisoId: programada.compromisoId,
      }
    }
    case 'comida':
    case 'observacion':
    case 'avance':
    case 'nota':
      return { propuesta: { tipo: accion.tipo, animalId: animalId!, texto } }
    case 'inventario': {
      if (accion.cantidad === undefined) return { motivo: 'Falta la cantidad' }
      const especie = especieDelTexto(texto) ?? ctx.especie
      if (!especie) return { motivo: 'Falta la especie' }
      return { propuesta: { tipo: 'inventario', especie, cambio: accion.cantidad } }
    }
    case 'factura':
      if (accion.monto === undefined) return { motivo: 'Falta el monto' }
      if (!montoValido(accion.monto)) return { motivo: 'Monto inválido' }
      if (!ctx.contraparteId) return { motivo: 'Falta la clínica' }
      return { propuesta: { tipo: 'deuda', clinicaId: ctx.contraparteId, monto: accion.monto, nota: texto } }
    case 'abono':
      if (accion.monto === undefined) return { motivo: 'Falta el monto' }
      if (!montoValido(accion.monto)) return { motivo: 'Monto inválido' }
      if (!ctx.contraparteId) return { motivo: 'Falta la clínica' }
      return {
        propuesta: {
          tipo: 'movimiento',
          movimiento: {
            tipo: 'gasto',
            monto: accion.monto,
            categoria: 'veterinaria',
            clinicaId: ctx.contraparteId,
            abonoDeuda: true,
            foto: ctx.mediaUrl ?? null,
            nota: texto,
          },
        },
      }
    case 'donacion':
      if (accion.monto === undefined) return { motivo: 'Falta el monto' }
      if (!montoValido(accion.monto)) return { motivo: 'Monto inválido' }
      return {
        propuesta: {
          tipo: 'movimiento',
          movimiento: {
            tipo: 'ingreso',
            monto: accion.monto,
            categoria: 'donacion',
            clinicaId: null,
            abonoDeuda: false,
            foto: ctx.mediaUrl ?? null,
            nota: texto,
          },
        },
      }
  }
}

/**
 * Convierte lo que dijo la persona en registros `por_confirmar`, con la frase exacta copiada.
 * Una dosis cuyo compromiso ya tiene un registro (en cualquier estado menos anulado), sea de antes o de
 * la misma tanda, va a `duplicados`. Los ids son `${registroIaId}:${posición}`: repetibles, sin azar.
 */
export function accionesAEventos(acciones: Accion[], contexto: ContextoAcciones): ResultadoAcciones {
  // Fecha y hora siempre de Bogotá (America/Bogota, UTC−05:00), venga el instante en UTC o con -05:00
  const ctx: ContextoAcciones = { ...contexto, ahoraIso: ahoraBogota(new Date(contexto.ahoraIso)).iso }
  const res: ResultadoAcciones = { eventos: [], duplicados: [], sinResolver: [] }
  const vigente = (compromisoId: string): Registro | undefined =>
    [...ctx.eventosHoy, ...res.eventos].find((r) => r.compromisoId === compromisoId && r.estado !== 'anulado')

  acciones.forEach((accion, i) => {
    const conversion = convertir(accion, ctx)
    if ('motivo' in conversion) {
      res.sinResolver.push({ accion, motivo: conversion.motivo })
      return
    }
    if (conversion.compromisoId) {
      const existente = vigente(conversion.compromisoId)
      if (existente) {
        res.duplicados.push({ accion, existente })
        return
      }
    }
    res.eventos.push({
      id: `${ctx.registroIaId}:${i}`,
      fechaHora: ctx.ahoraIso,
      agenteId: ctx.agenteId,
      origen: ctx.origen ?? 'audio',
      estado: 'por_confirmar',
      propuesta: conversion.propuesta,
      fraseExacta: accion.fraseExacta,
      confianza: accion.confianza,
      registroIaId: ctx.registroIaId,
      ...(ctx.mediaUrl !== undefined && { mediaUrl: ctx.mediaUrl }),
      ...(conversion.compromisoId !== undefined && { compromisoId: conversion.compromisoId }),
    })
  })
  return res
}

/** Solo lo de bajo riesgo se autoconfirma. Dosis, deuda, movimientos y notas siempre las confirma una persona. */
const AUTOCONFIRMABLES: Array<PropuestaServidor['tipo']> = ['comida', 'observacion', 'avance', 'inventario']

/** Ids de los registros por confirmar que ya pueden pasar a confirmados solos (confianza y antigüedad de la config). */
export function autoconfirmables(eventos: Registro[], ahoraIso: string, cfg: ConfigServidor): string[] {
  const ahora = Date.parse(ahoraIso)
  return eventos
    .filter(
      (r) =>
        r.estado === 'por_confirmar' &&
        AUTOCONFIRMABLES.includes(r.propuesta.tipo) &&
        r.confianza !== undefined &&
        r.confianza >= cfg.umbralAutoconfirmar &&
        ahora - Date.parse(r.fechaHora) >= cfg.minutosAutoconfirmar * 60_000,
    )
    .map((r) => r.id)
}

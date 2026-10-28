// Ficha de HOY de un animal, pública (placa) y de equipo (placa viva, Task 4). Puro: sin E/S.
import type { Animal, Persona, Tratamiento } from '../tipos'
import { animalIdDe, type ConfigServidor, type Registro } from '../registro'
import type { DosisProgramada, EstadoDosisFicha, FichaVM, Vista } from '../vistas'
import { dosisDelDia } from './dosis'
import { ahoraBogota, horaCorta } from './hora'

/** Pasada esta espera sin registro, la dosis se marca atrasada */
const MINUTOS_ATRASADA = 60

function minutosDelDia(hhmm: string): number {
  const [h = '0', m = '0'] = hhmm.split(':')
  return Number(h) * 60 + Number(m)
}

/** Entre varios registros del mismo hecho, el que ya decidió una persona gana al que sigue por confirmar */
function elegir(registros: Registro[]): Registro | undefined {
  return registros.find((r) => r.estado === 'confirmado' || r.estado === 'corregido') ?? registros[0]
}

/** "Andrea dijo: "…" – 2:01 PM, sin confirmar" para el equipo; sin nombre para la vista pública */
function textoPorConfirmar(r: Registro, que: 'dosis' | 'comida', vista: Vista, agentes: Persona[]): string {
  const hora = horaCorta(r.fechaHora)
  if (vista === 'publica') return `Un voluntario reportó la ${que} a las ${hora}`
  const nombre = agentes.find((p) => p.id === r.agenteId)?.nombre ?? 'Alguien'
  return `${nombre} dijo: "${r.fraseExacta ?? ''}" – ${hora}, sin confirmar`
}

/** `llamarA` solo existe en la vista de equipo y si la persona tiene teléfono */
function enlaceLlamar(r: Registro, vista: Vista, agentes: Persona[]): string | undefined {
  if (vista === 'publica') return undefined
  const telefono = agentes.find((p) => p.id === r.agenteId)?.telefono
  return telefono ? `https://wa.me/${telefono}` : undefined
}

function dosisDeLaFicha(
  a: Animal,
  trats: Tratamiento[],
  propios: Registro[],
  agentes: Persona[],
  vista: Vista,
  ahora: { fecha: string; hora: string },
): FichaVM['dosis'] {
  const minutosAhora = minutosDelDia(ahora.hora)
  const programadas = dosisDelDia(
    trats.filter((t) => t.animalId === a.id),
    ahora.fecha,
  )
  const conRegistro = (d: DosisProgramada): Registro | undefined => elegir(propios.filter((r) => r.compromisoId === d.compromisoId))

  // Una dosis sin registro se oculta cuando ya venció otra posterior del mismo tratamiento (la de la
  // madrugada cuando ya es de tarde): la ficha muestra la que toca y el cierre del día lista las que faltaron.
  const superada = (d: DosisProgramada): boolean =>
    programadas.some((o) => o.tratamientoId === d.tratamientoId && o.hora > d.hora && minutosDelDia(o.hora) <= minutosAhora)

  const dosis: FichaVM['dosis'] = []
  for (const d of programadas) {
    const registro = conRegistro(d)
    if (!registro && superada(d)) continue

    let estado: EstadoDosisFicha
    if (registro) estado = registro.estado === 'por_confirmar' ? 'por_confirmar' : 'dada'
    else estado = minutosAhora - minutosDelDia(d.hora) > MINUTOS_ATRASADA ? 'atrasada' : 'pendiente'

    const llamarA = registro?.estado === 'por_confirmar' ? enlaceLlamar(registro, vista, agentes) : undefined
    dosis.push({
      medicamento: d.medicamento,
      hora: horaCorta(d.hora),
      estado,
      ...(registro?.estado === 'por_confirmar' && { texto: textoPorConfirmar(registro, 'dosis', vista, agentes) }),
      ...(llamarA !== undefined && { llamarA }),
    })
  }
  return dosis
}

function comidaDeLaFicha(propios: Registro[], agentes: Persona[], vista: Vista): FichaVM['comida'] {
  const registro = elegir(propios.filter((r) => r.propuesta.tipo === 'comida'))
  if (!registro) return { estado: 'no_consta' }
  const hora = horaCorta(registro.fechaHora)
  if (registro.estado === 'por_confirmar') {
    return { estado: 'por_confirmar', hora, texto: textoPorConfirmar(registro, 'comida', vista, agentes) }
  }
  return { estado: 'comio', hora }
}

/**
 * La ficha de HOY. En `publica` no hay nombres ni teléfonos del equipo; en `equipo` sí.
 * `ahoraIso` es un instante con zona (UTC o Bogotá): se pasa a Bogotá antes de leer fecha y hora; `eventosHoy` son los registros de ese día.
 */
export function buildFicha(
  a: Animal,
  trats: Tratamiento[],
  eventosHoy: Registro[],
  agentes: Persona[],
  vista: Vista,
  ahoraIso: string,
  cfg: ConfigServidor,
  waNumeroBot: string,
): FichaVM {
  const codigo = a.codigo ?? a.id
  // Lo anulado no cuenta para la ficha
  const propios = eventosHoy.filter((r) => r.estado !== 'anulado' && animalIdDe(r.propuesta) === a.id)

  return {
    codigo,
    nombre: a.nombre,
    canil: a.canil ?? '',
    ...(a.foto !== null && { fotoUrl: a.foto }),
    encabezadoPublico: `Soy ${a.nombre}, del albergue Huellitas`,
    advertencias: [...a.advertencias],
    comida: comidaDeLaFicha(propios, agentes, vista),
    dosis: dosisDeLaFicha(a, trats, propios, agentes, vista, ahoraBogota(new Date(ahoraIso))),
    registrarUrl: `https://wa.me/${waNumeroBot}?text=${encodeURIComponent(`Registro ${codigo} (${a.nombre}): `)}`,
    contactoUrl: `tel:+${cfg.telefonoAlbergue}`,
    vista,
  }
}

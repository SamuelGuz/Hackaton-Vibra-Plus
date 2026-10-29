// Recordatorios del día: la lista "Para hoy" que va con el resumen de las 7:00 y el recordatorio de las 7:00 p. m.
// para mandar la actualización. Hablan con lo que dice el panel: medicinas con su hora, comida y pendientes.
import { diasDeComida, dosisDeHoy, nivelComida } from '../datos/calculos.js'
import { diasHablados, fechaLocal, horaBonita } from '../formato.js'
import type { DatosAlbergue, Especie } from '../panel-tipos.js'
import { textos } from '../textos.js'
import type { Deps, Usuario } from '../tipos.js'

const MAX_DOSIS = 10
const EN_EL_REFUGIO = new Set(['cuarentena', 'tratamiento', 'adoptable', 'hogar_temporal'])

/** "• 8:00 a. m. Mateo · Amoxicilina 3 ml", con "…y N más" si son muchas */
function lineasDosis(d: DatosAlbergue, dosis: ReturnType<typeof dosisDeHoy>): string[] {
  const nombre = (id: string) => d.animales.find((a) => a.id === id)?.nombre ?? '?'
  const lineas = dosis
    .slice(0, MAX_DOSIS)
    .map((x) => `• ${horaBonita(x.hora)} ${nombre(x.tratamiento.animalId)} · ${x.tratamiento.medicamento} ${x.tratamiento.dosis}${x.estado === 'atrasada' ? ' ⚠️ atrasada' : ''}`)
  if (dosis.length > MAX_DOSIS) lineas.push(`• …y ${dosis.length - MAX_DOSIS} más`)
  return lineas
}

/** "2 perros y 1 gato" (los que están a cargo del refugio) */
function cuantos(d: DatosAlbergue): string {
  const n = (e: Especie) => d.animales.filter((a) => a.especie === e && EN_EL_REFUGIO.has(a.estado)).length
  const partes = [n('perro') && `${n('perro')} ${n('perro') === 1 ? 'perro' : 'perros'}`, n('gato') && `${n('gato')} ${n('gato') === 1 ? 'gato' : 'gatos'}`].filter(Boolean)
  return partes.join(' y ')
}

/** La lista de la mañana: comida, medicinas, bodega, pendientes y el recordatorio de mandar audios */
export function listaParaHoy(d: DatosAlbergue, ahora: Date): string {
  const partes: string[] = ['☀️ *Para hoy:*']
  const animales = cuantos(d)
  if (animales) partes.push(`🍖 Servir la comida: ${animales}.`)
  const dosis = dosisDeHoy(d, ahora).filter((x) => x.estado !== 'dada')
  if (dosis.length) partes.push(`💊 Medicinas (${dosis.length}):\n${lineasDosis(d, dosis).join('\n')}`)
  for (const e of ['perro', 'gato'] as const) {
    const dias = diasDeComida(d, e)
    if (!Number.isFinite(dias)) continue
    const nivel = nivelComida(d, dias)
    if (nivel !== 'bien') partes.push(`📦 La comida de ${e} alcanza para *${diasHablados(dias)}*: toca pedir${nivel === 'urgente' ? ' hoy ⚠️' : ''}.`)
  }
  const porConfirmar = d.porConfirmar.filter((p) => p.estado === 'pendiente').length
  if (porConfirmar) partes.push(`⏳ Por confirmar en el panel: ${porConfirmar}.`)
  partes.push(textos.recordatorioAudios)
  return partes.join('\n\n')
}

/** ¿Esta persona registró algo hoy (por WhatsApp o en el panel)? */
function contoAlgoHoy(d: DatosAlbergue, usuarioId: number, hoy: string): boolean {
  const quien = String(usuarioId)
  const deHoy = (x: { quien: string; fechaHora: string }) => x.quien === quien && x.fechaHora.startsWith(hoy)
  return [d.porConfirmar, d.dosisDadas, d.inventario, d.movimientos, d.notas].some((lista) => (lista as { quien: string; fechaHora: string }[]).some(deHoy))
}

/**
 * El recordatorio de la tarde: a quien no ha contado nada le pide la actualización; a quien sí, le dice qué medicinas faltan.
 * Si ya contó y no falta nada, no la molesta. Devuelve true si mandó algo.
 */
export async function recordatorioTarde(deps: Deps, usuario: Usuario): Promise<boolean> {
  const ahora = deps.ahora()
  const d = await deps.repo.hoy(ahora)
  const conto = contoAlgoHoy(d, usuario.id, fechaLocal(ahora))
  const faltan = dosisDeHoy(d, ahora).filter((x) => x.estado !== 'dada' && !x.reporte)
  if (conto && faltan.length === 0) return false
  const dosis = faltan.length ? lineasDosis(d, faltan).join('\n') : ''
  const texto = conto
    ? textos.tardeFaltanMedicinas(usuario.nombre, dosis)
    : `${textos.tardeSinNoticias(usuario.nombre)}${dosis ? `\n\n💊 Según el panel faltan estas medicinas:\n${dosis}` : ''}`
  await deps.wa.enviar(usuario.telefono, { tipo: 'botones', texto, botones: [{ id: 'menu', titulo: 'Registrar algo' }] })
  return true
}

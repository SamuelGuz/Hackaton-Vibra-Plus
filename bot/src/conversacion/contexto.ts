// Lo que la IA necesita saber para responderle al equipo ("¿cómo se llama la persona?", "¿cuánta comida queda?").
// Va filtrado por rol, igual que el panel: solicitudes y seguimientos para administración y adopciones; la caja, solo administración.
// A Gemini no le llegan teléfonos, cédulas ni apellidos: solo el nombre de pila de quien quiere adoptar.
import { pendientesDeHoy, veAdoptantes } from '../adopcion/seguimientos.js'
import { diasDeComida, dosisDeHoy, kgEnBodega, plataEnCaja, vacunasPorVencer } from '../datos/calculos.js'
import { diasHablados, fechaLocal, horaBonita, pesos } from '../formato.js'
import type { Ctx } from './ctx.js'
import { puedeVerPlata } from './ctx.js'

const MAX_SOLICITUDES = 8
const nombreDePila = (nombre: string) => nombre.trim().split(/\s+/)[0] || 'sin nombre'

/** "sábado 31 de octubre, 10:00 a. m." en hora de Colombia */
function cuando(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const dia = d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' })
  const h = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' })
  return `${dia}, ${horaBonita(h)}`
}

/** Bloque de texto para la IA. Si algo de la base falla, se responde con lo que haya. */
export async function contextoEquipo(c: Ctx): Promise<string> {
  const d = await c.datos()
  const nombre = (id: string | null) => (id && d.animales.find((a) => a.id === id)?.nombre) || null
  const lineas: string[] = [`QUIÉN TE ESCRIBE: ${c.usuario.nombre} (${c.usuario.rol}). Hoy es ${fechaLocal(c.ahora)}.`]

  const comida = (['perro', 'gato'] as const).map((e) => {
    const dias = diasDeComida(d, e)
    return `${e}: ${Math.round(kgEnBodega(d, e))} kg${Number.isFinite(dias) ? `, alcanza para ${diasHablados(dias)}` : ''}`
  })
  lineas.push(`COMIDA EN BODEGA: ${comida.join(' · ')}`)

  const faltan = dosisDeHoy(d, c.ahora).filter((x) => x.estado !== 'dada')
  lineas.push(
    `MEDICINAS QUE FALTAN HOY: ${faltan.length ? faltan.map((x) => `${horaBonita(x.hora)} ${nombre(x.tratamiento.animalId) ?? '?'} (${x.tratamiento.medicamento})${x.estado === 'atrasada' ? ' atrasada' : ''}`).join('; ') : 'ninguna'}`,
  )
  const vacunas = vacunasPorVencer(d, c.ahora)
  if (vacunas.length) lineas.push(`VACUNAS POR VENCER: ${vacunas.map((v) => `${v.animal} ${v.vacuna} ${v.vence}`).join('; ')}`)
  const porConfirmar = d.porConfirmar.filter((p) => p.estado === 'pendiente').length
  lineas.push(`REGISTROS POR CONFIRMAR EN EL PANEL: ${porConfirmar}`)

  if (veAdoptantes(c.usuario.rol)) {
    try {
      const solicitudes = (await c.deps.repo.solicitudesAdopcion()).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, MAX_SOLICITUDES)
      if (solicitudes.length) {
        lineas.push(
          'SOLICITUDES DE ADOPCIÓN (las más recientes; solo nombre de pila):\n' +
            solicitudes
              .map((s) => {
                const partes = [`${nombreDePila(s.nombre)} quiere a ${nombre(s.animalId) ?? 'un animal sin elegir'}`, `llegó ${s.fecha.slice(0, 10)}`]
                if (s.visitaPropuesta) partes.push(`visita propuesta ${cuando(s.visitaPropuesta)} (por confirmar)`)
                if (s.llamadaAgendada) partes.push(`llamada agendada ${cuando(s.llamadaAgendada)}`)
                if (s.puntajeIdoneidad != null) partes.push(`idoneidad ${s.puntajeIdoneidad}/100`)
                return `- ${partes.join(' · ')}`
              })
              .join('\n'),
        )
      }
      const seguimientos = pendientesDeHoy(await c.deps.repo.seguimientosAdopcion(), c.ahora)
      if (seguimientos.length) {
        lineas.push(`SEGUIMIENTOS QUE TOCAN HOY: ${seguimientos.map((s) => `${s.animalNombre} (día ${s.dia}) con ${nombreDePila(s.adoptanteNombre)}`).join('; ')}`)
      }
    } catch (e) {
      console.error('No se pudieron leer las solicitudes para responder:', e)
    }
  }

  if (puedeVerPlata(c)) {
    lineas.push(`CAJA: ${pesos(plataEnCaja(d))}`)
    lineas.push(`DEUDA CON CLÍNICAS: ${d.clinicas.map((k) => `${k.nombre} ${pesos(k.deuda)} de ${pesos(k.limite)}`).join('; ') || 'ninguna'}`)
  }
  return `DATOS DEL REFUGIO PARA RESPONDER PREGUNTAS (no van en la transcripción):\n${lineas.join('\n')}`
}

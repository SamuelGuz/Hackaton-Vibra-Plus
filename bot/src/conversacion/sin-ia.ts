// Cuando la IA no responde (cuota agotada, caída): lo común se responde igual con los datos del panel,
// para que el equipo nunca reciba "No te entendí" por una pregunta de todos los días.
import { veAdoptantes } from '../adopcion/seguimientos.js'
import { diasDeComida, dosisDeHoy, kgEnBodega, plataEnCaja, vacunasPorVencer } from '../datos/calculos.js'
import { diasHablados, horaBonita, pesos } from '../formato.js'
import { textos } from '../textos.js'
import type { Estado } from '../tipos.js'
import { preguntarAlgoMas } from './confirmar.js'
import { puedeVerPlata, type Ctx } from './ctx.js'
import { normal } from './elegir.js'

const GRACIAS = /^(muchas |mil |muchisimas )?(gracias|grax|gracia)\b|^(listo|perfecto|genial|excelente|dale|super|ok|okey|vale) (gracias|muchas gracias)$/
const PREGUNTA = /^(que|cuant\w*|cuando|como|quien|quienes|donde|cual\w*|a quien|hay|tenemos|queda\w*|falta\w*|me (dices|cuentas|recuerdas))\b/

/** ¿Es una pregunta o un "gracias"? Lo demás (algo que hizo) sigue el camino de siempre */
export function esPreguntaOGracias(texto: string): boolean {
  const n = normal(texto)
  return texto.includes('?') || PREGUNTA.test(n) || GRACIAS.test(n)
}

/** Responde sin IA. Devuelve null si el texto no es una pregunta ni un "gracias". */
export async function responderSinIa(c: Ctx, texto: string): Promise<Estado | null> {
  if (!esPreguntaOGracias(texto)) return null
  const n = normal(texto)
  if (GRACIAS.test(n) && !texto.includes('?')) return preguntarAlgoMas(c, textos.conGusto(c.usuario.nombre))

  const d = await c.datos()
  const nombre = (id: string | null) => (id && d.animales.find((a) => a.id === id)?.nombre) || null

  if (/\b(comida|bultos?|concentrado|carne|kilos?|alimento|croquetas?)\b/.test(n)) {
    const lineas = (['perro', 'gato'] as const).flatMap((e) => {
      const dias = diasDeComida(d, e)
      return Number.isFinite(dias) ? [`🍖 Comida de ${e}: ${Math.round(kgEnBodega(d, e))} kg, alcanza para *${diasHablados(dias)}*.`] : []
    })
    if (lineas.length) return preguntarAlgoMas(c, lineas.join('\n'))
  }
  if (/\b(medicin\w*|dosis|pastillas?|tratamientos?|remedios?)\b/.test(n)) {
    const faltan = dosisDeHoy(d, c.ahora).filter((x) => x.estado !== 'dada')
    if (!faltan.length) return preguntarAlgoMas(c, textos.medicinaNinguna)
    const lineas = faltan.map((x) => `• ${horaBonita(x.hora)} ${nombre(x.tratamiento.animalId) ?? '?'} · ${x.tratamiento.medicamento}${x.estado === 'atrasada' ? ' ⚠️ atrasada' : ''}`)
    return preguntarAlgoMas(c, `💊 Faltan ${faltan.length} hoy:\n${lineas.join('\n')}`)
  }
  if (/\b(vacunas?|refuerzos?)\b/.test(n)) {
    const v = vacunasPorVencer(d, c.ahora)
    return preguntarAlgoMas(c, v.length ? `💉 Por vencer:\n${v.map((x) => `• ${x.animal} · ${x.vacuna} · ${x.vence}`).join('\n')}` : '💉 Ninguna vacuna vence esta semana 🎉')
  }
  if (/\b(plata|caja|dinero|platica|deudas?|debemos|clinicas?)\b/.test(n)) {
    if (!puedeVerPlata(c)) return preguntarAlgoMas(c, textos.informeSinPlata)
    const deudas = d.clinicas.map((k) => `🏥 ${k.nombre}: ${pesos(k.deuda)} de ${pesos(k.limite)}`)
    return preguntarAlgoMas(c, [textos.enCaja(plataEnCaja(d)), ...deudas].join('\n'))
  }
  if (/\b(adopt\w*|solicitud\w*|interesad\w*|visitas?|se llama|persona)\b/.test(n) && veAdoptantes(c.usuario.rol)) {
    const solicitudes = (await c.deps.repo.solicitudesAdopcion().catch(() => [])).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5)
    if (solicitudes.length) {
      const lineas = solicitudes.map((s) => {
        const visita = s.visitaPropuesta ? ` · visita propuesta ${new Date(s.visitaPropuesta).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' })}` : ''
        return `• ${s.nombre.trim().split(/\s+/)[0] || 'Sin nombre'} quiere a ${nombre(s.animalId) ?? 'un animal sin elegir'}${visita}`
      })
      return preguntarAlgoMas(c, `🐾 Las solicitudes más recientes:\n${lineas.join('\n')}\n\nEl detalle (teléfono, respuestas) está en el panel.`)
    }
  }
  return preguntarAlgoMas(c, textos.sinIaNoSe)
}

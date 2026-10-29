import { buscarAdministradoras } from './avisos.js'
import type { Recepcion } from './recepcion.js'

const normal = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export const preguntaIdentidad = (t: string) => /(?:eres|sos|es esto|hablo con).*(?:\bia\b|robot|bot\b|inteligencia artificial|humano|persona real)/i.test(normal(t))
const estado = new WeakMap<Recepcion['sesion'], { enojo: number; solicitado: boolean; avisados: Set<string> }>()

export async function atenderEscalamiento(r: Recepcion, texto: string): Promise<boolean> {
  let e = estado.get(r.sesion)
  if (!e) { e = { enojo: 0, solicitado: false, avisados: new Set() }; estado.set(r.sesion, e) }
  const t = normal(texto)
  const molesto = /enojad|molest[oa]|furios|estoy hart|pesimo|no sirve|inutil|mierda|no me (ayudas|respondes|entiendes)|mal servicio/.test(t)
  e.enojo = molesto ? e.enojo + 1 : 0
  const humano = /(?:hablar|comunicar|pasame|pasar|contactar|atender|atienda).*(?:humano|persona|equipo|asesor|encargad|administrador)/.test(t)
  const delicado = /reclamo|queja|denuncia|demanda|abogado|legal|reembolso|devolucion de (dinero|plata)|cobro|(?:pago|transferencia|plata|donacion).*(?:no lleg|error|problema|equivoc|disputa)|(?:problema|error).*(?:pago|transferencia)/.test(t)
  if (!humano && !delicado && e.enojo < 2 && !e.solicitado) return false
  e.solicitado = true
  let avisados = e.avisados.size
  try {
    const admins = await buscarAdministradoras(r.deps)
    for (const a of admins) {
      if (e.avisados.has(a.telefono)) continue
      try {
        await r.deps.wa.enviar(a.telefono, { tipo: 'texto', texto: `Atención humana solicitada por +${r.telefono.replace(/\D/g, '')}. Motivo: ${delicado ? 'reclamo, pago o asunto legal' : e.enojo >= 2 ? 'malestar persistente' : 'solicitud expresa'}. Revisar este chat y responder directamente` })
        e.avisados.add(a.telefono); avisados++
      } catch (error) { console.error('No se pudo entregar escalamiento humano:', error) }
    }
  } catch (error) { console.error('No se pudo buscar equipo para escalamiento:', error) }
  await r.enviar({ tipo: 'texto', texto: avisados
    ? 'Le avisé al equipo para que una persona revise tu caso por aquí. La respuesta queda pendiente de ellos'
    : 'Este caso necesita que lo revise una persona del equipo. No pude entregarles el aviso ahora; puedes volver a pedirlo por aquí' })
  return true
}

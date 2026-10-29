import { createHash, randomUUID } from 'node:crypto'
import type { Deps, Entrada, Salida, Usuario } from '../tipos.js'
import { buscarAdministradoras } from '../adopciones-agente/avisos.js'
import { quitarDatosSensibles } from '../ia/redactar.js'

const normal = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const hash = (t: string) => createHash('sha256').update(t).digest('hex')
const escapar = (t: string) => t.replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[x]!)
const vencimiento = (deps: Deps) => new Date(deps.ahora().getTime() + 7 * 24 * 3_600_000)
const leer = async <T>(deps: Deps, key: string): Promise<T | null> => await deps.repo.leerMemoria?.(key, deps.ahora()) as T | null ?? null
async function guardar(deps: Deps, key: string, value: unknown) {
  if (!deps.repo.guardarMemoria) throw new Error('Falta el almacenamiento de solicitudes de apoyo')
  await deps.repo.guardarMemoria(key, value, vencimiento(deps))
}

/** Una oferta externa nunca se convierte por sí sola en inventario ni en ingreso. */
export function esOfertaComida(texto: string): boolean {
  const t = normal(texto)
  return /\b(comida|carne|alimento\w*|bultos?|concentrado|menudencia|kilos?|kg)\b/.test(t)
    && /\b(don\w*|tengo|tenemos|puedo|podemos|llevar\w*|regal\w*|ofre\w*)\b/.test(t)
    && !/\b(no tengo|no tenemos|necesito que|necesitamos que|se acabo)\b/.test(t)
    // Dinero o apadrinamiento para comprar comida es una donación, no una entrega de alimento; las preguntas de «cómo» las responde la IA con los datos reales
    && !/\b(plata|dinero|pesos|transferenc\w*|consign\w*|nequi|daviplata|efectivo|apadrin\w*)\b|\$/.test(t)
    && !/\b(como|donde|cuanto|cual)\b.*\b(don\w*|ayud\w*|apoy\w*)\b/.test(t)
}

export async function atenderOfertaComida(deps: Deps, telefono: string, texto: string, enviar: (s: Salida) => Promise<void>): Promise<boolean> {
  if (!esOfertaComida(texto)) return false
  const key = `apoyo:oferta:${hash(telefono + ':' + normal(texto))}`
  let oferta = await leer<{ registroId: string; avisados: string[] }>(deps, key)
  if (!oferta) {
    const registroId = await deps.repo.crearRegistro({ usuarioId: null, canal: 'whatsapp', tipoEntrada: 'texto',
      transcripcion: `Oferta de alimento pendiente de recepción: ${quitarDatosSensibles(texto).slice(0, 700)}`,
      acciones: [], confianza: null, estado: 'por_confirmar' })
    oferta = { registroId, avisados: [] }
    await guardar(deps, key, oferta)
  }
  const admins = (await buscarAdministradoras(deps)).filter(a => a.rol === 'admin')
  for (const admin of admins) {
    if (oferta.avisados.includes(admin.telefono)) continue
    try {
      await deps.wa.enviar(admin.telefono, { tipo: 'texto', texto: `Hay una oferta de alimento para coordinar con +${telefono.replace(/\D/g, '')}: ${quitarDatosSensibles(texto).slice(0, 500)}\nEstá pendiente de entrega; todavía no se sumó al inventario` })
      oferta.avisados.push(admin.telefono)
      await guardar(deps, key, oferta)
    } catch { /* Queda pendiente en la memoria persistente; un reintento solo avisa a quienes faltan. */ }
  }
  await enviar({ tipo: 'texto', texto: 'Gracias por querer apoyar con comida a los peluditos' })
  await enviar({ tipo: 'texto', texto: oferta.avisados.length ? 'Le avisé al equipo para coordinar contigo la entrega' : 'Tu oferta quedó guardada, pero no pude avisar al equipo ahora; sigue pendiente de coordinación' })
  await enviar({ tipo: 'texto', texto: /manana|hoy|lunes|martes|miercoles|jueves|viernes|sabado|domingo/i.test(normal(texto)) ? '¿En qué horario podrías acercarla?' : '¿Qué día podrías acercarla?' })
  return true
}

interface CampanaApoyo {
  id: string; texto: string; paso: 'borrador' | 'contactos' | 'confirmar' | 'enviado'; contactos: string[]; enviados: string[]
}
const claveCampana = (u: Usuario) => `apoyo:campana:${hash(String(u.id))}`
const puedeEnviar = (u: Usuario) => u.rol === 'admin' || u.rol === 'comunicacion'
const colas = new WeakMap<Deps['repo'], Map<number, Promise<void>>>()

export async function atenderAyudaInterna(deps: Deps, u: Usuario, entrada: Entrada): Promise<boolean> {
  const texto = entrada.tipo === 'texto' ? entrada.texto : ''
  const solicitud = /(?:se acabo|nos quedamos sin|necesit\w*|pedir|solicitar).*(?:comida|alimento|ayuda|apoyo).*(?:comunidad|ayuda|apoyo)|(?:se acabo|nos quedamos sin) la comida/i.test(normal(texto))
  const esBoton = entrada.tipo === 'boton' && entrada.id.startsWith('apoyo:')
  const campana = await leer<CampanaApoyo>(deps, claveCampana(u))
  if (!solicitud && !esBoton && !(campana?.paso === 'contactos' && texto)) return false
  let mapa = colas.get(deps.repo)
  if (!mapa) { mapa = new Map(); colas.set(deps.repo, mapa) }
  const anterior = mapa.get(u.id) ?? Promise.resolve()
  const turno = anterior.then(() => ejecutarAyuda(deps, u, entrada, solicitud))
  mapa.set(u.id, turno.catch(() => {}))
  await turno
  return true
}

async function ejecutarAyuda(deps: Deps, u: Usuario, entrada: Entrada, solicitud: boolean): Promise<void> {
  const enviar = (s: Salida) => deps.wa.enviar(u.telefono, s)
  const key = claveCampana(u)
  let c = await leer<CampanaApoyo>(deps, key)
  if (solicitud) {
    c = { id: randomUUID(), texto: 'Muchachos, nos quedamos sin comida en el refugio. ¿Quién puede apoyarnos con alimento para los peluditos?', paso: 'borrador', contactos: [], enviados: [] }
    await guardar(deps, key, c)
    await enviar({ tipo: 'texto', texto: 'Te preparé un mensaje para pedir apoyo con comida' })
    await enviar({ tipo: 'texto', texto: c.texto })
    await enviar({ tipo: 'botones', texto: '¿Cómo lo quieres compartir?', botones: [{ id: `apoyo:estado:${c.id}`, titulo: 'Preparar estado' }, { id: `apoyo:privados:${c.id}`, titulo: 'Por privado' }] })
    return
  }
  const id = entrada.tipo === 'boton' ? entrada.id.split(':').slice(2).join(':') : ''
  if (entrada.tipo === 'boton' && entrada.id.startsWith('apoyo:enviar:') && !puedeEnviar(u)) {
    await enviar({ tipo: 'texto', texto: 'Los envíos privados los confirma administración o comunicación' }); return
  }
  if (!c || (id && id !== c.id)) { await enviar({ tipo: 'texto', texto: 'Ese pedido ya no está disponible. Escribe de nuevo qué ayuda necesitas' }); return }
  if (entrada.tipo === 'boton' && entrada.id.startsWith('apoyo:estado:')) {
    const png = await deps.dibujar(`<!doctype html><meta charset="utf-8"><style>body{margin:0;width:540px;background:#f6efe4;color:#285443;font:32px Arial;padding:50px;box-sizing:border-box}h1{font-size:43px}p{line-height:1.5}</style><h1>Una mano para el refugio</h1><p>${escapar(c.texto)}</p>`)
    await enviar({ tipo: 'imagen', png, texto: 'Aquí tienes la imagen del pedido para compartirla tú en tu estado de WhatsApp; todavía no se ha publicado' })
    return
  }
  if (entrada.tipo === 'boton' && entrada.id.startsWith('apoyo:privados:')) {
    if (!puedeEnviar(u)) { await enviar({ tipo: 'texto', texto: 'Administración puede confirmar los privados; tú ya tienes el mensaje preparado' }); return }
    c.paso = 'contactos'; await guardar(deps, key, c)
    await enviar({ tipo: 'texto', texto: 'Pásame los números de los contactos autorizados que aceptaron recibir pedidos de ayuda, con indicativo del país' })
    return
  }
  if (entrada.tipo === 'texto' && c.paso === 'contactos') {
    if (!/autorizad|aceptaron|consentimiento/i.test(entrada.texto)) { await enviar({ tipo: 'texto', texto: 'Antes necesito que confirmes que esos contactos aceptaron recibir estos mensajes' }); return }
    c.contactos = [...new Set((entrada.texto.match(/\+?\d[\d ()-]{8,19}\d/g) ?? []).map(t => t.replace(/\D/g, '')).filter(t => /^\d{10,15}$/.test(t)))].slice(0, 10)
    if (!c.contactos.length) { await enviar({ tipo: 'texto', texto: 'No reconocí los números. Escríbelos con el indicativo, separados por coma' }); return }
    c.paso = 'confirmar'; await guardar(deps, key, c)
    await enviar({ tipo: 'texto', texto: c.texto })
    await enviar({ tipo: 'botones', texto: `Está preparado para ${c.contactos.length} contactos autorizados; todavía no lo envié`, botones: [{ id: `apoyo:enviar:${c.id}`, titulo: 'Confirmar envío' }, { id: `apoyo:cancelar:${c.id}`, titulo: 'Cancelar' }] })
    return
  }
  if (entrada.tipo === 'boton' && entrada.id.startsWith('apoyo:cancelar:')) { await deps.repo.borrarMemoria?.(key); await enviar({ tipo: 'texto', texto: 'Cancelé el pedido de envío; no se enviará a los contactos pendientes' }); return }
  if (entrada.tipo === 'boton' && entrada.id.startsWith('apoyo:enviar:')) {
    if (!['confirmar', 'enviado'].includes(c.paso)) { await enviar({ tipo: 'texto', texto: 'Primero revisa los contactos y la vista previa del mensaje' }); return }
    for (const telefono of c.contactos) {
      if (c.enviados.includes(telefono)) continue
      try { await deps.wa.enviar(telefono, { tipo: 'texto', texto: c.texto }); c.enviados.push(telefono); await guardar(deps, key, c) } catch { /* El resumen informa la entrega parcial. */ }
    }
    c.paso = c.enviados.length === c.contactos.length ? 'enviado' : 'confirmar'; await guardar(deps, key, c)
    await enviar({ tipo: 'texto', texto: `Se entregaron ${c.enviados.length} de ${c.contactos.length} mensajes${c.paso === 'confirmar' ? '; los demás siguen pendientes y puedes reintentar' : '; un nuevo toque no repetirá los envíos'}` })
  }
}

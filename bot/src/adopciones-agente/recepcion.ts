// Recepción por botones para quien escribe de afuera: menú (adoptar, donar, saber más), la web una sola vez,
// adoptar en 3 toques y el nombre, y los datos de donación a la vista. Lo que la persona escribe con sus palabras
// lo sigue respondiendo la IA (agente.ts). Solo WhatsApp: la llamada de la web no tiene botones.
import { crearSalidaCatalogo } from '../catalogo/index.js'
import { CONOCIMIENTO } from '../rag/conocimiento-data.js'
import type { ContextoExterno, PerritoPublico } from '../rag/tipos.js'
import type { Deps, Fila, Salida } from '../tipos.js'
import { proponerVisita } from './agente.js'
import { combinarEvaluacion, puedeAgendarVisita } from './decisiones.js'
import { PADRINAZGO_DESDE, textosAgente } from './textos.js'
import type { EvaluacionParcial, Formulario, Sesion } from './tipos.js'

/** Lo que necesita la recepción para contestar un mensaje */
export interface Recepcion {
  deps: Deps
  ctx: ContextoExterno
  sesion: Sesion
  clave: string
  telefono: string
  enviar(s: Salida): Promise<void>
}

const normal = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Un saludo o un "menú" sin nada más: ahí va el menú, no la IA */
const SOLO_SALUDO =
  /^(hola+|holi+|ola|hey|alo|buenas?|buenos dias|buen dia|buenas (tardes|noches|dias)|saludos|que tal|info|informacion|menu|inicio|empezar|opciones)( (como (estas|esta|estan|vas|van)|que tal|buen dia|buenas|buenas tardes|buenas noches|buenos dias))?$/

export function esSoloSaludo(texto: string): boolean {
  return SOLO_SALUDO.test(normal(texto))
}

export function pideMenu(texto: string): boolean {
  return /^(menu|inicio|opciones|volver)$/.test(normal(texto))
}

// ---------- Mensajes ----------

const BOTONES_MENU = [
  { id: 'ext:adoptar', titulo: '🐶 Adoptar' },
  { id: 'ext:donar', titulo: '💛 Donar' },
  { id: 'ext:info', titulo: 'ℹ️ Saber más' },
]

/** La web va una sola vez por conversación; después de eso, el texto sigue sin ella */
function lineaWeb(r: Recepcion): string | null {
  if (!r.ctx.sitioWeb || r.sesion.webEnviada) return null
  r.sesion.webEnviada = true
  return textosAgente.web(r.ctx.sitioWeb)
}

export async function enviarMenu(r: Recepcion, saludo = true): Promise<void> {
  r.sesion.bienvenida = true
  const web = lineaWeb(r)
  const texto = [saludo ? textosAgente.bienvenida : textosAgente.menuOtraVez, web].filter(Boolean).join('\n\n')
  await r.enviar({ tipo: 'botones', texto, botones: BOTONES_MENU })
  recordar(r, saludo ? '(saludó)' : '(pidió el menú)', texto)
}

/** Si a la persona aún no se le ha compartido la web, se manda aparte (después de una respuesta de la IA) */
export async function webSiFalta(r: Recepcion): Promise<void> {
  const web = lineaWeb(r)
  if (web) await r.enviar({ tipo: 'texto', texto: web })
}

/** Lo que pasó con botones también queda en el historial: la IA sabe de qué se viene hablando */
function recordar(r: Recepcion, persona: string, respuesta: string) {
  r.sesion.historial.push({ rol: 'user', texto: persona }, { rol: 'model', texto: respuesta })
}

const tamano = { pequeno: 'pequeño', mediano: 'mediano', grande: 'grande' } as const
const emoji = (p: PerritoPublico) => (p.especie === 'gato' ? '🐱' : '🐶')

export function pideCatalogo(texto: string): boolean {
  return /(?:interesad[oa].*(?:animalitos|animales|peluditos)|(?:ver|mostrar|muestrame|conocer|catalogo).*(?:animales|perritos|gatos|peluditos)|^(?:ver otros|otros|mas animales|mas perritos|quiero adoptar)$)/.test(normal(texto))
}

const mostrados = new WeakMap<Sesion, Set<string>>()

export async function enviarLista(r: Recepcion, consulta?: string): Promise<void> {
  const mas = consulta && /\b(otros|otras|mas)\b/.test(normal(consulta))
  const consultaReal = mas ? undefined : consulta
  const candidatos = consultaReal ? (await r.ctx.rag.buscar(consultaReal, 5)).resultados.map(x => x.perrito) : await r.ctx.rag.listar({ limite: 5 })
  const vistos = mostrados.get(r.sesion) ?? new Set<string>()
  if (!mas) vistos.clear()
  const animales = candidatos.filter(p => !vistos.has(p.id)).slice(0, 3)
  if (!animales.length) {
    await r.enviar({ tipo: 'texto', texto: mas ? 'Ya viste los animalitos que tengo disponibles por aquí. ¿De cuál quieres saber más?' : 'Ahora mismo no tengo peluditos para mostrarte por aquí. ¿Quieres que revisemos otras formas de ayudar?' })
    return
  }
  let imagen: Salida
  try {
    imagen = await crearSalidaCatalogo(animales, html => r.deps.dibujar(html))
  } catch (error) {
    console.error('No se pudo dibujar el catálogo; se ofrece alternativa de texto:', error)
    imagen = { tipo: 'texto', texto: `No pude cargar la imagen ahora, pero puedes conocer a ${animales.map(p => p.nombre).join(', ')}` }
  }
  const presentacion = 'Te presento algunos peluditos que puedes conocer 🐾 Cada uno tiene su propia historia'
  await r.enviar({ tipo: 'texto', texto: presentacion })
  await r.enviar(imagen)
  await r.enviar({ tipo: 'texto', texto: '¿Cuál te gustaría conocer mejor?' })
  animales.forEach(p => vistos.add(p.id))
  mostrados.set(r.sesion, vistos)
  recordar(r, '(quiere conocer animales)', presentacion + ' ' + animales.map(p => p.nombre).join(', '))
}

function ficha(p: PerritoPublico): string {
  const c = p.compatibilidad
  const conQuien = [c.ninos && 'niños', c.perros && 'otros perros', c.gatos && 'gatos'].filter(Boolean).join(', ')
  return [
    `${emoji(p)} *${p.nombre}* · ${p.edadTexto} · tamaño ${tamano[p.tamano]}`,
    p.personalidad.length ? `Es ${p.personalidad.join(', ')}.` : null,
    // Solo la historia confirmada se cuenta como hecho
    p.historiaConfirmada && p.historia ? p.historia.slice(0, 400) : null,
    conQuien ? `✅ Se lleva bien con ${conQuien}${c.apartamento ? '. Puede vivir en apartamento' : ''}.` : c.apartamento ? '✅ Puede vivir en apartamento.' : null,
    p.necesidadesMedicas.length ? `💊 Cuidados: ${p.necesidadesMedicas.join('; ')}` : null,
    p.adoptable ? null : textosAgente.soloApadrinar(p.nombre),
  ]
    .filter(Boolean)
    .join('\n')
}

async function enviarFicha(r: Recepcion, p: PerritoPublico): Promise<void> {
  r.sesion.perroFoco = p.id
  const texto = `${ficha(p)}\n\n¿Qué te gustaría hacer?`
  await r.enviar({
    tipo: 'botones',
    texto,
    botones: [
      p.adoptable ? { id: `ext:q:${p.id}`, titulo: '❤️ Quiero adoptarlo' } : { id: 'ext:donar', titulo: '💛 Apadrinarlo' },
      { id: 'ext:adoptar', titulo: '🐾 Ver otros' },
      p.adoptable ? { id: `ext:p:${p.id}`, titulo: '💛 Apadrinarlo' } : { id: 'ext:duda', titulo: '❓ Tengo una duda' },
    ],
  })
  recordar(r, `(quiere conocer a ${p.nombre})`, texto)
}

/** Los datos para donar, a la vista. También se mandan cuando la IA nota que la persona quiere donar o apadrinar. */
export function enviarDonacion(r: Recepcion, perro?: PerritoPublico | null): Promise<void> {
  return enviarDonar(r, perro)
}

async function enviarDonar(r: Recepcion, perro?: PerritoPublico | null): Promise<void> {
  const d = r.ctx.donaciones ?? {}
  const cuentas = [d.nequi && 'Nequi: ' + d.nequi, d.llave && 'Llave Bre-B: ' + d.llave, d.cuenta, d.titular && 'Titular: ' + d.titular].filter(Boolean).join('; ')
  await r.enviar({ tipo: 'texto', texto: perro ? 'Puedes apadrinar a ' + perro.nombre + ' desde ' + PADRINAZGO_DESDE + ' al mes. El equipo te ayuda con el proceso' : 'Tu ayuda puede convertirse en comida y cuidados para los peluditos. Puedes donar dinero o insumos' })
  await r.enviar({ tipo: 'texto', texto: cuentas || 'No tengo datos de pago confirmados por aquí. El equipo debe compartirlos antes de que hagas la donación' })
  const contacto = d.telefono ? 'Para comida o insumos puedes coordinar al ' + d.telefono + '. ' : ''
  await r.enviar({ tipo: 'botones', texto: contacto + 'Si ya donaste, envía la foto del comprobante para revisión del equipo. La donación queda pendiente de confirmación humana', botones: [{ id: 'ext:comprobante', titulo: 'Ya doné' }, { id: 'ext:adoptar', titulo: 'Adoptar' }, { id: 'ext:duda', titulo: 'Tengo una duda' }] })
  r.sesion.donacionMostrada = true
  recordar(r, '(quiere ayudar)', cuentas || 'Datos pendientes del equipo')
}

/** "Saber más": qué es el refugio, horarios y visitas, tomado de la base de conocimiento (no se inventa nada) */
function enviarInfo(r: Recepcion): Promise<void> {
  const de = (id: string) => CONOCIMIENTO.find((e) => e.id === id)?.respuesta
  const texto = [de('ref-que'), de('ref-horario'), de('visitas-cuando'), textosAgente.infoDudas, lineaWeb(r) ?? (r.ctx.sitioWeb ? `🌐 ${r.ctx.sitioWeb}` : null)]
    .filter(Boolean)
    .join('\n\n')
  recordar(r, '(quiere saber más)', texto)
  return r.enviar({
    tipo: 'botones',
    texto,
    botones: [BOTONES_MENU[0], BOTONES_MENU[1], { id: 'ext:duda', titulo: '❓ Tengo una duda' }],
  })
}

// ---------- Formulario de adopción: 3 preguntas con botones y el nombre ----------

const PREGUNTAS = {
  vivienda: {
    texto: (perro: string) => `Vamos a revisar algunos cuidados para ${perro}. ¿Dónde viviría?`,
    botones: [
      { id: 'ext:f:v:propia', titulo: '🏠 Vivienda propia' },
      { id: 'ext:f:v:arriendo', titulo: '🔑 Arriendo, me dejan' },
      { id: 'ext:f:v:nose', titulo: '❓ Arriendo, no sé' },
    ],
  },
  tiempo: {
    texto: () => '¿Cuánto tiempo pasa alguien en casa?',
    botones: [
      { id: 'ext:f:t:mucho', titulo: 'Casi todo el día' },
      { id: 'ext:f:t:medio', titulo: 'Medio día' },
      { id: 'ext:f:t:poco', titulo: 'Casi nunca' },
    ],
  },
  presupuesto: {
    texto: () => '¿Puedes cubrir su comida, vacunas y una visita al veterinario si se enferma?',
    botones: [
      { id: 'ext:f:p:si', titulo: 'Sí, sin problema' },
      { id: 'ext:f:p:nose', titulo: 'No estoy seguro' },
      { id: 'ext:f:p:no', titulo: 'Ahora no puedo' },
    ],
  },
} as const

type Paso = keyof typeof PREGUNTAS | 'nombre'

function siguientePaso(f: Formulario, s: Sesion): Paso | null {
  if (!f.respuestas.vivienda) return 'vivienda'
  if (!f.respuestas.tiempo) return 'tiempo'
  if (!f.respuestas.presupuesto) return 'presupuesto'
  if (!s.evaluacion.nombre) return 'nombre'
  return null
}

/** Puntajes con reglas fijas: con vivienda propia o con permiso, tiempo y presupuesto se llega a la visita */
function evaluacionDe(f: Formulario): EvaluacionParcial {
  const { vivienda, tiempo, presupuesto } = f.respuestas
  let suitability = 40
  let risk = 15
  const e: EvaluacionParcial = {}
  if (vivienda === 'propia') ((suitability += 20), (e.viviendaTipo = 'otro'), (e.permisoArriendo = 'no_aplica'))
  if (vivienda === 'arriendo') ((suitability += 15), (e.viviendaTipo = 'otro'), (e.permisoArriendo = 'si'))
  if (vivienda === 'nose') e.viviendaTipo = 'otro'
  if (tiempo === 'mucho') ((suitability += 20), (e.tiempoDisponible = 'suficiente'))
  if (tiempo === 'medio') ((suitability += 15), (e.tiempoDisponible = 'suficiente'))
  if (tiempo === 'poco') ((suitability -= 20), (risk += 35), (e.tiempoDisponible = 'poco'))
  if (presupuesto === 'si') ((suitability += 20), (e.presupuestoVeterinario = 'si'))
  if (presupuesto === 'no') ((suitability -= 30), (risk += 30), (e.presupuestoVeterinario = 'no'))
  e.suitability = Math.max(0, Math.min(100, suitability))
  e.risk = Math.min(100, risk)
  return e
}

async function preguntar(r: Recepcion, paso: Paso, perro: PerritoPublico): Promise<void> {
  if (paso === 'nombre') {
    await r.enviar({ tipo: 'texto', texto: textosAgente.nombre })
    recordar(r, '(respondió con botones)', textosAgente.nombre)
    return
  }
  const q = PREGUNTAS[paso]
  const texto = q.texto(perro.nombre)
  await r.enviar({ tipo: 'botones', texto, botones: [...q.botones] })
  recordar(r, '(respondió con botones)', texto)
}

async function empezarFormulario(r: Recepcion, perro: PerritoPublico): Promise<void> {
  if (!perro.adoptable) return enviarDonar(r, perro)
  r.sesion.perroFoco = perro.id
  r.sesion.formulario = { animalId: perro.id, respuestas: r.sesion.formulario?.animalId === perro.id ? r.sesion.formulario.respuestas : {} }
  const paso = siguientePaso(r.sesion.formulario, r.sesion) ?? 'vivienda'
  await preguntar(r, paso, perro)
}

async function seguirFormulario(r: Recepcion): Promise<void> {
  const f = r.sesion.formulario
  if (!f) return enviarMenu(r, false)
  const perro = await r.ctx.rag.porId(f.animalId)
  if (!perro) {
    r.sesion.formulario = null
    return enviarMenu(r, false)
  }
  r.sesion.evaluacion = combinarEvaluacion(r.sesion.evaluacion, evaluacionDe(f))
  const paso = siguientePaso(f, r.sesion)
  if (paso) return preguntar(r, paso, perro)
  return terminarFormulario(r, f, perro)
}

/** Con las 3 respuestas y el nombre: visita propuesta, o qué falta, o apadrinar. Siempre con cariño. */
async function terminarFormulario(r: Recepcion, f: Formulario, perro: PerritoPublico): Promise<void> {
  const nombre = r.sesion.evaluacion.nombre ?? ''
  const { vivienda, tiempo, presupuesto } = f.respuestas
  const evaluacion = r.sesion.evaluacion
  if (!r.sesion.visitas.has(perro.id) && puedeAgendarVisita({ evaluacion, intencion: 'adoptar', alertaBienestar: r.sesion.alertaBienestar, perroAdoptable: perro.adoptable })) {
    const confirmacion = await proponerVisita({ deps: r.deps, ctx: r.ctx, clave: r.clave, canal: { tipo: 'whatsapp', telefono: r.telefono } }, r.sesion, perro, evaluacion)
    if (confirmacion) {
      r.sesion.formulario = null
      const texto = `¡Gracias, ${nombre}! 🐾 ${confirmacion}`
      await r.enviar({ tipo: 'texto', texto })
      recordar(r, `(se llama ${nombre})`, texto)
      return
    }
    // Si el aviso no le llegó a nadie del equipo, no se promete la visita
    const texto = textosAgente.visitaSinAviso(nombre)
    await r.enviar({ tipo: 'texto', texto })
    recordar(r, `(se llama ${nombre})`, texto)
    return
  }
  if (r.sesion.visitas.has(perro.id)) {
    await r.enviar({ tipo: 'texto', texto: textosAgente.visitaYaPropuesta(nombre, perro.nombre) })
    return
  }
  if (tiempo === 'poco' || presupuesto === 'no') {
    r.sesion.formulario = null
    r.sesion.padrinazgoOfrecido = true
    const texto = textosAgente.mejorApadrinar(nombre, perro.nombre, tiempo === 'poco')
    await r.enviar({
      tipo: 'botones',
      texto,
      botones: [
        { id: `ext:p:${perro.id}`, titulo: '💛 Apadrinarlo' },
        { id: 'ext:donar', titulo: '🎁 Otras formas' },
        { id: 'ext:duda', titulo: '❓ Tengo una duda' },
      ],
    })
    recordar(r, `(se llama ${nombre})`, texto)
    return
  }
  // Falta algo que se puede resolver: el permiso del arriendo o el presupuesto
  if (vivienda === 'nose') {
    f.respuestas.vivienda = undefined
    const texto = textosAgente.preguntaArriendo(nombre, perro.nombre)
    await r.enviar({ tipo: 'botones', texto, botones: [PREGUNTAS.vivienda.botones[1], { id: `ext:p:${perro.id}`, titulo: '💛 Mejor apadrinar' }, { id: 'ext:duda', titulo: '❓ Tengo una duda' }] })
    recordar(r, `(se llama ${nombre})`, texto)
    return
  }
  f.respuestas.presupuesto = undefined
  const texto = textosAgente.preguntaPresupuesto(nombre, perro.nombre)
  await r.enviar({ tipo: 'botones', texto, botones: [PREGUNTAS.presupuesto.botones[0], { id: `ext:p:${perro.id}`, titulo: '💛 Mejor apadrinar' }, { id: 'ext:duda', titulo: '❓ Tengo una duda' }] })
  recordar(r, `(se llama ${nombre})`, texto)
}

/** Un nombre de verdad: hasta 4 palabras, solo letras. Lo demás (una pregunta, una frase) lo responde la IA. */
export function leerNombre(texto: string): string | null {
  const t = texto
    .replace(/^(me llamo|mi nombre es|soy)\s+/i, '')
    .replace(/[.!]+$/, '')
    .trim()
  if (!t || t.length > 40 || /[?\d@]/.test(t)) return null
  const palabras = t.split(/\s+/)
  if (palabras.length > 4 || !palabras.every((p) => /^[\p{L}'-]+$/u.test(p))) return null
  return palabras.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

/** ¿El formulario está esperando el nombre? */
export function esperaNombre(s: Sesion): boolean {
  return Boolean(s.formulario && siguientePaso(s.formulario, s) === 'nombre')
}

export async function recibirNombre(r: Recepcion, nombre: string): Promise<void> {
  r.sesion.evaluacion = { ...r.sesion.evaluacion, nombre }
  await seguirFormulario(r)
}

// ---------- Botones ----------

/** Atiende un botón 'ext:…'. Uno viejo o inventado vuelve al menú. */
export async function tocarBoton(r: Recepcion, id: string): Promise<void> {
  const [, que = '', a = '', b = ''] = id.split(':')
  const animal = async (animalId: string) => (animalId ? r.ctx.rag.porId(animalId).catch(() => null) : null)
  switch (que) {
    case 'menu':
      return enviarMenu(r, false)
    case 'adoptar':
      return enviarLista(r)
    case 'donar':
      return enviarDonar(r)
    case 'info':
      return enviarInfo(r)
    case 'duda':
      await r.enviar({ tipo: 'texto', texto: textosAgente.escribeDuda })
      return
    case 'comprobante':
      await r.enviar({ tipo: 'texto', texto: textosAgente.mandaFotoComprobante })
      return
    case 'a': {
      const p = await animal(a)
      return p ? enviarFicha(r, p) : enviarMenu(r, false)
    }
    case 'q': {
      const p = await animal(a)
      return p ? empezarFormulario(r, p) : enviarMenu(r, false)
    }
    case 'p': {
      const p = await animal(a)
      return enviarDonar(r, p)
    }
    case 'f': {
      const f = r.sesion.formulario
      if (!f) return enviarMenu(r, false)
      if (a === 'v' && (b === 'propia' || b === 'arriendo' || b === 'nose')) f.respuestas.vivienda = b
      else if (a === 't' && (b === 'mucho' || b === 'medio' || b === 'poco')) f.respuestas.tiempo = b
      else if (a === 'p' && (b === 'si' || b === 'nose' || b === 'no')) f.respuestas.presupuesto = b
      else return enviarMenu(r, false)
      return seguirFormulario(r)
    }
    default:
      return enviarMenu(r, false)
  }
}

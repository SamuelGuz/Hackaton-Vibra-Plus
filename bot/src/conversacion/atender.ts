// Punto de entrada de la conversación: decide qué hacer con cada mensaje según el paso en que va la persona.
//
// Casi todos los botones llevan en su id lo que necesitan (d:<tratamiento>:<hora>, si:<registro>…),
// así un botón viejo del chat sigue sirviendo. El paso guardado sirve para lo que se escribe,
// se dice en audio o se manda en foto: en cada pregunta se puede tocar, escribir o hablar.

import { textos } from '../textos.js'
import type { Accion, Deps, Entendido, Entrada, Estado, Registro, Usuario } from '../tipos.js'
import { elegirAnimal, guardarNota, nombreEscrito } from './animal.js'
import { cantidadEscrita, elegirCantidad, elegirEspecie, empezarComida, especieDeTexto } from './comida.js'
import { responder, type Respuesta } from './confirmar.js'
import { crearCtx, type Ctx } from './ctx.js'
import { respuestaAConfirmar } from './elegir.js'
import { enviarInforme, informePedido } from './informe.js'
import { opcionDelMenu } from './intencion.js'
import { libreMedia, libreTexto, registrarEntendido } from './libre.js'
import { dosisEscrita, duplicadaEscrita, elegirDosis, empezarMedicina, responderDuplicada } from './medicina.js'
import { bajarYGuardar, entenderSeguro } from './medios.js'
import { mostrarMenu } from './menu.js'
import { anotarSeguimiento, pideSeguimientos, verSeguimientos } from './seguimientos.js'
import { sinTildes } from './numeros.js'
import {
  categoriaEscrita,
  clinicaFacturaEscrita,
  clinicaPlataEscrita,
  elegirCategoria,
  elegirClinicaFactura,
  elegirClinicaPlata,
  empezarPlata,
  facturaConFoto,
  facturaMontoEscrito,
  facturaSinFoto,
  facturaSinFotoEscrita,
  fotoEscrita,
  guardarPlata,
  montoEscrito,
  pedirQueMandeFoto,
} from './plata.js'

/** Si nadie responde en este tiempo, la conversación vuelve al inicio sin decir nada */
export const MINUTOS_PARA_OLVIDAR = 30

const PARA_VOLVER = new Set([
  'menu', '0', 'hola', 'ola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches',
  'cancelar', 'inicio', 'volver', 'salir', 'empezar', 'atras',
])
const PARA_AYUDA = new Set(['ayuda', '?', 'ayudame', 'como funciona'])

const normal = (t: string) => sinTildes(t.toLowerCase()).replace(/[^a-z0-9? ]/g, '').replace(/\s+/g, ' ').trim()

export async function atender(deps: Deps, usuario: Usuario, entrada: Entrada): Promise<void> {
  const c = crearCtx(deps, usuario)
  const guardado = await deps.repo.leerEstado(usuario.id)
  let estado: Estado = guardado?.estado ?? { paso: 'menu' }
  if (guardado && c.ahora.getTime() - guardado.actualizadoEn.getTime() > MINUTOS_PARA_OLVIDAR * 60_000) {
    estado = { paso: 'menu' }
  }

  let nuevo: Estado
  try {
    if (!guardado) await c.enviar({ tipo: 'texto', texto: textos.bienvenida(usuario.nombre) })
    nuevo = await despachar(c, estado, entrada)
  } catch (err) {
    console.error(`Error atendiendo a ${usuario.nombre}:`, err)
    nuevo = await mostrarMenu(c, textos.algoFallo).catch(() => ({ paso: 'menu' }) as Estado)
  }
  await deps.repo.guardarEstado(usuario.id, nuevo)
}

function despachar(c: Ctx, estado: Estado, entrada: Entrada): Promise<Estado> {
  switch (entrada.tipo) {
    case 'boton':
      return boton(c, estado, entrada.id)
    case 'texto': {
      const t = normal(entrada.texto)
      if (!t || PARA_VOLVER.has(t)) return mostrarMenu(c)
      if (PARA_AYUDA.has(t)) return mostrarMenu(c, textos.ayuda)
      return texto(c, estado, entrada.texto)
    }
    case 'audio':
      return audio(c, estado, entrada.mediaId)
    case 'imagen':
      return imagen(c, estado, entrada.mediaId, entrada.texto)
    case 'otro':
      return mostrarMenu(c, textos.soloAudiosFotosTexto)
  }
}


/** Después de "Corregir": se abre el camino guiado de lo que estaba mal, con lo que ya se sabe. */
async function empezarCorreccion(c: Ctx, a: Accion, r: Registro): Promise<Estado> {
  switch (a.tipo) {
    case 'dosis':
      return empezarMedicina(c)
    case 'inventario':
      return a.cambio < 0 ? empezarComida(c, false) : elegirEspecie(c, true, a.especie)
    case 'movimiento':
      return empezarPlata(c, a.movimiento.tipo)
    case 'deuda':
      await c.enviar({ tipo: 'texto', texto: textos.facturaCuanto })
      return { paso: 'factura_monto', soporte: r.mediaUrl, clinicaId: null, concepto: a.nota }
    case 'nota':
      return elegirAnimal(c, `a:${a.animalId}`)
    case 'estado_animal':
      return mostrarMenu(c)
  }
}

async function boton(c: Ctx, estado: Estado, id: string): Promise<Estado> {
  if (id === 'menu') return mostrarMenu(c)
  if (id === 'fin') {
    await c.enviar({ tipo: 'texto', texto: textos.despedida(c.usuario.nombre) })
    return { paso: 'menu' }
  }

  const [prefijo] = id.split(':')
  switch (prefijo) {
    case 'm':
      return opcionDelMenu(c, id.slice(2))
    case 'si':
    case 'corregir':
    case 'borrar':
      return responder(c, prefijo as Respuesta, id.slice(prefijo.length + 1), empezarCorreccion)
    case 'd':
      return elegirDosis(c, id)
    case 'dup':
      return responderDuplicada(c, id)
    case 'e': {
      const [, llegada, especie] = id.split(':')
      return especie === 'perro' || especie === 'gato' ? elegirEspecie(c, llegada === '1', especie) : mostrarMenu(c)
    }
    case 'n':
      return elegirCantidad(c, id)
    case 'a':
      return elegirAnimal(c, id)
    case 'nf':
      return facturaSinFoto(c)
    case 'i':
      return enviarInforme(c, id.slice(2))
    case 'sg':
      return anotarSeguimiento(c, id)
  }

  // Botones que dependen del paso en que va la persona
  if (prefijo === 'cat' && estado.paso === 'plata_categoria') return elegirCategoria(c, estado, id)
  if (prefijo === 'pk' && estado.paso === 'plata_clinica') return elegirClinicaPlata(c, estado, id)
  if (prefijo === 'fk' && estado.paso === 'factura_clinica') return elegirClinicaFactura(c, estado, id)
  if (id === 'mf' && estado.paso === 'plata_foto') return pedirQueMandeFoto(c, estado)
  if (id === 'sf' && estado.paso === 'plata_foto') return guardarPlata(c, estado, null)
  return mostrarMenu(c, textos.seMePerdio)
}

/** Lo que acompaña a un audio: lo que la IA sacó y dónde quedó guardado */
interface DelAudio {
  e: Entendido
  mediaUrl: string
}

/** El monto que la IA sacó del audio, o el texto para que se lea de ahí */
function montoDicho(t: string, a?: DelAudio): string {
  const mov = a?.e.acciones.find((x) => x.tipo === 'movimiento' || x.tipo === 'deuda')
  const monto = mov?.tipo === 'movimiento' ? mov.movimiento.monto : mov?.tipo === 'deuda' ? mov.monto : null
  return monto ? String(monto) : t
}

/**
 * Lo escrito o dicho como respuesta a la pregunta del paso en que va la persona.
 * Null si no la responde: entonces se toma como un registro libre.
 */
async function respuestaDelPaso(c: Ctx, estado: Estado, t: string, a?: DelAudio): Promise<Estado | null> {
  switch (estado.paso) {
    case 'menu':
      return null
    case 'confirmar': {
      const r = respuestaAConfirmar(t)
      return r ? responder(c, r, estado.registroId, empezarCorreccion) : null
    }
    case 'medicina':
      return dosisEscrita(c, t)
    case 'medicina_duplicada':
      return duplicadaEscrita(c, t)
    case 'comida_especie': {
      const especie = especieDeTexto(t)
      return especie ? elegirEspecie(c, estado.llegada, especie) : null
    }
    case 'comida_cantidad': {
      // Del audio sirve lo que anotó la IA: "15 kilos de carne" o el número de bultos
      const inv = a?.e.acciones.find((x) => x.tipo === 'inventario')
      const dicho =
        inv?.tipo !== 'inventario' ? t : inv.unidad === 'kg' ? `${Math.abs(inv.cambio)} kilos de ${inv.producto ?? 'carne'}` : String(Math.abs(inv.cambio))
      return cantidadEscrita(c, estado.especie, dicho, estado.unidad)
    }
    case 'plata_monto':
      return montoEscrito(c, estado, montoDicho(t, a))
    case 'plata_categoria':
      return categoriaEscrita(c, estado, t)
    case 'plata_clinica':
      return clinicaPlataEscrita(c, estado, t)
    case 'plata_foto':
      return fotoEscrita(c, estado, t)
    case 'factura_foto':
      return facturaSinFotoEscrita(c, montoDicho(t, a))
    case 'factura_monto':
      return facturaMontoEscrito(c, estado, montoDicho(t, a))
    case 'factura_clinica':
      return clinicaFacturaEscrita(c, estado, t)
    case 'animal':
    case 'animal_nombre':
      return nombreEscrito(c, t)
    case 'animal_nota':
      return a
        ? guardarNota(c, estado.animalId, t, { otras: a.e.acciones, mediaUrl: a.mediaUrl, audio: true })
        : guardarNota(c, estado.animalId, t)
  }
}

async function texto(c: Ctx, estado: Estado, t: string): Promise<Estado> {
  const respuesta = await respuestaDelPaso(c, estado, t)
  if (respuesta) return respuesta
  if (pideSeguimientos(t)) return verSeguimientos(c)
  const informe = informePedido(t)
  return informe ? enviarInforme(c, informe) : libreTexto(c, t)
}

/** El primer mensaje que se mande empieza con "🎧 Escuché: «…»", para que la persona vea qué se entendió */
function conEscuche(c: Ctx, dicho: string): Ctx {
  let primero = true
  return {
    ...c,
    enviar(s) {
      if (!primero || !('texto' in s) || typeof s.texto !== 'string') return c.enviar(s)
      primero = false
      return c.enviar({ ...s, texto: `${textos.escuche(dicho)}\n\n${s.texto}` })
    },
  }
}

/**
 * Un audio es como escribir lo que dice: primero se mira si responde la pregunta del paso.
 * Si no, se usa lo que la IA anotó. En la lista de dosis gana lo de la IA, que ya trae animal, medicina y hora.
 */
async function audio(c: Ctx, estado: Estado, mediaId: string): Promise<Estado> {
  const m = await bajarYGuardar(c, mediaId)
  const e = await entenderSeguro(c, { media: { datos: m.datos, mime: m.mime }, pista: 'libre' })
  if (!e) {
    if (estado.paso === 'menu' || estado.paso === 'confirmar') return mostrarMenu(c, textos.noPudeEscuchar)
    // A mitad de una pregunta no se pierde lo que se llevaba
    await c.enviar({ tipo: 'texto', texto: textos.noPudeEscuchar })
    return estado
  }
  const dicho = e.transcripcion.trim()
  if (PARA_VOLVER.has(normal(dicho))) return mostrarMenu(c)

  // En la lista de dosis lo de la IA es más preciso; en el "¿Está bien?" es algo nuevo para anotar, no la respuesta
  const ganaLaIa = (estado.paso === 'medicina' || estado.paso === 'confirmar') && e.acciones.length > 0
  if (dicho && !ganaLaIa) {
    const respuesta = await respuestaDelPaso(conEscuche(c, dicho), estado, dicho, { e, mediaUrl: m.url })
    if (respuesta) return respuesta
  }
  return registrarEntendido(c, e, { tipoEntrada: 'audio', mediaUrl: m.url })
}

async function imagen(c: Ctx, estado: Estado, mediaId: string, pie?: string): Promise<Estado> {
  if (estado.paso === 'plata_foto') {
    const m = await bajarYGuardar(c, mediaId)
    return guardarPlata(c, estado, m.url)
  }
  if (estado.paso === 'factura_foto') return facturaConFoto(c, await bajarYGuardar(c, mediaId), pie)
  return libreMedia(c, mediaId, 'imagen', pie)
}

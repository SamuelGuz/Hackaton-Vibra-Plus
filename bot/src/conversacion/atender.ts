// Punto de entrada de la conversación: decide qué hacer con cada mensaje según el paso en que va la persona.
//
// Casi todos los botones llevan en su id lo que necesitan (d:<tratamiento>:<hora>, si:<registro>…),
// así un botón viejo del chat sigue sirviendo. El paso guardado solo importa para lo que se escribe,
// se dice en audio o se manda en foto.

import { textos } from '../textos.js'
import type { Accion, Deps, Entrada, Estado, Registro, Usuario } from '../tipos.js'
import { elegirAnimal, empezarAnimal, guardarNota, nombreEscrito } from './animal.js'
import { cantidadEscrita, elegirCantidad, elegirEspecie, empezarComida, especieDeTexto } from './comida.js'
import { responder, type Respuesta } from './confirmar.js'
import { crearCtx, type Ctx } from './ctx.js'
import { libreMedia, libreTexto, registrarEntendido } from './libre.js'
import { elegirDosis, empezarMedicina, responderDuplicada } from './medicina.js'
import { bajarYGuardar, entenderSeguro } from './medios.js'
import { abrirPanel, mostrarMenu } from './menu.js'
import { parsearMonto, sinTildes } from './numeros.js'
import {
  elegirCategoria,
  elegirClinicaFactura,
  elegirClinicaPlata,
  empezarFactura,
  empezarPlata,
  facturaConFoto,
  facturaMontoEscrito,
  facturaSinFoto,
  guardarPlata,
  montoEscrito,
  pedirQueMandeFoto,
} from './plata.js'
import { verHoy } from './resumen.js'

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

function opcionDelMenu(c: Ctx, opcion: string): Promise<Estado> {
  switch (opcion) {
    case 'med':
      return empezarMedicina(c)
    case 'bulto':
      return empezarComida(c, false)
    case 'llego':
      return empezarComida(c, true)
    case 'entro':
      return empezarPlata(c, 'ingreso')
    case 'salio':
      return empezarPlata(c, 'gasto')
    case 'factura':
      return empezarFactura(c)
    case 'animal':
      return empezarAnimal(c)
    case 'hoy':
      return verHoy(c)
    case 'panel':
      return abrirPanel(c)
    default:
      return mostrarMenu(c)
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
  }

  // Botones que dependen del paso en que va la persona
  if (prefijo === 'cat' && estado.paso === 'plata_categoria') return elegirCategoria(c, estado, id)
  if (prefijo === 'pk' && estado.paso === 'plata_clinica') return elegirClinicaPlata(c, estado, id)
  if (prefijo === 'fk' && estado.paso === 'factura_clinica') return elegirClinicaFactura(c, estado, id)
  if (id === 'mf' && estado.paso === 'plata_foto') return pedirQueMandeFoto(c, estado)
  if (id === 'sf' && estado.paso === 'plata_foto') return guardarPlata(c, estado, null)
  return mostrarMenu(c, textos.seMePerdio)
}

function texto(c: Ctx, estado: Estado, t: string): Promise<Estado> {
  switch (estado.paso) {
    case 'comida_especie': {
      const especie = especieDeTexto(t)
      return especie ? elegirEspecie(c, estado.llegada, especie) : libreTexto(c, t)
    }
    case 'comida_cantidad':
      return cantidadEscrita(c, estado.especie, t)
    case 'plata_monto':
      return montoEscrito(c, estado, t)
    case 'factura_monto':
      return facturaMontoEscrito(c, estado, t)
    case 'animal':
    case 'animal_nombre':
      return nombreEscrito(c, t)
    case 'animal_nota':
      return guardarNota(c, estado.animalId, t)
    case 'plata_foto':
      return /\b(no|sin)\b/i.test(t) ? guardarPlata(c, estado, null) : libreTexto(c, t)
    default:
      return libreTexto(c, t)
  }
}

/** En los pasos que esperan un número o una nota, el audio responde esa pregunta. Si no, es un registro libre. */
async function audio(c: Ctx, estado: Estado, mediaId: string): Promise<Estado> {
  const m = await bajarYGuardar(c, mediaId)
  const e = await entenderSeguro(c, { media: { datos: m.datos, mime: m.mime }, pista: 'libre' })
  const dicho = e?.transcripcion?.trim() ?? ''

  switch (estado.paso) {
    case 'comida_cantidad': {
      const inv = e?.acciones.find((a) => a.tipo === 'inventario')
      return cantidadEscrita(c, estado.especie, inv?.tipo === 'inventario' ? String(Math.abs(inv.cambio)) : dicho)
    }
    case 'plata_monto':
    case 'factura_monto': {
      const mov = e?.acciones.find((a) => a.tipo === 'movimiento' || a.tipo === 'deuda')
      const monto = mov?.tipo === 'movimiento' ? mov.movimiento.monto : mov?.tipo === 'deuda' ? mov.monto : parsearMonto(dicho)
      const valor = monto ? String(monto) : dicho
      return estado.paso === 'plata_monto' ? montoEscrito(c, estado, valor) : facturaMontoEscrito(c, estado, valor)
    }
    case 'animal_nota':
      if (!dicho) return mostrarMenu(c, textos.noEntendi)
      return guardarNota(c, estado.animalId, dicho, { otras: e?.acciones, mediaUrl: m.url, audio: true })
    default:
      return registrarEntendido(c, e, { tipoEntrada: 'audio', mediaUrl: m.url })
  }
}

async function imagen(c: Ctx, estado: Estado, mediaId: string, pie?: string): Promise<Estado> {
  if (estado.paso === 'plata_foto') {
    const m = await bajarYGuardar(c, mediaId)
    return guardarPlata(c, estado, m.url)
  }
  if (estado.paso === 'factura_foto') return facturaConFoto(c, await bajarYGuardar(c, mediaId), pie)
  return libreMedia(c, mediaId, 'imagen', pie)
}

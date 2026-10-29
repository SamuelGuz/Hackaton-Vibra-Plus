// Guardar lo entendido como "por confirmar", preguntar "¿Está bien?" y atender Sí / Corregir / Borrar.
import { diasHablados } from '../formato.js'
import { textos, botones } from '../textos.js'
import type { Accion, Estado, NuevoRegistro, Registro } from '../tipos.js'
import { diasDeComida, nivelClinica, nivelComida, plataEnCaja } from '../datos/calculos.js'
import { puedeVerPlata, type Ctx } from './ctx.js'
import { describir, resumenCorto } from './describir.js'

export interface PorGuardar {
  acciones: Accion[]
  tipoEntrada: NuevoRegistro['tipoEntrada']
  mediaUrl?: string | null
  /** Lo que se escuchó o leyó. Si no hay, se guarda el resumen de las acciones. */
  transcripcion?: string
  confianza?: number | null
  /** Se muestra "Escuché: «…»" para que la persona verifique */
  mostrarEscuche?: boolean
  /** Avisos que van arriba, p. ej. una dosis que no se repitió */
  avisos?: string[]
}

/** Guarda de una vez (por confirmar) y pregunta "¿Está bien?". Se responde tocando, escribiendo o en audio. */
export async function guardarYPreguntar(c: Ctx, g: PorGuardar): Promise<Estado> {
  const d = await c.datos()
  const id = await c.deps.repo.crearRegistro({
    usuarioId: c.usuario.id,
    canal: 'whatsapp',
    tipoEntrada: g.tipoEntrada,
    mediaUrl: g.mediaUrl ?? null,
    transcripcion: g.transcripcion?.trim() || resumenCorto(g.acciones, d),
    acciones: g.acciones,
    confianza: g.confianza ?? null,
    estado: 'por_confirmar',
  })

  const partes: string[] = []
  if (g.avisos?.length) partes.push(g.avisos.join('\n'))
  if (g.mostrarEscuche && g.transcripcion) partes.push(textos.escuche(g.transcripcion))
  const lineas = g.acciones.map((a, i) => (g.acciones.length > 1 ? `${i + 1}. ${describir(a, d)}` : describir(a, d)))
  partes.push(`${textos.entendi}\n\n${lineas.join('\n')}`)
  partes.push(textos.estaBien)

  await c.enviar({
    tipo: 'botones',
    texto: partes.join('\n\n'),
    botones: [botones.si(id), botones.corregir(id), botones.borrar(id)],
  })
  // Los botones llevan el id, así que siguen sirviendo después; el paso es para responder escribiendo o en audio
  return { paso: 'confirmar', registroId: String(id) }
}

export async function preguntarAlgoMas(c: Ctx, texto: string): Promise<Estado> {
  await c.enviar({ tipo: 'botones', texto: `${texto}\n\n${textos.algoMas}`, botones: [botones.menu, botones.fin] })
  return { paso: 'menu' }
}

/** Frases de "cómo quedó" después de confirmar: días de comida, caja, deuda. */
async function comoQuedo(c: Ctx, acciones: Accion[]): Promise<string[]> {
  const d = await c.datos(true)
  const frases: string[] = []
  const especies = new Set(acciones.flatMap((a) => (a.tipo === 'inventario' ? [a.especie] : [])))
  for (const especie of especies) {
    const dias = diasDeComida(d, especie)
    if (Number.isFinite(dias)) frases.push(textos.quedanDias(especie, diasHablados(dias), nivelComida(d, dias) === 'urgente'))
  }
  if (puedeVerPlata(c) && acciones.some((a) => a.tipo === 'movimiento')) frases.push(textos.enCaja(plataEnCaja(d)))
  const clinicas = new Set(
    acciones.flatMap((a) =>
      a.tipo === 'deuda' ? [a.clinicaId] : a.tipo === 'movimiento' && a.movimiento.abonoDeuda ? [a.movimiento.clinicaId!] : [],
    ),
  )
  for (const id of clinicas) {
    const k = d.clinicas.find((x) => x.id === id)
    if (k && k.limite > 0 && (puedeVerPlata(c) || nivelClinica(k) === 'urgente')) {
      frases.push(textos.deudaClinica(k.nombre, k.deuda, Math.round((k.deuda / k.limite) * 100)))
    }
  }
  return frases
}

export type Respuesta = 'si' | 'corregir' | 'borrar'

/** Atiende los botones Sí / Corregir / Borrar. `empezarCorreccion` abre el flujo guiado de la acción. */
export async function responder(
  c: Ctx,
  respuesta: Respuesta,
  registroId: string,
  empezarCorreccion: (c: Ctx, a: Accion, r: Registro) => Promise<Estado>,
): Promise<Estado> {
  const r = await c.deps.repo.leerRegistro(registroId)
  if (!r) return preguntarAlgoMas(c, textos.seMePerdio)
  if (r.usuarioId !== c.usuario.id) return preguntarAlgoMas(c, textos.noEsTuyo)
  if (r.estado === 'anulado' || r.estado === 'corregido') return preguntarAlgoMas(c, textos.yaBorrado)
  if (r.estado === 'confirmado' && respuesta === 'si') return preguntarAlgoMas(c, textos.yaGuardado)

  if (respuesta === 'si') {
    await c.deps.repo.cambiarEstado([r.id], 'confirmado')
    const frases = await comoQuedo(c, r.acciones)
    return preguntarAlgoMas(c, [textos.listo, ...frases].join('\n\n'))
  }
  if (respuesta === 'borrar') {
    await c.deps.repo.cambiarEstado([r.id], 'anulado')
    return preguntarAlgoMas(c, textos.borrado)
  }
  await c.deps.repo.cambiarEstado([r.id], 'corregido')
  const aviso = r.acciones.length > 1 ? `${textos.corregir}\n${textos.corregirVarios}` : textos.corregir
  await c.enviar({ tipo: 'texto', texto: aviso })
  // Lo anulado vuelve a estar pendiente (p. ej. la dosis vuelve a la lista)
  await c.datos(true)
  return empezarCorreccion(c, r.acciones[0], r)
}

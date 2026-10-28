// "Entró plata", "Salió plata" y "Factura de clínica": una pregunta por mensaje.
import { pesos } from '../formato.js'
import type { CategoriaGasto, CategoriaIngreso, DatosAlbergue } from '../panel-tipos.js'
import { botones, CATEGORIAS, textos } from '../textos.js'
import type { Accion, Estado, Fila, TipoPlata } from '../tipos.js'
import { puedeManejarPlata, puedeVerPlata, type Ctx } from './ctx.js'
import { guardarYPreguntar, preguntarAlgoMas } from './confirmar.js'
import { entenderSeguro } from './medios.js'
import { parsearMonto } from './numeros.js'

type PasoPlata<P extends Estado['paso']> = Extract<Estado, { paso: P }>

/** "Clínica Veterinaria San Roque" → "San Roque", para que quepa en la lista */
export function nombreCorto(nombre: string): string {
  return nombre.replace(/^cl[ií]nica\s+(veterinaria\s+)?/i, '') || nombre
}

function filasClinicas(c: Ctx, d: DatosAlbergue, prefijo: string): Fila[] {
  return d.clinicas.map((k) => ({
    id: `${prefijo}:${k.id}`,
    titulo: nombreCorto(k.nombre),
    descripcion: puedeVerPlata(c) ? `Le debemos ${pesos(k.deuda)}` : k.nombre,
  }))
}

// ---------- Entró / salió plata ----------

export async function empezarPlata(c: Ctx, tipo: TipoPlata): Promise<Estado> {
  if (!puedeManejarPlata(c)) return preguntarAlgoMas(c, textos.noPuedePlata)
  await c.enviar({ tipo: 'texto', texto: textos.plataMonto(tipo) })
  return { paso: 'plata_monto', tipo }
}

export async function montoEscrito(c: Ctx, e: PasoPlata<'plata_monto'>, texto: string): Promise<Estado> {
  const monto = parsearMonto(texto)
  if (!monto) {
    await c.enviar({ tipo: 'texto', texto: textos.plataNoEntendi })
    return e
  }
  const filas = CATEGORIAS[e.tipo]
  await c.enviar({ tipo: 'lista', texto: textos.plataCategoria(e.tipo, monto), boton: textos.plataCategoriaBoton, filas })
  return { paso: 'plata_categoria', tipo: e.tipo, monto }
}

/** Botón 'cat:<categoria>' */
export async function elegirCategoria(c: Ctx, e: PasoPlata<'plata_categoria'>, id: string): Promise<Estado> {
  const categoria = id.slice('cat:'.length)
  const abono = categoria === 'abono'
  if (abono || categoria === 'veterinaria') {
    const d = await c.datos()
    const filas = filasClinicas(c, d, 'pk')
    if (!abono) filas.push({ id: 'pk:ninguna', titulo: 'Otra o ninguna' })
    await c.enviar({ tipo: 'lista', texto: textos.plataClinica, boton: textos.plataCategoriaBoton, filas })
    return { paso: 'plata_clinica', tipo: e.tipo, monto: e.monto, categoria: abono ? 'veterinaria' : categoria, abono }
  }
  return pedirFoto(c, { tipo: e.tipo, monto: e.monto, categoria, abono: false, clinicaId: null })
}

/** Botón 'pk:<clinica|ninguna>' */
export async function elegirClinicaPlata(c: Ctx, e: PasoPlata<'plata_clinica'>, id: string): Promise<Estado> {
  const clinicaId = id === 'pk:ninguna' ? null : id.slice('pk:'.length)
  if (e.abono && !clinicaId) return preguntarAlgoMas(c, textos.seMePerdio)
  return pedirFoto(c, { tipo: e.tipo, monto: e.monto, categoria: e.categoria, abono: e.abono, clinicaId })
}

async function pedirFoto(c: Ctx, datos: Omit<PasoPlata<'plata_foto'>, 'paso'>): Promise<Estado> {
  await c.enviar({
    tipo: 'botones',
    texto: textos.plataFoto,
    botones: [
      { id: 'mf', titulo: '📷 Mandar foto' },
      { id: 'sf', titulo: 'Sin foto' },
    ],
  })
  return { paso: 'plata_foto', ...datos }
}

export async function pedirQueMandeFoto(c: Ctx, e: PasoPlata<'plata_foto'>): Promise<Estado> {
  await c.enviar({ tipo: 'texto', texto: textos.plataMandaFoto })
  return e
}

export function guardarPlata(c: Ctx, e: PasoPlata<'plata_foto'>, foto: string | null): Promise<Estado> {
  const tipo = e.abono ? 'gasto' : e.tipo
  const accion: Accion = {
    tipo: 'movimiento',
    movimiento: {
      tipo,
      monto: e.monto,
      categoria: e.categoria as CategoriaGasto | CategoriaIngreso,
      clinicaId: e.clinicaId,
      abonoDeuda: e.abono,
      foto,
      nota: '',
    },
  }
  return guardarYPreguntar(c, { acciones: [accion], tipoEntrada: foto ? 'imagen' : 'boton', mediaUrl: foto })
}

// ---------- Factura de clínica ----------

export async function empezarFactura(c: Ctx): Promise<Estado> {
  await c.enviar({
    tipo: 'botones',
    texto: textos.facturaFoto,
    botones: [{ id: 'nf', titulo: 'No tengo foto' }, botones.volver],
  })
  return { paso: 'factura_foto' }
}

export async function facturaSinFoto(c: Ctx): Promise<Estado> {
  await c.enviar({ tipo: 'texto', texto: textos.facturaCuanto })
  return { paso: 'factura_monto', soporte: null, clinicaId: null, concepto: '' }
}

/** Llegó la foto de la factura: la IA lee monto y clínica; lo que falte se pregunta. */
export async function facturaConFoto(c: Ctx, foto: { datos: Buffer; mime: string; url: string }, texto?: string): Promise<Estado> {
  const e = await entenderSeguro(c, { media: { datos: foto.datos, mime: foto.mime }, texto, pista: 'factura' })
  const leida = e?.factura ?? { monto: null, clinicaId: null, concepto: '' }
  return seguirFactura(c, { soporte: foto.url, monto: leida.monto, clinicaId: leida.clinicaId, concepto: leida.concepto, transcripcion: e?.transcripcion })
}

export async function facturaMontoEscrito(c: Ctx, e: PasoPlata<'factura_monto'>, texto: string): Promise<Estado> {
  const monto = parsearMonto(texto)
  if (!monto) {
    await c.enviar({ tipo: 'texto', texto: textos.plataNoEntendi })
    return e
  }
  return seguirFactura(c, { soporte: e.soporte, monto, clinicaId: e.clinicaId, concepto: e.concepto })
}

/** Botón 'fk:<clinica>' */
export function elegirClinicaFactura(c: Ctx, e: PasoPlata<'factura_clinica'>, id: string): Promise<Estado> {
  return seguirFactura(c, { soporte: e.soporte, monto: e.monto, clinicaId: id.slice('fk:'.length), concepto: e.concepto })
}

interface FacturaParcial {
  soporte: string | null
  monto: number | null
  clinicaId: string | null
  concepto: string
  transcripcion?: string
}

async function seguirFactura(c: Ctx, f: FacturaParcial): Promise<Estado> {
  if (!f.monto) {
    await c.enviar({ tipo: 'texto', texto: textos.facturaMonto })
    return { paso: 'factura_monto', soporte: f.soporte, clinicaId: f.clinicaId, concepto: f.concepto }
  }
  const d = await c.datos()
  if (!f.clinicaId || !d.clinicas.some((k) => k.id === f.clinicaId)) {
    await c.enviar({ tipo: 'lista', texto: textos.facturaClinica, boton: textos.plataCategoriaBoton, filas: filasClinicas(c, d, 'fk') })
    return { paso: 'factura_clinica', soporte: f.soporte, monto: f.monto, concepto: f.concepto }
  }
  return guardarYPreguntar(c, {
    acciones: [{ tipo: 'deuda', clinicaId: f.clinicaId, monto: f.monto, nota: f.concepto }],
    tipoEntrada: f.soporte ? 'imagen' : 'boton',
    mediaUrl: f.soporte,
    transcripcion: f.transcripcion,
  })
}

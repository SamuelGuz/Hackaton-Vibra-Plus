// Almacén de medicinas en un libro de Excel (.xlsx) local: la "base de datos interna" que la dueña puede abrir y editar.
// Mañana puede ser Google Sheets: se reemplaza SOLO este archivo por otro AlmacenMedicinas con el mismo leer/guardar,
// manteniendo los nombres de hojas y encabezados (ver docs/operacion/medicinas-excel.md).
//
// - El libro guarda solo datos de origen (nada calculado): stock, vencimientos y alertas los calcula el servicio.
// - leer() tolera ediciones a mano (espacios, filas vacías, "si"/"SÍ", números como texto, fechas reales de Excel,
//   columnas en otro orden o ausentes si son opcionales) pero NUNCA descarta una fila: si algo no se entiende, falla
//   con un mensaje que dice hoja, fila y columna.
// - guardar() escribe a un archivo temporal en la misma carpeta y lo renombra: un corte no daña el archivo original.

import ExcelJS from 'exceljs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { aFechaISO, esFechaISO } from './fechas.js'
import { normalizar } from './texto.js'
import type {
  AlmacenMedicinas,
  CategoriaMedicamento,
  Contacto,
  DatosMedicinas,
  LoteMedicamento,
  Medicamento,
  TipoContacto,
  UnidadMedicamento,
} from './tipos.js'

// ---------------------------------------------------------------------------
// Forma del libro
// ---------------------------------------------------------------------------

export const HOJA_LEEME = 'LEEME'
export const HOJA_MEDICAMENTOS = 'Medicamentos'
export const HOJA_LOTES = 'Lotes'
export const HOJA_CONTACTOS = 'Contactos'

const SEPARADOR = ' | '

const CATEGORIAS: Record<CategoriaMedicamento, string> = {
  antibiotico: 'Antibiótico',
  antiparasitario: 'Antiparasitario',
  analgesico: 'Analgésico',
  antiinflamatorio: 'Antiinflamatorio',
  anticonvulsivante: 'Anticonvulsivante',
  vitamina: 'Vitamina',
  dermatologico: 'Dermatológico',
  oftalmico: 'Oftálmico',
  vacuna: 'Vacuna',
  suero: 'Suero',
  otro: 'Otro',
}
const UNIDADES: UnidadMedicamento[] = ['tableta', 'ml', 'frasco', 'ampolla', 'sobre', 'tubo', 'dosis']
const TIPOS: Record<TipoContacto, string> = {
  proveedor: 'Proveedor',
  clinica: 'Clínica',
  padrino: 'Padrino',
  donante: 'Donante',
  adoptante: 'Adoptante',
  voluntario: 'Voluntario',
}
const ESPECIES = { perro: 'Perro', gato: 'Gato' } as const

type Formato = 'texto' | 'entero' | 'numero' | 'fecha' | 'lista' | 'sino'

interface Columna {
  clave: string
  encabezado: string
  ancho: number
  formato: Formato
  requerida?: boolean
  /** Valores de la lista desplegable */
  lista?: string[]
  ayuda: string
}

const COLUMNAS_MEDICAMENTOS: Columna[] = [
  { clave: 'id', encabezado: 'ID', ancho: 18, formato: 'texto', ayuda: 'Código único del medicamento (sin espacios). Si lo deja vacío se crea uno a partir del nombre.' },
  { clave: 'nombre', encabezado: 'Nombre', ancho: 30, formato: 'texto', requerida: true, ayuda: 'Nombre del medicamento como lo dice el equipo.' },
  { clave: 'alias', encabezado: 'Alias', ancho: 26, formato: 'texto', ayuda: 'Otros nombres (comerciales o cortos), separados por " | ". Ej.: Amoxi | Clamoxyl.' },
  { clave: 'principioActivo', encabezado: 'Principio activo', ancho: 26, formato: 'texto', ayuda: 'Sustancia que hace el efecto.' },
  { clave: 'categoria', encabezado: 'Categoría', ancho: 20, formato: 'lista', requerida: true, lista: Object.values(CATEGORIAS), ayuda: 'Elija de la lista.' },
  { clave: 'presentacion', encabezado: 'Presentación', ancho: 34, formato: 'texto', ayuda: 'Cómo viene. Si el envase es frasco/ampolla/tubo escriba su volumen ("Frasco 60 ml"): sirve para calcular cuántos días alcanza.' },
  { clave: 'unidad', encabezado: 'Unidad', ancho: 12, formato: 'lista', requerida: true, lista: UNIDADES, ayuda: 'Lo que se cuenta en Cantidad de los lotes (tableta, ml, frasco…).' },
  { clave: 'especies', encabezado: 'Especies', ancho: 16, formato: 'texto', ayuda: 'Perro, Gato o ambos separados por " | ".' },
  { clave: 'usoComun', encabezado: 'Uso común', ancho: 36, formato: 'texto', ayuda: 'Para qué se usa, con palabras sencillas ("dolor", "infecciones de piel"): ayuda a encontrarlo.' },
  { clave: 'dosisReferencia', encabezado: 'Dosis de referencia', ancho: 28, formato: 'texto', ayuda: 'Dosis habitual orientativa. La indica siempre el veterinario.' },
  { clave: 'contraindicaciones', encabezado: 'Contraindicaciones', ancho: 32, formato: 'texto', ayuda: 'Cuándo NO usarlo.' },
  { clave: 'requiereFormula', encabezado: 'Requiere fórmula', ancho: 14, formato: 'sino', ayuda: 'Sí o No: si se compra solo con fórmula veterinaria.' },
  { clave: 'stockMinimo', encabezado: 'Stock mínimo', ancho: 12, formato: 'numero', ayuda: 'Por debajo de esta cantidad (en la Unidad) se avisa que toca comprar.' },
  { clave: 'proveedorId', encabezado: 'ID proveedor', ancho: 16, formato: 'texto', ayuda: 'ID (o nombre) de un contacto de tipo Proveedor o Clínica de la hoja Contactos.' },
  { clave: 'precioUnitarioCOP', encabezado: 'Precio unitario (COP)', ancho: 18, formato: 'numero', ayuda: 'Pesos colombianos por Unidad, sin símbolos.' },
]

const COLUMNAS_LOTES: Columna[] = [
  { clave: 'id', encabezado: 'ID', ancho: 14, formato: 'texto', ayuda: 'Código único del lote. Si lo deja vacío se crea uno.' },
  { clave: 'medicamentoId', encabezado: 'ID medicamento', ancho: 22, formato: 'texto', requerida: true, ayuda: 'ID (o el nombre exacto) de un medicamento de la hoja Medicamentos.' },
  { clave: 'numeroLote', encabezado: 'Número de lote', ancho: 18, formato: 'texto', ayuda: 'Número impreso en el empaque.' },
  { clave: 'vence', encabezado: 'Vence', ancho: 14, formato: 'fecha', requerida: true, ayuda: 'Último día de uso, YYYY-MM-DD (también se entiende DD/MM/AAAA).' },
  { clave: 'cantidad', encabezado: 'Cantidad', ancho: 12, formato: 'numero', requerida: true, ayuda: 'Cuántas unidades quedan de este lote (en la Unidad del medicamento).' },
  { clave: 'ingreso', encabezado: 'Ingreso', ancho: 14, formato: 'fecha', ayuda: 'Día en que llegó, YYYY-MM-DD. Opcional.' },
]

const COLUMNAS_CONTACTOS: Columna[] = [
  { clave: 'id', encabezado: 'ID', ancho: 14, formato: 'texto', ayuda: 'Código único del contacto. Si lo deja vacío se crea uno.' },
  { clave: 'tipo', encabezado: 'Tipo', ancho: 14, formato: 'lista', requerida: true, lista: Object.values(TIPOS), ayuda: 'Elija de la lista.' },
  { clave: 'nombre', encabezado: 'Nombre', ancho: 32, formato: 'texto', requerida: true, ayuda: 'Nombre de la persona, clínica o empresa.' },
  { clave: 'telefono', encabezado: 'Teléfono', ancho: 16, formato: 'texto', ayuda: 'Con indicativo, sin espacios ni signos: 573001234567.' },
  { clave: 'correo', encabezado: 'Correo', ancho: 30, formato: 'texto', ayuda: 'Correo electrónico.' },
  { clave: 'ciudad', encabezado: 'Ciudad', ancho: 16, formato: 'texto', ayuda: 'Ciudad.' },
  { clave: 'nota', encabezado: 'Nota', ancho: 40, formato: 'texto', ayuda: 'Lo que convenga recordar.' },
  { clave: 'activo', encabezado: 'Activo', ancho: 10, formato: 'sino', ayuda: 'Sí o No: No para quien ya no hay que contactar (no se borra).' },
]

const HOJAS = [
  { nombre: HOJA_MEDICAMENTOS, columnas: COLUMNAS_MEDICAMENTOS, descripcion: 'Catálogo: una fila por medicamento.' },
  { nombre: HOJA_LOTES, columnas: COLUMNAS_LOTES, descripcion: 'Existencias: una fila por lote que entró. El stock es la suma de los lotes que no han vencido.' },
  { nombre: HOJA_CONTACTOS, columnas: COLUMNAS_CONTACTOS, descripcion: 'Proveedores, clínicas, padrinos, donantes, adoptantes y voluntarios.' },
]

// ---------------------------------------------------------------------------
// Errores
// ---------------------------------------------------------------------------

/** El libro tiene datos que no se pueden entender; `errores` trae uno por línea, con hoja y fila. */
export class ErrorExcelMedicinas extends Error {
  constructor(readonly errores: string[]) {
    super(errores.join('\n'))
    this.name = 'ErrorExcelMedicinas'
  }
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

const FILAS_CON_LISTA = 500

const sinVacio = (v: string | number | null) => (v === '' ? null : v)

function construirLibro(datos: DatosMedicinas): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Huellitas'
  wb.created = new Date(0)

  const leeme = wb.addWorksheet(HOJA_LEEME)
  leeme.getColumn(1).width = 28
  leeme.getColumn(2).width = 110
  const linea = (a: string, b = '') => leeme.addRow([a, b])
  linea('Inventario de medicinas de Huellitas').getCell(1).font = { bold: true, size: 14 }
  linea('Este libro es la base de datos de medicinas. Puede abrirlo y editarlo en Excel; el bot lo lee cada vez que cambia.')
  linea('Ciérrelo antes de que el bot necesite guardar cambios: si está abierto en Excel, Windows no deja reemplazarlo.')
  linea('')
  linea('Reglas para escribir').getCell(1).font = { bold: true }
  linea('Fechas', 'YYYY-MM-DD (2027-03-15). También se entiende 15/03/2027.')
  linea('Sí / No', 'En las columnas Sí/No escriba Sí o No (se entiende también si, SI, no).')
  linea('Listas', `Varios valores en una celda se separan con "${SEPARADOR.trim()}" (con espacios): Perro | Gato.`)
  linea('Filas', 'No borre los encabezados de la fila 1. Puede agregar filas al final y dejar celdas opcionales vacías.')
  linea('Stock', 'No escriba el stock: se calcula sumando los lotes que no han vencido.')
  linea('')
  for (const hoja of HOJAS) {
    linea(`Hoja ${hoja.nombre}`, hoja.descripcion).getCell(1).font = { bold: true }
    for (const c of hoja.columnas) linea(`  ${c.encabezado}${c.requerida ? ' *' : ''}`, c.ayuda)
  }
  linea('')
  linea('* = obligatoria')

  const filasMedicamentos = datos.medicamentos.map((m) => [
    m.id,
    m.nombre,
    m.alias.join(SEPARADOR),
    m.principioActivo,
    CATEGORIAS[m.categoria] ?? m.categoria,
    m.presentacion,
    m.unidad,
    m.especies.map((e) => ESPECIES[e]).join(SEPARADOR),
    m.usoComun,
    m.dosisReferencia,
    m.contraindicaciones,
    m.requiereFormula ? 'Sí' : 'No',
    m.stockMinimo,
    m.proveedorId ?? '',
    m.precioUnitarioCOP,
  ])
  const filasLotes = datos.lotes.map((l) => [l.id, l.medicamentoId, l.numeroLote, l.vence, l.cantidad, l.ingreso])
  const filasContactos = datos.contactos.map((c) => [c.id, TIPOS[c.tipo] ?? c.tipo, c.nombre, c.telefono, c.correo, c.ciudad, c.nota, c.activo ? 'Sí' : 'No'])

  const filas = [filasMedicamentos, filasLotes, filasContactos]
  HOJAS.forEach((hoja, i) => {
    const ws = wb.addWorksheet(hoja.nombre)
    ws.columns = hoja.columnas.map((c) => ({ header: c.encabezado, width: c.ancho }))
    const encabezado = ws.getRow(1)
    encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    encabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F6F4E' } }
    encabezado.alignment = { vertical: 'middle', wrapText: true }
    encabezado.height = 30
    ws.views = [{ state: 'frozen', ySplit: 1 }]
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: hoja.columnas.length } }

    for (const fila of filas[i]) {
      const r = ws.addRow(fila.map((v) => sinVacio(v as string | number | null)))
      hoja.columnas.forEach((c, j) => {
        // texto y fechas como texto: Excel no les cambia el formato (ceros iniciales, fechas)
        if (c.formato === 'texto' || c.formato === 'fecha') r.getCell(j + 1).numFmt = '@'
      })
    }
    const ultima = Math.max(FILAS_CON_LISTA, filas[i].length + 200)
    hoja.columnas.forEach((c, j) => {
      const opciones = c.formato === 'sino' ? ['Sí', 'No'] : c.lista
      if (!opciones) return
      for (let f = 2; f <= ultima; f++) {
        ws.getCell(f, j + 1).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${opciones.join(',')}"`],
          showErrorMessage: true,
          errorStyle: 'warning',
          errorTitle: c.encabezado,
          error: `Se espera: ${opciones.join(', ')}`,
        }
      }
    })
  })
  return wb
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

type Plano = string | number | boolean | Date

/** Valor "plano" de una celda: texto enriquecido, fórmulas y enlaces quedan en su texto o resultado */
function valorPlano(v: ExcelJS.CellValue): Plano {
  if (v === null || v === undefined) return ''
  if (v instanceof Date || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((t) => t.text).join('')
    if ('formula' in v || 'sharedFormula' in v) return valorPlano((v as { result?: ExcelJS.CellValue }).result ?? null)
    if ('text' in v) return String(v.text)
    if ('error' in v) throw new Error(`la celda tiene un error de Excel (${v.error})`)
  }
  return String(v)
}

const comoTexto = (v: Plano): string =>
  v instanceof Date ? aFechaISO(v.getTime()) : typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v).replace(/ /g, ' ').trim()

interface FilaLeida {
  fila: number
  valor: (clave: string) => Plano
  /** ¿la columna existe en el libro? */
  tiene: (clave: string) => boolean
}

function buscarHoja(wb: ExcelJS.Workbook, nombre: string): ExcelJS.Worksheet | undefined {
  const buscado = normalizar(nombre)
  return wb.worksheets.find((w) => normalizar(w.name) === buscado)
}

function leerFilas(wb: ExcelJS.Workbook, nombreHoja: string, columnas: Columna[], errores: string[]): FilaLeida[] {
  const ws = buscarHoja(wb, nombreHoja)
  if (!ws) {
    errores.push(`Falta la hoja ${nombreHoja} en el libro`)
    return []
  }
  const posicion = new Map<string, number>()
  ws.getRow(1).eachCell({ includeEmpty: false }, (celda, n) => {
    let texto = ''
    try {
      texto = normalizar(comoTexto(valorPlano(celda.value)))
    } catch {
      return
    }
    const col = columnas.find((c) => normalizar(c.encabezado) === texto || normalizar(c.clave) === texto)
    if (col && !posicion.has(col.clave)) posicion.set(col.clave, n)
  })
  for (const c of columnas) {
    if (c.requerida && !posicion.has(c.clave)) errores.push(`Hoja ${nombreHoja}: falta la columna '${c.encabezado}' en la fila 1`)
  }
  if (columnas.some((c) => c.requerida && !posicion.has(c.clave))) return []

  const filas: FilaLeida[] = []
  for (let n = 2; n <= ws.rowCount; n++) {
    const row = ws.getRow(n)
    const celdas = new Map<string, Plano>()
    let vacia = true
    for (const [clave, col] of posicion) {
      let v: Plano
      try {
        v = valorPlano(row.getCell(col).value)
      } catch (e) {
        const c = columnas.find((x) => x.clave === clave)!
        errores.push(`Hoja ${nombreHoja}, fila ${n}: '${c.encabezado.toLowerCase()}' ${(e as Error).message}`)
        v = ''
        vacia = false
      }
      if (comoTexto(v) !== '') vacia = false
      celdas.set(clave, v)
    }
    if (vacia) continue
    filas.push({ fila: n, valor: (clave) => celdas.get(clave) ?? '', tiene: (clave) => posicion.has(clave) })
  }
  return filas
}

/** Lector de celdas de una fila que acumula errores con hoja, fila y columna */
function lector(hoja: string, f: FilaLeida, columnas: Columna[], errores: string[]) {
  const nombre = (clave: string) => columnas.find((c) => c.clave === clave)!.encabezado.toLowerCase()
  const falla = (clave: string, mensaje: string) => errores.push(`Hoja ${hoja}, fila ${f.fila}: '${nombre(clave)}' ${mensaje}`)
  return {
    falla,
    texto(clave: string, obligatoria = false): string {
      const t = comoTexto(f.valor(clave))
      if (obligatoria && t === '') falla(clave, 'está vacío')
      return t
    },
    numero(clave: string, porDefecto = 0): number {
      const v = f.valor(clave)
      if (typeof v === 'number') return comprobarNumero(clave, v)
      const t = comoTexto(v)
      if (t === '') return f.tiene(clave) ? obligatoriaVacia(clave, porDefecto) : porDefecto
      const n = parsearNumero(t)
      if (n === null) {
        falla(clave, `no es un número (${t})`)
        return porDefecto
      }
      return comprobarNumero(clave, n)
    },
    fecha(clave: string, obligatoria: boolean): string {
      const v = f.valor(clave)
      const t = v instanceof Date ? aFechaISO(v.getTime()) : comoTexto(v)
      if (t === '') {
        if (obligatoria) falla(clave, 'está vacío')
        return ''
      }
      const normal = normalizarFecha(t)
      if (normal === null) {
        falla(clave, `no es una fecha (YYYY-MM-DD), dice "${t}"`)
        return ''
      }
      return normal
    },
    sino(clave: string, porDefecto: boolean): boolean {
      const t = normalizar(comoTexto(f.valor(clave)))
      if (t === '') return porDefecto
      if (['si', 's', 'true', 'verdadero', '1', 'x', 'yes', 'y'].includes(t)) return true
      if (['no', 'n', 'false', 'falso', '0', 'not'].includes(t)) return false
      falla(clave, `debe ser Sí o No (${comoTexto(f.valor(clave))})`)
      return porDefecto
    },
    opcion<T extends string>(clave: string, validas: Record<T, string> | readonly T[], porDefecto: T, masculino = false): T {
      const t = normalizar(comoTexto(f.valor(clave)))
      if (t === '') {
        falla(clave, 'está vacío')
        return porDefecto
      }
      const entradas: [T, string][] = Array.isArray(validas)
        ? (validas as readonly T[]).map((v) => [v, v])
        : (Object.entries(validas) as [T, string][])
      const hallada = entradas.find(([codigo, etiqueta]) => normalizar(codigo) === t || normalizar(etiqueta) === t)
      if (!hallada) {
        falla(clave, `no es válid${masculino ? 'o' : 'a'} (${comoTexto(f.valor(clave))}); use una de: ${entradas.map(([, e]) => e).join(', ')}`)
        return porDefecto
      }
      return hallada[0]
    },
  }

  function obligatoriaVacia(clave: string, porDefecto: number): number {
    const c = columnas.find((x) => x.clave === clave)!
    if (c.requerida) falla(clave, 'está vacío')
    return porDefecto
  }
  function comprobarNumero(clave: string, n: number): number {
    if (!Number.isFinite(n)) {
      falla(clave, `no es un número (${n})`)
      return 0
    }
    if (n < 0) {
      falla(clave, `no puede ser negativa (${n})`)
      return 0
    }
    return n
  }
}

/** "12", "1.250", "$28.500", "0,5", "1.500,50" → número; null si no es un número */
function parsearNumero(texto: string): number | null {
  let t = texto.replace(/[\s$]/g, '').replace(/cop$/i, '')
  if (t === '') return null
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.') // puntos de miles (es-CO)
  else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, '') // comas de miles (en-US)
  else t = t.replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null
  return Number(t)
}

/** YYYY-MM-DD (o D/M/AAAA a la colombiana) → YYYY-MM-DD; null si no es una fecha real */
function normalizarFecha(texto: string): string | null {
  if (esFechaISO(texto)) return texto
  const iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/)
  const col = texto.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  const partes = iso ? [iso[1], iso[2], iso[3]] : col ? [col[3], col[2], col[1]] : null
  if (!partes) return null
  const [a, m, d] = partes
  const candidata = `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  return esFechaISO(candidata) ? candidata : null
}

const slug = (t: string) => normalizar(t).replace(/ /g, '-').slice(0, 40) || 'sin-nombre'

/** Reparte ids: respeta los escritos y crea (sin repetir) los que faltan */
function asignarIds<T extends { fila: number; id: string; base: string }>(hoja: string, items: T[], prefijo: string, errores: string[]): void {
  const vistos = new Map<string, number>()
  for (const it of items) {
    if (it.id === '') continue
    const previo = vistos.get(it.id)
    if (previo !== undefined) errores.push(`Hoja ${hoja}, fila ${it.fila}: el 'id' ${it.id} ya está en la fila ${previo}`)
    else vistos.set(it.id, it.fila)
  }
  for (const it of items) {
    if (it.id !== '') continue
    const base = `${prefijo}-${slug(it.base)}`
    let candidato = base
    for (let k = 2; vistos.has(candidato); k++) candidato = `${base}-${k}`
    vistos.set(candidato, it.fila)
    it.id = candidato
  }
}

function leerDatos(wb: ExcelJS.Workbook): DatosMedicinas {
  const errores: string[] = []

  // Medicamentos
  const filasMed = leerFilas(wb, HOJA_MEDICAMENTOS, COLUMNAS_MEDICAMENTOS, errores)
  const medicamentos = filasMed.map((f) => {
    const l = lector(HOJA_MEDICAMENTOS, f, COLUMNAS_MEDICAMENTOS, errores)
    const nombre = l.texto('nombre', true)
    const especiesTexto = l.texto('especies')
    const especies = especiesTexto === '' ? (['perro', 'gato'] as ('perro' | 'gato')[]) : []
    for (const e of especiesTexto === '' ? [] : especiesTexto.split('|')) {
      const t = normalizar(e)
      if (t === '') continue
      const hallada = (['perro', 'gato'] as const).find((x) => x === t || x + 's' === t)
      if (hallada) {
        if (!especies.includes(hallada)) especies.push(hallada)
      } else l.falla('especies', `no es válida (${e.trim()}); use Perro, Gato o ambos separados por " | "`)
    }
    const m: Medicamento & { fila: number; base: string } = {
      fila: f.fila,
      base: nombre,
      id: l.texto('id'),
      nombre,
      alias: l.texto('alias').split('|').map((a) => a.trim()).filter((a) => a !== ''),
      principioActivo: l.texto('principioActivo'),
      categoria: l.opcion('categoria', CATEGORIAS, 'otro'),
      presentacion: l.texto('presentacion'),
      unidad: l.opcion('unidad', UNIDADES, 'tableta'),
      especies,
      usoComun: l.texto('usoComun'),
      dosisReferencia: l.texto('dosisReferencia'),
      contraindicaciones: l.texto('contraindicaciones'),
      requiereFormula: l.sino('requiereFormula', false),
      stockMinimo: l.numero('stockMinimo'),
      proveedorId: l.texto('proveedorId') || null,
      precioUnitarioCOP: l.numero('precioUnitarioCOP'),
    }
    return m
  })
  asignarIds(HOJA_MEDICAMENTOS, medicamentos, 'med', errores)

  // Contactos
  const filasCon = leerFilas(wb, HOJA_CONTACTOS, COLUMNAS_CONTACTOS, errores)
  const contactos = filasCon.map((f) => {
    const l = lector(HOJA_CONTACTOS, f, COLUMNAS_CONTACTOS, errores)
    const nombre = l.texto('nombre', true)
    const c: Contacto & { fila: number; base: string } = {
      fila: f.fila,
      base: nombre,
      id: l.texto('id'),
      tipo: l.opcion('tipo', TIPOS, 'donante', true),
      nombre,
      telefono: l.texto('telefono'),
      correo: l.texto('correo'),
      ciudad: l.texto('ciudad'),
      nota: l.texto('nota'),
      activo: l.sino('activo', true),
    }
    return c
  })
  asignarIds(HOJA_CONTACTOS, contactos, 'con', errores)

  // Un proveedor puede escribirse por nombre; si no coincide con nadie se conserva tal cual
  for (const m of medicamentos) {
    if (m.proveedorId && !contactos.some((c) => c.id === m.proveedorId)) {
      const porNombre = contactos.find((c) => normalizar(c.nombre) === normalizar(m.proveedorId!))
      if (porNombre) m.proveedorId = porNombre.id
    }
  }

  // Lotes
  const filasLote = leerFilas(wb, HOJA_LOTES, COLUMNAS_LOTES, errores)
  const lotes = filasLote.map((f) => {
    const l = lector(HOJA_LOTES, f, COLUMNAS_LOTES, errores)
    const referencia = l.texto('medicamentoId', true)
    let medicamentoId = ''
    if (referencia !== '') {
      const hallado =
        medicamentos.find((m) => m.id === referencia) ?? medicamentos.find((m) => normalizar(m.nombre) === normalizar(referencia))
      if (hallado) medicamentoId = hallado.id
      else l.falla('medicamentoId', `(${referencia}) no existe en la hoja ${HOJA_MEDICAMENTOS}`)
    }
    const numeroLote = l.texto('numeroLote')
    const lote: LoteMedicamento & { fila: number; base: string } = {
      fila: f.fila,
      base: `${medicamentoId}-${numeroLote || f.fila}`,
      id: l.texto('id'),
      medicamentoId,
      numeroLote,
      vence: l.fecha('vence', true),
      cantidad: l.numero('cantidad'),
      ingreso: l.fecha('ingreso', false),
    }
    return lote
  })
  asignarIds(HOJA_LOTES, lotes, 'lote', errores)

  if (errores.length > 0) throw new ErrorExcelMedicinas(errores.slice(0, 25))

  return {
    medicamentos: medicamentos.map(({ fila: _f, base: _b, ...m }) => m),
    lotes: lotes.map(({ fila: _f, base: _b, ...l }) => l),
    contactos: contactos.map(({ fila: _f, base: _b, ...c }) => c),
  }
}

// ---------------------------------------------------------------------------
// Almacén
// ---------------------------------------------------------------------------

export interface OpcionesAlmacenExcel {
  /** Datos con los que se crea el archivo si no existe; sin esto se crea vacío */
  semilla?: () => DatosMedicinas
}

const VACIO = (): DatosMedicinas => ({ medicamentos: [], lotes: [], contactos: [] })

export function crearAlmacenExcel(ruta: string, opciones: OpcionesAlmacenExcel = {}): AlmacenMedicinas {
  const archivo = path.resolve(ruta)
  let cache: { mtimeMs: number; size: number; datos: DatosMedicinas } | null = null
  let cola: Promise<unknown> = Promise.resolve()

  /** Una sola operación a la vez dentro del proceso; un error no frena a las siguientes */
  function enCola<T>(tarea: () => Promise<T>): Promise<T> {
    const siguiente = cola.then(tarea, tarea)
    cola = siguiente.catch(() => undefined)
    return siguiente
  }

  async function escribir(datos: DatosMedicinas): Promise<void> {
    const wb = construirLibro(datos)
    const buffer = await wb.xlsx.writeBuffer()
    const carpeta = path.dirname(archivo)
    await fs.mkdir(carpeta, { recursive: true })
    const temporal = path.join(carpeta, `.${path.basename(archivo)}.${process.pid}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.tmp`)
    try {
      const fh = await fs.open(temporal, 'w')
      try {
        await fh.writeFile(Buffer.from(buffer))
        await fh.sync()
      } finally {
        await fh.close()
      }
      await fs.rename(temporal, archivo)
    } catch (e) {
      await fs.rm(temporal, { force: true }).catch(() => undefined)
      cache = null
      throw new Error(
        `No pude guardar ${archivo}: ${(e as Error).message}. ` +
          'Si el archivo está abierto en Excel, ciérrelo; el archivo anterior quedó intacto.',
        { cause: e },
      )
    }
    const st = await fs.stat(archivo)
    cache = { mtimeMs: st.mtimeMs, size: st.size, datos: structuredClone(datos) }
  }

  return {
    leer: () =>
      enCola(async () => {
        let st = await fs.stat(archivo).catch((e: NodeJS.ErrnoException) => {
          if (e.code === 'ENOENT') return null
          throw e
        })
        if (!st) {
          await escribir(opciones.semilla ? opciones.semilla() : VACIO())
          st = await fs.stat(archivo)
        }
        if (cache && cache.mtimeMs === st.mtimeMs && cache.size === st.size) return structuredClone(cache.datos)

        const wb = new ExcelJS.Workbook()
        try {
          await wb.xlsx.readFile(archivo)
        } catch (e) {
          throw new Error(`No pude abrir ${archivo} como un libro de Excel (.xlsx): ${(e as Error).message}`, { cause: e })
        }
        const datos = leerDatos(wb)
        cache = { mtimeMs: st.mtimeMs, size: st.size, datos: structuredClone(datos) }
        return datos
      }),

    guardar: (datos) => enCola(() => escribir(structuredClone(datos))),
  }
}

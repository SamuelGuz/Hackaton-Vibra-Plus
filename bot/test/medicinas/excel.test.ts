import ExcelJS from 'exceljs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crearAlmacenExcel } from '../../src/medicinas/almacen-excel.js'
import type { DatosMedicinas } from '../../src/medicinas/tipos.js'
import { carpetaTemporal, contacto, datosDePrueba, dia, lote, med } from './fixtures.js'

let dir = ''
let limpiar: () => Promise<void> = async () => {}
let ruta = ''

beforeEach(async () => {
  ;({ dir, limpiar } = await carpetaTemporal())
  ruta = path.join(dir, 'datos', 'medicinas.xlsx')
})
afterEach(async () => {
  vi.restoreAllMocks()
  await limpiar()
})

const VACIO: DatosMedicinas = { medicamentos: [], lotes: [], contactos: [] }

/** Libro "escrito a mano": cada hoja con su encabezado y filas sueltas, como las dejaría una persona. */
async function libroAMano(
  hojas: { Medicamentos?: unknown[][]; Lotes?: unknown[][]; Contactos?: unknown[][] },
  archivo = ruta,
) {
  const wb = new ExcelJS.Workbook()
  wb.addWorksheet('LEEME').addRow(['Instrucciones'])
  for (const [nombre, filas] of Object.entries(hojas)) {
    const ws = wb.addWorksheet(nombre)
    for (const f of filas as unknown[][]) ws.addRow(f)
  }
  await fs.mkdir(path.dirname(archivo), { recursive: true })
  await wb.xlsx.writeFile(archivo)
}

const ENC_MED = ['ID', 'Nombre', 'Alias', 'Principio activo', 'Categoría', 'Presentación', 'Unidad', 'Especies', 'Uso común', 'Dosis de referencia', 'Contraindicaciones', 'Requiere fórmula', 'Stock mínimo', 'ID proveedor', 'Precio unitario (COP)']
const ENC_LOTE = ['ID', 'ID medicamento', 'Número de lote', 'Vence', 'Cantidad', 'Ingreso']
const ENC_CON = ['ID', 'Tipo', 'Nombre', 'Teléfono', 'Correo', 'Ciudad', 'Nota', 'Activo']

describe('crearAlmacenExcel: creación del archivo', () => {
  it('si no existe lo crea desde la semilla (y también la carpeta)', async () => {
    const semilla = datosDePrueba()
    const almacen = crearAlmacenExcel(ruta, { semilla: () => semilla })
    expect(await almacen.leer()).toEqual(semilla)
    expect((await fs.stat(ruta)).size).toBeGreaterThan(0)
  })
  it('sin semilla lo crea vacío', async () => {
    const almacen = crearAlmacenExcel(ruta)
    expect(await almacen.leer()).toEqual(VACIO)
    expect((await fs.stat(ruta)).isFile()).toBe(true)
  })
  it('si ya existe no lo toca ni usa la semilla', async () => {
    await crearAlmacenExcel(ruta).guardar(datosDePrueba())
    const antes = await fs.readFile(ruta)
    const semilla = vi.fn(() => VACIO)
    const leido = await crearAlmacenExcel(ruta, { semilla }).leer()
    expect(semilla).not.toHaveBeenCalled()
    expect(leido).toEqual(datosDePrueba())
    expect((await fs.readFile(ruta)).equals(antes)).toBe(true)
  })
})

describe('crearAlmacenExcel: ida y vuelta', () => {
  it('guardar → leer con otra instancia devuelve exactamente lo mismo', async () => {
    const datos = datosDePrueba()
    datos.medicamentos[0].alias = ['Amoxi', 'Clamoxyl', 'Amox 500']
    datos.medicamentos[1].especies = ['gato']
    datos.medicamentos[2].requiereFormula = true
    datos.medicamentos[3].proveedorId = 'cli1'
    datos.medicamentos[4].precioUnitarioCOP = 1234.5
    datos.lotes[0].numeroLote = '007123' // el cero inicial no se pierde
    datos.contactos[1].nota = 'Atiende urgencias; llamar antes'
    await crearAlmacenExcel(ruta).guardar(datos)
    expect(await crearAlmacenExcel(ruta).leer()).toEqual(datos)
  })
  it('guarda y recupera un conjunto vacío', async () => {
    await crearAlmacenExcel(ruta).guardar(VACIO)
    expect(await crearAlmacenExcel(ruta).leer()).toEqual(VACIO)
  })
  it('lo que devuelve leer() es una copia: cambiarla no altera lo guardado', async () => {
    const almacen = crearAlmacenExcel(ruta, { semilla: datosDePrueba })
    const a = await almacen.leer()
    a.medicamentos[0].nombre = 'Cambiado'
    a.lotes.length = 0
    const b = await almacen.leer()
    expect(b).toEqual(datosDePrueba())
    expect(b).not.toBe(a)
  })
  it('detecta que el dueño cambió el archivo (caché por fecha y tamaño)', async () => {
    const almacen = crearAlmacenExcel(ruta, { semilla: datosDePrueba })
    await almacen.leer()
    const otro = datosDePrueba()
    otro.medicamentos.push(med('nuevo', 'Medicamento nuevo'))
    await crearAlmacenExcel(ruta).guardar(otro) // otro proceso/instancia
    expect((await almacen.leer()).medicamentos.map((m) => m.id)).toContain('nuevo')
  })
  it('el libro es amigable: hojas, encabezado fijo, filtro, listas y LEEME', async () => {
    await crearAlmacenExcel(ruta).guardar(datosDePrueba())
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(ruta)
    expect(wb.worksheets.map((w) => w.name)).toEqual(['LEEME', 'Medicamentos', 'Lotes', 'Contactos'])
    const ws = wb.getWorksheet('Medicamentos')!
    expect(ws.getRow(1).values).toEqual(expect.arrayContaining(['Nombre', 'Categoría', 'Unidad', 'Stock mínimo']))
    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
    expect(ws.autoFilter).toBeTruthy()
    expect(ws.getColumn(2).width).toBeGreaterThan(10)
    const colCategoria = (ws.getRow(1).values as string[]).indexOf('Categoría')
    expect(ws.getCell(2, colCategoria).dataValidation?.type).toBe('list')
    const leeme = wb.getWorksheet('LEEME')!
    const texto = leeme.getSheetValues().flat().join(' ')
    expect(texto).toContain('YYYY-MM-DD')
    expect(texto).toContain('Sí')
    expect(texto).toContain(' | ')
    // el libro guarda solo datos de origen: sin fórmulas ni columnas calculadas
    const hayFormula = ['Medicamentos', 'Lotes', 'Contactos'].some((n) => {
      let f = false
      wb.getWorksheet(n)!.eachRow((r) => r.eachCell((c) => { if (c.type === ExcelJS.ValueType.Formula) f = true }))
      return f
    })
    expect(hayFormula).toBe(false)
  })
})

describe('crearAlmacenExcel: tolera ediciones a mano', () => {
  it('espacios, filas vacías, sí/si/SI, números en texto, fechas reales de Excel y celdas opcionales vacías', async () => {
    await libroAMano({
      Medicamentos: [
        ENC_MED,
        ['amox', '  Amoxicilina  ', ' Amoxi |  Clamoxyl ', '', 'antibiótico', '', 'FRASCO', 'Perro | gato', '', '', '', 'SI', ' 3 ', 'prov1', '$28.500'],
        [null, null, null],
        ['melox', 'Meloxicam', null, null, 'Antiinflamatorio', null, 'tableta', null, null, null, null, 'no', '20', null, null],
        [],
      ],
      Lotes: [
        ENC_LOTE,
        ['l1', 'amox', ' ABC-1 ', new Date(Date.UTC(2027, 0, 15)), '12', '2026-10-01'],
        [null, null, null, null, null, null],
        ['l2', 'Meloxicam', 77123, '2027-03-01', ' 40 ', new Date(Date.UTC(2026, 8, 30))], // medicamento por nombre; lote numérico
        ['', 'melox', '', '15/06/2027', 5, ''], // sin id, con fecha a la colombiana
      ],
      Contactos: [
        ENC_CON,
        ['c1', ' Proveedor ', 'Droguería El Cachorro ', 573001234567, 'ventas@example.com', 'Medellín', '', 'Sí'],
        ['c2', 'clínica', 'Clínica San Roque', '', '', '', '', 'no'],
      ],
    })
    const d = await crearAlmacenExcel(ruta).leer()
    expect(d.medicamentos).toHaveLength(2)
    expect(d.medicamentos[0]).toMatchObject({
      id: 'amox',
      nombre: 'Amoxicilina',
      alias: ['Amoxi', 'Clamoxyl'],
      categoria: 'antibiotico',
      unidad: 'frasco',
      especies: ['perro', 'gato'],
      requiereFormula: true,
      stockMinimo: 3,
      proveedorId: 'prov1',
      precioUnitarioCOP: 28500,
      principioActivo: '',
    })
    expect(d.medicamentos[1]).toMatchObject({ categoria: 'antiinflamatorio', requiereFormula: false, alias: [], proveedorId: null, precioUnitarioCOP: 0, especies: ['perro', 'gato'] })
    expect(d.lotes).toHaveLength(3)
    expect(d.lotes[0]).toEqual({ id: 'l1', medicamentoId: 'amox', numeroLote: 'ABC-1', vence: '2027-01-15', cantidad: 12, ingreso: '2026-10-01' })
    expect(d.lotes[1]).toMatchObject({ id: 'l2', medicamentoId: 'melox', numeroLote: '77123', vence: '2027-03-01', cantidad: 40, ingreso: '2026-09-30' })
    expect(d.lotes[2]).toMatchObject({ medicamentoId: 'melox', vence: '2027-06-15', cantidad: 5, ingreso: '' })
    expect(d.lotes[2].id).toBeTruthy()
    expect(d.contactos[0]).toMatchObject({ id: 'c1', tipo: 'proveedor', nombre: 'Droguería El Cachorro', telefono: '573001234567', activo: true })
    expect(d.contactos[1]).toMatchObject({ tipo: 'clinica', activo: false })
  })
  it('las columnas pueden estar en otro orden y las opcionales pueden faltar', async () => {
    await libroAMano({
      Medicamentos: [['Unidad', 'Categoría', 'Nombre'], ['ml', 'Vitamina', 'Vitaminas']],
      Lotes: [['Cantidad', 'ID medicamento', 'Vence'], [3, 'Vitaminas', '2027-01-01']],
      Contactos: [['Nombre', 'Tipo'], ['Marta', 'Padrino']],
    })
    const d = await crearAlmacenExcel(ruta).leer()
    expect(d.medicamentos[0]).toMatchObject({ nombre: 'Vitaminas', unidad: 'ml', categoria: 'vitamina', stockMinimo: 0 })
    expect(d.medicamentos[0].id).toBeTruthy()
    expect(d.lotes[0]).toMatchObject({ medicamentoId: d.medicamentos[0].id, cantidad: 3, vence: '2027-01-01' })
    expect(d.contactos[0]).toMatchObject({ nombre: 'Marta', tipo: 'padrino', activo: true })
  })
  it('un proveedorId que ya no existe se conserva tal cual, sin perder la fila', async () => {
    await libroAMano({
      Medicamentos: [ENC_MED, ['a', 'A', '', '', 'otro', '', 'tableta', '', '', '', '', '', 0, 'ya-no-existe', 0]],
      Lotes: [ENC_LOTE],
      Contactos: [ENC_CON],
    })
    expect((await crearAlmacenExcel(ruta).leer()).medicamentos[0].proveedorId).toBe('ya-no-existe')
  })
})

describe('crearAlmacenExcel: errores precisos', () => {
  const lotesMalos = (fila: unknown[]) => ({
    Medicamentos: [ENC_MED, ['a', 'A', '', '', 'otro', '', 'tableta', '', '', '', '', '', 0, '', 0]],
    Lotes: [
      ENC_LOTE,
      ['l1', 'a', 'x', '2027-01-01', 1, ''],
      ['l2', 'a', 'x', '2027-01-01', 1, ''],
      ['l3', 'a', 'x', '2027-01-01', 1, ''],
      ['l4', 'a', 'x', '2027-01-01', 1, ''],
      ['l5', 'a', 'x', '2027-01-01', 1, ''],
      fila, // fila 7 de la hoja
    ],
    Contactos: [ENC_CON],
  })
  const mensaje = async () => crearAlmacenExcel(ruta).leer().then(() => '', (e: Error) => e.message)

  it('fecha inválida: dice hoja, fila y columna', async () => {
    await libroAMano(lotesMalos(['l6', 'a', 'x', 'mañana', 1, '']))
    expect(await mensaje()).toContain("Hoja Lotes, fila 7: 'vence' no es una fecha (YYYY-MM-DD)")
  })
  it('fecha imposible (30 de febrero)', async () => {
    await libroAMano(lotesMalos(['l6', 'a', 'x', '2027-02-30', 1, '']))
    expect(await mensaje()).toContain("Hoja Lotes, fila 7: 'vence' no es una fecha")
  })
  it('cantidad que no es número o es negativa', async () => {
    await libroAMano(lotesMalos(['l6', 'a', 'x', '2027-01-01', 'muchas', '']))
    expect(await mensaje()).toContain("Hoja Lotes, fila 7: 'cantidad' no es un número")
    await libroAMano(lotesMalos(['l6', 'a', 'x', '2027-01-01', -3, '']))
    expect(await mensaje()).toContain("Hoja Lotes, fila 7: 'cantidad' no puede ser negativa")
  })
  it('lote de un medicamento que no existe', async () => {
    await libroAMano(lotesMalos(['l6', 'zzz', 'x', '2027-01-01', 1, '']))
    expect(await mensaje()).toContain("Hoja Lotes, fila 7: 'id medicamento' (zzz) no existe en la hoja Medicamentos")
  })
  it('una fila con datos pero incompleta no se descarta: falla', async () => {
    await libroAMano(lotesMalos([null, null, null, null, 9, null]))
    const m = await mensaje()
    expect(m).toContain('Hoja Lotes, fila 7')
    expect(m).toContain("'id medicamento' está vacío")
  })
  it('categoría, unidad, tipo y sí/no desconocidos', async () => {
    await libroAMano({
      Medicamentos: [ENC_MED, ['a', 'A', '', '', 'magia', '', 'litros', '', '', '', '', 'quizás', 0, '', 0]],
      Lotes: [ENC_LOTE],
      Contactos: [ENC_CON, ['c', 'extraterrestre', 'X', '', '', '', '', '']],
    })
    const m = await mensaje()
    expect(m).toContain("Hoja Medicamentos, fila 2: 'categoría' no es válida (magia)")
    expect(m).toContain("Hoja Medicamentos, fila 2: 'unidad' no es válida (litros)")
    expect(m).toContain("Hoja Medicamentos, fila 2: 'requiere fórmula' debe ser Sí o No")
    expect(m).toContain("Hoja Contactos, fila 2: 'tipo' no es válido (extraterrestre)")
  })
  it('ids repetidos', async () => {
    await libroAMano({
      Medicamentos: [ENC_MED, ['a', 'A', '', '', 'otro', '', 'tableta', '', '', '', '', '', 0, '', 0], ['a', 'B', '', '', 'otro', '', 'tableta', '', '', '', '', '', 0, '', 0]],
      Lotes: [ENC_LOTE],
      Contactos: [ENC_CON],
    })
    expect(await mensaje()).toContain("Hoja Medicamentos, fila 3: el 'id' a ya está en la fila 2")
  })
  it('hoja o columna que falta', async () => {
    await libroAMano({ Medicamentos: [ENC_MED], Contactos: [ENC_CON] })
    expect(await mensaje()).toContain('Falta la hoja Lotes')
    await libroAMano({ Medicamentos: [['Nombre', 'Unidad']], Lotes: [ENC_LOTE], Contactos: [ENC_CON] })
    expect(await mensaje()).toContain("Hoja Medicamentos: falta la columna 'Categoría'")
  })
  it('lista varios errores a la vez para arreglarlos de una vez', async () => {
    await libroAMano(lotesMalos(['l6', 'a', 'x', 'mañana', 'x', '']))
    const m = await mensaje()
    expect(m).toContain("'vence'")
    expect(m).toContain("'cantidad'")
  })
  it('un archivo que no es un Excel da un mensaje claro', async () => {
    await fs.mkdir(path.dirname(ruta), { recursive: true })
    await fs.writeFile(ruta, 'esto no es un xlsx')
    expect(await mensaje()).toContain(ruta)
  })
})

describe('crearAlmacenExcel: escritura segura', () => {
  it('no deja archivos temporales y el Excel queda legible', async () => {
    const almacen = crearAlmacenExcel(ruta)
    await almacen.guardar(datosDePrueba())
    await almacen.guardar(datosDePrueba())
    expect(await fs.readdir(path.dirname(ruta))).toEqual(['medicinas.xlsx'])
  })
  it('si falla al reemplazar, el original queda intacto y no sobran temporales', async () => {
    const almacen = crearAlmacenExcel(ruta)
    await almacen.guardar(datosDePrueba())
    const antes = await fs.readFile(ruta)
    const spy = vi.spyOn(fs, 'rename').mockRejectedValueOnce(Object.assign(new Error('EBUSY'), { code: 'EBUSY' }))
    const otro = datosDePrueba()
    otro.medicamentos.push(med('x', 'X'))
    await expect(almacen.guardar(otro)).rejects.toThrow(/medicinas\.xlsx/)
    expect(spy).toHaveBeenCalled()
    expect((await fs.readFile(ruta)).equals(antes)).toBe(true)
    expect(await fs.readdir(path.dirname(ruta))).toEqual(['medicinas.xlsx'])
    // y se recupera: el siguiente guardado funciona y lo leído es lo nuevo
    await almacen.guardar(otro)
    expect((await almacen.leer()).medicamentos.map((m) => m.id)).toContain('x')
  })
  it('un guardado fallido no deja datos viejos en la caché', async () => {
    const almacen = crearAlmacenExcel(ruta, { semilla: datosDePrueba })
    await almacen.leer()
    vi.spyOn(fs, 'rename').mockRejectedValueOnce(new Error('EBUSY'))
    await expect(almacen.guardar(VACIO)).rejects.toThrow()
    expect(await almacen.leer()).toEqual(datosDePrueba())
  })
  it('lecturas y escrituras simultáneas se ordenan: nunca ven un archivo a medias', async () => {
    const almacen = crearAlmacenExcel(ruta, { semilla: () => VACIO })
    const versiones = Array.from({ length: 6 }, (_, i) => ({
      medicamentos: [med(`m${i}`, `Med ${i}`)],
      lotes: [lote(`l${i}`, `m${i}`, 30, i)],
      contactos: [contacto(`c${i}`, 'donante', `Donante ${i}`)],
    }))
    const tareas = versiones.flatMap((v) => [almacen.guardar(v), almacen.leer()])
    const resultados = await Promise.all(tareas)
    // cada lectura vio una versión completa (la inicial vacía o alguna de las guardadas), nunca algo a medias
    const validas = [VACIO, ...versiones]
    for (const r of resultados) if (r) expect(validas).toContainEqual(r)
    expect(await crearAlmacenExcel(ruta).leer()).toEqual(versiones[5])
    expect(await fs.readdir(path.dirname(ruta))).toEqual(['medicinas.xlsx'])
  })
  it('las fechas se guardan como texto YYYY-MM-DD para que Excel no las cambie', async () => {
    await crearAlmacenExcel(ruta).guardar({ medicamentos: [med('a', 'A')], lotes: [lote('l', 'a', 10, 1)], contactos: [] })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(ruta)
    const ws = wb.getWorksheet('Lotes')!
    const col = (ws.getRow(1).values as string[]).indexOf('Vence')
    expect(ws.getCell(2, col).value).toBe(dia(10))
  })
})

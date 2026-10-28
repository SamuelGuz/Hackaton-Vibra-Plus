// Los informes que el bot manda como imagen. Cada uno es una hoja HTML armada con los datos del refugio.
import { bultosEnBodega, diasDeComida, dosisDeHoy, nivelClinica, nivelComida, plataEnCaja, type Nivel } from '../datos/calculos.js'
import { diasHablados, fechaLocal, horaBonita, horaDe, pesos } from '../formato.js'
import type { DatosAlbergue, Especie, EstadoAnimal } from '../panel-tipos.js'
import { barras, cifras, columnas, hoja, numeroGrande, renglones, tarjeta, type Tono } from './plantilla.js'

export const TIPOS_INFORME = ['general', 'plata', 'comida', 'medicinas', 'animales'] as const
export type TipoInforme = (typeof TIPOS_INFORME)[number]

export const NOMBRE_INFORME: Record<TipoInforme, string> = {
  general: 'Resumen del refugio',
  plata: 'La plata',
  comida: 'La comida',
  medicinas: 'Medicinas de hoy',
  animales: 'Los animales',
}

/** Solo la administración ve la plata */
export const informeDePlata = (t: TipoInforme) => t === 'plata'

/** "2026-10-25" → "25 de octubre" */
const diaDelMes = (fecha: string) =>
  new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })

/** Montos cortos para encima de las barras: 190 mil → "190k", 1.250.000 → "1,3M" */
const pesosCortos = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })}M`
    : n >= 1_000
      ? `${Math.round(n / 1_000)}k`
      : String(n)

const DIAS_GRAFICA = 7
const MAX_DOSIS = 14
const ESTADOS_A_CARGO: EstadoAnimal[] = ['cuarentena', 'tratamiento', 'adoptable', 'hogar_temporal']
const NOMBRE_ESTADO: Record<EstadoAnimal, string> = {
  cuarentena: 'En cuarentena',
  tratamiento: 'En tratamiento',
  adoptable: 'Listos para adoptar',
  hogar_temporal: 'En hogar temporal',
  adoptado: 'Adoptados',
  fallecido: 'Fallecidos',
  devuelto: 'Devueltos',
}
const NOMBRE_CATEGORIA: Record<string, string> = {
  comida: 'Comida',
  veterinaria: 'Veterinaria',
  limpieza: 'Limpieza',
  servicios: 'Servicios',
  transporte: 'Transporte',
  otro: 'Otros',
  donacion: 'Donaciones',
  padrino: 'Padrinos',
  rifa: 'Rifas y eventos',
}

const tonoDe = (n: Nivel): Tono => n
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** Los últimos `n` días, terminando hoy: fecha AAAA-MM-DD, día del mes y día de la semana corto */
function ultimosDias(ahora: Date, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(ahora)
    d.setDate(d.getDate() - (n - 1 - i))
    const semana = d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')
    return { fecha: fechaLocal(d), dia: String(d.getDate()), etiqueta: i === n - 1 ? 'hoy' : semana }
  })
}

function tarjetaComida(d: DatosAlbergue, ahora: Date): string {
  const especies: Especie[] = ['perro', 'gato']
  const lista = especies.map((e) => {
    const dias = diasDeComida(d, e)
    const bultos = bultosEnBodega(d, e)
    const tono: Tono = Number.isFinite(dias) ? tonoDe(nivelComida(d, dias)) : 'neutro'
    const hasta = new Date(ahora)
    hasta.setDate(hasta.getDate() + Math.floor(dias))
    const nota = Number.isFinite(dias)
      ? `${plural(bultos, 'bulto', 'bultos')} · alcanza hasta el ${hasta.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}`
      : plural(bultos, 'bulto', 'bultos')
    return { etiqueta: e === 'perro' ? 'Perros' : 'Gatos', valor: Number.isFinite(dias) ? diasHablados(dias) : '—', tono, nota }
  })
  return tarjeta('¿Para cuántos días hay comida?', cifras(lista))
}

function tarjetaMedicinas(d: DatosAlbergue, ahora: Date, titulo = 'Medicinas de hoy'): string {
  const dosis = dosisDeHoy(d, ahora)
  const dadas = dosis.filter((x) => x.estado === 'dada').length
  const atrasadas = dosis.filter((x) => x.estado === 'atrasada').length
  return tarjeta(
    titulo,
    cifras([
      { etiqueta: 'Dadas', valor: `${dadas} de ${dosis.length}`, tono: dadas === dosis.length ? 'bien' : 'neutro' },
      { etiqueta: 'Atrasadas', valor: String(atrasadas), tono: atrasadas ? 'urgente' : 'bien' },
    ]),
  )
}

function aCargo(d: DatosAlbergue) {
  return d.animales.filter((a) => ESTADOS_A_CARGO.includes(a.estado))
}

function tarjetaClinicas(d: DatosAlbergue): string {
  if (d.clinicas.length === 0) return ''
  return tarjeta(
    'Lo que le debemos a las clínicas',
    barras(
      d.clinicas.map((k) => ({
        nombre: k.nombre,
        valor: pesos(k.deuda),
        proporcion: k.limite > 0 ? k.deuda / k.limite : 0,
        tono: tonoDe(nivelClinica(k)),
        nota: k.limite > 0 ? `Límite ${pesos(k.limite)} · quedan ${pesos(Math.max(0, k.limite - k.deuda))}` : undefined,
      })),
    ),
  )
}

function general(d: DatosAlbergue, ahora: Date, verPlata: boolean): string {
  const pendientes = d.porConfirmar.filter((p) => p.estado === 'pendiente').length
  const cuerpo = [
    verPlata ? tarjeta('Plata en caja', numeroGrande(pesos(plataEnCaja(d)), plataEnCaja(d) < 0 ? 'urgente' : 'neutro')) : '',
    tarjetaComida(d, ahora),
    tarjetaMedicinas(d, ahora),
    tarjeta(
      'Animales',
      cifras([
        { etiqueta: 'A cargo del refugio', valor: String(aCargo(d).length), tono: 'neutro' },
        { etiqueta: 'Vidas cambiadas', valor: String(d.vidasCambiadas), tono: 'bien', nota: 'adoptados en total' },
      ]),
    ),
    pendientes
      ? tarjeta('Por confirmar en el panel', numeroGrande(String(pendientes), 'ojo', 'Registros del bot que alguien debe revisar'))
      : '',
    verPlata ? tarjetaClinicas(d) : '',
  ]
  return hoja(NOMBRE_INFORME.general, ahora, cuerpo.filter(Boolean))
}

function plata(d: DatosAlbergue, ahora: Date): string {
  const dias = ultimosDias(ahora, DIAS_GRAFICA)
  const desde = dias[0].fecha
  const recientes = d.movimientos.filter((m) => m.fechaHora.slice(0, 10) >= desde)
  const suma = (tipo: 'ingreso' | 'gasto', fecha?: string) =>
    recientes.filter((m) => m.tipo === tipo && (!fecha || m.fechaHora.startsWith(fecha))).reduce((s, m) => s + m.monto, 0)
  const entro = suma('ingreso')
  const salio = suma('gasto')
  const caja = plataEnCaja(d)

  const porCategoria = (tipo: 'ingreso' | 'gasto') => {
    const totales = new Map<string, number>()
    for (const m of recientes.filter((x) => x.tipo === tipo)) totales.set(m.categoria, (totales.get(m.categoria) ?? 0) + m.monto)
    const max = Math.max(1, ...totales.values())
    return [...totales.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cat, total]) => ({
        nombre: NOMBRE_CATEGORIA[cat] ?? cat,
        valor: pesos(total),
        proporcion: total / max,
        tono: (tipo === 'ingreso' ? 'bien' : 'urgente') as Tono,
      }))
  }
  const gastos = porCategoria('gasto')
  const ingresos = porCategoria('ingreso')

  const cuerpo = [
    tarjeta('Plata en caja', numeroGrande(pesos(caja), caja < 0 ? 'urgente' : 'neutro', `Desde el último cuadre de caja, el ${diaDelMes(d.cajaInicial.fecha)}`)),
    tarjeta(
      'Últimos 7 días',
      cifras([
        { etiqueta: 'Entró', valor: pesos(entro), tono: 'bien' },
        { etiqueta: 'Salió', valor: pesos(salio), tono: 'urgente' },
        { etiqueta: entro >= salio ? 'Quedó a favor' : 'Faltó', valor: pesos(Math.abs(entro - salio)), tono: entro >= salio ? 'bien' : 'ojo' },
      ]) +
        columnas(
          dias,
          [
            { nombre: 'Entró', tono: 'bien', valores: dias.map((x) => suma('ingreso', x.fecha)) },
            { nombre: 'Salió', tono: 'urgente', valores: dias.map((x) => suma('gasto', x.fecha)) },
          ],
          pesosCortos,
        ),
    ),
    gastos.length ? tarjeta('¿En qué se fue la plata?', barras(gastos), 'Últimos 7 días') : '',
    ingresos.length ? tarjeta('¿De dónde llegó?', barras(ingresos), 'Últimos 7 días') : '',
    tarjetaClinicas(d),
  ]
  return hoja(NOMBRE_INFORME.plata, ahora, cuerpo.filter(Boolean))
}

function comida(d: DatosAlbergue, ahora: Date): string {
  const dias = ultimosDias(ahora, DIAS_GRAFICA)
  const abiertos = (e: Especie, fecha: string) =>
    -d.inventario.filter((m) => m.tipo === e && m.cambio < 0 && m.fechaHora.startsWith(fecha)).reduce((s, m) => s + m.cambio, 0)
  const llegaron = (e: Especie) =>
    d.inventario.filter((m) => m.tipo === e && m.cambio > 0 && m.fechaHora.slice(0, 10) >= dias[0].fecha).reduce((s, m) => s + m.cambio, 0)
  const { kgPorBulto, consumoDiarioKg, diasAviso } = d.configComida

  const cuerpo = [
    tarjetaComida(d, ahora),
    tarjeta(
      'Bultos abiertos por día',
      columnas(dias, [
        { nombre: 'Perro', tono: 'neutro', valores: dias.map((x) => abiertos('perro', x.fecha)) },
        { nombre: 'Gato', tono: 'ojo', valores: dias.map((x) => abiertos('gato', x.fecha)) },
      ]),
      `Últimos 7 días · llegaron ${plural(llegaron('perro'), 'bulto', 'bultos')} de perro y ${plural(llegaron('gato'), 'bulto', 'bultos')} de gato`,
    ),
    tarjeta(
      '¿Cómo se calcula?',
      `<p class="sub">Un bulto de perro trae ${kgPorBulto.perro} kg y comen ${consumoDiarioKg.perro.toLocaleString('es-CO')} kg al día. ` +
        `Uno de gato trae ${kgPorBulto.gato} kg y comen ${consumoDiarioKg.gato.toLocaleString('es-CO')} kg al día. ` +
        `Con ${diasAviso} días o menos, toca pedir.</p>`,
    ),
  ]
  return hoja(NOMBRE_INFORME.comida, ahora, cuerpo)
}

function medicinas(d: DatosAlbergue, ahora: Date): string {
  const dosis = dosisDeHoy(d, ahora)
  const nombre = (id: string) => d.animales.find((a) => a.id === id)?.nombre ?? '¿?'
  const quien = (id: string) => d.personas.find((p) => p.id === id)?.nombre ?? ''
  const orden = { atrasada: 0, pendiente: 1, dada: 2 } as const
  const lista = [...dosis].sort((a, b) => orden[a.estado] - orden[b.estado] || a.hora.localeCompare(b.hora))
  const filas = lista.slice(0, MAX_DOSIS).map((x) => {
    const chip =
      x.estado === 'dada'
        ? `Dada ${x.dada ? horaDe(x.dada.fechaHora) : ''}`.trim()
        : x.reporte
          ? 'Por confirmar'
          : x.estado === 'atrasada'
            ? 'Atrasada'
            : 'Pendiente'
    const tono: Tono = x.estado === 'dada' ? 'bien' : x.reporte ? 'ojo' : x.estado === 'atrasada' ? 'urgente' : 'neutro'
    const por = x.dada && quien(x.dada.quien) ? ` · la dio ${quien(x.dada.quien)}` : ''
    return {
      hora: horaBonita(x.hora),
      titulo: `${nombre(x.tratamiento.animalId)} · ${x.tratamiento.medicamento}`,
      detalle: `${x.tratamiento.dosis}${por}`,
      chip,
      tono,
    }
  })
  const resto = dosis.length - filas.length
  const cuerpo = [
    tarjetaMedicinas(d, ahora, '¿Cómo vamos?'),
    dosis.length
      ? tarjeta('Una por una', renglones(filas) + (resto > 0 ? `<p class="sub">…y ${plural(resto, 'dosis más', 'dosis más')}</p>` : ''), 'Primero lo atrasado')
      : tarjeta('Una por una', '<p class="sub">Hoy no hay medicinas programadas.</p>'),
  ]
  return hoja(NOMBRE_INFORME.medicinas, ahora, cuerpo)
}

function animales(d: DatosAlbergue, ahora: Date): string {
  const lista = aCargo(d)
  const porEstado = ESTADOS_A_CARGO.map((e) => ({ e, n: lista.filter((a) => a.estado === e).length })).filter((x) => x.n > 0)
  const max = Math.max(1, ...porEstado.map((x) => x.n))
  const tonoEstado: Record<EstadoAnimal, Tono> = {
    cuarentena: 'ojo',
    tratamiento: 'urgente',
    adoptable: 'bien',
    hogar_temporal: 'neutro',
    adoptado: 'bien',
    fallecido: 'neutro',
    devuelto: 'ojo',
  }
  const perros = lista.filter((a) => a.especie === 'perro').length
  const cuerpo = [
    tarjeta(
      'A cargo del refugio',
      numeroGrande(String(lista.length), 'neutro', `${plural(perros, 'perro', 'perros')} y ${plural(lista.length - perros, 'gato', 'gatos')}`),
    ),
    tarjeta(
      '¿Cómo están?',
      barras(porEstado.map(({ e, n }) => ({ nombre: NOMBRE_ESTADO[e], valor: String(n), proporcion: n / max, tono: tonoEstado[e] }))),
    ),
    tarjeta('Vidas cambiadas', numeroGrande(String(d.vidasCambiadas), 'bien', 'Animales que ya encontraron familia')),
  ]
  return hoja(NOMBRE_INFORME.animales, ahora, cuerpo)
}

export function armarInforme(tipo: TipoInforme, d: DatosAlbergue, ahora: Date, verPlata: boolean): string {
  switch (tipo) {
    case 'general':
      return general(d, ahora, verPlata)
    case 'plata':
      return plata(d, ahora)
    case 'comida':
      return comida(d, ahora)
    case 'medicinas':
      return medicinas(d, ahora)
    case 'animales':
      return animales(d, ahora)
  }
}

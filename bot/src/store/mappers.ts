// Filas de Google Sheets <-> objetos del modelo compartido (placa viva Task 10a, adaptada a D3 y D4).
// Todo viaja como texto (la escritura es RAW). Las columnas se buscan por nombre en HOJAS, así que el orden de
// las columnas vive en un solo lugar. Sheets recorta las celdas vacías del final de cada fila: al leer, una celda que falta es ''.
// Las celdas opcionales ausentes quedan vacías; al leer, una celda vacía vuelve a ser "ausente" (no hay undefined sueltos).
import type { DiaSeguimiento, Monton, ParaQuien, DondeVivira, Seguimiento, Solicitud, Vivienda } from '@huellitas/shared/adopcion/tipos'
import type { BaseAlbergue, ConfigServidor, EstadoRegistro, ItemCatalogo, OrigenRegistro, Padrinazgo, PropuestaServidor, Registro } from '@huellitas/shared/registro'
import type { Animal, Clinica, ConfigComida, Especie, EstadoAnimal, Persona, Rol, Tratamiento } from '@huellitas/shared/tipos'
import { HOJAS } from './hojas'
import type { Fila } from './sql'

// ── Celdas ──

const ESPECIES: readonly Especie[] = ['perro', 'gato']
const ESTADOS_ANIMAL: readonly EstadoAnimal[] = ['cuarentena', 'tratamiento', 'adoptable', 'hogar_temporal', 'adoptado', 'fallecido', 'devuelto']
const ROLES: readonly Rol[] = ['cuidador', 'bienestar', 'admin', 'adopciones', 'comunicacion', 'voluntario']
const ORIGENES: readonly OrigenRegistro[] = ['panel', 'audio', 'foto', 'texto']
const ESTADOS_REGISTRO: readonly EstadoRegistro[] = ['por_confirmar', 'confirmado', 'corregido', 'anulado']
const TIPOS_PROPUESTA: readonly PropuestaServidor['tipo'][] = ['dosis', 'inventario', 'movimiento', 'nota', 'deuda', 'estado_animal', 'comida', 'observacion', 'avance']
const VIVIENDAS: readonly Vivienda[] = ['casa', 'apartamento', 'finca', 'otra']
const PARA_QUIEN: readonly ParaQuien[] = ['yo', 'familia', 'regalo']
const DONDE_VIVIRA: readonly DondeVivira[] = ['dentro_casa', 'patio', 'guardia', 'amarrado', 'azotea']
const MONTONES: readonly Monton[] = ['verde', 'amarillo', 'rojo']
const DIAS_SEGUIMIENTO: readonly DiaSeguimiento[] = [2, 5, 15, 30, 90]

function cabecera(tab: string): string[] {
  const c = HOJAS[tab]
  if (!c) throw new Error(`La hoja ${tab} no existe en HOJAS`)
  return c
}

/** La fila como { encabezado: celda }; una celda que falta es ''. */
function columnas(tab: string, fila: string[]): Record<string, string> {
  return Object.fromEntries(cabecera(tab).map((c, i) => [c, fila[i] ?? '']))
}

/** { encabezado: celda } como fila, en el orden de HOJAS. Una columna que no existe en la hoja es un error de programación. */
function aFila(tab: string, valores: Record<string, string>): string[] {
  const cols = cabecera(tab)
  const desconocida = Object.keys(valores).find((k) => !cols.includes(k))
  if (desconocida !== undefined) throw new Error(`La hoja ${tab} no tiene la columna ${desconocida}`)
  return cols.map((c) => valores[c] ?? '')
}

function sinIndefinidos<T extends object>(objeto: T): T {
  return Object.fromEntries(Object.entries(objeto).filter(([, v]) => v !== undefined)) as T
}

const opcional = (celda: string): string | undefined => (celda === '' ? undefined : celda)
const textoONulo = (celda: string): string | null => (celda === '' ? null : celda)

function uno<T extends string>(celda: string, permitidos: readonly T[], campo: string): T {
  const valor = permitidos.find((p) => p === celda)
  if (valor === undefined) throw new Error(`Valor inválido en ${campo}: "${celda}" (se esperaba ${permitidos.join(', ')})`)
  return valor
}

function numero(celda: string, campo: string): number {
  const n = celda.trim() === '' ? Number.NaN : Number(celda.includes('.') ? celda : celda.replace(',', '.'))
  if (!Number.isFinite(n)) throw new Error(`Número inválido en ${campo}: "${celda}"`)
  return n
}
const numeroOpcional = (celda: string, campo: string): number | undefined => (celda === '' ? undefined : numero(celda, campo))

function booleano(celda: string, campo: string): boolean {
  const c = celda.trim().toUpperCase()
  if (c === 'TRUE' || c === 'VERDADERO') return true
  if (c === 'FALSE' || c === 'FALSO') return false
  throw new Error(`Booleano inválido en ${campo}: "${celda}" (se esperaba TRUE o FALSE)`)
}
const booleanoOpcional = (celda: string, campo: string): boolean | undefined => (celda === '' ? undefined : booleano(celda, campo))

const deNumero = (n: number | undefined): string => (n === undefined ? '' : String(n))
const deBooleano = (b: boolean | undefined): string => (b === undefined ? '' : b ? 'TRUE' : 'FALSE')
/** Lista separada con `|`. Un `|` dentro de un elemento se cambia por `/` para no partirlo en dos. */
const deLista = (l: string[] | undefined): string => (l ?? []).map((e) => e.replaceAll('|', '/')).join('|')
const aLista = (celda: string): string[] => (celda === '' ? [] : celda.split('|'))

/** Quita la fila de encabezados que devuelve SheetsClient.leer. */
export function sinEncabezado(filas: string[][]): string[][] {
  return filas.slice(1)
}

// ── Animal ──

export function animalAFila(a: Animal): string[] {
  return aFila('Animales', {
    id: a.id,
    nombre: a.nombre,
    especie: a.especie,
    estado: a.estado,
    foto: a.foto ?? '',
    fechaIngreso: a.fechaIngreso,
    advertencias: deLista(a.advertencias),
    caracter: a.caracter,
    padrino: a.padrino ?? '',
    codigo: a.codigo ?? '',
    alias: deLista(a.alias),
    canil: a.canil ?? '',
  })
}

export function filaAAnimal(fila: string[]): Animal {
  const c = columnas('Animales', fila)
  return sinIndefinidos<Animal>({
    id: c.id ?? '',
    nombre: c.nombre ?? '',
    especie: uno(c.especie ?? '', ESPECIES, 'especie'),
    estado: uno(c.estado ?? '', ESTADOS_ANIMAL, 'estado'),
    foto: textoONulo(c.foto ?? ''),
    fechaIngreso: c.fechaIngreso ?? '',
    advertencias: aLista(c.advertencias ?? ''),
    caracter: c.caracter ?? '',
    padrino: textoONulo(c.padrino ?? ''),
    codigo: opcional(c.codigo ?? ''),
    alias: (c.alias ?? '') === '' ? undefined : aLista(c.alias ?? ''),
    canil: opcional(c.canil ?? ''),
  })
}

// ── Tratamiento ──

export function tratamientoAFila(t: Tratamiento): string[] {
  return aFila('Tratamientos', {
    id: t.id,
    animalId: t.animalId,
    medicamento: t.medicamento,
    dosis: t.dosis,
    horas: deLista(t.horas),
    inicio: t.inicio,
    fin: t.fin,
    critico: deBooleano(t.critico),
    activo: deBooleano(t.activo),
  })
}

export function filaATratamiento(fila: string[]): Tratamiento {
  const c = columnas('Tratamientos', fila)
  return sinIndefinidos<Tratamiento>({
    id: c.id ?? '',
    animalId: c.animalId ?? '',
    medicamento: c.medicamento ?? '',
    dosis: c.dosis ?? '',
    horas: aLista(c.horas ?? ''),
    inicio: c.inicio ?? '',
    fin: c.fin ?? '',
    critico: booleanoOpcional(c.critico ?? '', 'critico'),
    activo: booleanoOpcional(c.activo ?? '', 'activo'),
  })
}

// ── Persona (el "agente" de placa viva) ──

export function personaAFila(p: Persona): string[] {
  return aFila('Usuarios', {
    id: p.id,
    nombre: p.nombre,
    cargo: p.cargo,
    rol: p.rol,
    color: p.color,
    foto: p.foto ?? '',
    telefono: p.telefono ?? '',
    activo: deBooleano(p.activo),
  })
}

export function filaAPersona(fila: string[]): Persona {
  const c = columnas('Usuarios', fila)
  return sinIndefinidos<Persona>({
    id: c.id ?? '',
    nombre: c.nombre ?? '',
    cargo: c.cargo ?? '',
    rol: uno(c.rol ?? '', ROLES, 'rol'),
    color: c.color ?? '',
    foto: textoONulo(c.foto ?? ''),
    telefono: opcional(c.telefono ?? ''),
    activo: booleanoOpcional(c.activo ?? '', 'activo'),
  })
}

// ── Registro (el "evento" de placa viva) ──

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

/** Comprueba que sea un objeto con un `tipo` conocido. El detalle de cada tipo lo garantiza quien lo escribió. */
function propuestaValida(crudo: unknown): PropuestaServidor {
  if (!esObjeto(crudo)) throw new Error('La propuesta no es un objeto')
  uno(String(crudo.tipo), TIPOS_PROPUESTA, 'propuesta.tipo')
  // El cast se apoya en el `tipo` ya comprobado; el resto del contenido lo escribió un Registro tipado
  return crudo as PropuestaServidor
}

function propuestaDe(celda: string): PropuestaServidor {
  let crudo: unknown
  try {
    crudo = JSON.parse(celda)
  } catch {
    throw new Error(`La columna propuesta no es JSON: "${celda}"`)
  }
  return propuestaValida(crudo)
}

export function registroAFila(r: Registro): string[] {
  return aFila('Eventos', {
    id: r.id,
    fechaHora: r.fechaHora,
    agenteId: r.agenteId,
    origen: r.origen,
    estado: r.estado,
    propuesta: JSON.stringify(r.propuesta),
    fraseExacta: r.fraseExacta ?? '',
    confianza: deNumero(r.confianza),
    registroIaId: r.registroIaId ?? '',
    mediaUrl: r.mediaUrl ?? '',
    compromisoId: r.compromisoId ?? '',
    confirmadoPor: r.confirmadoPor ?? '',
    confirmadoEn: r.confirmadoEn ?? '',
  })
}

export function filaARegistro(fila: string[]): Registro {
  const c = columnas('Eventos', fila)
  return sinIndefinidos<Registro>({
    id: c.id ?? '',
    fechaHora: c.fechaHora ?? '',
    agenteId: c.agenteId ?? '',
    origen: uno(c.origen ?? '', ORIGENES, 'origen'),
    estado: uno(c.estado ?? '', ESTADOS_REGISTRO, 'estado'),
    propuesta: propuestaDe(c.propuesta ?? ''),
    fraseExacta: opcional(c.fraseExacta ?? ''),
    confianza: numeroOpcional(c.confianza ?? '', 'confianza'),
    registroIaId: opcional(c.registroIaId ?? ''),
    mediaUrl: opcional(c.mediaUrl ?? ''),
    compromisoId: opcional(c.compromisoId ?? ''),
    confirmadoPor: opcional(c.confirmadoPor ?? ''),
    confirmadoEn: opcional(c.confirmadoEn ?? ''),
  })
}

// ── Puente con la cola de Sheets (pendientesSheets de pg-repo.ts) ──

/** Lo que dice la fila 'actualizar' de la cola: un cambio de estado de un registro que ya está en la hoja. */
export interface CambioEstado {
  id: string
  estado: EstadoRegistro
  confirmadoPor: string
  confirmadoEn: string
}

function textoRequerido(payload: Fila, campo: string, donde: string): string {
  const v = payload[campo]
  if (typeof v !== 'string') throw new Error(`Falta ${campo} en ${donde} de la cola de Sheets`)
  return v
}

function textoOpcional(payload: Fila, campo: string): string | undefined {
  const v = payload[campo]
  return typeof v === 'string' ? v : undefined
}

/** El payload de una fila 'agregar' (el Registro completo en JSON) como Registro, listo para registroAFila. */
export function registroDePendiente(payload: Fila): Registro {
  const confianza = payload.confianza
  return sinIndefinidos<Registro>({
    id: textoRequerido(payload, 'id', 'el registro'),
    fechaHora: textoRequerido(payload, 'fechaHora', 'el registro'),
    agenteId: textoRequerido(payload, 'agenteId', 'el registro'),
    origen: uno(textoRequerido(payload, 'origen', 'el registro'), ORIGENES, 'origen'),
    estado: uno(textoRequerido(payload, 'estado', 'el registro'), ESTADOS_REGISTRO, 'estado'),
    propuesta: propuestaValida(payload.propuesta),
    fraseExacta: textoOpcional(payload, 'fraseExacta'),
    confianza: typeof confianza === 'number' ? confianza : undefined,
    registroIaId: textoOpcional(payload, 'registroIaId'),
    mediaUrl: textoOpcional(payload, 'mediaUrl'),
    compromisoId: textoOpcional(payload, 'compromisoId'),
    confirmadoPor: textoOpcional(payload, 'confirmadoPor'),
    confirmadoEn: textoOpcional(payload, 'confirmadoEn'),
  })
}

/** El payload de una fila 'actualizar': { id, estado, confirmadoPor, confirmadoEn }. */
export function cambioEstadoDePendiente(payload: Fila): CambioEstado {
  return {
    id: textoRequerido(payload, 'id', 'el cambio de estado'),
    estado: uno(textoRequerido(payload, 'estado', 'el cambio de estado'), ESTADOS_REGISTRO, 'estado'),
    confirmadoPor: textoRequerido(payload, 'confirmadoPor', 'el cambio de estado'),
    confirmadoEn: textoRequerido(payload, 'confirmadoEn', 'el cambio de estado'),
  }
}

/** La fila de Eventos (tal como la devolvió leer, aunque venga recortada) con el cambio aplicado. No modifica la original. */
export function aplicarCambioEstado(fila: string[], cambio: CambioEstado): string[] {
  const c = columnas('Eventos', fila)
  if (c.id !== cambio.id) throw new Error(`La fila de Eventos es del registro "${c.id}", no de "${cambio.id}"`)
  return aFila('Eventos', { ...c, estado: cambio.estado, confirmadoPor: cambio.confirmadoPor, confirmadoEn: cambio.confirmadoEn })
}

// ── Clínica (la "entidad" de placa viva) ──

export function clinicaAFila(c: Clinica): string[] {
  return aFila('Entidades', { id: c.id, nombre: c.nombre, deuda: String(c.deuda), limite: String(c.limite) })
}

export function filaAClinica(fila: string[]): Clinica {
  const c = columnas('Entidades', fila)
  return { id: c.id ?? '', nombre: c.nombre ?? '', deuda: numero(c.deuda ?? '', 'deuda'), limite: numero(c.limite ?? '', 'limite') }
}

// ── Catálogo ──

export function itemAFila(i: ItemCatalogo): string[] {
  return aFila('Catalogo', {
    id: i.id,
    nombre: i.nombre,
    tipo: i.tipo,
    kgPorUnidad: String(i.kgPorUnidad),
    especieObjetivo: i.especieObjetivo ?? '',
    consumoDiarioKgPorAnimal: deNumero(i.consumoDiarioKgPorAnimal),
  })
}

export function filaAItem(fila: string[]): ItemCatalogo {
  const c = columnas('Catalogo', fila)
  return sinIndefinidos<ItemCatalogo>({
    id: c.id ?? '',
    nombre: c.nombre ?? '',
    tipo: c.tipo ?? '',
    kgPorUnidad: numero(c.kgPorUnidad ?? '', 'kgPorUnidad'),
    especieObjetivo: (c.especieObjetivo ?? '') === '' ? undefined : uno(c.especieObjetivo ?? '', ESPECIES, 'especieObjetivo'),
    consumoDiarioKgPorAnimal: numeroOpcional(c.consumoDiarioKgPorAnimal ?? '', 'consumoDiarioKgPorAnimal'),
  })
}

// ── Padrinazgo ──

export function padrinazgoAFila(p: Padrinazgo): string[] {
  return aFila('Padrinazgos', { id: p.id, personaTelefono: p.personaTelefono, personaNombre: p.personaNombre, animalId: p.animalId, activo: deBooleano(p.activo) })
}

export function filaAPadrinazgo(fila: string[]): Padrinazgo {
  const c = columnas('Padrinazgos', fila)
  return {
    id: c.id ?? '',
    personaTelefono: c.personaTelefono ?? '',
    personaNombre: c.personaNombre ?? '',
    animalId: c.animalId ?? '',
    activo: booleano(c.activo ?? '', 'activo'),
  }
}

// ── Solicitud de adopción ──

export function solicitudAFila(s: Solicitud): string[] {
  return aFila('Solicitudes', {
    id: s.id,
    fecha: s.fecha,
    nombre: s.nombre,
    telefono: s.telefono,
    cedula: s.cedula,
    direccion: s.direccion,
    animalId: s.animalId ?? '',
    familiaDeAcuerdo: deBooleano(s.familiaDeAcuerdo),
    paraQuien: s.paraQuien,
    destinatario: s.destinatario ?? '',
    vivienda: s.vivienda,
    viviendaConMallas: deBooleano(s.viviendaConMallas),
    dondeVivira: s.dondeVivira,
    aceptaEsterilizar: deBooleano(s.aceptaEsterilizar),
    aceptaVacunar: deBooleano(s.aceptaVacunar),
    aceptaSeguimiento: deBooleano(s.aceptaSeguimiento),
    quiereEntregaInmediata: deBooleano(s.quiereEntregaInmediata),
    preguntoPorCaracter: deBooleano(s.preguntoPorCaracter),
    planEmergencia: s.planEmergencia,
    mascotasAnteriores: s.mascotasAnteriores,
    motivo: s.motivo,
    montonManual: s.montonManual ?? '',
    nota: s.nota,
    llamadaAgendada: s.llamadaAgendada ?? '',
  })
}

export function filaASolicitud(fila: string[]): Solicitud {
  const c = columnas('Solicitudes', fila)
  return sinIndefinidos<Solicitud>({
    id: c.id ?? '',
    fecha: c.fecha ?? '',
    nombre: c.nombre ?? '',
    telefono: c.telefono ?? '',
    cedula: c.cedula ?? '',
    direccion: c.direccion ?? '',
    animalId: textoONulo(c.animalId ?? ''),
    familiaDeAcuerdo: booleano(c.familiaDeAcuerdo ?? '', 'familiaDeAcuerdo'),
    paraQuien: uno(c.paraQuien ?? '', PARA_QUIEN, 'paraQuien'),
    destinatario: opcional(c.destinatario ?? ''),
    vivienda: uno(c.vivienda ?? '', VIVIENDAS, 'vivienda'),
    viviendaConMallas: booleano(c.viviendaConMallas ?? '', 'viviendaConMallas'),
    dondeVivira: uno(c.dondeVivira ?? '', DONDE_VIVIRA, 'dondeVivira'),
    aceptaEsterilizar: booleano(c.aceptaEsterilizar ?? '', 'aceptaEsterilizar'),
    aceptaVacunar: booleano(c.aceptaVacunar ?? '', 'aceptaVacunar'),
    aceptaSeguimiento: booleano(c.aceptaSeguimiento ?? '', 'aceptaSeguimiento'),
    quiereEntregaInmediata: booleano(c.quiereEntregaInmediata ?? '', 'quiereEntregaInmediata'),
    preguntoPorCaracter: booleano(c.preguntoPorCaracter ?? '', 'preguntoPorCaracter'),
    planEmergencia: c.planEmergencia ?? '',
    mascotasAnteriores: c.mascotasAnteriores ?? '',
    motivo: c.motivo ?? '',
    montonManual: (c.montonManual ?? '') === '' ? null : uno(c.montonManual ?? '', MONTONES, 'montonManual'),
    nota: c.nota ?? '',
    llamadaAgendada: textoONulo(c.llamadaAgendada ?? ''),
  })
}

// ── Seguimiento de adopción ──

export function seguimientoAFila(s: Seguimiento): string[] {
  return aFila('Seguimientos', {
    id: s.id,
    solicitudId: s.solicitudId ?? '',
    adoptanteNombre: s.adoptanteNombre,
    adoptanteTelefono: s.adoptanteTelefono,
    animalId: s.animalId,
    fechaEntrega: s.fechaEntrega,
    dia: String(s.dia),
    fecha: s.fecha,
    resultado: s.resultado ?? '',
    llamadaHumana: deBooleano(s.llamadaHumana),
    nota: s.nota,
  })
}

export function filaASeguimiento(fila: string[]): Seguimiento {
  const c = columnas('Seguimientos', fila)
  const dia = numero(c.dia ?? '', 'dia')
  const diaValido = DIAS_SEGUIMIENTO.find((d) => d === dia)
  if (diaValido === undefined) throw new Error(`Valor inválido en dia: "${c.dia}" (se esperaba ${DIAS_SEGUIMIENTO.join(', ')})`)
  return sinIndefinidos<Seguimiento>({
    id: c.id ?? '',
    solicitudId: textoONulo(c.solicitudId ?? ''),
    adoptanteNombre: c.adoptanteNombre ?? '',
    adoptanteTelefono: c.adoptanteTelefono ?? '',
    animalId: c.animalId ?? '',
    fechaEntrega: c.fechaEntrega ?? '',
    dia: diaValido,
    fecha: c.fecha ?? '',
    resultado: (c.resultado ?? '') === '' ? null : uno(c.resultado ?? '', MONTONES, 'resultado'),
    llamadaHumana: booleanoOpcional(c.llamadaHumana ?? '', 'llamadaHumana'),
    nota: c.nota ?? '',
  })
}

// ── Config (clave/valor) ──

/** Los tres bloques de DatosSemilla que viven en la hoja Config. */
export interface ConfigHoja {
  config: ConfigServidor
  configComida: ConfigComida
  base: BaseAlbergue
}

/** Filas de datos (sin encabezado) de la hoja Config: [clave, valor]. Las claves anidadas se separan con punto. */
export function configAFilas({ config, configComida, base }: ConfigHoja): string[][] {
  const pares: Array<[string, string]> = [
    ['umbralPreguntar', String(config.umbralPreguntar)],
    ['umbralAutoconfirmar', String(config.umbralAutoconfirmar)],
    ['minutosAutoconfirmar', String(config.minutosAutoconfirmar)],
    ['diasAlertaComida', String(config.diasAlertaComida)],
    ['horaCierre', config.horaCierre],
    ['telefonoAlbergue', config.telefonoAlbergue],
    ['baseUrl', config.baseUrl],
    ['kgPorBulto.perro', String(configComida.kgPorBulto.perro)],
    ['kgPorBulto.gato', String(configComida.kgPorBulto.gato)],
    ['consumoDiarioKg.perro', String(configComida.consumoDiarioKg.perro)],
    ['consumoDiarioKg.gato', String(configComida.consumoDiarioKg.gato)],
    ['diasAviso', String(configComida.diasAviso)],
    ['diasUrgente', String(configComida.diasUrgente)],
    ['conteoInicial.fecha', base.conteoInicial.fecha],
    ['conteoInicial.bultos.perro', String(base.conteoInicial.bultos.perro)],
    ['conteoInicial.bultos.gato', String(base.conteoInicial.bultos.gato)],
    ['cajaInicial.fecha', base.cajaInicial.fecha],
    ['cajaInicial.monto', String(base.cajaInicial.monto)],
    ['vidasCambiadas', String(base.vidasCambiadas)],
  ]
  return pares.map(([clave, valor]) => aFila('Config', { clave, valor }))
}

export function filasAConfig(filas: string[][]): ConfigHoja {
  const valores = new Map(filas.map((f) => [(f[0] ?? '').trim(), f[1] ?? '']))
  const texto = (clave: string): string => {
    const v = valores.get(clave)
    if (v === undefined) throw new Error(`Falta la clave ${clave} en la hoja Config`)
    return v
  }
  const num = (clave: string): number => numero(texto(clave), clave)

  return {
    config: {
      umbralPreguntar: num('umbralPreguntar'),
      umbralAutoconfirmar: num('umbralAutoconfirmar'),
      minutosAutoconfirmar: num('minutosAutoconfirmar'),
      diasAlertaComida: num('diasAlertaComida'),
      horaCierre: texto('horaCierre'),
      telefonoAlbergue: texto('telefonoAlbergue'),
      baseUrl: texto('baseUrl'),
    },
    configComida: {
      kgPorBulto: { perro: num('kgPorBulto.perro'), gato: num('kgPorBulto.gato') },
      consumoDiarioKg: { perro: num('consumoDiarioKg.perro'), gato: num('consumoDiarioKg.gato') },
      diasAviso: num('diasAviso'),
      diasUrgente: num('diasUrgente'),
    },
    base: {
      conteoInicial: { fecha: texto('conteoInicial.fecha'), bultos: { perro: num('conteoInicial.bultos.perro'), gato: num('conteoInicial.bultos.gato') } },
      cajaInicial: { fecha: texto('cajaInicial.fecha'), monto: num('cajaInicial.monto') },
      vidasCambiadas: num('vidasCambiadas'),
    },
  }
}

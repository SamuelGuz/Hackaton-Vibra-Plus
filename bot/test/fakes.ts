// WhatsApp, Gemini, archivos y base de datos falsos para probar la conversación sin red.
import type { NuevaSolicitudAdopcion, SolicitudGuardada } from '../src/adopcion/solicitudes.js'
import type { CambioSolicitud } from '../src/adopcion/tipos.js'
import type { DatosAlbergue, PorConfirmar } from '../src/panel-tipos.js'
import type {
  Accion,
  Deps,
  Entendido,
  EntradaIa,
  EntrantePendiente,
  Estado,
  EstadoRegistro,
  NuevoMiembro,
  NuevoRegistro,
  Repo,
  Salida,
  SolicitudEquipo,
  Usuario,
} from '../src/tipos.js'
import type { MensajeWa } from '../src/wa/webhook.js'

/** Martes 27 de octubre de 2026, 3:00 p. m. en Bogotá */
export const AHORA = new Date('2026-10-27T15:00:00-05:00')
export const HOY = '2026-10-27'

export const LUIS: Usuario = { id: 1, nombre: 'Don Luis', rol: 'cuidador', telefono: '573000000001' }
export const ANDREA: Usuario = { id: 2, nombre: 'Andrea', rol: 'bienestar', telefono: '573000000002' }
export const CAROLINA: Usuario = { id: 3, nombre: 'Carolina', rol: 'admin', telefono: '573000000003' }

export function datosDePrueba(): DatosAlbergue {
  return {
    personas: [LUIS, ANDREA, CAROLINA].map((u) => ({ id: String(u.id), nombre: u.nombre, cargo: '', rol: u.rol, color: '#000', foto: null })),
    animales: [
      { id: '10', nombre: 'Tobías', especie: 'perro', estado: 'tratamiento', foto: null, fechaIngreso: '2026-01-01', advertencias: [], caracter: '', padrino: null, alias: ['Tobi'] } as DatosAlbergue['animales'][number],
      { id: '11', nombre: 'Mateo', especie: 'perro', estado: 'tratamiento', foto: null, fechaIngreso: '2026-01-01', advertencias: [], caracter: '', padrino: null },
      { id: '12', nombre: 'Luna', especie: 'gato', estado: 'adoptable', foto: null, fechaIngreso: '2026-01-01', advertencias: [], caracter: '', padrino: null },
    ],
    tratamientos: [
      { id: '100', animalId: '10', medicamento: 'Fenobarbital', dosis: '1 pastilla', horas: ['14:00'], inicio: '2026-10-01', fin: '2026-12-31' },
      { id: '101', animalId: '11', medicamento: 'Amoxicilina', dosis: '3 ml', horas: ['08:00', '20:00'], inicio: '2026-10-20', fin: '2026-11-05' },
    ],
    dosisDadas: [],
    inventario: [],
    conteoInicial: { fecha: '2026-10-25', bultos: { perro: 3, gato: 3 } },
    movimientos: [],
    cajaInicial: { fecha: '2026-10-24', monto: 1_000_000 },
    clinicas: [{ id: '50', nombre: 'Clínica Veterinaria San Roque', deuda: 1_550_000, limite: 2_500_000 }],
    porConfirmar: [],
    notas: [],
    // 45 perros y 25 gatos, como en la semilla
    configComida: { kgPorBulto: { perro: 25, gato: 10 }, consumoDiarioKg: { perro: 16.875, gato: 1.625 }, diasAviso: 6, diasUrgente: 4 },
    vidasCambiadas: 0,
  }
}

interface RegistroFalso extends NuevoRegistro {
  id: string
  estadoActual: EstadoRegistro
  creadoEn: string
}

export class RepoFalso implements Repo {
  usuarios = [LUIS, ANDREA, CAROLINA]
  datos = datosDePrueba()
  registros: RegistroFalso[] = []
  estados = new Map<number, { estado: Estado; actualizadoEn: Date }>()
  buzon = new Map<string, EntrantePendiente & { estado: 'pendiente' | 'atendido' | 'fallido'; proximoEn: Date; error?: string }>()
  sesiones = new Map<string, number>()
  ahora = AHORA

  inactivos = new Set<number>()
  solicitudes: SolicitudEquipo[] = []

  async usuarioPorTelefono(t: string) {
    return this.usuarios.find((u) => u.telefono === t.replace(/\D/g, '') && !this.inactivos.has(u.id)) ?? null
  }
  async usuarioPorId(id: number) {
    return this.usuarios.find((u) => u.id === id && !this.inactivos.has(u.id)) ?? null
  }
  async anotarSolicitud(telefono: string, nombre: string | null) {
    const ya = this.solicitudes.find((s) => s.telefono === telefono)
    if (ya) {
      ya.mensajes++
      ya.nombre = nombre ?? ya.nombre
    } else this.solicitudes.push({ telefono, nombre, mensajes: 1, ultimoMensajeEn: this.ahora.toISOString() })
  }
  async equipo() {
    return {
      personas: this.usuarios.map((u) => ({ ...u, activo: !this.inactivos.has(u.id) })),
      solicitudes: [...this.solicitudes],
    }
  }
  async agregarAlEquipo(m: NuevoMiembro) {
    let u = this.usuarios.find((x) => x.telefono === m.telefono)
    if (u) Object.assign(u, { nombre: m.nombre, rol: m.rol })
    else this.usuarios.push((u = { id: this.usuarios.length + 1, ...m }))
    this.inactivos.delete(u.id)
    this.solicitudes = this.solicitudes.filter((s) => s.telefono !== m.telefono)
    return { ...u }
  }
  async cambiarActivo(id: number, activo: boolean) {
    if (!this.usuarios.some((u) => u.id === id)) return false
    if (activo) this.inactivos.delete(id)
    else this.inactivos.add(id)
    return true
  }
  async descartarSolicitud(telefono: string) {
    this.solicitudes = this.solicitudes.filter((s) => s.telefono !== telefono)
  }
  async contarSolicitudes() {
    return this.solicitudes.length
  }
  async guardarEntrante(m: MensajeWa, ahora: Date) {
    if (this.buzon.has(m.id)) return false
    this.buzon.set(m.id, { ...m, intentos: 0, recibidoEn: ahora, estado: 'pendiente', proximoEn: ahora })
    return true
  }
  async entrantesPendientes(ahora: Date, limite: number) {
    return [...this.buzon.values()]
      .filter((x) => x.estado === 'pendiente' && x.proximoEn <= ahora)
      .slice(0, limite)
      .map(({ estado: _e, proximoEn: _p, error: _x, ...m }) => m)
  }
  async cerrarEntrante(id: string, estado: 'atendido' | 'fallido', error?: string) {
    const x = this.buzon.get(id)
    if (x) Object.assign(x, { estado, error })
  }
  async reintentarEntrante(id: string, proximoEn: Date, error: string) {
    const x = this.buzon.get(id)
    if (x) Object.assign(x, { intentos: x.intentos + 1, proximoEn, error })
  }
  async leerEstado(id: number) {
    return this.estados.get(id) ?? null
  }
  async guardarEstado(id: number, estado: Estado) {
    this.estados.set(id, { estado, actualizadoEn: this.ahora })
  }
  async hoy() {
    const d = structuredClone(this.datos)
    d.porConfirmar = this.registros
      .filter((r) => r.canal === 'whatsapp')
      .map(
        (r): PorConfirmar => ({
          id: r.id,
          fechaHora: r.creadoEn,
          origen: r.tipoEntrada === 'imagen' ? 'foto' : 'audio',
          quien: String(r.usuarioId),
          textoOriginal: r.transcripcion,
          propuestas: r.acciones,
          estado: ({ por_confirmar: 'pendiente', confirmado: 'confirmado', corregido: 'corregido', anulado: 'descartado' } as const)[r.estadoActual],
        }),
      )
    return d
  }
  async crearRegistro(n: NuevoRegistro) {
    const ya = n.clienteId && this.registros.find((r) => r.clienteId === n.clienteId)
    if (ya) return ya.id
    const id = String(this.registros.length + 1)
    const hhmm = `${String(this.ahora.getHours()).padStart(2, '0')}:${String(this.ahora.getMinutes()).padStart(2, '0')}`
    this.registros.push({ ...n, id, estadoActual: n.estado, creadoEn: `${HOY}T${hhmm}` })
    if (n.estado === 'confirmado') this.aplicar(n.acciones, n.usuarioId, `${HOY}T${hhmm}`, id)
    return id
  }
  async leerRegistro(id: string) {
    const r = this.registros.find((x) => x.id === id || (!!x.clienteId && x.clienteId === id))
    return r ? { id: r.id, usuarioId: r.usuarioId, estado: r.estadoActual, acciones: r.acciones, mediaUrl: r.mediaUrl ?? null } : null
  }
  async cambiarEstado(ids: string[], estado: EstadoRegistro) {
    let n = 0
    for (const r of this.registros) {
      if (!ids.includes(r.id) && !ids.includes(r.clienteId ?? '')) continue
      if (r.estadoActual === 'anulado') continue
      if (estado === 'confirmado' && r.estadoActual !== 'por_confirmar') continue
      if (estado === 'confirmado') this.aplicar(r.acciones, r.usuarioId, r.creadoEn, r.id)
      // Como la base: lo confirmado que se corrige o se anula deja de contar
      else if (r.estadoActual === 'confirmado') this.deshacer(r)
      r.estadoActual = estado
      n++
    }
    return n
  }
  async crearSesion(usuarioId: number) {
    const token = `token-${usuarioId}-${this.sesiones.size}`
    this.sesiones.set(token, usuarioId)
    return token
  }

  async duenoDeRecibo(url: string) {
    const r = this.registros.find(
      (x) =>
        x.acciones.some((a) => a.tipo === 'movimiento' || a.tipo === 'deuda') &&
        (x.mediaUrl === url || x.acciones.some((a) => a.tipo === 'movimiento' && a.movimiento.foto === url)),
    )
    if (r) return { usuarioId: r.usuarioId }
    return this.datos.movimientos.some((m) => m.foto === url) ? { usuarioId: null } : null
  }

  /** Solicitudes de adopción, con la clave de origen para no duplicar (como el índice único de la base) */
  adopcion: (SolicitudGuardada & { claveOrigen: string })[] = []
  async guardarSolicitudAdopcion(s: NuevaSolicitudAdopcion, ahora: Date) {
    const ya = this.adopcion.find((x) => x.claveOrigen === s.claveOrigen)
    const animalId = s.respuestas.animalId && this.datos.animales.some((a) => a.id === s.respuestas.animalId) ? s.respuestas.animalId : null
    const visita = s.visitaPropuesta ? s.visitaPropuesta.toISOString() : null
    if (ya) {
      // Lo de la coordinación (montón, nota, llamada) no se toca
      Object.assign(ya, s.respuestas, {
        animalId,
        visitaPropuesta: visita ?? ya.visitaPropuesta,
        visitaEstado: visita ? 'propuesta' : ya.visitaEstado,
        puntajeIdoneidad: s.puntajeIdoneidad ?? ya.puntajeIdoneidad,
        puntajeRiesgo: s.puntajeRiesgo ?? ya.puntajeRiesgo,
      })
      return { id: ya.id, nueva: false }
    }
    const id = String(this.adopcion.length + 1)
    this.adopcion.push({
      ...s.respuestas, animalId, id, fecha: ahora.toISOString(), montonManual: null, nota: '', llamadaAgendada: null,
      origen: s.origen, claveOrigen: s.claveOrigen, visitaPropuesta: visita, visitaEstado: visita ? 'propuesta' : null,
      puntajeIdoneidad: s.puntajeIdoneidad ?? null, puntajeRiesgo: s.puntajeRiesgo ?? null,
    })
    return { id, nueva: true }
  }
  async solicitudesAdopcion() {
    return this.adopcion.map(({ claveOrigen: _, ...s }) => ({ ...s }))
  }
  async cambiarSolicitudAdopcion(id: string, cambio: CambioSolicitud) {
    const s = this.adopcion.find((x) => x.id === id)
    if (!s) return false
    Object.assign(s, cambio)
    return true
  }

  /** Lo confirmado pasa a los datos, como lo haría la base */
  private aplicar(acciones: Accion[], usuarioId: number, fechaHora: string, registroId: string) {
    const quien = String(usuarioId)
    for (const [i, a] of acciones.entries()) {
      const id = `r${registroId}-${i}`
      if (a.tipo === 'dosis') this.datos.dosisDadas.push({ id, tratamientoId: a.tratamientoId, hora: a.hora, fechaHora, quien, origen: 'bot' })
      if (a.tipo === 'inventario') {
        // Como la base: los kilos sueltos llegan también en bultos equivalentes
        const kg = a.unidad === 'kg' ? { kg: a.cambio, unidad: 'kg' as const, producto: a.producto } : {}
        const cambio = a.unidad === 'kg' ? a.cambio / this.datos.configComida.kgPorBulto[a.especie] : a.cambio
        this.datos.inventario.push({ id, fechaHora, tipo: a.especie, cambio, quien, origen: 'bot', ...kg })
      }
      if (a.tipo === 'movimiento') this.datos.movimientos.push({ id, fechaHora, quien, ...a.movimiento })
      if (a.tipo === 'nota') this.datos.notas.push({ id, animalId: a.animalId, texto: a.texto, fechaHora, quien })
      if (a.tipo === 'deuda') this.datos.clinicas.find((k) => k.id === a.clinicaId)!.deuda += a.monto
    }
  }

  private deshacer(r: RegistroFalso) {
    const deOtro = (x: { id: string }) => !x.id.startsWith(`r${r.id}-`)
    this.datos.dosisDadas = this.datos.dosisDadas.filter(deOtro)
    this.datos.inventario = this.datos.inventario.filter(deOtro)
    this.datos.movimientos = this.datos.movimientos.filter(deOtro)
    this.datos.notas = this.datos.notas.filter(deOtro)
    for (const a of r.acciones) if (a.tipo === 'deuda') this.datos.clinicas.find((k) => k.id === a.clinicaId)!.deuda -= a.monto
  }

  porEstado(estado: EstadoRegistro) {
    return this.registros.filter((r) => r.estadoActual === estado)
  }
}

export class WaFalso {
  enviados: { telefono: string; salida: Salida }[] = []
  /** Sin definir por defecto, como un WhatsApp que no muestra "escribiendo…"; las pruebas lo ponen cuando lo miran */
  escribiendo?: (mensajeId: string) => Promise<void>

  async enviar(telefono: string, salida: Salida) {
    this.enviados.push({ telefono, salida })
  }
  async descargar(mediaId: string) {
    return { datos: Buffer.from(`archivo ${mediaId}`), mime: mediaId.startsWith('img') ? 'image/jpeg' : 'audio/ogg; codecs=opus' }
  }
  /** Lo último que vio la persona */
  ultimo(): Salida {
    return this.enviados[this.enviados.length - 1].salida
  }
  ultimoTexto(): string {
    return this.ultimo().texto
  }
  /** Ids de los botones o filas del último mensaje */
  opciones(): string[] {
    const s = this.ultimo()
    if (s.tipo === 'botones') return s.botones.map((b) => b.id)
    if (s.tipo === 'lista') return s.filas.map((f) => f.id)
    return []
  }
  limpiar() {
    this.enviados = []
  }
}

export class IaFalsa {
  llamadas: EntradaIa[] = []
  respuesta: Entendido | Error = { transcripcion: '', acciones: [], confianza: 0, futuras: 0 }
  async entender(e: EntradaIa) {
    this.llamadas.push(e)
    if (this.respuesta instanceof Error) throw this.respuesta
    return this.respuesta
  }
  responder(r: Partial<Entendido>) {
    // Por defecto un poco dudosa: así un audio queda por confirmar. Desde 0,9 se guarda solo (libre.ts).
    this.respuesta = { transcripcion: '', acciones: [], confianza: 0.8, futuras: 0, ...r }
  }
}

export function crearDeps() {
  const repo = new RepoFalso()
  const wa = new WaFalso()
  const ia = new IaFalsa()
  const dibujos: string[] = []
  let n = 0
  const deps: Deps = {
    repo,
    wa,
    ia,
    archivos: { guardar: async (_d, mime) => `/archivos/f${++n}.${mime.startsWith('image') ? 'jpg' : 'ogg'}` },
    dibujar: async (html) => {
      dibujos.push(html)
      return Buffer.from('png')
    },
    panelUrl: 'https://panel.huellitas.test',
    ahora: () => repo.ahora,
  }
  return { deps, repo, wa, ia, dibujos }
}

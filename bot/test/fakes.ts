// WhatsApp, Gemini, archivos y base de datos falsos para probar la conversación sin red.
import type { DatosAlbergue, PorConfirmar } from '../src/panel-tipos.js'
import type {
  Accion,
  Deps,
  Entendido,
  EntradaIa,
  Estado,
  EstadoRegistro,
  NuevoMiembro,
  NuevoRegistro,
  Repo,
  Salida,
  SolicitudEquipo,
  Usuario,
} from '../src/tipos.js'

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
  mensajes = new Set<string>()
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
  async marcarMensaje(id: string) {
    if (this.mensajes.has(id)) return false
    this.mensajes.add(id)
    return true
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
    if (n.estado === 'confirmado') this.aplicar(n.acciones, n.usuarioId, `${HOY}T${hhmm}`)
    return id
  }
  async leerRegistro(id: string) {
    const r = this.registros.find((x) => x.id === id)
    return r ? { id: r.id, usuarioId: r.usuarioId, estado: r.estadoActual, acciones: r.acciones, mediaUrl: r.mediaUrl ?? null } : null
  }
  async cambiarEstado(ids: string[], estado: EstadoRegistro) {
    let n = 0
    for (const r of this.registros) {
      if (!ids.includes(r.id) && !ids.includes(r.clienteId ?? '')) continue
      if (r.estadoActual === 'anulado') continue
      if (estado === 'confirmado' && r.estadoActual !== 'por_confirmar') continue
      if (estado === 'confirmado') this.aplicar(r.acciones, r.usuarioId, r.creadoEn)
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

  /** Lo confirmado pasa a los datos, como lo haría la base */
  private aplicar(acciones: Accion[], usuarioId: number, fechaHora: string) {
    const quien = String(usuarioId)
    for (const a of acciones) {
      const id = `x${Math.random()}`
      if (a.tipo === 'dosis') this.datos.dosisDadas.push({ id, tratamientoId: a.tratamientoId, hora: a.hora, fechaHora, quien, origen: 'bot' })
      if (a.tipo === 'inventario') this.datos.inventario.push({ id, fechaHora, tipo: a.especie, cambio: a.cambio, quien, origen: 'bot' })
      if (a.tipo === 'movimiento') this.datos.movimientos.push({ id, fechaHora, quien, ...a.movimiento })
      if (a.tipo === 'nota') this.datos.notas.push({ id, animalId: a.animalId, texto: a.texto, fechaHora, quien })
      if (a.tipo === 'deuda') this.datos.clinicas.find((k) => k.id === a.clinicaId)!.deuda += a.monto
    }
  }

  porEstado(estado: EstadoRegistro) {
    return this.registros.filter((r) => r.estadoActual === estado)
  }
}

export class WaFalso {
  enviados: { telefono: string; salida: Salida }[] = []
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
    this.respuesta = { transcripcion: '', acciones: [], confianza: 0.9, futuras: 0, ...r }
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

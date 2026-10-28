// Repo en memoria: pruebas, demo y arranque sin DATABASE_URL (D5). Guarda y devuelve copias,
// así lo que cambie quien llama no altera lo guardado (igual que una base de datos).
import type { Seguimiento, Solicitud } from '@huellitas/shared/adopcion/tipos'
import { animalIdDe, type BaseAlbergue, type ConfigServidor, type EstadoRegistro, type ItemCatalogo, type Padrinazgo, type Registro } from '@huellitas/shared/registro'
import type { Animal, Clinica, ConfigComida, Persona, Tratamiento } from '@huellitas/shared/tipos'
import type { DatosSemilla, Repo } from './repo'

const copia = <T>(valor: T): T => structuredClone(valor)

/** La fecha de Bogotá de un registro: los 10 primeros caracteres de su fechaHora ('2026-10-27T14:01:00-05:00'). */
const diaDe = (r: Registro) => r.fechaHora.slice(0, 10)

export class MemoryRepo implements Repo {
  private personasLista: Persona[]
  private animalesLista: Animal[]
  private tratamientosLista: Tratamiento[]
  private clinicasLista: Clinica[]
  private configComidaDatos: ConfigComida
  private configDatos: ConfigServidor
  private catalogoLista: ItemCatalogo[]
  private baseDatos: BaseAlbergue
  private padrinazgosLista: Padrinazgo[]
  private registrosLista: Registro[]
  private solicitudesLista: Solicitud[]
  private seguimientosLista: Seguimiento[]

  constructor(semilla: DatosSemilla) {
    const s = copia(semilla)
    this.personasLista = s.personas
    this.animalesLista = s.animales
    this.tratamientosLista = s.tratamientos
    this.clinicasLista = s.clinicas
    this.configComidaDatos = s.configComida
    this.configDatos = s.config
    this.catalogoLista = s.catalogo
    this.baseDatos = s.base
    this.padrinazgosLista = s.padrinazgos
    this.registrosLista = s.registros ?? []
    this.solicitudesLista = s.solicitudes ?? []
    this.seguimientosLista = s.seguimientos ?? []
  }

  async personas(): Promise<Persona[]> {
    return copia(this.personasLista)
  }

  async personaPorId(id: string): Promise<Persona | null> {
    return copia(this.personasLista.find((p) => p.id === id) ?? null)
  }

  async personaPorTelefono(telefono: string): Promise<Persona | null> {
    return copia(this.personasLista.find((p) => p.telefono === telefono) ?? null)
  }

  async crearPersona(p: Persona): Promise<void> {
    const i = this.personasLista.findIndex((x) => x.id === p.id)
    if (i >= 0) this.personasLista[i] = copia(p)
    else this.personasLista.push(copia(p))
  }

  async animales(): Promise<Animal[]> {
    return copia(this.animalesLista)
  }

  async animalPorId(id: string): Promise<Animal | null> {
    return copia(this.animalesLista.find((a) => a.id === id) ?? null)
  }

  async animalPorCodigo(codigo: string): Promise<Animal | null> {
    const buscado = codigo.toUpperCase()
    return copia(this.animalesLista.find((a) => a.codigo?.toUpperCase() === buscado) ?? null)
  }

  async tratamientos(animalId?: string): Promise<Tratamiento[]> {
    return copia(this.tratamientosLista.filter((t) => animalId === undefined || t.animalId === animalId))
  }

  async registrosDelDia(fecha: string, animalId?: string): Promise<Registro[]> {
    return this.registrosEntre(fecha, fecha, animalId)
  }

  async registrosEntre(desde: string, hasta: string, animalId?: string): Promise<Registro[]> {
    return copia(
      this.registrosLista.filter((r) => {
        const dia = diaDe(r)
        return dia >= desde && dia <= hasta && (animalId === undefined || animalIdDe(r.propuesta) === animalId)
      }),
    )
  }

  async registroPorId(id: string): Promise<Registro | null> {
    return copia(this.registrosLista.find((r) => r.id === id) ?? null)
  }

  async registrosPorIa(registroIaId: string): Promise<Registro[]> {
    return copia(this.registrosLista.filter((r) => r.registroIaId === registroIaId))
  }

  async registrosPorEstado(estado: EstadoRegistro): Promise<Registro[]> {
    return copia(this.registrosLista.filter((r) => r.estado === estado))
  }

  async agregarRegistros(registros: Registro[]): Promise<string[]> {
    const nuevos: string[] = []
    for (const r of registros) {
      if (this.registrosLista.some((x) => x.id === r.id)) continue
      this.registrosLista.push(copia(r))
      nuevos.push(r.id)
    }
    return nuevos
  }

  async cambiarEstado(ids: string[], estado: EstadoRegistro, por: string, en: string): Promise<number> {
    let cambiados = 0
    for (const r of this.registrosLista) {
      if (!ids.includes(r.id)) continue
      r.estado = estado
      r.confirmadoPor = por
      r.confirmadoEn = en
      cambiados++
    }
    return cambiados
  }

  async clinicas(): Promise<Clinica[]> {
    return copia(this.clinicasLista)
  }

  async configComida(): Promise<ConfigComida> {
    return copia(this.configComidaDatos)
  }

  async config(): Promise<ConfigServidor> {
    return copia(this.configDatos)
  }

  async catalogo(): Promise<ItemCatalogo[]> {
    return copia(this.catalogoLista)
  }

  async base(): Promise<BaseAlbergue> {
    return copia(this.baseDatos)
  }

  async padrinazgosActivos(): Promise<Padrinazgo[]> {
    return copia(this.padrinazgosLista.filter((p) => p.activo))
  }

  async solicitudes(): Promise<Solicitud[]> {
    return copia(this.solicitudesLista)
  }

  async solicitudPorId(id: string): Promise<Solicitud | null> {
    return copia(this.solicitudesLista.find((s) => s.id === id) ?? null)
  }

  async guardarSolicitud(s: Solicitud): Promise<void> {
    const i = this.solicitudesLista.findIndex((x) => x.id === s.id)
    if (i >= 0) this.solicitudesLista[i] = copia(s)
    else this.solicitudesLista.push(copia(s))
  }

  async seguimientos(): Promise<Seguimiento[]> {
    return copia(this.seguimientosLista)
  }

  async guardarSeguimiento(s: Seguimiento): Promise<void> {
    const i = this.seguimientosLista.findIndex((x) => x.id === s.id)
    if (i >= 0) this.seguimientosLista[i] = copia(s)
    else this.seguimientosLista.push(copia(s))
  }
}

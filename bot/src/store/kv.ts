// Almacén clave-valor para lo efímero: idempotencia de webhooks, candados, ventana de 24 h,
// contexto de animal, tokens de un solo uso. Las implementaciones: MemoryKv (aquí) y PgKv (T9).

export interface Kv {
  /** Valor guardado, o null si no existe o ya venció. */
  get(key: string): Promise<string | null>
  /** Guarda (o pisa) el valor. Con ttlSegundos vence pasado ese tiempo; sin él, no vence. */
  put(key: string, value: string, ttlSegundos?: number): Promise<void>
  delete(key: string): Promise<void>
  /**
   * Guarda solo si la clave no existe (o ya venció), en una operación atómica.
   * Devuelve true si guardó y false si ya había un valor vigente (sin pisarlo).
   */
  ponerSiNoExiste(key: string, value: string, ttlSegundos: number): Promise<boolean>
}

/** Kv en memoria, con reloj inyectable (milisegundos) para probar los vencimientos. */
export class MemoryKv implements Kv {
  private datos = new Map<string, { value: string; venceEn: number | null }>()

  constructor(private ahora: () => number = Date.now) {}

  private vigente(key: string): string | null {
    const e = this.datos.get(key)
    if (!e) return null
    if (e.venceEn !== null && this.ahora() >= e.venceEn) {
      this.datos.delete(key)
      return null
    }
    return e.value
  }

  async get(key: string): Promise<string | null> {
    return this.vigente(key)
  }

  async put(key: string, value: string, ttlSegundos?: number): Promise<void> {
    this.datos.set(key, { value, venceEn: ttlSegundos === undefined ? null : this.ahora() + ttlSegundos * 1000 })
  }

  async delete(key: string): Promise<void> {
    this.datos.delete(key)
  }

  async ponerSiNoExiste(key: string, value: string, ttlSegundos: number): Promise<boolean> {
    if (this.vigente(key) !== null) return false
    this.datos.set(key, { value, venceEn: this.ahora() + ttlSegundos * 1000 })
    return true
  }
}

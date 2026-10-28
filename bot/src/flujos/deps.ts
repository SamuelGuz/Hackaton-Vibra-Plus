// Dependencias que reciben los flujos, las rutas y los crons. En producción son las reales;
// en las pruebas: MemoryRepo, MemoryKv, WhatsApp falso, IA falsa y un reloj fijo.
import type { Env } from '../env'
import type { IaApi } from '../ia/tipos'
import type { Kv } from '../store/kv'
import type { Repo } from '../store/repo'
import type { WaApi } from '../wa/tipos'

export interface Deps {
  env: Env
  repo: Repo
  kv: Kv
  wa: WaApi
  ia: IaApi
  /** Reloj inyectable: nunca llamar a `new Date()` directo en los flujos */
  ahora: () => Date
}

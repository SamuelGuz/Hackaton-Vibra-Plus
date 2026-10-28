// Enrutamiento del buzón: quien está registrado en el equipo sigue por el flujo interno (`base`);
// cualquier otro número lo atiende el agente emocional de adopciones.
import type { Deps } from '../flujos/deps'
import type { ContextoExterno } from '../rag/tipos'
import type { Procesador } from '../wa/trabajador'
import { atenderInteresadoExterno } from './whatsapp'

/**
 * Envuelve el `Procesador` de master. Es del equipo quien tiene una persona con ese teléfono y no está dada de baja
 * (`activo !== false`); una persona inactiva se trata como cualquier desconocida.
 *
 * Al externo no se le crean registros (no es bitácora del albergue): solo respuestas, que el buzón guarda junto con el cierre del mensaje.
 * Si la consulta de personas falla, el error sube y el buzón reintenta: no se adivina quién es.
 */
export function crearProcesadorExterno(o: { base: Procesador; deps: Deps; ctx: ContextoExterno }): Procesador {
  return {
    async procesar(entrante, medio) {
      const persona = await o.deps.repo.personaPorTelefono(entrante.telefono)
      if (persona && persona.activo !== false) return o.base.procesar(entrante, medio)
      const { respuestas } = await atenderInteresadoExterno(o.deps, entrante, o.ctx)
      return { registros: [], respuestas }
    },
  }
}

// Vacíos de PRIVACIDAD / habeas data (Ley 1581 de 2012, Colombia) del agente de adopciones.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerAgente } from '../../../src/adopciones-agente/agente.js'
import { claveMemoria } from '../../../src/adopciones-agente/memoria.js'
import { crudo, excelente, TEL } from '../ayudas.js'
import { atenderInteresadoExterno } from '../../../src/adopciones-agente/index.js'
import { AHORA } from '../../fakes.js'
import { brecha, escenario, montarApp, webhook } from './ayudas-vacios.js'

let e: ReturnType<typeof escenario>
beforeEach(() => {
  e = escenario()
})
afterEach(() => vi.restoreAllMocks())

const HORA = 3_600_000

describe('datos personales que la persona escribe', () => {
  it('[P-01] cédula y celular escritos en el chat se tachan antes de mandarlos a Gemini (como ya se hace con el equipo)', async () => {
    e.t.llm.responder(crudo())
    await e.escribir('Mi cédula es 1.234.567.890 y mi celular 311 555 0001, escríbanme')
    const enviado = e.t.llm.llamadas[0].mensajes.at(-1)!.texto
    expect(enviado).not.toMatch(/1\.234\.567\.890|311 555 0001|3115550001/)
  })

  it('[P-02] esos mismos datos tampoco viajan en la consulta al RAG (que puede ir a embeddings de Gemini)', async () => {
    e.t.llm.responder(crudo())
    await e.escribir('Mi cédula es 1234567890, busco un perrito tranquilo')
    expect(e.t.rag.consultas.join(' ')).not.toMatch(/1234567890/)
  })

  it('[P-03] el historial guardado en la sesión no conserva esos datos en claro', async () => {
    e.t.llm.responder(crudo(), crudo())
    await e.escribir('Mi cédula es 1234567890')
    await e.escribir('gracias')
    const segunda = e.t.llm.llamadas[1].mensajes.map((m) => m.texto).join(' ')
    expect(segunda).not.toMatch(/1234567890/)
  })
})

describe('aviso de privacidad y consentimiento', () => {
  it('[P-04] el primer mensaje que recibe una persona nueva incluye aviso de tratamiento de datos / cómo pedir su borrado', async () => {
    e.t.llm.responder(crudo())
    await e.escribir('cuéntame de los peluditos')
    expect(e.alTelefono(TEL).join('\n')).toMatch(/datos personales|privacidad|pol[ií]tica de|habeas|Ley 1581|autoriz/i)
  })

  it('[P-05] el prompt le indica al agente qué decir si le preguntan qué hace con sus datos', async () => {
    e.t.llm.responder(crudo())
    await e.escribir('cuéntame de los peluditos')
    expect(e.t.llm.llamadas[0].sistema).toMatch(/datos personales|privacidad|tratamiento de (sus )?datos/i)
  })
})

describe('"no me escriban más" (baja) y derecho de supresión', () => {
  for (const mensaje of ['BAJA', 'STOP', 'no me escriban más', 'ya no quiero que me escriban', 'cancelar suscripción']) {
    it(`[P-06] "${mensaje}" corta la conversación sin gastar Gemini y lo confirma`, async () => {
      e.t.llm.responder(crudo())
      await e.escribir(mensaje)
      expect(e.t.llm.llamadas).toHaveLength(0)
      expect(e.alTelefono(TEL).join('\n')).toMatch(/no te (escribir|volver)|dado de baja|no recibir/i)
    })
  }

  it('[P-07] después de una baja, el agente deja de contestar y de avisar a las administradoras', async () => {
    const app = montarApp(e.t)
    e.t.llm.responder(excelente({ nombre: 'Ana' }))
    await webhook(app, TEL, 'wamid.stop', 'STOP')
    await app.ociosa()
    const solicitudesTrasBaja = e.t.repo.solicitudes.map((s) => ({ ...s }))
    await webhook(app, TEL, 'wamid.despues', 'hola otra vez')
    await app.ociosa()
    expect(e.t.llm.llamadas).toHaveLength(0)
    expect(e.avisos()).toEqual([])
    expect(e.t.repo.solicitudes).toEqual(solicitudesTrasBaja)
  })

  it('[P-08] "borren mis datos" elimina la sesión (historial, evaluación) y se lo confirma', async () => {
    e.t.llm.responder(crudo({ nombre: 'Ana' }))
    await e.escribir('hola, soy Ana')
    expect(obtenerAgente(e.t.deps).sesiones.tiene(`wa:${TEL}`)).toBe(true)
    await e.escribir('Por favor borren mis datos')
    expect(obtenerAgente(e.t.deps).sesiones.tiene(`wa:${TEL}`)).toBe(false)
    expect(e.alTelefono(TEL).at(-1)).toMatch(/borr|elimin/i)
  })

  it('[P-09] la baja queda en almacenamiento por clave hasheada y se respeta tras reiniciar el agente', async () => {
    await e.escribir('STOP')
    const claveBaja = claveMemoria(`baja:${TEL.replace(/\D/g, '')}`)
    expect(e.t.repo.memoria.get(claveBaja)?.valor).toEqual({ version: 1, no_contactar: true })
    expect([...e.t.repo.memoria.keys()]).not.toContain(TEL)
    const depsReiniciado = { ...e.t.deps }
    await atenderInteresadoExterno(depsReiniciado, TEL, { tipo: 'texto', texto: 'hola otra vez' }, e.t.ctx)
    expect(e.t.llm.llamadas).toHaveLength(0)
    expect(e.alTelefono(TEL)).toHaveLength(1)
  })
})

describe('qué se guarda y por cuánto tiempo', () => {
  it('[P-10] tras 6 h sin hablar la conversación vuelve a empezar (no se arrastra el historial viejo)', async () => {
    e.t.llm.responder(crudo({ respuesta: 'Uno' }), crudo({ respuesta: 'Dos' }))
    await e.escribir('hola, soy Ana')
    e.t.repo.ahora = new Date(AHORA.getTime() + 7 * HORA)
    await e.escribir('cuéntame de los peluditos')
    expect(e.t.llm.llamadas[1].mensajes).toEqual([{ rol: 'user', texto: 'cuéntame de los peluditos' }])
    expect(e.t.llm.llamadas[1].sistema).toContain('MENSAJE NÚMERO 1')
  })

  it('[P-11] una sesión caducada se borra de memoria sola (sin esperar a que la persona vuelva ni a llegar a 500)', async () => {
    e.t.llm.responder(crudo())
    await e.escribir('cuéntame de los peluditos')
    e.t.repo.ahora = new Date(AHORA.getTime() + 7 * HORA)
    // nadie vuelve a escribir: se pide el tamaño tal como está
    expect(obtenerAgente(e.t.deps).sesiones.tamano()).toBe(0)
  })

  it('[P-12] la sesión sobrevive a un reinicio del bot (la especificación L3(d) pide guardarla en Kv, no en memoria)', async () => {
    e.t.llm.responder(crudo({ respuesta: 'Uno' }), crudo({ respuesta: 'Dos' }))
    await e.escribir('Mi cédula es 1234567890; quiero conocer un perrito')
    const valoresGuardados = [...e.t.repo.memoria.values()].map((x) => x.valor)
    expect(JSON.stringify(valoresGuardados)).not.toContain('1234567890')
    expect([...e.t.repo.memoria.keys()]).not.toContain(TEL)
    const depsReiniciado = { ...e.t.deps } // mismo repo/Kv, proceso nuevo: el WeakMap del agente arranca vacío
    await atenderInteresadoExterno(depsReiniciado, TEL, { tipo: 'texto', texto: 'sigo aquí' }, e.t.ctx)
    expect(e.t.llm.llamadas[1].mensajes).toHaveLength(3)
  })

  it('[P-13] el aviso a las administradoras no copia lo que la persona escribió (solo datos resumidos)', async () => {
    e.t.llm.responder(excelente({ nombre: 'Ana', respuesta: 'Qué bonito hogar' }))
    await e.escribir('Mi secreto: tengo una deuda enorme pero igual quiero a Toby, vivo en casa propia')
    const aviso = e.avisos().join('\n')
    expect(aviso).not.toContain('deuda enorme')
    expect(aviso).not.toContain('Mi secreto')
  })

  brecha('[P-14] el log de errores no imprime el teléfono completo de la persona (dato personal en logs)', async () => {
    e.t.llm.responder(crudo())
    e.t.wa.enviar = async () => {
      throw new Error('Meta 500')
    }
    await e.escribir('cuéntame de los peluditos')
    const logs = e.consola.error.mock.calls.flat().map(String).join(' ')
    expect(logs).not.toContain(TEL)
  })
})

describe('integración con app.ts (quien escribe sin ser del equipo)', () => {
  it('[P-15] un desconocido recibe respuesta del agente y no el aviso "no estás registrado"', async () => {
    const app = montarApp(e.t)
    e.t.llm.responder(crudo({ respuesta: 'Mira, te cuento la historia de Toby' }))
    await webhook(app, TEL, 'wamid.1', 'cuéntame de los peluditos')
    await app.ociosa()
    expect(e.alTelefono(TEL)).toHaveLength(1)
    expect(e.alTelefono(TEL)[0]).toContain('Mira, te cuento la historia de Toby')
    expect(e.alTelefono(TEL)[0]).toMatch(/datos personales|privacidad|tratamiento/i)
  })

  it('[P-16] el adoptante curioso NO queda anotado en "solicitudes para unirse al equipo" (con su nombre de perfil de WhatsApp)', async () => {
    const app = montarApp(e.t)
    e.t.llm.responder(crudo())
    await webhook(app, TEL, 'wamid.1', 'cuéntame de los peluditos')
    await app.ociosa()
    expect(e.t.repo.solicitudes).toEqual([])
  })
})

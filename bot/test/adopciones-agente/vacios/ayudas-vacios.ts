// Ayudas de las pruebas de "vacíos" del agente de adopciones (no es una prueba: vitest solo corre *.test.ts).
import { createHmac } from 'node:crypto'
import { it } from 'vitest'
import { atenderInteresadoExterno } from '../../../src/adopciones-agente/index.js'
import { crearApp } from '../../../src/app.js'
import type { Entrada, Usuario } from '../../../src/tipos.js'
import { CAROLINA } from '../../fakes.js'
import { montar, silenciarConsola, TEL, texto } from '../ayudas.js'

/**
 * Un VACÍO real: la prueba afirma el comportamiento BUENO. Hoy el código no lo cumple, así que `it.fails` la mantiene
 * en verde y documenta el hueco. Cuando alguien lo arregle, vitest avisa ("Expect test to fail") y se cambia a `it`.
 */
/** Con VACIOS_VER=1 las brechas corren como pruebas normales: sirve para leer POR QUÉ fallan (un assert real, no un error del test). */
export const brecha: typeof it.fails = process.env.VACIOS_VER ? (it as unknown as typeof it.fails) : it.fails

export const MARIA: Usuario = { id: 4, nombre: 'María', rol: 'adopciones', telefono: '573000000004' }
export const SECRETO = 'secreto-de-prueba'

export type Montaje = ReturnType<typeof montar>

export function escenario() {
  const t = montar()
  const consola = silenciarConsola()
  const escribir = (msg: string | Entrada, tel = TEL) => atenderInteresadoExterno(t.deps, tel, typeof msg === 'string' ? texto(msg) : msg, t.ctx)
  /** Textos enviados a un teléfono, en orden */
  const alTelefono = (tel: string) => t.wa.enviados.filter((e) => e.telefono === tel).map((e) => (e.salida.tipo === 'texto' ? e.salida.texto : ''))
  const avisos = () => alTelefono(CAROLINA.telefono)
  const agregarAdmin = (u: Usuario) => {
    t.repo.usuarios.push(u)
    t.repo.datos.personas.push({ id: String(u.id), nombre: u.nombre, cargo: '', rol: u.rol, color: '#000', foto: null })
  }
  return { t, consola, escribir, alTelefono, avisos, agregarAdmin }
}

/** La app completa (WhatsApp + rutas públicas), con el frente externo conectado */
export function montarApp(t: Montaje) {
  return crearApp({
    deps: t.deps,
    externo: { ...t.ctx, correo: { config: { remitente: 'Huellitas <hola@huellitas.test>', urlBase: 'https://huellitas.test', whatsappPublico: '573001112233' }, enviador: null } },
    usuarioPorSesion: async () => null,
    eventos: async () => ({ dosis: [], inventario: [], movimientos: [], notas: [] }),
    leerArchivo: async () => null,
    verifyToken: 'verificar',
    appSecret: SECRETO,
  })
}

export function webhook(app: ReturnType<typeof montarApp>, de: string, id: string, texto: string) {
  const cuerpo = JSON.stringify({
    entry: [{ changes: [{ value: { contacts: [{ wa_id: de, profile: { name: 'Pepito Perez' } }], messages: [{ id, from: de, type: 'text', text: { body: texto } }] } }] }],
  })
  const sig = `sha256=${createHmac('sha256', SECRETO).update(cuerpo).digest('hex')}`
  return app.request('/wa', { method: 'POST', body: cuerpo, headers: { 'x-hub-signature-256': sig, 'content-type': 'application/json' } })
}

/** Lo que ve la persona: todo lo enviado a ese teléfono, unido */
export const todo = (xs: string[]) => xs.join('\n')

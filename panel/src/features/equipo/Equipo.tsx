// Equipo (solo administración): quién le escribió al bot sin estar en la lista, agregar a alguien
// y quitar a quien ya no está. Habla directo con el servidor: sin señal no se puede cambiar.
import { useCallback, useEffect, useState } from 'react'
import { Boton } from '../../components/Boton'
import { useSesion } from '../../app/sesion'
import {
  agregarAlEquipo,
  cambiarActivo,
  descartarSolicitud,
  ErrorApi,
  pedirEquipo,
  type Equipo as DatosEquipo,
  type SolicitudEquipo,
} from '../../data/api'
import { useDatos } from '../../data/DatosProvider'
import type { Rol } from '../../data/tipos'
import styles from './Equipo.module.css'

const ROLES: { id: Rol; texto: string }[] = [
  { id: 'cuidador', texto: 'Cuidador' },
  { id: 'voluntario', texto: 'Voluntario' },
  { id: 'bienestar', texto: 'Bienestar animal' },
  { id: 'adopciones', texto: 'Adopciones' },
  { id: 'comunicacion', texto: 'Comunicación' },
  { id: 'admin', texto: 'Administración' },
]
const nombreRol = (rol: Rol) => ROLES.find((r) => r.id === rol)?.texto ?? rol

/** 573001234567 → +57 300 123 4567 */
export function telefonoBonito(t: string): string {
  const m = /^57(\d{3})(\d{3})(\d{4})$/.exec(t)
  return m ? `+57 ${m[1]} ${m[2]} ${m[3]}` : `+${t}`
}

function cuando(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

const mensajeDe = (e: unknown) =>
  e instanceof ErrorApi ? e.message : 'No hay señal. Intenta otra vez cuando vuelva.'

interface PropsFormulario {
  /** Si viene, el número ya se sabe (llegó por WhatsApp) y no se pregunta */
  telefono?: string
  nombreInicial?: string
  ocupado: boolean
  alAgregar: (m: { nombre: string; rol: Rol; telefono: string }) => void
  children?: React.ReactNode
}

function FormularioMiembro({ telefono, nombreInicial = '', ocupado, alAgregar, children }: PropsFormulario) {
  const [nombre, setNombre] = useState(nombreInicial)
  const [numero, setNumero] = useState('')
  const [rol, setRol] = useState<Rol | null>(null)
  const tel = telefono ?? numero
  const listo = nombre.trim() !== '' && rol !== null && tel.replace(/\D/g, '').length >= 10

  return (
    <form
      className={styles.formulario}
      onSubmit={(e) => {
        e.preventDefault()
        if (listo && rol) alAgregar({ nombre: nombre.trim(), rol, telefono: tel })
      }}
    >
      <label className={styles.campo}>
        <span>Nombre</span>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" maxLength={60} />
      </label>
      {telefono === undefined && (
        <label className={styles.campo}>
          <span>Teléfono de WhatsApp</span>
          <input
            type="tel"
            inputMode="tel"
            placeholder="300 123 4567"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            autoComplete="off"
          />
        </label>
      )}
      <fieldset className={styles.roles}>
        <legend>¿Qué hace en Huellitas?</legend>
        {ROLES.map((r) => (
          <button key={r.id} type="button" className={styles.rol} aria-pressed={rol === r.id} onClick={() => setRol(r.id)}>
            {r.texto}
          </button>
        ))}
      </fieldset>
      <div className={styles.acciones}>
        <Boton icono="mas" type="submit" ancho disabled={!listo || ocupado}>
          Agregar al equipo
        </Boton>
        {children}
      </div>
    </form>
  )
}

function Solicitud({ s, ocupado, alAgregar, alDescartar }: {
  s: SolicitudEquipo
  ocupado: boolean
  alAgregar: PropsFormulario['alAgregar']
  alDescartar: () => void
}) {
  return (
    <li className={styles.tarjeta} aria-label={s.nombre ?? telefonoBonito(s.telefono)}>
      <p className={styles.quien}>
        <strong>{s.nombre ?? 'Sin nombre en WhatsApp'}</strong>
        <span className="numero">{telefonoBonito(s.telefono)}</span>
      </p>
      <p className={styles.nota}>
        {s.mensajes === 1 ? 'Escribió una vez' : `Escribió ${s.mensajes} veces`} · último mensaje {cuando(s.ultimoMensajeEn)}
      </p>
      <FormularioMiembro telefono={s.telefono} nombreInicial={s.nombre ?? ''} ocupado={ocupado} alAgregar={alAgregar}>
        <Boton icono="menos" variante="secundario" ancho disabled={ocupado} onClick={alDescartar}>
          No es del equipo
        </Boton>
      </FormularioMiembro>
    </li>
  )
}

export function Equipo() {
  const { modo, token, datos } = useDatos()
  const { persona: yo } = useSesion()
  const [equipo, setEquipo] = useState<DatosEquipo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [aMano, setAMano] = useState(false)

  const cargar = useCallback(async () => {
    if (!token) return
    try {
      setEquipo(await pedirEquipo(token))
      setError(null)
    } catch (e) {
      setError(mensajeDe(e))
    }
  }, [token])

  useEffect(() => {
    void cargar()
  }, [cargar])

  /** Corre un cambio en el servidor, muestra el resultado y vuelve a pedir la lista */
  const hacer = async (fn: () => Promise<string>) => {
    setOcupado(true)
    setAviso(null)
    try {
      setAviso(await fn())
      setError(null)
    } catch (e) {
      setError(mensajeDe(e))
    } finally {
      setOcupado(false)
      void cargar()
    }
  }

  const agregar: PropsFormulario['alAgregar'] = (m) =>
    hacer(async () => {
      const r = await agregarAlEquipo(token!, m)
      setAMano(false)
      return r.avisado
        ? `Listo: ${r.persona.nombre} ya está en el equipo. Le llegó un WhatsApp de bienvenida.`
        : `Listo: ${r.persona.nombre} ya está en el equipo. Dile que le escriba "hola" al bot.`
    })

  if (modo === 'demo') {
    return (
      <div className={styles.equipo}>
        <h1>Equipo</h1>
        <p className={styles.nota}>Esto es una demostración. Para agregar personas, entra con el enlace que te manda el bot.</p>
        <ul className={styles.lista}>
          {datos.personas.map((p) => (
            <li key={p.id} className={styles.persona}>
              <strong>{p.nombre}</strong>
              <span className={styles.nota}>{nombreRol(p.rol)}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const activos = equipo?.personas.filter((p) => p.activo) ?? []
  const inactivos = equipo?.personas.filter((p) => !p.activo) ?? []

  return (
    <div className={styles.equipo}>
      <h1>Equipo</h1>
      {aviso && (
        <p className={styles.listo} role="status">
          {aviso}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!equipo && !error && <p className={styles.nota}>Cargando…</p>}

      {equipo && (
        <>
          <section className={styles.seccion} aria-labelledby="quieren-entrar">
            <h2 id="quieren-entrar">Quieren entrar</h2>
            {equipo.solicitudes.length === 0 ? (
              <p className={styles.nota}>Nadie nuevo. Cuando alguien que no está en la lista le escriba al bot, aparece aquí.</p>
            ) : (
              <ul className={styles.lista}>
                {equipo.solicitudes.map((s) => (
                  <Solicitud
                    key={s.telefono}
                    s={s}
                    ocupado={ocupado}
                    alAgregar={agregar}
                    alDescartar={() =>
                      hacer(async () => {
                        await descartarSolicitud(token!, s.telefono)
                        return `Listo, ${telefonoBonito(s.telefono)} salió de la lista.`
                      })
                    }
                  />
                ))}
              </ul>
            )}
          </section>

          <section className={styles.seccion}>
            {aMano ? (
              <div className={styles.tarjeta}>
                <h2>Agregar a alguien</h2>
                <FormularioMiembro ocupado={ocupado} alAgregar={agregar}>
                  <Boton icono="atras" variante="secundario" ancho onClick={() => setAMano(false)}>
                    Cancelar
                  </Boton>
                </FormularioMiembro>
              </div>
            ) : (
              <Boton icono="mas" variante="secundario" ancho onClick={() => setAMano(true)}>
                Agregar a alguien con su número
              </Boton>
            )}
          </section>

          <section className={styles.seccion} aria-labelledby="el-equipo">
            <h2 id="el-equipo">En el equipo ({activos.length})</h2>
            <ul className={styles.lista}>
              {[...activos, ...inactivos].map((p) => (
                <li key={p.id} className={`${styles.persona} ${p.activo ? '' : styles.inactivo}`} aria-label={p.nombre}>
                  <p className={styles.quien}>
                    <strong>{p.nombre}</strong>
                    <span className={styles.nota}>
                      {nombreRol(p.rol)} · <span className="numero">{telefonoBonito(p.telefono)}</span>
                      {!p.activo && ' · ya no está'}
                    </span>
                  </p>
                  {String(p.id) !== yo?.id && (
                    <Boton
                      icono={p.activo ? 'menos' : 'mas'}
                      variante={p.activo ? 'peligro' : 'secundario'}
                      disabled={ocupado}
                      onClick={() =>
                        hacer(async () => {
                          await cambiarActivo(token!, p.id, !p.activo)
                          return p.activo
                            ? `${p.nombre} ya no está en el equipo: el bot no le va a responder.`
                            : `${p.nombre} volvió al equipo.`
                        })
                      }
                    >
                      {p.activo ? 'Quitar' : 'Volver a agregar'}
                    </Boton>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}

// Marco de las pantallas con sesión: arriba quién está y la señal; abajo las pestañas del rol.
import { Link, NavLink, Outlet } from 'react-router-dom'
import { EstadoConexion, useEnLinea } from '../components/EstadoConexion'
import { Huella } from '../components/Huella'
import { Icono } from '../components/Icono'
import { useDatos } from '../data/DatosProvider'
import { PESTANAS } from './pestanas'
import { useSesion } from './sesion'
import styles from './Marco.module.css'

export function Marco() {
  const { persona, salir } = useSesion()
  const { datos, modo, pendientes: sinEnviar, problema, solicitudesEquipo } = useDatos()
  const enLinea = useEnLinea()
  if (!persona) return null

  const pestanas = PESTANAS[persona.rol]
  const pendientes = datos.porConfirmar.filter((p) => p.estado === 'pendiente').length

  return (
    <div className={styles.marco}>
      <header className={styles.cabecera}>
        <Huella tamano={30} />
        <EstadoConexion enLinea={enLinea} pendientes={sinEnviar} />
        {/* Las pestañas de la administradora ya están llenas (máximo 4): Equipo va aquí arriba */}
        {persona.rol === 'admin' && (
          <NavLink to="/equipo" className={styles.equipo}>
            <Icono nombre="mas" tamano={22} />
            <span>Equipo</span>
            {solicitudesEquipo > 0 && (
              <span className={styles.cuenta} aria-label={`${solicitudesEquipo} quieren entrar`}>
                {solicitudesEquipo}
              </span>
            )}
          </NavLink>
        )}
        {modo === 'demo' ? (
          <Link to="/" className={styles.persona} onClick={salir}>
            {persona.nombre} · Cambiar
          </Link>
        ) : (
          <span className={styles.persona}>{persona.nombre}</span>
        )}
      </header>
      {problema && (
        <p className={styles.problema} role="alert">
          {problema}
        </p>
      )}

      <main className={styles.contenido}>
        <Outlet />
      </main>

      <nav className={styles.pestanas} aria-label="Pantallas" style={{ gridTemplateColumns: `repeat(${pestanas.length}, 1fr)` }}>
        {pestanas.map((p) => (
          <NavLink key={p.ruta} to={p.ruta} className={styles.pestana}>
            <Icono nombre={p.icono} tamano={28} />
            <span>{p.texto}</span>
            {p.ruta === '/confirmar' && pendientes > 0 && (
              <span className={styles.cuenta} aria-label={`${pendientes} sin confirmar`}>
                {pendientes}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

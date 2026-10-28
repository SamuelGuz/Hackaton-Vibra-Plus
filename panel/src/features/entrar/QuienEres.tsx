import { useNavigate } from 'react-router-dom'
import { useSesion } from '../../app/sesion'
import { useDatos } from '../../data/DatosProvider'
import { Inicial } from '../../components/Inicial'
import { Huella } from '../../components/Huella'
import { BotonSol } from '../../components/BotonSol'
import { giro } from '../../lib/mano'
import { saludo } from '../../lib/formato'
import styles from './QuienEres.module.css'

export function QuienEres() {
  const { datos } = useDatos()
  const { entrar } = useSesion()
  const navegar = useNavigate()

  return (
    <main className={styles.pagina}>
      <header className={styles.cabecera}>
        <div className={styles.marca}>
          <Huella tamano={34} />
          <span>Huellitas</span>
        </div>
        <BotonSol />
      </header>

      <section className={styles.saludo}>
        <p className={styles.hola}>{saludo()}</p>
        <h1>¿Quién eres?</h1>
        <p className={styles.ayuda}>Toca tu nombre para empezar.</p>
      </section>

      <ul className={styles.lista}>
        {datos.personas.map((p) => (
          <li key={p.id} style={{ rotate: `${giro(p.id, 0.7)}deg` }}>
            <button
              type="button"
              className={styles.persona}
              onClick={() => {
                entrar(p.id)
                navegar('/hoy')
              }}
            >
              <Inicial id={p.id} nombre={p.nombre} color={p.color} foto={p.foto} tamano={76} />
              <span className={styles.texto}>
                <span className={styles.nombre}>{p.nombre}</span>
                <span className={styles.cargo}>{p.cargo}</span>
              </span>
              <svg className={styles.flecha} width="34" height="34" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 12.4c4.6-.3 9.4-.2 14.6.1M13.4 6.6c2 1.9 3.9 3.8 5.7 5.8-1.9 1.8-3.8 3.7-5.5 5.6" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      <p className={styles.pie}>Sin contraseñas. Lo que anotes se guarda en este celular aunque no haya señal.</p>
    </main>
  )
}

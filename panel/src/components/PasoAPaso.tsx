import type { ReactNode } from 'react'
import { Icono } from './Icono'
import styles from './PasoAPaso.module.css'

interface Props {
  /** Paso actual, desde 1 */
  paso: number
  total: number
  /** La única pregunta de esta pantalla */
  pregunta: string
  alVolver: () => void
  children: ReactNode
}

/** Flujo de una sola pregunta por pantalla, con puntos de avance y "Atrás" siempre a la vista. */
export function PasoAPaso({ paso, total, pregunta, alVolver, children }: Props) {
  return (
    <section className={styles.paso}>
      <div className={styles.barra}>
        <button type="button" className={styles.atras} onClick={alVolver}>
          <Icono nombre="atras" tamano={24} />
          <span>Atrás</span>
        </button>
        <div className={styles.avance}>
          <span className={styles.puntos} aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={i < paso ? styles.hecho : undefined} />
            ))}
          </span>
          <span className={styles.texto}>{`Paso ${paso} de ${total}`}</span>
        </div>
      </div>
      <h1 className={styles.pregunta}>{pregunta}</h1>
      {children}
    </section>
  )
}

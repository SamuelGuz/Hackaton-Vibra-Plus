import type { Nivel as TipoNivel } from '../lib/calculos'
import styles from './Nivel.module.css'

const INFO: Record<TipoNivel, { signo: string; palabra: string }> = {
  bien: { signo: '✓', palabra: 'Bien' },
  ojo: { signo: '!', palabra: 'Ojo' },
  urgente: { signo: '✕', palabra: 'Urgente' },
}

/** Semáforo que nunca es solo color: color + signo + palabra (daltonismo y sol). */
export function Nivel({ nivel }: { nivel: TipoNivel }) {
  const { signo, palabra } = INFO[nivel]
  return (
    <span className={`${styles.nivel} ${styles[nivel]}`}>
      <span className={styles.signo} aria-hidden="true">
        {signo}
      </span>
      <span>{palabra}</span>
    </span>
  )
}

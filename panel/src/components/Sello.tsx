import { useEffect } from 'react'
import { horaBonita } from '../lib/formato'
import styles from './Sello.module.css'

interface Props {
  /** Qué se hizo, en una palabra: "Dada" */
  texto: string
  /** Hora en formato 24 h: '07:12' */
  hora: string
  quien: string
  /** true solo cuando el sello acaba de caer (anima y vibra una vez) */
  animar?: boolean
}

/** Sello de goma: confirma que algo quedó hecho, cuándo y por quién. */
export function Sello({ texto, hora, quien, animar = false }: Props) {
  useEffect(() => {
    if (animar) navigator.vibrate?.(40)
  }, [animar])

  return (
    <span className={`${styles.sello} ${animar ? styles.animar : ''}`}>
      <span className={styles.texto}>{`${texto} ✓`}</span>
      <span className={styles.detalle}>{`${horaBonita(hora)} · ${quien}`}</span>
    </span>
  )
}

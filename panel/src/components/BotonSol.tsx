// Interruptor del modo "sol fuerte" (máximo contraste). Se recuerda en el celular.
import { useEffect, useState } from 'react'
import styles from './BotonSol.module.css'

const CLAVE = 'huellitas.sol'

function leer(): boolean {
  try {
    return localStorage.getItem(CLAVE) === 'fuerte'
  } catch {
    return false
  }
}

export function BotonSol() {
  const [fuerte, setFuerte] = useState(leer)

  useEffect(() => {
    document.documentElement.dataset.sol = fuerte ? 'fuerte' : ''
    try {
      localStorage.setItem(CLAVE, fuerte ? 'fuerte' : '')
    } catch {
      // Sin almacenamiento: funciona igual, solo no se recuerda
    }
  }, [fuerte])

  return (
    <button type="button" className={styles.boton} aria-pressed={fuerte} onClick={() => setFuerte((v) => !v)}>
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="12" cy="12" r="4.2" fill={fuerte ? 'currentColor' : 'none'} />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M5.2 18.8l1.6-1.6M17.2 6.8l1.6-1.6" />
      </svg>
      <span>{fuerte ? 'Sol fuerte: sí' : 'Sol fuerte'}</span>
    </button>
  )
}

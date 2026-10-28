// Pantalla completa para cuando el panel todavía no puede mostrar datos.
import type { ReactNode } from 'react'
import { Huella } from '../components/Huella'
import styles from './PantallaAviso.module.css'

export function PantallaAviso({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <main className={styles.pantalla}>
      <Huella tamano={56} />
      <h1>{titulo}</h1>
      {children}
    </main>
  )
}

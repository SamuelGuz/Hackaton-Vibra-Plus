import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icono, type NombreIcono } from './Icono'
import styles from './Boton.module.css'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Siempre ícono + palabra: los íconos solos se malinterpretan. */
  icono: NombreIcono
  children: ReactNode
  variante?: 'principal' | 'secundario' | 'peligro'
  /** normal = 64 px (mínimo con guantes) · grande = 72 px */
  tamano?: 'normal' | 'grande'
  ancho?: boolean
}

export function Boton({
  icono,
  children,
  variante = 'principal',
  tamano = 'normal',
  ancho = false,
  className,
  type = 'button',
  ...resto
}: Props) {
  const clases = [styles.boton, styles[variante], styles[tamano], ancho && styles.ancho, className]
    .filter(Boolean)
    .join(' ')
  return (
    <button type={type} className={clases} {...resto}>
      <Icono nombre={icono} tamano={tamano === 'grande' ? 30 : 26} />
      <span>{children}</span>
    </button>
  )
}

import type { ReactNode } from 'react'
import estilos from './Boton.module.css'

type Variante = 'primario' | 'secundario'

interface Props {
  href: string
  children: ReactNode
  variante?: Variante
  conFlecha?: boolean
  externo?: boolean
}

// Enlace con forma de botón (receta de docs/DESIGN.md §8). Un solo primario por pantalla.
export default function Boton({ href, children, variante = 'primario', conFlecha = true, externo }: Props) {
  return (
    <a
      href={href}
      className={`${estilos.boton} ${estilos[variante]}`}
      {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <span>{children}</span>
      {conFlecha && (
        <svg className={estilos.flecha} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </a>
  )
}

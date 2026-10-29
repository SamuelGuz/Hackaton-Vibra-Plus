import { useId } from 'react'
import Boton from '../../componentes/Boton'
import type { Cta } from '../../contenido/historia'
import { hrefDestino } from './contenido'
import c from './comun.module.css'

interface Props {
  cta: Cta
  variante?: 'primario' | 'secundario'
  /** Shown next to a CTA that cannot work yet (pending number). */
  notaPendiente?: string
}

// A content CTA as a real link, or a visibly disabled control while its destination is pending.
export default function CtaSeccion({ cta, variante = 'primario', notaPendiente = 'Número por confirmar' }: Props) {
  const idNota = useId()
  const href = hrefDestino(cta.destino)

  if (!href) {
    return (
      <span className={c.ctaInactivo}>
        <button type="button" disabled className={c.botonInactivo} aria-describedby={idNota}>
          {cta.texto}
        </button>
        <span id={idNota} className={c.notaInactivo}>
          {notaPendiente}
        </span>
      </span>
    )
  }

  return (
    <Boton href={href} variante={variante} externo={href.startsWith('http')}>
      {cta.texto}
    </Boton>
  )
}

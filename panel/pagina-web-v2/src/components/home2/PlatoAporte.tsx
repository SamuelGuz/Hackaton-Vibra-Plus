'use client'

import { useId } from 'react'
import { pesos } from '../home/progreso'
import s from './PlatoAporte.module.css'

/** Illustrates the selected amount; it never represents meals or a completed payment. */
export function PlatoAporte({ monto }: { monto: number }) {
  const id = useId()
  const altura = 12 + Math.min(1, Math.max(0, monto) / 50000) * 35
  return (
    <div className={s.plato}>
      <svg viewBox="0 0 240 140" aria-hidden="true">
        <defs><clipPath id={id}><ellipse cx="120" cy="69" rx="88" ry="28" /></clipPath></defs>
        <ellipse className={s.base} cx="120" cy="117" rx="85" ry="8" />
        <path className={s.cuenco} d="M22 69h196l-22 43c-17 19-135 19-152 0Z" />
        <ellipse className={s.borde} cx="120" cy="69" rx="98" ry="34" />
        <g clipPath={`url(#${id})`}>
          <ellipse className={s.interior} cx="120" cy="69" rx="88" ry="28" />
          <rect className={s.comida} x="32" y={97 - altura} width="176" height={altura} />
          {[55, 81, 107, 133, 159, 185].map((x, i) => <circle key={x} className={s.grano} cx={x} cy={91 - altura + (i % 2) * 8} r="8" />)}
        </g>
        <path className={s.marca} d="M105 109h30" />
      </svg>
      <p aria-live="polite"><span>Tu aporte elegido</span><strong>{pesos(monto)}</strong></p>
      <small>Ilustración del aporte. No equivale a una cantidad de comida.</small>
    </div>
  )
}

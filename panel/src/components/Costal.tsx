import { useId } from 'react'
import type { Especie } from '../data/tipos'
import type { Nivel as TipoNivel } from '../lib/calculos'
import { diasHablados } from '../lib/formato'
import { Nivel } from './Nivel'
import styles from './Costal.module.css'

/** Con 10 días o más el costal se ve lleno. */
const DIAS_LLENO = 10

export function rellenoCostal(dias: number): number {
  return Math.min(1, Math.max(0, dias / DIAS_LLENO))
}

const CUERPO = 'M22 30c18 4 38 4 56 0 8 22 10 50 6 76-2 10-14 14-34 14s-32-4-34-14c-4-26-2-54 6-76z'
const COLOR: Record<TipoNivel, string> = { bien: 'var(--bien)', ojo: 'var(--ojo)', urgente: 'var(--urgente)' }

/** Bulto de concentrado que se vacía según los días de comida que quedan. */
export function Costal({ especie, dias, nivel }: { especie: Especie; dias: number; nivel: TipoNivel }) {
  const clip = useId()
  const alto = rellenoCostal(dias) * 88
  const enteros = Math.floor(dias)

  return (
    <figure className={styles.costal}>
      <svg
        viewBox="0 0 100 124"
        className={styles.dibujo}
        role="img"
        aria-label={`Costal de comida de ${especie}: quedan ${diasHablados(dias)}`}
      >
        <clipPath id={clip}>
          <path d={CUERPO} />
        </clipPath>
        <path d={CUERPO} fill="var(--papel-claro)" />
        <rect
          className={styles.relleno}
          x="0"
          y={120 - alto}
          width="100"
          height={alto}
          fill={COLOR[nivel]}
          clipPath={`url(#${clip})`}
        />
        <g fill="none" stroke="var(--tinta)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d={CUERPO} />
          <path d="M26 29c-3-7-3-13 0-20 8 4 16 4 24 0 8 4 16 4 24 0 3 7 3 13 0 20" />
          <path d="M40 60c6 1 13 1 20-.2M43 70c4.6.4 9.4.4 14 0" opacity="0.5" />
        </g>
      </svg>
      <figcaption className={styles.texto}>
        <span className={styles.especie}>{especie === 'perro' ? 'Perro' : 'Gato'}</span>
        <span className={styles.dias}>
          <span className="numero">{enteros}</span>
          <span className={styles.unidad}>{enteros === 1 ? 'día' : 'días'}</span>
        </span>
        <Nivel nivel={nivel} />
      </figcaption>
    </figure>
  )
}

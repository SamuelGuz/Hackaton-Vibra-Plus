import { circuloAMano } from '../lib/mano'
import styles from './Inicial.module.css'

interface Props {
  id: string
  nombre: string
  color: string
  foto?: string | null
  tamano?: number
}

/** Círculo con la inicial a marcador. Si hay foto, la muestra recortada en la misma forma. */
export function Inicial({ id, nombre, color, foto, tamano = 72 }: Props) {
  const forma = circuloAMano(id, 50, 50, 46)
  const letra = nombre.replace(/^(Don|Doña)\s+/i, '').charAt(0).toUpperCase()
  const clip = `clip-${id}`

  return (
    <svg className={styles.inicial} width={tamano} height={tamano} viewBox="0 0 100 100" aria-hidden="true">
      {foto ? (
        <>
          <clipPath id={clip}>
            <path d={forma} />
          </clipPath>
          <image href={foto} width="100" height="100" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} />
        </>
      ) : (
        <>
          <path d={forma} fill={color} />
          <text x="50" y="52" className={styles.letra} textAnchor="middle" dominantBaseline="central">
            {letra}
          </text>
        </>
      )}
      {/* Segundo trazo encima, levemente corrido: como cuando se repasa con marcador */}
      <path d={circuloAMano(id + '·', 50, 50, 46, 0.05)} fill="none" stroke="var(--tinta)" strokeWidth="2.5" opacity="0.85" />
    </svg>
  )
}

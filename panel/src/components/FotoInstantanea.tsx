import type { Animal } from '../data/tipos'
import { giro, semilla } from '../lib/mano'
import styles from './FotoInstantanea.module.css'

type AnimalFoto = Pick<Animal, 'id' | 'nombre' | 'especie' | 'foto'>

// Fondos de la tarjeta "sin foto": uno fijo por animal
const FONDOS = ['var(--foto-1)', 'var(--foto-2)', 'var(--foto-3)', 'var(--foto-4)']

function Silueta({ animal }: { animal: AnimalFoto }) {
  const fondo = FONDOS[Math.floor(semilla(animal.id)() * FONDOS.length)]
  return (
    <svg
      className={styles.imagen}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${animal.nombre}, ${animal.especie} sin foto`}
      style={{ background: fondo }}
    >
      <g fill="var(--tinta)" opacity="0.78" stroke="var(--tinta)" strokeWidth="2" strokeLinejoin="round">
        {animal.especie === 'perro' ? (
          <>
            <path d="M36 92c-3-13-2-27 5-37 3-4 15-4 18 0 7 10 8 24 5 37z" />
            <path d="M50 18c-10 0-16 7-16 16 0 9 7 15 16 15s16-6 16-15c0-9-6-16-16-16z" />
            <path d="M37 23c-7 1-10 8-9 17 1 4 4 5 6 2 2-5 3-11 3-19zM63 23c7 1 10 8 9 17-1 4-4 5-6 2-2-5-3-11-3-19z" />
          </>
        ) : (
          <>
            <path d="M38 92c-3-13-1-25 5-35 3-4 11-4 14 0 6 10 8 22 5 35z" />
            <path d="M50 24c-9 0-15 6-15 14 0 8 7 13 15 13s15-5 15-13c0-8-6-14-15-14z" />
            <path d="M37 32l-1-15 11 9zM63 32l1-15-11 9z" />
            <path d="M61 90c9 0 15-4 16-11 1-5-2-9-6-9" fill="none" strokeWidth="5" strokeLinecap="round" />
          </>
        )}
      </g>
    </svg>
  )
}

/** Foto del animal como una instantánea pegada en la libreta: borde blanco, girada y con el nombre a mano. */
export function FotoInstantanea({ animal, ancho = 150 }: { animal: AnimalFoto; ancho?: number }) {
  return (
    <figure className={styles.foto} style={{ width: ancho, rotate: `${giro(animal.id, 1.5)}deg` }}>
      {animal.foto ? (
        <img className={styles.imagen} src={animal.foto} alt={animal.nombre} loading="lazy" />
      ) : (
        <Silueta animal={animal} />
      )}
      <figcaption className={`${styles.nombre} ${ancho < 120 ? styles.chica : ''}`}>{animal.nombre}</figcaption>
    </figure>
  )
}

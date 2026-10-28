import { nivelClinica } from '../lib/calculos'
import { pesos } from '../lib/formato'
import { Nivel } from './Nivel'
import styles from './Termometro.module.css'

interface Props {
  nombre: string
  deuda: number
  limite: number
}

/** Deuda con una clínica como termómetro de campaña, con la raya roja del límite. */
export function Termometro({ nombre, deuda, limite }: Props) {
  const nivel = nivelClinica({ id: nombre, nombre, deuda, limite })
  // La escala deja un 15 % de aire después del límite para que la raya se vea
  const escala = Math.max(limite * 1.15, deuda)
  const relleno = (deuda / escala) * 100
  const raya = (limite / escala) * 100
  const falta = limite - deuda

  return (
    <div className={styles.termometro}>
      <div className={styles.cabecera}>
        <h3 className={styles.nombre}>{nombre}</h3>
        <Nivel nivel={nivel} />
      </div>
      <p className={styles.deuda}>
        Debemos <span className="numero">{pesos(deuda)}</span>
      </p>
      <div
        className={styles.barra}
        role="meter"
        aria-label={`Deuda con ${nombre}`}
        aria-valuemin={0}
        aria-valuemax={limite}
        aria-valuenow={deuda}
      >
        <div className={`${styles.relleno} ${styles[nivel]}`} style={{ width: `${relleno}%` }} />
        <div className={styles.raya} style={{ left: `${raya}%` }} />
      </div>
      <p className={styles.mensaje}>
        {falta >= 0 ? `Te faltan ${pesos(falta)} para el límite` : `Se pasó del límite por ${pesos(-falta)}`}
      </p>
      <p className={styles.limite}>Límite: {pesos(limite)}</p>
    </div>
  )
}

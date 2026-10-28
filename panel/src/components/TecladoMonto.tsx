import { pesos } from '../lib/formato'
import { Icono } from './Icono'
import styles from './TecladoMonto.module.css'

type Digito = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
export type Tecla = Digito | '000' | 'borrar' | '+10000' | '+50000' | '+100000'

const MAXIMO = 99_999_999

/** Aplica una tecla al monto. Nunca deja pasar de 99 millones (evita ceros de más). */
export function teclear(monto: number, tecla: Tecla): number {
  if (tecla === 'borrar') return Math.floor(monto / 10)
  if (tecla.startsWith('+')) return Math.min(MAXIMO, monto + Number(tecla.slice(1)))
  const nuevo = Number(`${monto}${tecla}`)
  return nuevo > MAXIMO ? monto : nuevo
}

const DIGITOS: Digito[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
const ATAJOS = [
  { tecla: '+10000', texto: '+10 mil' },
  { tecla: '+50000', texto: '+50 mil' },
  { tecla: '+100000', texto: '+100 mil' },
] as const

/** Teclado numérico gigante para montos en pesos, con el formato en vivo. */
export function TecladoMonto({ monto, alCambiar }: { monto: number; alCambiar: (monto: number) => void }) {
  const tocar = (t: Tecla) => alCambiar(teclear(monto, t))

  return (
    <div className={styles.teclado}>
      <output className={`numero ${styles.pantalla}`} aria-live="polite">
        {pesos(monto)}
      </output>
      <div className={styles.atajos}>
        {ATAJOS.map((a) => (
          <button key={a.tecla} type="button" className={styles.atajo} onClick={() => tocar(a.tecla)}>
            {a.texto}
          </button>
        ))}
      </div>
      <div className={styles.teclas}>
        {DIGITOS.map((d) => (
          <button key={d} type="button" className={styles.tecla} onClick={() => tocar(d)}>
            {d}
          </button>
        ))}
        <button type="button" className={styles.tecla} onClick={() => tocar('000')}>
          000
        </button>
        <button type="button" className={styles.tecla} onClick={() => tocar('0')}>
          0
        </button>
        <button type="button" className={`${styles.tecla} ${styles.borrar}`} onClick={() => tocar('borrar')}>
          <Icono nombre="atras" tamano={24} />
          <span>Borrar</span>
        </button>
      </div>
    </div>
  )
}

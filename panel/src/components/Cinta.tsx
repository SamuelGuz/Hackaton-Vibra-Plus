import { giro, semilla } from '../lib/mano'
import styles from './Cinta.module.css'

/** Bordes rasgados de un trozo de cinta de enmascarar, siempre iguales para el mismo texto. */
export function formaCinta(clave: string): string {
  const rnd = semilla(clave)
  const corte = () => rnd() * 6
  const derecha = [0, 25, 50, 75, 100].map((y) => `${(100 - corte()).toFixed(1)}% ${y}%`)
  const izquierda = [100, 75, 50, 25, 0].map((y) => `${corte().toFixed(1)}% ${y}%`)
  return `polygon(${[...derecha, ...izquierda].join(', ')})`
}

/** Etiqueta de estado como un trozo de cinta pegado ("CUARENTENA", "ADOPTABLE"). */
export function Cinta({ children }: { children: string }) {
  return (
    <span className={styles.cinta} style={{ clipPath: formaCinta(children), rotate: `${giro(children, 2)}deg` }}>
      {children}
    </span>
  )
}

import { useEffect, useRef } from 'react'
import { Icono } from './Icono'
import styles from './AvisoDeshacer.module.css'

interface Props {
  mensaje: string
  alDeshacer: () => void
  alCerrar: () => void
  /** Milisegundos antes de cerrarse solo */
  duracion?: number
}

/** Aviso grande abajo: "Listo, quedó guardado" + Deshacer. Reemplaza al "¿Está seguro?". */
export function AvisoDeshacer({ mensaje, alDeshacer, alCerrar, duracion = 6000 }: Props) {
  // La última función de cierre, sin reiniciar el tiempo en cada render
  const cerrar = useRef(alCerrar)
  cerrar.current = alCerrar

  useEffect(() => {
    const t = setTimeout(() => cerrar.current(), duracion)
    return () => clearTimeout(t)
  }, [mensaje, duracion])

  return (
    <div className={styles.aviso} role="status">
      <span className={styles.mensaje}>
        <Icono nombre="check" tamano={28} />
        {mensaje}
      </span>
      <button type="button" className={styles.deshacer} onClick={alDeshacer}>
        <Icono nombre="deshacer" tamano={24} />
        <span>Deshacer</span>
      </button>
      <span className={styles.tiempo} style={{ animationDuration: `${duracion}ms` }} aria-hidden="true" />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Icono } from './Icono'
import styles from './EstadoConexion.module.css'

/** true si el celular tiene señal; se actualiza solo. */
export function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine)
  useEffect(() => {
    const si = () => setEnLinea(true)
    const no = () => setEnLinea(false)
    window.addEventListener('online', si)
    window.addEventListener('offline', no)
    return () => {
      window.removeEventListener('online', si)
      window.removeEventListener('offline', no)
    }
  }, [])
  return enLinea
}

/** Píldora tranquila con el estado de la señal. Nunca un error rojo por falta de internet. */
export function EstadoConexion({ enLinea, pendientes }: { enLinea: boolean; pendientes: number }) {
  const texto = !enLinea
    ? 'Sin señal: lo que anotes se guarda y se envía solo'
    : pendientes > 0
      ? `${pendientes} ${pendientes === 1 ? 'registro esperando' : 'registros esperando'} señal`
      : 'Todo enviado'

  return (
    <p className={`${styles.estado} ${enLinea ? '' : styles.sinSenal}`} role="status">
      <Icono nombre={enLinea ? (pendientes > 0 ? 'senal' : 'check') : 'sin-senal'} tamano={22} />
      <span>{texto}</span>
    </p>
  )
}

// Comida para administración: la misma tarjeta del cuidador más lo que se movió en la semana.
import { useDatos } from '../../data/DatosProvider'
import { fechaLocal, horaBonita } from '../../lib/formato'
import { TarjetaComida } from './TarjetaComida'
import styles from './Comida.module.css'

export function Comida() {
  const { datos } = useDatos()
  const hace7 = new Date()
  hace7.setDate(hace7.getDate() - 7)
  const desde = fechaLocal(hace7)

  const semana = datos.inventario
    .filter((m) => m.fechaHora >= desde)
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))

  return (
    <div className={styles.comida}>
      <TarjetaComida />
      <section className={styles.semana} aria-labelledby="titulo-semana">
        <h2 id="titulo-semana">Esta semana</h2>
        {semana.length === 0 && <p>No se ha movido comida en los últimos 7 días.</p>}
        <ul>
          {semana.map((m) => {
            const [fecha, hora] = m.fechaHora.split('T')
            const dia = new Date(`${fecha}T00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric' })
            const quien = datos.personas.find((p) => p.id === m.quien)?.nombre ?? 'Alguien'
            const n = Math.abs(m.cambio)
            return (
              <li key={m.id}>
                <span className={styles.que}>
                  {m.cambio < 0
                    ? `Se abrió ${n} ${n === 1 ? 'bulto' : 'bultos'} de ${m.tipo}`
                    : `Llegaron ${n} ${n === 1 ? 'bulto' : 'bultos'} de ${m.tipo}`}
                </span>
                <span className={styles.detalle}>
                  {dia} · {horaBonita(hora)} · {quien}
                  {m.origen === 'bot' ? ' (por audio)' : ''}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

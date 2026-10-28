// "¿Cuánta plata hay?": la caja en grande, la deuda por clínica como termómetro
// y los últimos movimientos como papelitos de recibo.
import { useState } from 'react'
import { Boton } from '../../components/Boton'
import { Termometro } from '../../components/Termometro'
import { useDatos } from '../../data/DatosProvider'
import type { Movimiento } from '../../data/tipos'
import { deudaTotal, plataEnCaja } from '../../lib/calculos'
import { cuandoFue, pesos } from '../../lib/formato'
import { nombreCategoria } from './categorias'
import { RegistrarMovimiento } from './RegistrarMovimiento'
import styles from './Plata.module.css'

export function Plata() {
  const { datos } = useDatos()
  const [registrando, setRegistrando] = useState<Movimiento['tipo'] | null>(null)
  const [guardado, setGuardado] = useState(false)

  if (registrando) {
    return (
      <RegistrarMovimiento
        tipo={registrando}
        alTerminar={(ok) => {
          setRegistrando(null)
          setGuardado(ok)
        }}
      />
    )
  }

  const ultimos = [...datos.movimientos].sort((a, b) => b.fechaHora.localeCompare(a.fechaHora)).slice(0, 5)

  return (
    <div className={styles.plata}>
      {guardado && (
        <p className={styles.listo} role="status">
          Listo, quedó guardado
        </p>
      )}

      <h1 className={styles.caja}>
        <span className={styles.etiqueta}>En caja</span>
        <span className="numero">{pesos(plataEnCaja(datos))}</span>
      </h1>

      <div className={styles.botones}>
        <Boton icono="entra" tamano="grande" onClick={() => setRegistrando('ingreso')}>
          Entró plata
        </Boton>
        <Boton icono="sale" variante="peligro" tamano="grande" onClick={() => setRegistrando('gasto')}>
          Salió plata
        </Boton>
      </div>

      <section className={styles.deudas} aria-labelledby="titulo-deudas">
        <h2 id="titulo-deudas">
          Le debemos a las clínicas <span className="numero">{pesos(deudaTotal(datos))}</span>
        </h2>
        {datos.clinicas.map((c) => (
          <Termometro key={c.id} nombre={c.nombre} deuda={c.deuda} limite={c.limite} />
        ))}
      </section>

      <section className={styles.recibos} aria-labelledby="titulo-recibos">
        <h2 id="titulo-recibos">Últimos movimientos</h2>
        <ul>
          {ultimos.map((m) => (
            <li key={m.id} className={styles.recibo}>
              <span className={styles.que}>
                {nombreCategoria(m.tipo, m.categoria)}
                {m.nota && <span className={styles.nota}>{m.nota}</span>}
              </span>
              <span className={`numero ${m.tipo === 'gasto' ? styles.salio : styles.entro}`}>
                {m.tipo === 'gasto' ? '−' : '+'}
                {pesos(m.monto)}
              </span>
              <span className={styles.cuando}>{cuandoFue(m.fechaHora)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

// "¿Quiénes están en el albergue?": cintas por estado con conteo (tocar una filtra)
// y las fotos de cada animal.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Cinta } from '../../components/Cinta'
import { FotoInstantanea } from '../../components/FotoInstantanea'
import { useDatos } from '../../data/DatosProvider'
import type { EstadoAnimal } from '../../data/tipos'
import { conteoPorEstado, ESTADOS_A_CARGO, NOMBRE_ESTADO } from '../../lib/calculos'
import styles from './Animales.module.css'

export function Animales() {
  const { datos } = useDatos()
  const [filtro, setFiltro] = useState<EstadoAnimal | null>(null)
  const conteo = conteoPorEstado(datos)
  const aCargo = datos.animales.filter((a) => ESTADOS_A_CARGO.includes(a.estado))
  const lista = filtro ? aCargo.filter((a) => a.estado === filtro) : aCargo

  return (
    <div className={styles.animales}>
      <h1 className={styles.titulo}>Animales</h1>

      <div className={styles.filtros}>
        <button
          type="button"
          className={styles.filtro}
          aria-pressed={filtro === null}
          aria-label={`Todos ${aCargo.length}`}
          onClick={() => setFiltro(null)}
        >
          <Cinta>Todos</Cinta>
          <span className="numero">{aCargo.length}</span>
        </button>
        {ESTADOS_A_CARGO.map((e) => (
          <button
            key={e}
            type="button"
            className={styles.filtro}
            aria-pressed={filtro === e}
            aria-label={`${NOMBRE_ESTADO[e]} ${conteo[e]}`}
            onClick={() => setFiltro(filtro === e ? null : e)}
          >
            <Cinta>{NOMBRE_ESTADO[e]}</Cinta>
            <span className="numero">{conteo[e]}</span>
          </button>
        ))}
      </div>

      <ul className={styles.fotos}>
        {lista.map((a) => (
          <li key={a.id}>
            <Link to={`/animales/${a.id}`} aria-label={`Ver a ${a.nombre}`} className={styles.enlace}>
              <FotoInstantanea animal={a} ancho={136} />
              {a.advertencias.length > 0 && <span className={styles.ojo}>¡Ojo!</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

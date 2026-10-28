// Página interna del equipo para revisar el sistema visual (no la ve el albergue).
import { Link } from 'react-router-dom'
import { BotonSol } from '../../components/BotonSol'
import { Huella } from '../../components/Huella'
import { Inicial } from '../../components/Inicial'
import { useDatos } from '../../data/DatosProvider'
import { pesos } from '../../lib/formato'
import styles from './Kit.module.css'

const COLORES = [
  { token: '--papel', uso: 'Fondo, la hoja de la libreta' },
  { token: '--papel-claro', uso: 'Tarjetas sobre la hoja' },
  { token: '--cinta', uso: 'Etiquetas de estado' },
  { token: '--tinta', uso: 'Texto principal' },
  { token: '--lapiz', uso: 'Texto secundario' },
  { token: '--bien', uso: 'Acción principal · todo bien' },
  { token: '--ojo', uso: 'Revisar · ojo' },
  { token: '--urgente', uso: 'Crítico · límite superado' },
]

export function Kit() {
  const { datos } = useDatos()

  return (
    <main className={styles.pagina}>
      <header className={styles.cabecera}>
        <Link to="/" className={styles.volver}>
          ← Volver
        </Link>
        <BotonSol />
      </header>

      <h1 className={styles.titulo}>
        <Huella tamano={44} /> Kit de Huellitas
      </h1>
      <p className={styles.bajada}>La libreta que no se moja. Revisar con la lista anti-IA (plan, sección 9).</p>

      <section className={styles.bloque}>
        <h2>Colores con significado</h2>
        <ul className={styles.colores}>
          {COLORES.map((c) => (
            <li key={c.token}>
              <span className={styles.muestra} style={{ background: `var(${c.token})` }} />
              <span>
                <code>{c.token}</code>
                <br />
                {c.uso}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.bloque}>
        <h2>Letras</h2>
        <p className={`numero ${styles.numeroXl}`}>{pesos(1_240_000)}</p>
        <p className={styles.nota}>Bricolage Grotesque · números grandes y títulos</p>
        <p className={styles.textoMuestra}>
          Quedan 4 días de comida de perro. Toca pedir hoy: el pedido tarda 2 días en llegar. 1 l I · 0 O · 3 ml
        </p>
        <p className={styles.nota}>Atkinson Hyperlegible Next · todo el texto (18 px mínimo)</p>
        <p className={styles.mano}>Mateo ya camina solito</p>
        <p className={styles.nota}>Kalam · solo nombres en fotos y notas en la cinta</p>
      </section>

      <section className={styles.bloque}>
        <h2>Semáforo: siempre color + forma + palabra</h2>
        <div className={styles.semaforo}>
          <span className={styles.bien}>✓ Bien</span>
          <span className={styles.ojo}>! Ojo</span>
          <span className={styles.urgente}>✕ Urgente</span>
        </div>
      </section>

      <section className={styles.bloque}>
        <h2>Personas (sin foto todavía)</h2>
        <div className={styles.personas}>
          {datos.personas.map((p) => (
            <figure key={p.id}>
              <Inicial id={p.id} nombre={p.nombre} color={p.color} tamano={88} />
              <figcaption>{p.nombre}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={styles.bloque}>
        <h2>Tamaños táctiles</h2>
        <div className={styles.toques}>
          <span style={{ width: 48, height: 48 }}>48</span>
          <span style={{ width: 64, height: 64 }}>64 mín.</span>
          <span style={{ width: 72, height: 72 }}>72</span>
        </div>
        <p className={styles.nota}>Con guantes, nada que se toque mide menos de 64 px.</p>
      </section>
    </main>
  )
}

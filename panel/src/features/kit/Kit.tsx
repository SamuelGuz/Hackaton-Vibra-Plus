// Página interna del equipo para revisar el sistema visual (no la ve el albergue).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Boton } from '../../components/Boton'
import { BotonSol } from '../../components/BotonSol'
import { Cinta } from '../../components/Cinta'
import { Costal } from '../../components/Costal'
import { FotoInstantanea } from '../../components/FotoInstantanea'
import { Huella } from '../../components/Huella'
import { Icono, NOMBRES_ICONOS } from '../../components/Icono'
import { Inicial } from '../../components/Inicial'
import { Nivel } from '../../components/Nivel'
import { Sello } from '../../components/Sello'
import { useDatos } from '../../data/DatosProvider'
import { diasDeComida, NOMBRE_ESTADO, nivelComida } from '../../lib/calculos'
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
  const [sellos, setSellos] = useState(0)
  const muestraAnimales = ['Mateo', 'Bruno', 'Luna'].map((n) => datos.animales.find((a) => a.nombre === n)!)

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
          <Nivel nivel="bien" />
          <Nivel nivel="ojo" />
          <Nivel nivel="urgente" />
        </div>
      </section>

      <section className={styles.bloque}>
        <h2>Botones: siempre ícono + palabra</h2>
        <div className={styles.botones}>
          <Boton icono="menos" tamano="grande" ancho>
            Abrí un bulto
          </Boton>
          <Boton icono="mas" variante="secundario">
            Llegaron bultos
          </Boton>
          <Boton icono="deshacer" variante="peligro">
            Deshacer
          </Boton>
          <Boton icono="check" disabled>
            Sin señal
          </Boton>
        </div>
      </section>

      <section className={styles.bloque}>
        <h2>Íconos a mano</h2>
        <ul className={styles.iconos}>
          {NOMBRES_ICONOS.map((n) => (
            <li key={n}>
              <Icono nombre={n} tamano={36} />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.bloque}>
        <h2>Fotos instantáneas</h2>
        <div className={styles.fotos}>
          {muestraAnimales.map((a) => (
            <FotoInstantanea key={a.id} animal={a} />
          ))}
        </div>
        <p className={styles.nota}>Sin fotos reales todavía: silueta dibujada, fondo fijo por animal.</p>
      </section>

      <section className={styles.bloque}>
        <h2>Cintas de estado</h2>
        <div className={styles.cintas}>
          {(['cuarentena', 'tratamiento', 'adoptable', 'hogar_temporal'] as const).map((e) => (
            <Cinta key={e}>{NOMBRE_ESTADO[e]}</Cinta>
          ))}
        </div>
      </section>

      <section className={styles.bloque}>
        <h2>Sello</h2>
        <div className={styles.sello}>
          <Sello key={sellos} texto="Dada" hora="07:12" quien="Don Luis" animar={sellos > 0} />
          <Boton icono="medicina" variante="secundario" onClick={() => setSellos((n) => n + 1)}>
            Ver caer el sello
          </Boton>
        </div>
      </section>

      <section className={styles.bloque}>
        <h2>Costales de comida</h2>
        <div className={styles.costales}>
          {(['perro', 'gato'] as const).map((e) => {
            const dias = diasDeComida(datos, e)
            return <Costal key={e} especie={e} dias={dias} nivel={nivelComida(datos, dias)} />
          })}
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

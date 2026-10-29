'use client'

import { useState } from 'react'
import { useAcciones } from '../../paginas/acciones'
import { BarraMeta, UltimaCompra } from '../../paginas/Mision'
import { ProgresoProvider, useProgreso } from '../../paginas/progreso'
import styles from './CaminoAyuda.module.css'

/**
 * Selector del Home: "Si hoy no puedes adoptar, puedes llenar un plato."
 * Lee el progreso de /data/progreso.json (esquema v2, compatible con el original) y reutiliza
 * las barras del modulo Mision. Fuera de las paginas internas no hay pop-ups: "Aportar" lleva a /aportar.
 */
function Panel({ camino }: { camino: 'adoptar' | 'aportar' }) {
  const { datos, carga, recargar } = useProgreso()
  const acciones = useAcciones()

  if (camino === 'adoptar') {
    return (
      <div className={styles.panel}>
        <h3>Un hogar para siempre</h3>
        <p>Antes de una visita te haremos cuatro preguntas: vivienda, presupuesto, rejas o cerramientos y compromiso con el veterinario. No es un examen; es cuidar al animal y a ti.</p>
        <a className={styles.boton} href="/adoptar">Ver quién espera hogar</a>
      </div>
    )
  }
  return (
    <div className={styles.panel}>
      <h3>Aporta y mira hacia dónde va</h3>
      {carga === 'error' && !datos && (
        <p className={styles.vacio}>No pudimos cargar la misión. Intenta de nuevo en un momento. <button type="button" className={styles.boton} onClick={recargar}>Intentar de nuevo</button></p>
      )}
      {datos && (
        <>
          <div className={styles.metas}>
            {datos.metas.slice(0, 2).map(m => <BarraMeta key={m.id} meta={m} datos={datos} />)}
          </div>
          <div className={styles.compras} aria-live="polite">
            <UltimaCompra datos={datos} />
          </div>
        </>
      )}
      <p className={styles.nota}>Las metas son de ejemplo, por confirmar con Yesenia. Esta página no cobra: tu aporte lo recibe ella directamente.</p>
      <button type="button" className={styles.boton} onClick={() => acciones.aportar()}>Aportar a la misión</button>
    </div>
  )
}

export default function CaminoAyuda() {
  const [camino, setCamino] = useState<'adoptar' | 'aportar'>('aportar')
  return (
    <ProgresoProvider>
      <section id="ayudar" className={styles.seccion} aria-labelledby="camino-titulo">
        <div className={styles.contenedor}>
          <div className={styles.cabecera}>
            <h2 id="camino-titulo">Si hoy no puedes adoptar, puedes llenar un plato.</h2>
            <p>Las dos cosas ayudan. Elige la que hoy sí puedes.</p>
          </div>

          <div className={styles.selector} role="group" aria-label="Elige cómo ayudar">
            <button type="button" aria-pressed={camino === 'adoptar'} onClick={() => setCamino('adoptar')}>Quiero adoptar</button>
            <button type="button" aria-pressed={camino === 'aportar'} onClick={() => setCamino('aportar')}>Quiero llenar un plato</button>
          </div>

          <Panel camino={camino} />
        </div>
      </section>
    </ProgresoProvider>
  )
}

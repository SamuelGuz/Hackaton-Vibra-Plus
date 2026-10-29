import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { historia, type MedioPago, type Seccion } from '../contenido/historia'
import Recorte from './comun/Recorte'
import { ANCLA_AYUDAR, esPendiente, esTituloLargo, formatoCop, mostrar } from './comun/contenido'
import { EASE_SALIDA, useRevelar } from './comun/movimiento'
import c from './comun/comun.module.css'
import e from './ComoAyuda.module.css'

/** Index of the suggested tier (the middle one). A design choice, not a sourced fact. */
const SUGERIDO = Math.min(1, historia.donaciones.length - 1)
const OTRO = 'otro'

type Eleccion = number | typeof OTRO

function MedioDePago({ medio, onCopiado }: { medio: MedioPago; onCopiado: (mensaje: string) => void }) {
  const pendiente = esPendiente(medio.numero)

  async function copiar() {
    if (pendiente) return
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable')
      await navigator.clipboard.writeText(medio.numero.replace(/\s/g, ''))
      onCopiado(`Número copiado: ${medio.nombre}.`)
    } catch {
      onCopiado(`No se pudo copiar. Mantén presionado el número de ${medio.nombre} para copiarlo.`)
    }
  }

  return (
    <li className={e.medio}>
      <div className={e.medioDatos}>
        <span className={e.medioNombre}>{medio.nombre}</span>
        <span className={pendiente ? e.medioPendiente : `${e.medioNumero} cifras`}>{mostrar(medio.numero)}</span>
        <span className={e.medioTitular}>Titular: {mostrar(medio.titular)}</span>
      </div>
      <button
        type="button"
        className={e.copiar}
        onClick={copiar}
        disabled={pendiente}
        aria-label={pendiente ? `Copiar número de ${medio.nombre}, por confirmar` : `Copiar número de ${medio.nombre}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="8" y="8" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        Copiar
      </button>
    </li>
  )
}

// Chapter 4 on the verde monte field: money becomes kilos. Pick an amount, see what it buys and how to send it.
export default function ComoAyuda({ seccion }: { seccion: Seccion }) {
  const { grupo, item, reduce } = useRevelar()
  const idTitulo = `titulo-${seccion.id}`
  const idLeyenda = useId()
  const [eleccion, setEleccion] = useState<Eleccion>(SUGERIDO)
  const [aviso, setAviso] = useState('')
  const temporizador = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(temporizador.current), [])

  function avisar(mensaje: string) {
    setAviso(mensaje)
    window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => setAviso(''), 4000)
  }

  const donacion = eleccion === OTRO ? null : historia.donaciones[eleccion]
  const monto = donacion ? formatoCop(donacion.montoCop) : 'el monto que puedas'

  return (
    <section
      id={ANCLA_AYUDAR}
      aria-labelledby={idTitulo}
      data-campo="oscuro"
      className={`${c.seccion} ${e.seccion}`}
    >
      <span id={seccion.id} className={c.ancla} aria-hidden="true" />
      <span id="donar" className={c.ancla} aria-hidden="true" />

      <div className="contenedor">
        <motion.header className={e.cabecera} {...grupo}>
          <motion.h2
            id={idTitulo}
            className={esTituloLargo(seccion.titulo) ? c.tituloLargo : c.titulo}
            {...item}
          >
            {seccion.titulo}
          </motion.h2>
          <motion.p className={c.entrada} {...item}>
            {seccion.cuerpo}
          </motion.p>
        </motion.header>

        <fieldset className={e.opciones} aria-describedby={idLeyenda}>
          <legend className="visually-hidden">Elige cuánto quieres aportar</legend>
          <motion.div className={e.rejillaOpciones} {...grupo}>
            {historia.donaciones.map((d, i) => (
              <motion.label
                key={d.montoCop}
                className={`${e.opcion} ${i === SUGERIDO ? e.sugerida : ''}`}
                {...item}
              >
                <input
                  type="radio"
                  name="aporte"
                  value={d.montoCop}
                  checked={eleccion === i}
                  onChange={() => setEleccion(i)}
                  className={e.radio}
                />
                <span className={e.punto} aria-hidden="true" />
                <span className={`${e.monto} cifras`}>{formatoCop(d.montoCop)}</span>
                <span className={e.compra}>{d.compra}</span>
                {i === SUGERIDO && <span className="visually-hidden">Opción sugerida.</span>}
              </motion.label>
            ))}
            <motion.label className={e.opcion} {...item}>
              <input
                type="radio"
                name="aporte"
                value={OTRO}
                checked={eleccion === OTRO}
                onChange={() => setEleccion(OTRO)}
                className={e.radio}
              />
              <span className={e.punto} aria-hidden="true" />
              <span className={e.monto}>Otro valor</span>
              <span className={e.compra}>El monto que puedas. También se vuelve comida.</span>
            </motion.label>
          </motion.div>
          <p id={idLeyenda} className={e.pista}>
            Esta página no cobra nada: eliges un monto y lo envías desde tu app de Nequi o Daviplata.
          </p>
        </fieldset>

        <div className={e.panel}>
          <Recorte slug="beagle-asomado-pata" className={e.beagle} sizes="(min-width: 56.25em) 18rem, 55vw" />

          <div className={e.panelRejilla}>
            <div className={e.pasos}>
              <h3 className={e.panelTitulo}>
                Tu aporte: <span className="cifras">{monto}</span>
              </h3>
              {donacion && <p className={e.panelCompra}>{donacion.compra}</p>}

              <ol className={e.listaPasos}>
                <li>Copia el número de Nequi o Daviplata.</li>
                <li>
                  Envía <span className="cifras">{monto}</span> desde tu app.
                </li>
                <li>Tu aporte le paga a Don Carlos y los animales comen ese mismo día.</li>
              </ol>

              <ul role="list" className={e.medios}>
                {historia.mediosPago.map((medio) => (
                  <MedioDePago key={medio.nombre} medio={medio} onCopiado={avisar} />
                ))}
              </ul>
              {historia.mediosPago.some((m) => esPendiente(m.numero)) && (
                <p className={e.notaPendiente}>Estamos confirmando los números para recibir aportes.</p>
              )}
              <p role="status" aria-live="polite" className={e.aviso}>
                {aviso}
              </p>
            </div>

            <figure className={e.mensaje}>
              <figcaption className={e.mensajeTitulo}>Así te contamos qué comieron</figcaption>
              <AnimatePresence mode="wait" initial={false}>
                {donacion ? (
                  <motion.blockquote
                    key={donacion.montoCop}
                    className={e.burbuja}
                    initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduce ? 0 : -8 }}
                    transition={{ duration: 0.28, ease: EASE_SALIDA }}
                  >
                    <p>{donacion.impacto}</p>
                  </motion.blockquote>
                ) : (
                  <motion.p
                    key="otro"
                    className={e.burbujaVacia}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.28, ease: EASE_SALIDA }}
                  >
                    Con cualquier monto te contamos en qué se convirtió tu aporte.
                  </motion.p>
                )}
              </AnimatePresence>
            </figure>
          </div>
        </div>
      </div>
    </section>
  )
}

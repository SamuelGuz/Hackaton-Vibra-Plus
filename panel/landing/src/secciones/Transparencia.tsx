import { motion } from 'motion/react'
import type { Seccion } from '../contenido/historia'
import Recorte from './comun/Recorte'
import { esTituloLargo } from './comun/contenido'
import { useRevelar } from './comun/movimiento'
import c from './comun/comun.module.css'
import e from './Transparencia.module.css'

// Chapter 6: admitting mistakes is the strongest trust signal. A raised panel the dogs sit on.
export default function Transparencia({ seccion }: { seccion: Seccion }) {
  const { grupo, item } = useRevelar()
  const idTitulo = `titulo-${seccion.id}`

  return (
    <section id={seccion.id} aria-labelledby={idTitulo} className={`${c.seccion} ${e.seccion}`}>
      <div className="contenedor">
        <div className={e.panel}>
          <Recorte slug="tres-perros-sentados" className={e.recorte} sizes="(min-width: 56.25em) 22rem, 60vw" />
          <div className={e.rejilla}>
            <motion.div className={e.texto} {...grupo}>
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
            </motion.div>

            {seccion.vinetas && seccion.vinetas.length > 0 && (
              <motion.ul role="list" className={e.compromisos} {...grupo}>
                {seccion.vinetas.map((v) => (
                  <motion.li key={v} className={e.compromiso} {...item}>
                    <svg className={e.check} width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      <path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{v}</span>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

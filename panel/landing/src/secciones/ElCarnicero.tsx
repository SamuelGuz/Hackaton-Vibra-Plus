import { motion } from 'motion/react'
import type { Seccion } from '../contenido/historia'
import { img } from '../contenido/imagenes'
import CtaSeccion from './comun/CtaSeccion'
import { esTituloLargo } from './comun/contenido'
import { useRevelar } from './comun/movimiento'
import c from './comun/comun.module.css'
import e from './ElCarnicero.module.css'

// Chapter 3: a concrete neighbourhood ally makes the help traceable. Photo left, words right.
export default function ElCarnicero({ seccion }: { seccion: Seccion }) {
  const { grupo, item, foto } = useRevelar()
  const idTitulo = `titulo-${seccion.id}`

  return (
    <section id={seccion.id} aria-labelledby={idTitulo} className={`${c.seccion} ${e.seccion}`}>
      <div className={`contenedor ${e.rejilla}`}>
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
          {seccion.cta && (
            <motion.div className={c.acciones} {...item}>
              <CtaSeccion cta={seccion.cta} />
            </motion.div>
          )}
        </motion.div>

        <motion.figure
          className={e.figura}
          initial="oculto"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <div className={e.marco}>
            <motion.img
              {...img('perros-calle-grupo-cuadros', '(min-width: 56.25em) 42vw, 92vw')}
              loading="lazy"
              decoding="async"
              className={e.foto}
              {...foto}
            />
          </div>
          <figcaption className={c.leyenda}>Foto de referencia, no corresponde a animales del refugio.</figcaption>
        </motion.figure>
      </div>
    </section>
  )
}

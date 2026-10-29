import { motion } from 'motion/react'
import type { Seccion } from '../contenido/historia'
import Recorte from './comun/Recorte'
import { esTituloLargo } from './comun/contenido'
import { useRevelar } from './comun/movimiento'
import c from './comun/comun.module.css'
import e from './QuienEsElla.module.css'

// Chapter 2 on the one caramelo field: people give to a person. Two dogs rise from the bottom seam.
export default function QuienEsElla({ seccion }: { seccion: Seccion }) {
  const { grupo, item } = useRevelar()
  const idTitulo = `titulo-${seccion.id}`

  return (
    <section id={seccion.id} aria-labelledby={idTitulo} className={e.seccion}>
      <div className={`contenedor ${e.rejilla}`}>
        <motion.div className={e.texto} {...grupo}>
          <motion.h2
            id={idTitulo}
            className={esTituloLargo(seccion.titulo) ? c.tituloLargo : c.titulo}
            {...item}
          >
            {seccion.titulo}
          </motion.h2>
          <motion.p className={e.declaracion} {...item}>
            {seccion.cuerpo}
          </motion.p>
        </motion.div>
        <div className={e.lugarRecorte}>
          <Recorte
            slug="dos-perros-juntos"
            className={e.recorte}
            sizes="(min-width: 56.25em) 34vw, 70vw"
          />
        </div>
      </div>
    </section>
  )
}

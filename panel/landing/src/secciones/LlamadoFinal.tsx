import { useRef } from 'react'
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'motion/react'
import type { Seccion } from '../contenido/historia'
import { img } from '../contenido/imagenes'
import Boton from '../componentes/Boton'
import CtaSeccion from './comun/CtaSeccion'
import { useRevelar } from './comun/movimiento'
import c from './comun/comun.module.css'
import e from './LlamadoFinal.module.css'

function Palabra({ texto, progreso, desde, hasta }: { texto: string; progreso: MotionValue<number>; desde: number; hasta: number }) {
  const opacity = useTransform(progreso, [desde, hasta], [0.28, 1])
  return <motion.span style={{ opacity }}>{texto}</motion.span>
}

// Each word goes from a muted tone to full ink as the heading crosses the reading line.
function TituloRevelado({ id, texto }: { id: string; texto: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const reduce = useReducedMotion() ?? false
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 45%'] })
  const palabras = texto.split(' ')

  if (reduce) {
    return (
      <h2 id={id} ref={ref} className={e.titulo}>
        {texto}
      </h2>
    )
  }

  return (
    <h2 id={id} ref={ref} className={e.titulo}>
      <span className="visually-hidden">{texto}</span>
      <span aria-hidden="true">
        {palabras.map((p, i) => (
          <span key={`${p}-${i}`}>
            <Palabra
              texto={p}
              progreso={scrollYProgress}
              desde={i / palabras.length}
              hasta={(i + 1) / palabras.length}
            />
            {i < palabras.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </h2>
  )
}

// Chapter 7: close with the smallest possible action.
export default function LlamadoFinal({ seccion }: { seccion: Seccion }) {
  const { grupo, item, foto, reduce } = useRevelar()
  const idTitulo = `titulo-${seccion.id}`
  const refFoto = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: refFoto, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [24, -24])

  return (
    <section id={seccion.id} aria-labelledby={idTitulo} className={`${c.seccion} ${e.seccion}`}>
      <div className={`contenedor ${e.rejilla}`}>
        <TituloRevelado id={idTitulo} texto={seccion.titulo} />
        <div className={e.texto}>
          <motion.div {...grupo}>
            <motion.p className={c.entrada} {...item}>
              {seccion.cuerpo}
            </motion.p>
            <motion.div className={c.acciones} {...item}>
              {seccion.cta && <CtaSeccion cta={seccion.cta} />}
              <Boton href="#adoptar" variante="secundario" conFlecha={false}>
                Quiero adoptar
              </Boton>
            </motion.div>
          </motion.div>
        </div>

        <motion.figure
          className={e.figura}
          initial="oculto"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <div ref={refFoto} className={e.marco}>
            <motion.div className={e.desplazable} style={{ y }}>
              <motion.img
                {...img('cinco-perros-mirando-arriba', '(min-width: 56.25em) 46vw, 92vw')}
                loading="lazy"
                decoding="async"
                className={e.foto}
                {...foto}
              />
            </motion.div>
          </div>
          <figcaption className={c.leyenda}>Foto de referencia, no corresponde a animales del refugio.</figcaption>
        </motion.figure>
      </div>
    </section>
  )
}

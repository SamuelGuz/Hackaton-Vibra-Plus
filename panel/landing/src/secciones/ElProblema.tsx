import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView, useReducedMotion } from 'motion/react'
import type { Seccion } from '../contenido/historia'
import CtaSeccion from './comun/CtaSeccion'
import { esTituloLargo, formatoNumero } from './comun/contenido'
import { EASE_EXPO, useRevelar } from './comun/movimiento'
import c from './comun/comun.module.css'
import e from './ElProblema.module.css'

interface Cifra {
  prefijo: string
  valor: number
  unidad: string
}

/** Pulls the leading figure out of a content bullet ("14 horas al día..." -> 14 horas). */
function leerCifra(texto: string): Cifra | null {
  const m = texto.match(/(\$?)(\d[\d.]*\d|\d)(\s(?:horas|kilos))?/)
  if (!m) return null
  return { prefijo: m[1] ?? '', valor: Number(m[2].replace(/\./g, '')), unidad: m[3] ?? '' }
}

// Figures count up once (<= 1.2s) when they enter. Screen readers read the full sentence instead.
function Contador({ valor }: { valor: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const visto = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotion() ?? false
  const [actual, setActual] = useState(0)

  useEffect(() => {
    if (!visto || reduce) return
    const control = animate(0, valor, {
      duration: 1.2,
      ease: EASE_EXPO,
      onUpdate: (v) => setActual(Math.round(v)),
    })
    return () => control.stop()
  }, [visto, reduce, valor])

  return <span ref={ref}>{formatoNumero(reduce ? valor : actual)}</span>
}

export default function ElProblema({ seccion }: { seccion: Seccion }) {
  const { grupo, item } = useRevelar()
  const idTitulo = `titulo-${seccion.id}`

  return (
    <section id="historia" aria-labelledby={idTitulo} className={`${c.seccion} ${e.seccion}`}>
      <span id={seccion.id} className={c.ancla} aria-hidden="true" />
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

        {seccion.vinetas && seccion.vinetas.length > 0 && (
          <motion.ul role="list" className={e.cifras} {...grupo}>
            {seccion.vinetas.map((vineta) => {
              const cifra = leerCifra(vineta)
              return (
                <motion.li key={vineta} className={e.cifra} {...item}>
                  {cifra && (
                    <span className={`${e.figura} cifras`} aria-hidden="true">
                      <span>
                        {cifra.prefijo}
                        <Contador valor={cifra.valor} />
                      </span>
                      {cifra.unidad && <span className={e.unidad}>{cifra.unidad}</span>}
                    </span>
                  )}
                  <span className={e.etiqueta}>{vineta}</span>
                </motion.li>
              )
            })}
          </motion.ul>
        )}
      </div>
    </section>
  )
}

import { motion } from 'motion/react'
import { historia, type Seccion } from '../contenido/historia'
import { img } from '../contenido/imagenes'
import CtaSeccion from './comun/CtaSeccion'
import { ANCLA_AYUDAR, esTituloLargo } from './comun/contenido'
import { useRevelar } from './comun/movimiento'
import c from './comun/comun.module.css'
import e from './Adoptar.module.css'

// Chapter 5: adoption in one breath. WhatsApp, four questions, a visit in her calendar.
export default function Adoptar({ seccion }: { seccion: Seccion }) {
  const { grupo, item, foto } = useRevelar()
  const idTitulo = `titulo-${seccion.id}`
  const { pasos } = historia.adopcion
  const demos = historia.animalesEjemplo.filter((a) => a.esDemo)

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
          {seccion.vinetas && seccion.vinetas.length > 0 && (
            <motion.div {...item}>
              <h3 className={e.subtitulo}>Las {seccion.vinetas.length} preguntas</h3>
              <ul role="list" className={e.preguntas}>
                {seccion.vinetas.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </motion.div>
          )}
          {seccion.cta && (
            <motion.div className={c.acciones} {...item}>
              <CtaSeccion cta={seccion.cta} notaPendiente="Número de WhatsApp por confirmar" />
            </motion.div>
          )}
        </motion.div>

        <motion.ol className={e.pasos} aria-label="Cómo es el proceso de adopción" {...grupo}>
          {pasos.map((p) => (
            <motion.li key={p.numero} className={e.paso} {...item}>
              <span className={`${e.numero} cifras`} aria-hidden="true">
                {p.numero}
              </span>
              <div>
                <h3 className={e.pasoTitulo}>{p.titulo}</h3>
                <p className={e.pasoDetalle}>{p.detalle}</p>
              </div>
            </motion.li>
          ))}
        </motion.ol>

        <p className={e.alterno}>
          ¿No es el momento de adoptar?{' '}
          <a className={c.enlaceTexto} href={`#${ANCLA_AYUDAR}`}>
            También ayudas pagando su comida
          </a>
          .
        </p>

        <motion.figure
          className={e.figura}
          initial="oculto"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <div className={e.marco}>
            <motion.img
              {...img('dos-perros-adopcion', '(min-width: 56.25em) 58vw, 92vw')}
              loading="lazy"
              decoding="async"
              className={e.foto}
              {...foto}
            />
          </div>
          <figcaption className={c.leyenda}>Foto de referencia, no corresponde a animales del refugio.</figcaption>
        </motion.figure>

        {demos.length > 0 && (
          <aside className={e.demos} aria-labelledby="titulo-demos">
            <h3 id="titulo-demos" className={e.demosTitulo}>
              Nombres de ejemplo
            </h3>
            <p className={e.demosNota}>
              Todavía no publicamos fichas de los animales. Estos nombres aparecen en el plan como ejemplo
              y son datos de demostración.
            </p>
            <ul role="list" className={e.demosLista}>
              {demos.map((a) => (
                <li key={a.nombre} className={e.demo}>
                  <span className={e.demoNombre}>{a.nombre}</span>
                  <span className={e.demoEtiqueta}>Ejemplo · por confirmar</span>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </section>
  )
}

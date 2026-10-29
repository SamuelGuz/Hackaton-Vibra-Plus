import { useEffect, useId, useState, type PointerEvent } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'
import Boton from '../../componentes/Boton'
import { historia } from '../../contenido/historia'
import { img } from '../../contenido/imagenes'
import estilos from './HeroCreativo.module.css'

// Hero 1, "creativo". Signature: the headline is a wall. A beagle peeks over the giant word
// "generosidad." from behind its letters, follows the pointer and perks up when the visitor
// reaches for the donate button. Two sleeping cats lie behind the butcher's ticket.

const EASE_EXPO = [0.16, 1, 0.3, 1] as const
const EASE_SALIDA = [0.22, 1, 0.36, 1] as const

/** Never show a raw content note: anything still pending renders as a discreet placeholder. */
function texto(valor: string): string {
  return valor.startsWith('PENDIENTE:') ? 'Por confirmar' : valor
}

/**
 * "Aquí nadie… presupuesto. Comen de la generosidad." → setup sentence + punchline split as
 * "Comen" / "de la generosidad.": the short first line leaves room for the dog above the long one.
 */
function partirTitulo(titulo: string) {
  const corte = titulo.indexOf('. ')
  const planteamiento = corte === -1 ? '' : titulo.slice(0, corte + 1)
  const [primera = '', ...resto] = (corte === -1 ? titulo : titulo.slice(corte + 2)).split(' ')
  return { planteamiento, lineaA: primera, lineaB: resto.join(' ') }
}

const formatoCop = new Intl.NumberFormat('es-CO')

export default function HeroCreativo() {
  const idTitulo = useId()
  const reduce = useReducedMotion() ?? false
  const contenido = historia.heroCreativo
  const { planteamiento, lineaA, lineaB } = partirTitulo(texto(contenido.titulo))
  const aporte = historia.donaciones.find((d) => d.montoCop === 10000) ?? historia.donaciones[0]

  // The beagle only follows a fine pointer (mouse/trackpad), never on touch or reduced motion.
  const [punteroFino, setPunteroFino] = useState(false)
  useEffect(() => {
    const consulta = window.matchMedia('(hover: hover) and (pointer: fine)')
    const actualizar = () => setPunteroFino(consulta.matches)
    actualizar()
    consulta.addEventListener('change', actualizar)
    return () => consulta.removeEventListener('change', actualizar)
  }, [])
  const seguir = punteroFino && !reduce

  const objetivoX = useMotionValue(0)
  const objetivoY = useMotionValue(0)
  const resorte = { stiffness: 110, damping: 18, mass: 0.7 }
  const x = useSpring(objetivoX, resorte)
  const y = useSpring(objetivoY, resorte)

  function alMover(evento: PointerEvent<HTMLElement>) {
    if (!seguir || evento.pointerType !== 'mouse') return
    const caja = evento.currentTarget.getBoundingClientRect()
    objetivoX.set(((evento.clientX - caja.left) / caja.width - 0.5) * 28)
    objetivoY.set(((evento.clientY - caja.top) / caja.height - 0.5) * 12)
  }
  function alSalir() {
    objetivoX.set(0)
    objetivoY.set(0)
  }

  // The beagle perks up while the donate button is hovered or focused.
  const [atento, setAtento] = useState(false)
  const atentoActivo = atento && !reduce

  const subir = (orden: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4, delay: orden * 0.09 } }
      : {
          initial: { opacity: 0, y: '0.35em' },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, ease: EASE_EXPO, delay: orden * 0.09 },
        }

  return (
    <section
      className={estilos.hero}
      aria-labelledby={idTitulo}
      onPointerMove={alMover}
      onPointerLeave={alSalir}
    >
      <div className={`contenedor ${estilos.interior}`}>
        <h1 id={idTitulo} className={estilos.titulo}>
          {planteamiento && <span className={estilos.planteamiento}>{planteamiento}</span>}{' '}
          <span className={estilos.remate}>
            <motion.span className={`${estilos.linea} ${estilos.lineaConPerro}`} {...subir(0)}>
              {lineaA}
              <span className={estilos.asomo} aria-hidden="true">
                <motion.span
                  className={estilos.capa}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: '48%' }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduce ? 0.4 : 1, ease: EASE_EXPO, delay: 0.2 }}
                >
                  <motion.span
                    className={estilos.capa}
                    animate={{ y: atentoActivo ? '-16%' : '0%' }}
                    transition={{ duration: 0.45, ease: EASE_SALIDA }}
                  >
                    <motion.img
                      {...img('beagle-asomado', '(min-width: 80em) 32rem, 38vw')}
                      alt=""
                      className={estilos.beagle}
                      style={seguir ? { x, y } : undefined}
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      draggable={false}
                    />
                  </motion.span>
                </motion.span>
              </span>
            </motion.span>{' '}
            <motion.span className={estilos.linea} {...subir(1)}>
              {lineaB}
            </motion.span>
          </span>
        </h1>

        <div className={estilos.pie}>
          <div className={estilos.apoyo}>
            <p className={estilos.bajada}>{texto(contenido.subtitulo)}</p>
            <div className={estilos.acciones}>
              <span
                className={estilos.accionPrincipal}
                onPointerEnter={() => setAtento(true)}
                onPointerLeave={() => setAtento(false)}
                onFocus={() => setAtento(true)}
                onBlur={() => setAtento(false)}
              >
                <Boton href="#ayudar">{texto(contenido.ctaPrincipal.texto)}</Boton>
              </span>
              <Boton href="#adoptar" variante="secundario">
                {texto(contenido.ctaSecundario.texto)}
              </Boton>
            </div>
          </div>

          <div className={estilos.tiquete}>
            <motion.img
              {...img('gatos-abrazados', '(min-width: 56.25em) 9.5rem, 10rem')}
              alt=""
              aria-hidden="true"
              className={estilos.gatos}
              loading="lazy"
              decoding="async"
              draggable={false}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: '40%' }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: reduce ? 0.4 : 1.1, ease: EASE_EXPO, delay: 0.3 }}
            />
            <div className={estilos.recibo}>
              <p className={estilos.cuenta}>
                <strong className={`${estilos.cifra} cifras`}>${formatoCop.format(aporte.montoCop)}</strong>{' '}
                <span>{texto(aporte.compra)}</span>
              </p>
              <a className={estilos.enlace} href="#historia">
                Conoce la historia de Doña Gloria
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

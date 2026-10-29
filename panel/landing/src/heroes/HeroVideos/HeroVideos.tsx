import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'motion/react'
import Boton from '../../componentes/Boton'
import { historia } from '../../contenido/historia'
import estilos from './HeroVideos.module.css'

// Hero variant 3 (docs/DESIGN.md §5): two cut-out dog videos at the top corners, text centred
// between them, all on --fondo-hero. The MP4 fallback is composited on that same colour.

const EASE_EXPO = [0.16, 1, 0.3, 1] as const
const PARALAJE_MAX = 10 // px, brief caps pointer parallax at 12px

const RUTA_VIDEO = '/media/video'

interface Perro {
  nombre: 'perro-1' | 'perro-2'
  claseMarco: string
  width: number
  height: number
}

const perros: [Perro, Perro] = [
  { nombre: 'perro-1', claseMarco: estilos.marcoUno, width: 700, height: 684 },
  { nombre: 'perro-2', claseMarco: estilos.marcoDos, width: 490, height: 660 },
]

// Never show a raw "PENDIENTE:" note on the page.
function mostrar(valor: string): string {
  return valor.startsWith('PENDIENTE:') ? 'Por confirmar' : valor
}

function quiereAhorrarDatos(): boolean {
  if (typeof navigator === 'undefined') return false
  const conexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return conexion?.saveData === true
}

interface PropsVideo {
  perro: Perro
  estatico: boolean
  registrar: (video: HTMLVideoElement | null) => void
}

function VideoPerro({ perro, estatico, registrar }: PropsVideo) {
  const base = `${RUTA_VIDEO}/${perro.nombre}`
  const poster = `${base}-poster.webp`

  // Reduced motion or Save-Data: poster only, no video bytes.
  if (estatico) {
    return <img className={estilos.medio} src={poster} width={perro.width} height={perro.height} alt="" aria-hidden="true" decoding="async" />
  }

  return (
    <video
      ref={registrar}
      className={estilos.medio}
      width={perro.width}
      height={perro.height}
      muted
      autoPlay
      loop
      playsInline
      preload="metadata"
      poster={poster}
      aria-hidden="true"
      tabIndex={-1}
      disablePictureInPicture
    >
      <source src={`${base}.webm`} type="video/webm; codecs=vp9" />
      <source src={`${base}.mp4`} type="video/mp4" />
    </video>
  )
}

export default function HeroVideos() {
  const { heroVideos } = historia
  const idTitulo = useId()
  const reduce = useReducedMotion() === true
  const [ahorroDatos] = useState(quiereAhorrarDatos)
  const estatico = reduce || ahorroDatos

  const seccionRef = useRef<HTMLElement>(null)
  const videosRef = useRef<(HTMLVideoElement | null)[]>([])

  // Pointer parallax: dogs drift opposite to each other, never more than PARALAJE_MAX.
  const punteroX = useMotionValue(0)
  const punteroY = useMotionValue(0)
  const resorte = { stiffness: 60, damping: 20, mass: 0.6 }
  const suaveX = useSpring(punteroX, resorte)
  const suaveY = useSpring(punteroY, resorte)
  const invertidoX = useTransform(suaveX, (v) => -v)
  const invertidoY = useTransform(suaveY, (v) => -v)
  const [conParalaje, setConParalaje] = useState(false)

  useEffect(() => {
    if (reduce || typeof window.matchMedia !== 'function') {
      setConParalaje(false)
      return
    }
    const consulta = window.matchMedia('(pointer: fine) and (min-width: 56.25em)')
    const actualizar = () => setConParalaje(consulta.matches)
    actualizar()
    consulta.addEventListener('change', actualizar)
    return () => consulta.removeEventListener('change', actualizar)
  }, [reduce])

  // Loops only play while the hero is on screen and the tab is visible (DESIGN.md §7).
  useEffect(() => {
    if (estatico) return
    const seccion = seccionRef.current
    if (!seccion) return

    let enPantalla = true
    const sincronizar = () => {
      const reproducir = enPantalla && document.visibilityState === 'visible'
      for (const video of videosRef.current) {
        if (!video) continue
        if (reproducir) {
          video.muted = true
          video.play().catch(() => {
            // Autoplay refused (low-power mode, data saver): the poster stays visible.
          })
        } else {
          video.pause()
        }
      }
    }

    const observador = new IntersectionObserver(
      ([entrada]) => {
        enPantalla = entrada?.isIntersecting ?? true
        sincronizar()
      },
      { threshold: 0.1 },
    )
    observador.observe(seccion)
    document.addEventListener('visibilitychange', sincronizar)
    return () => {
      observador.disconnect()
      document.removeEventListener('visibilitychange', sincronizar)
    }
  }, [estatico])

  function alMoverPuntero(evento: PointerEvent<HTMLElement>) {
    if (!conParalaje || evento.pointerType !== 'mouse') return
    const caja = evento.currentTarget.getBoundingClientRect()
    const nx = ((evento.clientX - caja.left) / caja.width) * 2 - 1
    const ny = ((evento.clientY - caja.top) / caja.height) * 2 - 1
    punteroX.set(Math.max(-1, Math.min(1, nx)) * PARALAJE_MAX)
    punteroY.set(Math.max(-1, Math.min(1, ny)) * PARALAJE_MAX * 0.6)
  }

  function alSalirPuntero() {
    punteroX.set(0)
    punteroY.set(0)
  }

  const subir = reduce ? 0 : 28
  const entrada = (retraso: number, duracion = 0.8) => ({
    initial: { opacity: 0, y: subir },
    animate: { opacity: 1, y: 0 },
    transition: { duration: duracion, delay: retraso, ease: EASE_EXPO },
  })

  // Opposite drift for the two dogs.
  const desplazamientos: [MotionValue<number>, MotionValue<number>][] = [
    [suaveX, suaveY],
    [invertidoX, invertidoY],
  ]

  return (
    <section
      ref={seccionRef}
      className={estilos.hero}
      aria-labelledby={idTitulo}
      onPointerMove={alMoverPuntero}
      onPointerLeave={alSalirPuntero}
    >
      <div className={`contenedor ${estilos.rejilla}`}>
        <div className={estilos.texto}>
          <motion.h1 id={idTitulo} className={estilos.titulo} {...entrada(0)}>
            {mostrar(heroVideos.titulo)}
          </motion.h1>
          <motion.div {...entrada(0.08)}>
            <p className={estilos.linea}>{mostrar(heroVideos.linea)}</p>
            <div className={estilos.acciones}>
              <Boton href="#ayudar">{mostrar(heroVideos.ctaPrincipal.texto)}</Boton>
              <a className={estilos.enlace} href="#adoptar">
                {mostrar(heroVideos.ctaSecundario.texto)}
              </a>
            </div>
          </motion.div>
        </div>

        {perros.map((perro, i) => {
          const [x, y] = desplazamientos[i] ?? desplazamientos[0]
          return (
            <motion.div
              key={perro.nombre}
              className={`${estilos.perro} ${i === 0 ? estilos.perroUno : estilos.perroDos}`}
              {...entrada(0.15 + i * 0.1, 0.95)}
            >
              <motion.div
                className={perro.claseMarco}
                style={conParalaje ? { x, y } : undefined}
              >
                <VideoPerro
                  perro={perro}
                  estatico={estatico}
                  registrar={(video) => {
                    videosRef.current[i] = video
                  }}
                />
              </motion.div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

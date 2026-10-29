import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { useReducedMotion } from 'motion/react'
import { historia } from '../../contenido/historia'
import styles from './HeroWild.module.css'

const DURATION = 2100

type DataConnection = EventTarget & { saveData?: boolean }
function dataConnection(): DataConnection | undefined {
  return typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { connection?: DataConnection }).connection
}
function subscribeDataPreference(onChange: () => void) {
  const connection = dataConnection()
  connection?.addEventListener('change', onChange)
  return () => connection?.removeEventListener('change', onChange)
}
const readDataPreference = () => dataConnection()?.saveData === true
// Safari y todo navegador de iPhone no pintan la transparencia del WebM VP9 y el MP4 trae fondo:
// ahí se muestra la imagen fija, que sí es transparente
const sinCambios = () => () => {}
const sinVideoTransparente = () => {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (/Safari\//.test(ua) && !/Chrome|Chromium|Edg|Android|Firefox/.test(ua))
}
const serverDataPreference = () => false

export default function HeroWild(_props: { siguiente?: string }) {
  const reduce = useReducedMotion() === true
  // Server rendering has no navigator; the server snapshot also keeps hydration stable.
  const saveData = useSyncExternalStore(subscribeDataPreference, readDataPreference, serverDataPreference)
  const soloImagen = useSyncExternalStore(sinCambios, sinVideoTransparente, () => false)
  const sectionRef = useRef<HTMLElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLSpanElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const animations = useRef<Animation[]>([])
  const copy = historia.heroWild

  useLayoutEffect(() => {
    const section = sectionRef.current
    const pill = pillRef.current
    const row = rowRef.current
    if (!section || !pill || !row || reduce) return
    let active = true
    const createTimeline = () => {
      animations.current.forEach(animation => animation.cancel())
      const mobile = matchMedia('(max-width: 45em)').matches
      const fs = parseFloat(getComputedStyle(row).fontSize)
      const finalWidth = mobile ? row.getBoundingClientRect().width : fs * 3.62
      const finalHeight = mobile ? finalWidth / 1.85 : fs * 1.81
      const dimension = mobile ? 'height' : 'width'
      const final = mobile ? finalHeight : finalWidth
      // The media's box stays at its final size while its parent reveals it.
      pill.style.setProperty('--media-width', `${finalWidth}px`)
      pill.style.setProperty('--media-height', `${finalHeight}px`)
      const animate = (element: Element | null, keyframes: Keyframe[]) => {
        if (!element) return
        const animation = element.animate(keyframes, { duration: DURATION, fill: 'both' })
        animation.pause()
        animation.currentTime = 0
        animations.current.push(animation)
      }
      animations.current = []
      const sizes = mobile ? [1.5, 1.5, final * 0.1, final * 0.55, final] : [fs * 0.012, fs * 0.012, fs * 0.16, fs * 1.81, final]
      animate(pill, [0, 0.14, 0.3, 0.58, 1].map((offset, index) => ({
        offset,
        [dimension]: `${sizes[index]}px`,
        clipPath: index === 0 ? (mobile ? 'inset(0 50%)' : 'inset(50% 0)') : 'inset(0)',
        easing: index < 2 ? 'cubic-bezier(.5,0,.3,1)' : 'cubic-bezier(.4,0,.2,1)',
      })))
      animate(row, [{ gap: `${fs * 0.026}px`, offset: 0 }, { gap: `${fs * 0.026}px`, offset: 0.14 }, { gap: `${fs * 0.05}px`, offset: 0.58 }, { gap: `${fs * (mobile ? 0.1 : 0.085)}px`, offset: 1 }])
      animate(lineRef.current, [{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.14 }, { opacity: 0, offset: 0.3 }, { opacity: 0, offset: 1 }])
      animate(paperRef.current, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1, offset: 0.78 }, { opacity: 1, offset: 1 }])
      return animations.current
    }
    createTimeline()
    void document.fonts.load('800 100px "Inter Wild"').catch(() => []).then(() => {
      if (!active) return
      const start = Number(document.timeline.currentTime)
      animations.current.forEach(animation => { animation.play(); animation.startTime = start })
    })
    let width = section.clientWidth
    let height = section.clientHeight
    const resize = new ResizeObserver(() => {
      if (section.clientWidth === width && section.clientHeight === height) return
      width = section.clientWidth
      height = section.clientHeight
      createTimeline().forEach(animation => animation.finish())
    })
    resize.observe(section)
    return () => {
      active = false
      resize.disconnect()
      animations.current.forEach(animation => animation.cancel())
      animations.current = []
    }
  }, [reduce])

  useEffect(() => {
    const section = sectionRef.current
    const video = videoRef.current
    if (!section || !video || reduce || saveData) return
    let visible = true
    const sync = () => {
      if (visible && !document.hidden) void video.play().catch(() => {})
      else video.pause()
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() }, { threshold: 0.05 })
    observer.observe(section)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); video.pause() }
  }, [reduce, saveData])

  return (
    <section ref={sectionRef} id="top" className={styles.hero} aria-labelledby="wild-title">
      <div ref={paperRef} className={styles.paper} aria-hidden="true">
        <svg viewBox="0 0 1440 960" preserveAspectRatio="none">
          {Array.from({ length: 15 }, (_, index) => <path key={index} d={`M ${-500 + index * 75} 1020 C ${300 + index * 25} 980, ${150 + index * 60} 370, ${810 + index * 60} -120`} strokeWidth={1.2 + index * 0.19} opacity={0.55 + (index % 4) * 0.1} />)}
        </svg>
      </div>
      <h1 id="wild-title" className="visually-hidden">{copy.title}</h1>
      <div ref={rowRef} className={styles.word}>
        <span className={styles.half} aria-hidden="true">AD</span>
        <div ref={pillRef} className={styles.pill}>
          <div className={styles.media}>
            {reduce || saveData || soloImagen ? <img src="/media/video/perro-2-poster.webp?v=3" alt="Cachorro atigrado mirando a la cámara. Imagen de referencia." width="490" height="660" /> :
              <video ref={videoRef} autoPlay muted playsInline loop preload="metadata" poster="/media/video/perro-2-poster.webp?v=3" aria-label="Un cachorro atigrado mira a la cámara. Video de referencia." disablePictureInPicture>
                <source src="/media/video/perro-2.webm?v=3" type="video/webm; codecs=vp9" />
                <source src="/media/video/perro-2.mp4?v=3" type="video/mp4" />
              </video>}
          </div>
          <span ref={lineRef} className={styles.hairline} aria-hidden="true" />
        </div>
        <span className={styles.half} aria-hidden="true">PTA</span>
      </div>
    </section>
  )
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import Boton from '../../componentes/Boton'
import { historia } from '../../contenido/historia'
import styles from './HeroWild.module.css'

const DURATION = 2100

export default function HeroWild() {
  const reduce = useReducedMotion() === true
  const [saveData] = useState(() => (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true)
  const [paused, setPaused] = useState(false)
  const [replaying, setReplaying] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLSpanElement>(null)
  const iconsRef = useRef<HTMLDivElement>(null)
  const ruleRef = useRef<HTMLDivElement>(null)
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
      const finalWidth = mobile ? section.getBoundingClientRect().width - 40 : fs * 3.62
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
      animate(navRef.current, [{ transform: 'translateY(-140%)', opacity: 0, offset: 0 }, { transform: 'translateY(-140%)', opacity: 0, offset: 0.5, easing: 'cubic-bezier(.2,.8,.2,1)' }, { transform: 'none', opacity: 1, offset: 0.86 }, { transform: 'none', opacity: 1, offset: 1 }])
      animate(footerRef.current, [{ transform: 'translateY(160%)', opacity: 0, offset: 0 }, { transform: 'translateY(160%)', opacity: 0, offset: 0.52, easing: 'cubic-bezier(.2,.8,.2,1)' }, { transform: 'none', opacity: 1, offset: 0.9 }, { transform: 'none', opacity: 1, offset: 1 }])
      animate(ruleRef.current, [{ transform: 'scaleX(0)', offset: 0 }, { transform: 'scaleX(0)', offset: 0.4 }, { transform: 'scaleX(1)', offset: 0.95 }, { transform: 'scaleX(1)', offset: 1 }])
      animate(iconsRef.current, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.8 }, { opacity: 1, offset: 1 }])
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
      if (visible && !document.hidden && !paused) void video.play().catch(() => {})
      else video.pause()
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() }, { threshold: 0.05 })
    observer.observe(section)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); video.pause() }
  }, [paused, reduce, saveData])

  async function replay() {
    if (reduce || replaying || !animations.current.length) return
    setReplaying(true)
    const timeline = animations.current
    timeline.forEach(animation => { animation.currentTime = DURATION; animation.playbackRate = -1; animation.play() })
    await Promise.all(timeline.map(animation => animation.finished.catch(() => {})))
    if (animations.current === timeline) {
      timeline.forEach(animation => { animation.currentTime = 0; animation.playbackRate = 1; animation.play() })
      await Promise.all(timeline.map(animation => animation.finished.catch(() => {})))
    }
    setReplaying(false)
  }

  return (
    <section ref={sectionRef} id="top" className={styles.hero} aria-labelledby="wild-title">
      <div ref={paperRef} className={styles.paper} aria-hidden="true">
        <svg viewBox="0 0 1440 960" preserveAspectRatio="none">
          {Array.from({ length: 15 }, (_, index) => <path key={index} d={`M ${-500 + index * 75} 1020 C ${300 + index * 25} 980, ${150 + index * 60} 370, ${810 + index * 60} -120`} strokeWidth={1.2 + index * 0.19} opacity={0.55 + (index % 4) * 0.1} />)}
        </svg>
      </div>
      <nav ref={navRef} className={styles.nav} aria-label="Principal">
        <div className={styles.links}><a href="#top">Huellitas</a><a href="#historia">Historia</a><a href="#ayudar">Cómo ayudar</a><a href="#adoptar">Adoptar</a></div>
        <span className={styles.location}>Rescate de perros y gatos · Colombia</span>
      </nav>
      <h1 id="wild-title" className="visually-hidden">{copy.title}</h1>
      <div ref={rowRef} className={styles.word}>
        <span className={styles.half} aria-hidden="true">AD</span>
        <div ref={pillRef} className={styles.pill}>
          <div className={styles.media}>
            {reduce || saveData ? <img src="/media/video/perro-2-poster.webp" alt="Cachorro atigrado mirando a la cámara. Imagen de referencia." width="490" height="660" /> :
              <video ref={videoRef} autoPlay muted playsInline loop preload="metadata" poster="/media/video/perro-2-poster.webp" aria-label="Un cachorro atigrado mira a la cámara. Video de referencia." disablePictureInPicture>
                <source src="/media/video/perro-2.mp4" type="video/mp4" />
              </video>}
          </div>
          <span ref={lineRef} className={styles.hairline} aria-hidden="true" />
          <div ref={iconsRef} className={styles.icons}>
            <svg className={styles.heart} viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 5.7a5 5 0 0 0-7.1 0L12 7.1l-1.4-1.4a5 5 0 0 0-7.1 7.1L12 21l8.5-8.2a5 5 0 0 0 0-7.1Z" /></svg>
            {!reduce && !saveData && <button type="button" className={styles.pause} onClick={() => setPaused(value => !value)} aria-label={paused ? 'Reproducir video' : 'Pausar video'} aria-pressed={paused}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{paused ? <path d="m9 5 11 7-11 7Z" /> : <path d="M8 5v14M16 5v14" />}</svg>
            </button>}
          </div>
        </div>
        <span className={styles.half} aria-hidden="true">PTA</span>
      </div>
      <p className={styles.statement}>{copy.statement}</p>
      <div ref={footerRef} className={styles.footer}>
        <div className={styles.copy}><p>{copy.lead}</p><span>Video de referencia. No es una ficha de adopción.</span></div>
        <div ref={ruleRef} className={styles.rule} aria-hidden="true" />
        <div className={styles.actions}>
          {!reduce && <button type="button" className={styles.replay} onClick={() => void replay()} disabled={replaying} aria-busy={replaying}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" /></svg><span>Volver a mirar</span></button>}
          <Boton href="#adoptar">{copy.cta}</Boton>
        </div>
      </div>
    </section>
  )
}

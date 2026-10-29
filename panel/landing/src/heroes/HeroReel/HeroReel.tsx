import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react'
import { useReducedMotion } from 'motion/react'
import Boton from '../../componentes/Boton'
import { img } from '../../contenido/imagenes'
import { historia } from '../../contenido/historia'
import styles from './HeroReel.module.css'

const media = [
  { slug: 'cachorro-atigrado-ladrillo' },
  { slug: 'gatos-abrazados-foto' },
  { slug: 'perro-negro-fuego-cara', video: 'perro-1' },
  { slug: 'perro-cafe-lengua-ladrillo' },
  { slug: 'gato-atigrado-cara' },
  { slug: 'cachorro-atigrado-ladrillo', video: 'perro-2' },
  { slug: 'chihuahua-primer-plano' },
  { slug: 'perro-crema-cara' },
  { slug: 'gatito-atigrado-cara' },
  { slug: 'terrier-gris-cara' },
]

// Round each corner of a four-sided card, preserving the cylinder's unequal edges.
function roundedQuad(points: number[][], radius: number) {
  const near = (from: number[], to: number[]) => {
    const distance = Math.hypot(to[0] - from[0], to[1] - from[1])
    const ratio = Math.min(radius / distance, 0.45)
    return [from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio]
  }
  return points.map((point, i) => {
    const start = near(point, points[(i + 3) % 4])
    const end = near(point, points[(i + 1) % 4])
    return `${i ? 'L' : 'M'}${start.join(',')} Q${point.join(',')} ${end.join(',')}`
  }).join(' ') + ' Z'
}

export default function HeroReel() {
  const reduce = useReducedMotion() === true
  const [paused, setPaused] = useState(false)
  const [saveData] = useState(() => (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true)
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLDivElement | null)[]>([])
  const movement = useRef({ offset: 0, velocity: 0, dragging: false, x: 0, time: 0, scale: 1 })

  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track) return
    let visible = true
    let frame = 0
    let previous = 0
    let width = track.clientWidth
    let height = track.clientHeight
    let lastOffset = Number.NaN
    let lastWidth = 0
    let lastHeight = 0
    const clock = reduce ? null : section.animate([], { duration: 1e9 })
    const state = movement.current
    const updateMedia = () => {
      const playing = visible && !document.hidden && !paused && !reduce
      section.querySelectorAll('video').forEach(video => {
        if (playing) void video.play().catch(() => {})
        else video.pause()
      })
    }
    const draw = (time: number) => {
      const now = typeof clock?.currentTime === 'number' ? clock.currentTime : time
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0
      previous = now
      const scale = width / (width <= 820 ? 640 : 1440)
      state.scale = scale
      if (visible && !document.hidden && !paused && !reduce && !state.dragging) {
        state.offset += (50 + state.velocity) * dt
        state.velocity *= Math.exp(-3 * dt)
      }
      if (state.offset !== lastOffset || width !== lastWidth || height !== lastHeight) cards.current.forEach((card, index) => {
        if (!card) return
        const pitch = 196
        const total = media.length * pitch
        const t = ((index * pitch - state.offset + total / 2) % total + total) % total - total / 2
        const d = Math.abs(t) / 706
        const cardWidth = (170 + 48 * d * d) * scale
        const centerX = width / 2 + t * (1 + 0.083 * (t / 706) ** 2) * scale
        const left = centerX - cardWidth / 2
        const edgeHeight = (x: number) => (280 + 92 * Math.min(Math.abs(x - width / 2) / (706 * scale), 1.5) ** 2.6) * scale
        const leftHeight = edgeHeight(left)
        const rightHeight = edgeHeight(left + cardWidth)
        const cardHeight = Math.max(leftHeight, rightHeight)
        const centerY = height / 2 - 12 * Math.min(d, 1.5) ** 2 * scale
        const topLeft = (cardHeight - leftHeight) / 2
        const topRight = (cardHeight - rightHeight) / 2
        card.style.width = `${cardWidth}px`
        card.style.height = `${cardHeight}px`
        card.style.transform = `translate3d(${left}px,${centerY - cardHeight / 2}px,0)`
        card.style.clipPath = `path('${roundedQuad([[0, topLeft], [cardWidth, topRight], [cardWidth, topRight + rightHeight], [0, topLeft + leftHeight]], 15 * scale)}')`
      })
      lastOffset = state.offset
      lastWidth = width
      lastHeight = height
      frame = requestAnimationFrame(draw)
    }
    const resize = new ResizeObserver(() => { width = track.clientWidth; height = track.clientHeight })
    resize.observe(track)
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; updateMedia() }, { threshold: 0.05 })
    observer.observe(section)
    document.addEventListener('visibilitychange', updateMedia)
    frame = requestAnimationFrame(draw)
    updateMedia()
    return () => {
      cancelAnimationFrame(frame)
      clock?.cancel()
      resize.disconnect()
      observer.disconnect()
      document.removeEventListener('visibilitychange', updateMedia)
      section.querySelectorAll('video').forEach(video => video.pause())
    }
  }, [paused, reduce, saveData])

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const state = movement.current
    state.dragging = true
    state.velocity = 0
    state.x = event.clientX
    state.time = event.timeStamp
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.dataset.dragging = 'true'
  }
  function drag(event: PointerEvent<HTMLDivElement>) {
    const state = movement.current
    if (!state.dragging) return
    const delta = (state.x - event.clientX) / state.scale
    const dt = Math.max((event.timeStamp - state.time) / 1000, 0.008)
    state.offset += delta
    state.velocity = Math.max(-1500, Math.min(1500, delta / dt))
    state.x = event.clientX
    state.time = event.timeStamp
  }
  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    movement.current.dragging = false
    if (event.type === 'pointercancel') movement.current.velocity = 0
    event.currentTarget.dataset.dragging = 'false'
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    movement.current.offset += event.key === 'ArrowRight' ? 196 : -196
    movement.current.velocity = 0
  }

  const copy = historia.heroReel
  return (
    <section ref={sectionRef} className={styles.hero} aria-labelledby="hero-reel-title" data-reduced={reduce}>
      <div className={styles.frame}>
        <p className={styles.badge}>{copy.badge}</p>
        <h1 id="hero-reel-title" className={styles.title}><span>{copy.lineOne}</span>{' '}<span>{copy.lineTwo}</span></h1>
        <p className={styles.lead}>{copy.lead}</p>
        <span className={styles.doodle} aria-hidden="true">
          <svg viewBox="0 0 58 55"><path d="M11 39 24 9M29 46 46 13" /></svg>
        </span>
        <div className={styles.note} aria-hidden="true"><span>Una segunda<br />oportunidad</span>
          <svg viewBox="0 0 160 120"><path d="M26 8c89 1 108 54 62 85-12 8-27 10-42 6m0 0 17-12m-17 12 18 11" /></svg>
        </div>
        <div ref={trackRef} className={styles.carousel} role="group" aria-label="Galería de perros y gatos. Usa las flechas para recorrerla." tabIndex={0}
          onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag} onKeyDown={onKeyDown}>
          {media.map((item, index) => (
            <div key={`${item.slug}-${index}`} ref={element => { cards.current[index] = element }} className={styles.card}>
              {item.video && !reduce && !saveData ? <>
                <video muted autoPlay loop playsInline preload="metadata" poster={`/media/video/${item.video}-poster.webp`} aria-label="Video de referencia de un perro" tabIndex={-1} disablePictureInPicture>
                  <source src={`/media/video/${item.video}.webm`} type="video/webm; codecs=vp9" />
                  <source src={`/media/video/${item.video}.mp4`} type="video/mp4" />
                </video>
                <span className={styles.videoMark} aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m7 5 8 5-8 5Z" /></svg></span>
              </> : <img {...img(item.slug as Parameters<typeof img>[0], '(max-width: 820px) 140px, 240px')} loading={index < 7 ? 'eager' : 'lazy'} decoding="async" draggable={false} />}
            </div>
          ))}
        </div>
        <div className={styles.action}>
          <div className={styles.buttonRing}><Boton href="#adoptar">{copy.cta}</Boton></div>
          <span className={styles.actionNote} aria-hidden="true">Su próximo<br />capítulo <svg viewBox="0 0 75 45"><path d="M4 8c11 25 36 27 62 12m-13-4 14 4-4 12" /></svg></span>
        </div>
        <div className={styles.meta}><p>Imágenes de referencia. No son fichas de adopción.</p>
          {!reduce && <button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused}>{paused ? 'Reanudar galería' : 'Pausar galería'}<span aria-hidden="true">{paused ? '↗' : 'Ⅱ'}</span></button>}
        </div>
      </div>
    </section>
  )
}

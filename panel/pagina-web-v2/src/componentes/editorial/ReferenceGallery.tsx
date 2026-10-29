// Original implementation. Visual reference: OriginKit Coverflow Gallery.
// OriginKit source was not acquired (sign-in required); no OriginKit code is copied.
import { useId, useState, type KeyboardEvent } from 'react'
import { motion, useReducedMotion, type PanInfo } from 'motion/react'
import { img } from '../../contenido/imagenes'
import { editorial } from '../../contenido/historia'
import { EDITORIAL_EASE } from './Reveal'
import styles from './ReferenceGallery.module.css'

const photos = ['cachorro-atigrado-ladrillo', 'gatos-abrazados-foto', 'chihuahua-primer-plano'] as const

export default function ReferenceGallery() {
  const [selected, setSelected] = useState(0)
  const reduce = useReducedMotion()
  const uid = useId()
  const copy = editorial.gallery
  const wrap = (index: number) => (index + photos.length) % photos.length

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') { event.preventDefault(); setSelected(index => wrap(index + 1)) }
    if (event.key === 'ArrowLeft') { event.preventDefault(); setSelected(index => wrap(index - 1)) }
    if (event.key === 'Home') { event.preventDefault(); setSelected(0) }
    if (event.key === 'End') { event.preventDefault(); setSelected(photos.length - 1) }
  }

  function swipe(_: unknown, info: PanInfo) {
    if (Math.abs(info.offset.x) < 50 || Math.abs(info.offset.x) <= Math.abs(info.offset.y)) return
    setSelected(index => wrap(index + (info.offset.x < 0 ? 1 : -1)))
  }

  return <div className={styles.gallery} role="region" aria-roledescription="carrusel"
    aria-label={copy.label} onKeyDown={onKeyDown}>
    <motion.div id={`${uid}-photos`} className={styles.stage} onPanEnd={swipe}>
      {photos.map((slug, index) => {
        const position = index === selected ? 0 : index === wrap(selected - 1) ? -1 : 1
        return <motion.div key={slug} className={styles.photo} data-position={position}
          aria-hidden={position !== 0}
          animate={{ x: `${position * 76}%`, scale: reduce ? 1 : position === 0 ? 1 : 0.82,
            rotate: reduce ? 0 : position * 5, opacity: position === 0 ? 1 : 0.5 }}
          initial={false} transition={{ duration: reduce ? 0 : 0.6, ease: EDITORIAL_EASE }}>
          <img {...img(slug, '(min-width: 900px) 480px, 76vw')} alt={img(slug).alt} loading="lazy" decoding="async" draggable={false} />
        </motion.div>
      })}
    </motion.div>
    <div className={styles.controls}>
      <button className={styles.arrow} type="button" aria-label={copy.previous} aria-controls={`${uid}-photos`}
        onClick={() => setSelected(index => wrap(index - 1))}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7" /></svg></button>
      <div className={styles.dots} aria-label={copy.choose}>
        {photos.map((slug, index) => <button type="button" key={slug} aria-label={`${copy.show} ${index + 1}`}
          aria-controls={`${uid}-photos`} aria-current={selected === index ? 'true' : undefined}
          onClick={() => setSelected(index)}><span /></button>)}
      </div>
      <button className={styles.arrow} type="button" aria-label={copy.next} aria-controls={`${uid}-photos`}
        onClick={() => setSelected(index => wrap(index + 1))}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-7-7 7 7-7 7" /></svg></button>
    </div>
    <p className={styles.status} aria-live="polite" aria-atomic="true">{copy.photo} {selected + 1} {copy.of} {photos.length}</p>
  </div>
}

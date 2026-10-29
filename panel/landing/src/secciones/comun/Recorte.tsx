import { motion, useReducedMotion } from 'motion/react'
import { img, type SlugImagen } from '../../contenido/imagenes'
import { EASE_EXPO } from './movimiento'

interface Props {
  slug: SlugImagen
  className: string
  sizes: string
}

// Decorative cut-out animal with the signature "asomarse" move: it rises once from behind its edge.
export default function Recorte({ slug, className, sizes }: Props) {
  const reduce = useReducedMotion() ?? false
  return (
    <motion.img
      {...img(slug, sizes)}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className={className}
      initial={{ y: reduce ? 0 : '40%', opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: reduce ? 0.2 : 1.1, ease: EASE_EXPO }}
    />
  )
}

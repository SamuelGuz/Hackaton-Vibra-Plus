// Motion language from docs/DESIGN.md §7, mirrored as JS constants for `motion/react`.
import { useReducedMotion, type Variants } from 'motion/react'

export const EASE_SALIDA = [0.22, 1, 0.36, 1] as const
export const EASE_EXPO = [0.16, 1, 0.3, 1] as const
export const EASE_VIAJE = [0.76, 0, 0.24, 1] as const

const DIST_REVELAR = 28

/**
 * Scroll reveal, once per element: spread `grupo` on the parent motion element and
 * `item` on each child (max 4 children per sequence). Reduced motion keeps opacity only.
 */
export function useRevelar(amount = 0.25) {
  const reduce = useReducedMotion() ?? false

  const grupo = {
    initial: 'oculto',
    whileInView: 'visible',
    viewport: { once: true, amount },
    variants: {
      oculto: {},
      visible: { transition: { staggerChildren: reduce ? 0 : 0.07 } },
    } satisfies Variants,
  } as const

  const item = {
    variants: {
      oculto: { opacity: 0, y: reduce ? 0 : DIST_REVELAR },
      visible: { opacity: 1, y: 0, transition: { duration: reduce ? 0.2 : 0.8, ease: EASE_EXPO } },
    } satisfies Variants,
  } as const

  /** Photo settling from scale 1.04, used inside an overflow-hidden frame. */
  const foto = {
    variants: {
      oculto: { opacity: 0, scale: reduce ? 1 : 1.04 },
      visible: { opacity: 1, scale: 1, transition: { duration: reduce ? 0.2 : 1.1, ease: EASE_EXPO } },
    } satisfies Variants,
  } as const

  return { grupo, item, foto, reduce }
}

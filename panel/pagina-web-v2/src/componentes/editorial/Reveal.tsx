// Adapted from Magic UI BlurFade. Copyright (c) Magic UI.
// MIT license: docs/licenses/magicui.txt. No blur or exit animation in this adaptation.
import { useRef, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

export const EDITORIAL_EASE = [0.23, 1, 0.32, 1] as const

export default function Reveal({ children, className, delay = 0 }: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useInView(ref, { once: true, amount: 0.12 })
  const reduce = useReducedMotion()

  return <motion.div ref={ref} className={className}
    initial={false}
    animate={visible && !reduce ? { y: [28, 0] } : { y: 0 }}
    transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : Math.min(delay, 0.21), ease: EDITORIAL_EASE }}
  >{children}</motion.div>
}

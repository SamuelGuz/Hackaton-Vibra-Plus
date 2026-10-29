'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import s from './Home.module.css'

/** Rise 28px + fade once when it enters the viewport (docs/BRANDING-HERO.md §6). */
export function useVisto<T extends HTMLElement>(umbral = 0.2) {
  const ref = useRef<T>(null)
  const [visto, setVisto] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setVisto(true); return }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisto(true); obs.disconnect() } }, { threshold: umbral, rootMargin: '0px 0px -8% 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [umbral])
  return [ref, visto] as const
}

export function Reveal({ children, retraso = 0, className = '' }: { children: ReactNode; retraso?: number; className?: string }) {
  const [ref, visto] = useVisto<HTMLDivElement>(0.12)
  return <div ref={ref} className={`${s.reveal} ${visto ? s.revealOn : ''} ${className}`} style={{ transitionDelay: `${retraso}ms` }}>{children}</div>
}

'use client'

import { useEffect, useRef, useState } from 'react'
import s from './Home.module.css'

interface Item { id: number; dx: number; dy: number; size: number; delay: number; dur: number; claro: boolean }

/**
 * Sparse, slow hearts for explicit actions only (docs/estrategia/ARQUITECTURA-Y-COPY.md §6).
 * Raise `rafaga` to fire once; max one burst every 4 s; removed from the DOM when finished.
 * Local to the Home: not exported globally.
 */
export default function Corazones({ rafaga, cantidad = 3 }: { rafaga: number; cantidad?: number }) {
  const [items, setItems] = useState<Item[]>([])
  const ultimo = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (rafaga <= 0) return
    const ahora = Date.now()
    if (ahora - ultimo.current < 4000) return
    ultimo.current = ahora
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const n = reduce ? 1 : cantidad
    setItems(Array.from({ length: n }, (_, i) => ({
      id: ahora + i,
      dx: Math.round((Math.random() * 2 - 1) * 16),
      dy: 60 + Math.round(Math.random() * 60),
      size: 10 + Math.round(Math.random() * 8),
      delay: i * 120,
      dur: 2400 + Math.round(Math.random() * 800),
      claro: i % 2 === 1,
    })))
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setItems([]), 3800 + n * 120)
  }, [rafaga, cantidad])

  useEffect(() => () => clearTimeout(timer.current), [])

  if (items.length === 0) return null
  return (
    <span className={s.corazones} aria-hidden="true">
      {items.map(i => (
        <svg key={i.id} className={`${s.corazon} ${i.claro ? s.corazonClaro : ''}`} viewBox="0 0 24 24" width={i.size} height={i.size}
          style={{ '--dx': `${i.dx}px`, '--dy': `${-i.dy}px`, animationDelay: `${i.delay}ms`, animationDuration: `${i.dur}ms` } as React.CSSProperties}>
          <path d="M20.5 5.7a5 5 0 0 0-7.1 0L12 7.1l-1.4-1.4a5 5 0 0 0-7.1 7.1L12 21l8.5-8.2a5 5 0 0 0 0-7.1Z" />
        </svg>
      ))}
    </span>
  )
}

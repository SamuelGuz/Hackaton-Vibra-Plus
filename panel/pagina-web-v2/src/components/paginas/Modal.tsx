'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import s from './Modal.module.css'

const ENFOCABLES = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),summary,[tabindex]:not([tabindex="-1"])'
const SALIDA_MS = 150

interface Props {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  children: ReactNode
  /** Impide cerrar con Escape o clic en el fondo (por ejemplo durante un envio). */
  bloquear?: boolean
  ancho?: 'media' | 'ancha'
}

/**
 * Dialogo accesible: role=dialog + aria-modal, foco atrapado, Escape, clic en el fondo,
 * foco devuelto al disparador, scroll bloqueado. Entrada ease-out fuerte 220 ms con scale .96 a 1,
 * salida 150 ms. En movil se comporta como hoja inferior.
 */
export function Modal({ abierto, onCerrar, titulo, children, bloquear = false, ancho = 'media' }: Props) {
  const [montado, setMontado] = useState(abierto)
  const [saliendo, setSaliendo] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const retorno = useRef<HTMLElement | null>(null)
  const idTitulo = useId()

  useEffect(() => {
    if (abierto) {
      retorno.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setMontado(true)
      setSaliendo(false)
      return
    }
    if (!montado) return
    setSaliendo(true)
    const t = window.setTimeout(() => { setMontado(false); setSaliendo(false) }, SALIDA_MS)
    const volver = retorno.current
    if (volver && document.contains(volver)) volver.focus({ preventScroll: true })
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  // Foco inicial y bloqueo de scroll mientras este montado.
  useEffect(() => {
    if (!montado) return
    const anterior = document.body.style.overflow
    const anchoBarra = window.innerWidth - document.documentElement.clientWidth
    const padPrevio = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'
    if (anchoBarra > 0) document.body.style.paddingRight = `${anchoBarra}px`
    const f = requestAnimationFrame(() => {
      const p = panel.current
      if (!p || p.contains(document.activeElement)) return
      const cuerpo = p.querySelector<HTMLElement>('[data-cuerpo]')
      const primero = cuerpo?.querySelector<HTMLElement>(ENFOCABLES) ?? p
      primero.focus({ preventScroll: true })
    })
    return () => {
      cancelAnimationFrame(f)
      document.body.style.overflow = anterior
      document.body.style.paddingRight = padPrevio
    }
  }, [montado])

  useEffect(() => {
    if (!montado || !abierto) return
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !bloquear) { e.preventDefault(); onCerrar(); return }
      if (e.key !== 'Tab' || !panel.current) return
      const lista = Array.from(panel.current.querySelectorAll<HTMLElement>(ENFOCABLES)).filter(el => el.offsetParent !== null)
      if (lista.length === 0) { e.preventDefault(); panel.current.focus(); return }
      const primero = lista[0]
      const ultimo = lista[lista.length - 1]
      const activo = document.activeElement
      if (e.shiftKey && (activo === primero || activo === panel.current)) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && activo === ultimo) { e.preventDefault(); primero.focus() }
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [montado, abierto, bloquear, onCerrar])

  if (!montado) return null
  return (
    <div
      className={`${s.fondo} ${saliendo ? s.sale : s.entra}`}
      onMouseDown={e => { if (e.target === e.currentTarget && !bloquear) onCerrar() }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={`${s.panel} ${ancho === 'ancha' ? s.ancha : ''}`}
      >
        <div className={s.cabecera}>
          <h2 id={idTitulo} className={s.titulo}>{titulo}</h2>
          <button type="button" className={s.cerrar} aria-label="Cerrar" onClick={() => { if (!bloquear) onCerrar() }}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /></svg>
          </button>
        </div>
        <div className={s.cuerpo} data-cuerpo>{children}</div>
      </div>
    </div>
  )
}

/** Un paso dentro de un dialogo. `dir` marca desde donde entra (1 derecha, -1 izquierda, 0 sin deslizar). */
export function Paso({ children, dir = 0 }: { children: ReactNode; dir?: 1 | -1 | 0 }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.focus({ preventScroll: true }) }, [])
  return <div ref={ref} tabIndex={-1} className={`${s.paso} ${dir === 1 ? s.desdeDer : dir === -1 ? s.desdeIzq : s.desdeNada}`}>{children}</div>
}

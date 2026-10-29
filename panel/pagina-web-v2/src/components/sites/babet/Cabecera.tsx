'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from './shared'
import shared from './Shared.module.css'
import s from './BabetPage.module.css'

// Shared header for every route. Routes come from docs/estrategia/ARQUITECTURA-Y-COPY.md §1.
export const RUTAS = [
  { label: 'Su historia', href: '/historia' },
  { label: 'Adoptar', href: '/adoptar' },
]

/**
 * `siempre`: show from the first pixel (inner pages). Without it the bar appears after the hero
 * (home page, where the hero draws its own navigation).
 */
export default function Cabecera({ actual, siempre = false }: { actual?: string; siempre?: boolean }) {
  const [pasoHero, setPasoHero] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (siempre) return
    const update = () => setPasoHero(window.scrollY > window.innerHeight * 0.9)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [siempre])
  useEffect(() => {
    if (!open) return
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [open])
  if (!siempre && !pasoHero && !open) return null
  return <>
    <header className={`${s.header} ${s.sticky} huellitas-header-visible`} style={{ background: 'var(--babet-white)', color: 'var(--babet-dark)' }}>
      <div className={`${shared.container} ${s.headerInner}`}>
        <Link href="/" aria-label="Huellitas, inicio"><span className="huellitas-marca">Huellitas</span></Link>
        <nav className={s.desktopNav} aria-label="Navegación principal"><ul>{RUTAS.map(r => <li key={r.href}><Link href={r.href} aria-current={actual === r.href ? 'page' : undefined} style={{ color: 'var(--babet-dark)', textDecoration: actual === r.href ? 'underline' : 'none', textUnderlineOffset: '0.3em' }}>{r.label}</Link></li>)}</ul></nav>
        <div className={s.headerActions}><Button href="/aportar" className={s.headerBook}>Donar</Button></div>
        <button className={s.menuToggle} aria-label="Abrir navegación" aria-expanded={open} onClick={() => setOpen(true)}><span /><span /><span /></button>
      </div>
    </header>
    {open && <div className={s.mobileBackdrop} onClick={() => setOpen(false)}><div className={s.mobilePanel} onClick={e => e.stopPropagation()}>
      <div className={s.mobileTop}><span className="huellitas-marca">Huellitas</span><button aria-label="Cerrar navegación" onClick={() => setOpen(false)}>×</button></div>
      <nav aria-label="Navegación móvil">{[...RUTAS, { label: 'Donar', href: '/aportar' }].map(r => <Link key={r.href} href={r.href} onClick={() => setOpen(false)}>{r.label}</Link>)}</nav>
    </div></div>}
  </>
}

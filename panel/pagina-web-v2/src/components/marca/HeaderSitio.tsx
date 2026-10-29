'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import s from './Identidad.module.css'

const rutas = [
  { label: 'Inicio', href: '/' },
  { label: 'Su historia', href: '/historia' },
  { label: 'Cómo ayudar', href: '/como-ayudar' },
  { label: 'Adoptar', href: '/adoptar' },
  { label: 'Donar', href: '/aportar' },
]

export default function HeaderSitio() {
  const pathname = usePathname()
  const [compacto, setCompacto] = useState(false)
  const [menu, setMenu] = useState(false)
  const ultimo = useRef(0)
  const colapso = useRef(0)
  const botonMenu = useRef<HTMLButtonElement>(null)
  const header = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', y => {
    const focoDentro = header.current?.contains(document.activeElement) && document.activeElement?.matches(':focus-visible')
    if (compacto) colapso.current = Math.max(colapso.current, y)
    if (!menu && !focoDentro && !compacto && y > ultimo.current && y > 150) {
      colapso.current = y
      setCompacto(true)
    } else if (compacto && (y < 80 || (y < ultimo.current && colapso.current - y > 80))) {
      setCompacto(false)
    }
    ultimo.current = y
  })

  useEffect(() => {
    if (!menu) return
    const cerrar = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenu(false); botonMenu.current?.focus() }
    }
    const fuera = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setMenu(false)
    }
    document.addEventListener('keydown', cerrar)
    document.addEventListener('pointerdown', fuera)
    return () => {
      document.removeEventListener('keydown', cerrar)
      document.removeEventListener('pointerdown', fuera)
    }
  }, [menu])

  return (
    <header ref={header} className={s.header}>
      <motion.div layout={!reduce} transition={{ type: 'spring', damping: 25, stiffness: 280 }} className={`${s.navCard} ${compacto ? s.compacto : ''} ${menu ? s.abierto : ''}`}>
        {compacto ? (
          <button type="button" className={s.reabrir} aria-label="Expandir navegación" onClick={event => {
            const teclado = event.currentTarget.matches(':focus-visible')
            setCompacto(false)
            if (teclado) requestAnimationFrame(() => header.current?.querySelector('a')?.focus())
          }}>
            <MenuIcon />
          </button>
        ) : (
          <>
            <Link href="/" className={s.logo} aria-label="Yesenia Refugio, inicio" onClick={() => setMenu(false)}>
              <Image src="/marca/yesenia-refugio.png" alt="Yesenia Refugio" width={500} height={200} priority />
            </Link>
            <nav className={s.desktop} aria-label="Navegación principal">
              {rutas.map(r => <Link key={r.href} href={r.href} className={r.href === '/aportar' ? s.donar : ''} aria-current={pathname === r.href ? 'page' : undefined}>{r.label}</Link>)}
            </nav>
            <button ref={botonMenu} type="button" className={s.toggle} aria-label={menu ? 'Cerrar navegación' : 'Abrir navegación'} aria-expanded={menu} aria-controls="navegacion-movil" onClick={() => setMenu(v => !v)}>
              {menu ? <span aria-hidden="true">×</span> : <MenuIcon />}
            </button>
            {menu && <nav id="navegacion-movil" className={s.movil} aria-label="Navegación móvil">
              {rutas.map(r => <Link key={r.href} href={r.href} aria-current={pathname === r.href ? 'page' : undefined} onClick={() => setMenu(false)}>{r.label}<span aria-hidden="true">↗</span></Link>)}
            </nav>}
          </>
        )}
      </motion.div>
    </header>
  )
}

function MenuIcon() {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
}

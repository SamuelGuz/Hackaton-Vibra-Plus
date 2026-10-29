'use client'

// Accesos rápidos flotantes (abajo a la derecha): Apoya → donaciones, Instagram y el chat con el agente por WhatsApp.
// Siguen docs/DESIGN.md: solo tokens, sin degradados, sin vidrio, sin sombra en reposo, sin bucles, toques ≥ 48px.
// Aparecen al llegar, en orden; al bajar por la página se esconden y vuelven apenas la persona sube un poco.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { fotoBanco } from '../home2/banco'
import s from './AccesosRapidos.module.css'

/** Se fijan al compilar: el WhatsApp del agente y el Instagram del refugio */
const WHATSAPP = (process.env.NEXT_PUBLIC_WA_AGENTE ?? '').replace(/\D/g, '')
const INSTAGRAM = (process.env.NEXT_PUBLIC_INSTAGRAM ?? '').trim()

/** Igual que --ease-salida: entradas y hovers de menos de 600 ms */
const EASE_SALIDA = [0.22, 1, 0.36, 1] as const

/** Se esconde al bajar (pasado el primer pantallazo) y vuelve al subir */
function useVisibleAlDesplazar(): boolean {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    let ultimo = window.scrollY
    let pendiente = false
    const revisar = () => {
      pendiente = false
      const y = window.scrollY
      if (Math.abs(y - ultimo) > 8) {
        setVisible(y < ultimo || y < window.innerHeight * 0.6)
        ultimo = y
      }
    }
    const alDesplazar = () => {
      if (pendiente) return
      pendiente = true
      requestAnimationFrame(revisar)
    }
    window.addEventListener('scroll', alDesplazar, { passive: true })
    return () => window.removeEventListener('scroll', alDesplazar)
  }, [])
  return visible
}

export default function AccesosRapidos() {
  const ruta = usePathname()
  const reduce = useReducedMotion()
  const visible = useVisibleAlDesplazar()
  const enDonar = ruta?.startsWith('/aportar') ?? false

  // Llegan en orden de lectura; con movimiento reducido, solo opacidad
  const entrada = (i: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.8 + i * 0.08, duration: 0.45, ease: EASE_SALIDA },
  })

  const avatar = fotoBanco('rescatista-cachorro', '48px')

  return (
    <nav className={[s.dock, visible ? '' : s.oculto, enDonar ? s.sobreBarra : ''].join(' ')} aria-label="Accesos rápidos">
      {!enDonar && (
        <motion.div {...entrada(0)}>
          <Link href="/aportar" className={s.apoya}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className={s.icono}>
              <path d="M12 20s-7-4.4-7-9.6A4 4 0 0 1 12 8a4 4 0 0 1 7 2.4C19 15.6 12 20 12 20Z" />
            </svg>
            <span>Apoya</span>
          </Link>
        </motion.div>
      )}

      {INSTAGRAM && (
        <motion.div {...entrada(1)}>
          <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" className={s.redondo} aria-label="Síguenos en Instagram (abre en otra pestaña)">
            <svg viewBox="0 0 24 24" aria-hidden="true" className={s.icono}>
              <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <path d="M17.2 6.8h.01" />
            </svg>
            <span className={s.pista} aria-hidden="true">Síguenos</span>
          </a>
        </motion.div>
      )}

      {WHATSAPP && (
        <motion.div {...entrada(2)}>
          <a
            href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola')}`}
            target="_blank"
            rel="noopener noreferrer"
            className={s.chat}
            aria-label="Escríbenos por WhatsApp para adoptar o donar (abre en otra pestaña)"
          >
            <span className={s.foto}>
              <img src={avatar.src} srcSet={avatar.srcSet} sizes="48px" alt="" width={48} height={48} decoding="async" />
              <span className={s.enLinea} aria-hidden="true" />
            </span>
            <span className={s.chatTexto}>
              <strong>¿Hablamos?</strong>
              <small>Adoptar o donar, por WhatsApp</small>
            </span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className={s.flecha}>
              <path d="M5 12h13m-5-5 5 5-5 5" />
            </svg>
          </a>
        </motion.div>
      )}
    </nav>
  )
}

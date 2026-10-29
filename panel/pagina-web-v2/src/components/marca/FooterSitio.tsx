'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { WHATSAPP_NUMERO, whatsappBonito } from '../paginas/config'
import s from './Identidad.module.css'

export default function FooterSitio() {
  const filtro = useId()
  const reduce = useReducedMotion()
  return (
    <footer className={s.footer}>
      <div className={s.footerCard}>
        <div className={s.footerInterior}>
          <div className={s.brand}>
            <Link href="/" aria-label="Yesenia Refugio, inicio"><Image src="/marca/yesenia-refugio.png" alt="Yesenia Refugio" width={500} height={200} unoptimized className={s.footerLogo} /></Link>
            <p>Un plato lleno o una casa nueva. Cualquiera de las dos cambia el día de alguien.</p>
            <div className={s.atajos}>
              <Link href="/aportar" aria-label="Llenar un plato"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10h18l-3 9H6ZM5 6h2m4 0h2m4 0h2" /></svg></Link>
              <Link href="/adoptar" aria-label="Dar un hogar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7" /></svg></Link>
              <Link href="/historia" aria-label="Conocer a Yesenia"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-3 4 0 7 8 14 8-7 11-10 8-14Z" /></svg></Link>
            </div>
          </div>
          <nav className={s.directorio} aria-label="El refugio"><h2>El refugio</h2><Link href="/">Inicio</Link><Link href="/historia">Su historia</Link><Link href="/adoptar">Adoptar</Link></nav>
          <nav className={s.directorio} aria-label="Cómo ayudar"><h2>Tu ayuda</h2><Link href="/aportar">Donar por Nequi</Link><Link href="/como-ayudar">Cómo ayudar</Link><Link href="/aportar#llega-titulo">Ver actividad</Link></nav>
          <div className={s.directorio}><h2>Contacto</h2><p>WhatsApp<br />{WHATSAPP_NUMERO ? <a href={`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent('Hola')}`} target="_blank" rel="noopener noreferrer">{whatsappBonito()}</a> : <span>Por confirmar</span>}</p><p>Correo<br /><span>Por confirmar</span></p></div>
        </div>
        <div className={s.legal}><p>Yesenia Refugio · Cuidar empieza con un gesto.</p><p>Privacidad y términos: por confirmar</p></div>
      </div>
      <div className={s.relieve} aria-hidden="true">
        <svg width="0" height="0" focusable="false"><defs><filter id={filtro} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="var(--marca-sombra-tinta)" floodOpacity="0.18" result="outer-shadow" />
          <feComponentTransfer in="SourceAlpha" result="alpha"><feFuncA type="linear" slope="1" /></feComponentTransfer>
          <feOffset in="alpha" dx="0" dy="4" result="offset-white" /><feGaussianBlur in="offset-white" stdDeviation="4" result="blur-white" />
          <feComposite in="alpha" in2="blur-white" operator="out" result="inner-white-mask" /><feFlood floodColor="var(--marca-blanco)" floodOpacity="0.6" result="white-fill" />
          <feComposite in="white-fill" in2="inner-white-mask" operator="in" result="inner-white-final" />
          <feGaussianBlur in="alpha" stdDeviation="6" result="blur-black" /><feComposite in="alpha" in2="blur-black" operator="out" result="inner-black-mask" />
          <feFlood floodColor="var(--marca-sombra-tinta)" floodOpacity="0.18" result="black-fill" /><feComposite in="black-fill" in2="inner-black-mask" operator="in" result="inner-black-final" />
          <feMerge><feMergeNode in="outer-shadow" /><feMergeNode in="SourceGraphic" /><feMergeNode in="inner-white-final" /><feMergeNode in="inner-black-final" /></feMerge>
        </filter></defs></svg>
        <motion.div initial={reduce ? false : { opacity: 0.6, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: reduce ? 0 : 1.8, ease: [0.16, 1, 0.3, 1] }} style={{ filter: `url(#${filtro})` }}>YESENIA</motion.div>
      </div>
      <p className={s.footerNota}>Los datos pendientes se publican cuando Yesenia los confirma. Las fichas de ejemplo y las imágenes de referencia se indican en cada sección.</p>
    </footer>
  )
}

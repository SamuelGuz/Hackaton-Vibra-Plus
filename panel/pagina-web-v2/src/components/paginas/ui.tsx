'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { foto } from '../sites/babet/shared'
import type { SlugImagen } from '../../contenido/imagenes'
import { waUrl } from './config'
import type { Faq } from './contenido'
import s from './Pagina.module.css'

type Variante = 'verde' | 'claro' | 'texto'

interface BotonProps {
  children: ReactNode
  variante?: Variante
  href?: string
  onClick?: (e: React.MouseEvent<HTMLElement>) => void
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
  ariaLabel?: string
}

const claseVar: Record<Variante, string> = { verde: s.btnVerde, claro: s.btnClaro, texto: s.btnTexto }

/** Boton pildora compartido. Con href interno usa next/link; externo abre en pestana nueva. */
export function Boton({ children, variante = 'verde', href, onClick, disabled, className = '', type = 'button', ariaLabel }: BotonProps) {
  const cls = `${s.btn} ${claseVar[variante]} ${disabled ? s.btnOff : ''} ${className}`
  if (href && !disabled) {
    if (/^https?:/.test(href)) return <a className={cls} href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel} onClick={onClick}>{children}</a>
    return <Link className={cls} href={href} aria-label={ariaLabel} onClick={onClick}>{children}</Link>
  }
  return <button type={type} className={cls} disabled={disabled} aria-disabled={disabled || undefined} aria-label={ariaLabel} onClick={onClick}>{children}</button>
}

/** WhatsApp con mensaje prellenado. Sin numero confirmado: deshabilitado y lo explica. */
export function BotonWhatsApp({ texto, children, variante = 'verde', nota = true }: { texto: string; children: ReactNode; variante?: Variante; nota?: boolean }) {
  const url = waUrl(texto)
  if (url) return <Boton href={url} variante={variante}>{children}</Boton>
  return (
    <div className={s.waOff}>
      <Boton variante={variante} disabled>{children}</Boton>
      {nota && <p className={s.notaWa}>El número de WhatsApp de Yesenia está por confirmar, por eso este botón aún no se puede usar.</p>}
    </div>
  )
}

/** Entrada al hacer scroll: sube 28 px y aparece, una vez. Sin JS el contenido queda visible. */
export function Revela({ children, className = '', retraso = 0 }: { children: ReactNode; className?: string; retraso?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [estado, setEstado] = useState<'inicial' | 'oculto' | 'visto'>('inicial')
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return
    setEstado('oculto')
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setEstado('visto'); io.disconnect() }
    }, { threshold: 0.12 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} className={`${className} ${estado === 'oculto' ? s.oculto : estado === 'visto' ? s.visto : ''}`} style={retraso ? { transitionDelay: `${retraso}ms` } : undefined}>{children}</div>
}

export function Faq({ items, titulo = 'Preguntas frecuentes' }: { items: Faq[]; titulo?: string }) {
  return (
    <section className={`${s.sec} ${s.claro}`} aria-labelledby="faq-t">
      <div className={`${s.caja} ${s.faqGrid}`}>
        <h2 id="faq-t" className={s.h2}>{titulo}</h2>
        <div className={s.faqLista}>
          {items.map(it => (
            <details key={it.q} className={s.faqItem}>
              <summary><span>{it.q}</span><span className={s.mas} aria-hidden="true" /></summary>
              <p>{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Foto del proyecto con su rotulo honesto. `recorte` = PNG/WEBP transparente sobre fondo suave. */
export function FotoRef({ slug, sizes, recorte = false, rotulo = 'Imagen de referencia.', className = '', prioridad = false }: { slug: SlugImagen; sizes?: string; recorte?: boolean; rotulo?: string | null; className?: string; prioridad?: boolean }) {
  return (
    <figure className={`${s.figura} ${className}`}>
      <div className={`${s.marco} ${recorte ? s.marcoRecorte : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img {...foto(slug, sizes)} loading={prioridad ? 'eager' : 'lazy'} data-recorte={recorte ? '' : undefined} />
      </div>
      {rotulo && <figcaption className={s.rotulo}>{rotulo}</figcaption>}
    </figure>
  )
}

export function Encabezado({ titulo, sub, slug, recorte = false, disposicion = 'derecha', children, sizes }: {
  titulo: string; sub: string; slug: SlugImagen; recorte?: boolean; disposicion?: 'derecha' | 'izquierda' | 'ancha'; children?: ReactNode; sizes?: string
}) {
  return (
    <header className={`${s.sec} ${s.beige} ${s.enc} ${s['enc_' + disposicion]}`}>
      <div className={`${s.caja} ${s.encGrid}`}>
        <div className={s.encTxt}>
          <h1 className={s.h1}>{titulo}</h1>
          <p className={s.lead}>{sub}</p>
          {children && <div className={s.encAccion}>{children}</div>}
        </div>
        <FotoRef slug={slug} recorte={recorte} prioridad sizes={sizes ?? '(min-width: 900px) 45vw, 92vw'} className={s.encFoto} />
      </div>
    </header>
  )
}

export function Cierre({ titulo, texto, children }: { titulo: string; texto?: string; children: ReactNode }) {
  return (
    <section className={`${s.sec} ${s.verde} ${s.cierre}`} aria-labelledby="cierre-t">
      <div className={s.caja}>
        <Revela>
          <h2 id="cierre-t" className={s.h2}>{titulo}</h2>
          {texto && <p className={s.lead}>{texto}</p>}
          <div className={s.cierreAccion}>{children}</div>
        </Revela>
      </div>
    </section>
  )
}

export async function copiarTexto(t: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(t); return true } catch { /* fallback abajo */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch { return false }
}

/** Boton que copia y muestra una marca durante 1,2 s. */
export function BotonCopiar({ texto, etiqueta = 'Copiar', onCopiado, variante = 'claro' }: { texto: string; etiqueta?: string; onCopiado?: (el: HTMLElement) => void; variante?: Variante }) {
  const [ok, setOk] = useState(false)
  const t = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(t.current), [])
  return (
    <Boton
      variante={variante}
      onClick={async e => {
        const el = e.currentTarget
        if (await copiarTexto(texto)) {
          setOk(true); window.clearTimeout(t.current); t.current = window.setTimeout(() => setOk(false), 1200)
          onCopiado?.(el)
        }
      }}
    >
      <span aria-live="polite">{ok ? 'Copiado ✓' : etiqueta}</span>
    </Boton>
  )
}

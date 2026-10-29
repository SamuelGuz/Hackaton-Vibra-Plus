import type { ReactNode } from 'react'
import styles from './Shared.module.css'

export const BABET_SOURCE = 'https://html.themehour.net/babet/demo/'
export function asset(relative: string) { return `/sites/babet/${relative.replace(/^\//, '')}` }
export function sourceLink(relative: string) { return relative === 'index.html' ? '/' : new URL(relative, BABET_SOURCE).href }

export function Arrow({ direction = 'right' }: { direction?: 'left' | 'right' | 'down' }) {
  return <img className={styles.arrowIcon} src={asset(`assets/img/icon/arrow-${direction}.svg`)} alt="" aria-hidden="true" />
}

export function Button({ href, children, outline = false, className = '' }: {
  href: string; children: ReactNode; outline?: boolean; className?: string
}) {
  return <a href={href} className={`${styles.button} ${outline ? styles.outline : ''} ${className}`}>{children}</a>
}

export function SectionHeading({ eyebrow, title, description, center = false }: {
  eyebrow: string; title: ReactNode; description?: string; center?: boolean
}) {
  return <div className={`${styles.sectionHeading} ${center ? styles.center : ''}`}>
    <span className={styles.eyebrow}><img src={asset('assets/img/icon/subtitle-icon.svg')} alt="" />{eyebrow}</span>
    <h2>{title}</h2>
    {description && <p>{description}</p>}
  </div>
}

import { img, type SlugImagen } from '../../../contenido/imagenes'

/** Attributes for one of the project's own photographs (alt text comes from the image manifest). */
export function foto(slug: SlugImagen, sizes = '(max-width: 768px) 100vw, 50vw') {
  return { ...img(slug, sizes), 'data-foto': slug }
}

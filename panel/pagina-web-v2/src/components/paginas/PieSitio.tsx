import Link from 'next/link'
import s from './PieSitio.module.css'

const RUTAS = [
  { label: 'Historia', href: '/historia' },
  { label: 'Cómo ayudar', href: '/como-ayudar' },
  { label: 'Adoptar', href: '/adoptar' },
  { label: 'Aportar', href: '/aportar' },
]

/** Pie compartido. Sin datos inventados: WhatsApp, correo y legal estan por confirmar. */
export default function PieSitio() {
  return (
    <footer className={s.pie}>
      <div className={s.caja}>
        <div className={s.fila}>
          <p className={s.frase}>Un plato lleno o una casa nueva. Cualquiera de las dos cambia el día de alguien.</p>
          <nav aria-label="Pie de página">
            <ul className={s.enlaces}>
              {RUTAS.map(r => <li key={r.href}><Link href={r.href}>{r.label}</Link></li>)}
            </ul>
          </nav>
          <ul className={s.datos}>
            <li>WhatsApp de Yesenia: por confirmar</li>
            <li>Correo: por confirmar</li>
            <li>Privacidad y términos: por confirmar</li>
          </ul>
        </div>
        <p className={s.nota}>Los datos marcados &quot;Por confirmar&quot; se actualizan cuando Yesenia los valida. Las fotos son imágenes de referencia.</p>
        <p className={s.marca} aria-hidden="true">Huellitas</p>
      </div>
    </footer>
  )
}

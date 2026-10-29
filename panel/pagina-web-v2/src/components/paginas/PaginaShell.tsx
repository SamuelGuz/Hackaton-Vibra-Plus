'use client'

import type { CSSProperties, ReactNode } from 'react'
import Cabecera from '../sites/babet/Cabecera'
import shared from '../sites/babet/Shared.module.css'
import '../sites/babet/fonts.css'
import '../sites/babet/huellitas-tema.css'
import { AccionesProvider } from './Modales'
import { ProgresoProvider } from './progreso'
import PieSitio from './PieSitio'
import s from './Pagina.module.css'

/** Envoltorio de las rutas internas: tema Huellitas, cabecera fija, progreso y pop-ups compartidos, pie. */
export default function PaginaShell({ actual, children }: { actual: string; children: ReactNode }) {
  return (
    <main data-tema="huellitas" className={shared.root} style={{ '--babet-orange': '#1f5a3a' } as CSSProperties}>
      <a href="#contenido" className={s.saltar}>Saltar al contenido</a>
      <Cabecera siempre actual={actual} />
      <ProgresoProvider>
        <AccionesProvider>
          <div id="contenido" className={s.pag}>{children}</div>
        </AccionesProvider>
      </ProgresoProvider>
      <PieSitio />
    </main>
  )
}

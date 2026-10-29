'use client'

import HeroWild from '../heroes/HeroWild/HeroWild'
import EditorialSections from '../secciones/Editorial/EditorialSections'

// Keep the authored v5 hero while new cloned sections are developed beneath it.
export default function RescuePage() {
  return <>
    <a className="saltar" href="#contenido">Saltar al contenido</a>
    <main id="contenido">
      <HeroWild siguiente="#historia" />
      <EditorialSections />
    </main>
  </>
}

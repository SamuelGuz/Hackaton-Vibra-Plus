'use client'

import type { CSSProperties } from 'react'
import HeroWild from '../../../heroes/HeroWild/HeroWild'
import Cabecera from './Cabecera'
import Infografia from '../../home2/Infografia'
import PieSitio from '../../paginas/PieSitio'
import shared from './Shared.module.css'
import './fonts.css'
import './huellitas-tema.css'

// Home `/`: hero, then the story as an infographic (docs/estrategia/HOME-INFOGRAFIA.md).
export default function BabetPage() {
  return <main data-tema="huellitas" className={shared.root} style={{ '--babet-orange': '#1f5a3a' } as CSSProperties}>
    <Cabecera />
    <HeroWild />
    <Infografia />
    <PieSitio />
  </main>
}

'use client'

import type { CSSProperties } from 'react'
import HeroWild from '../../../heroes/HeroWild/HeroWild'
import Infografia from '../../home2/Infografia'
import Actividad from '../../paginas2/aportar/Actividad'
import aportar from '../../paginas2/aportar/Aportar.module.css'
import shared from './Shared.module.css'
import './fonts.css'
import './huellitas-tema.css'

// Home `/`: hero, then the story as an infographic (docs/estrategia/HOME-INFOGRAFIA.md).
export default function BabetPage() {
  return <main data-tema="huellitas" className={shared.root} style={{ '--babet-orange': '#1f5a3a' } as CSSProperties}>
    <HeroWild />
    {/* Lo que hace Yesenia y las donaciones, en vivo desde el backend: lo primero después del hero */}
    <div className={aportar.ap}><Actividad /></div>
    <Infografia />
  </main>
}

import { useEffect, useLayoutEffect, useState } from 'react'
import HeroCreativo from './heroes/HeroCreativo/HeroCreativo'
import HeroRescateReal from './heroes/HeroRescateReal/HeroRescateReal'
import HeroVideos from './heroes/HeroVideos/HeroVideos'
import HeroReel from './heroes/HeroReel/HeroReel'
import HeroWild from './heroes/HeroWild/HeroWild'
import Secciones from './secciones/Editorial/EditorialSections'
import Encabezado from './componentes/Encabezado/Encabezado'
import Pie from './componentes/Pie/Pie'
import SelectorHero, { type VersionHero } from './SelectorHero'

const heroes: Record<VersionHero, () => React.JSX.Element> = {
  '1': HeroCreativo,
  '2': HeroRescateReal,
  '3': HeroVideos,
  '4': HeroReel,
  '5': HeroWild,
}

function leerVersion(): VersionHero {
  const valor = new URLSearchParams(window.location.search).get('hero')
  return valor === '1' || valor === '2' || valor === '3' || valor === '4' || valor === '5' ? valor : '5'
}

export default function App() {
  const [version, setVersion] = useState<VersionHero>(leerVersion)

  useLayoutEffect(() => {
    document.documentElement.dataset.hero = version
  }, [version])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('hero', version)
    window.history.replaceState(null, '', url)
  }, [version])

  const Hero = heroes[version]

  return (
    <>
      <a className="saltar" href="#contenido">Saltar al contenido</a>
      {version !== '5' && <Encabezado />}
      <main id="contenido">
        <Hero key={version} />
        <Secciones />
      </main>
      <Pie />
      <SelectorHero version={version} onCambiar={setVersion} />
    </>
  )
}

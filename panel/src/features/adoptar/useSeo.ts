import { useEffect } from 'react'
import type { PerritoPublico } from './tipos'

export const TITULO_ADOPTAR = 'Adoptar perrito - Fundación Huellitas'
export const DESCRIPCION_ADOPTAR =
  'Conoce a los perritos y gatitos de la Fundación Huellitas que buscan hogar. Busca por cómo es tu casa, apadrina desde $20.000 al mes o habla con nuestro agente de voz.'

interface Opciones {
  titulo: string
  descripcion: string
  perritos: PerritoPublico[]
}

/** Arma el JSON-LD: la fundación (AnimalShelter) y la lista de los animales cargados */
export function jsonLdAdoptar(url: string, perritos: PerritoPublico[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AnimalShelter',
        '@id': `${url}#fundacion`,
        name: 'Fundación Huellitas',
        url,
        description: DESCRIPCION_ADOPTAR,
      },
      {
        '@type': 'ItemList',
        name: 'Animales en adopción',
        numberOfItems: perritos.length,
        itemListElement: perritos.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: p.nombre,
          description: p.historia,
          url: `${url}#${p.id}`,
          ...(p.foto ? { image: p.foto } : {}),
        })),
      },
    ],
  }
}

type Deshacer = () => void

/** Pone o cambia un elemento del <head> y devuelve cómo dejarlo como estaba */
function fijar(selector: string, crear: () => HTMLElement, poner: (el: HTMLElement) => void): Deshacer {
  const existente = document.head.querySelector<HTMLElement>(selector)
  const el = existente ?? crear()
  const previo = existente?.cloneNode(true) as HTMLElement | undefined
  poner(el)
  if (!existente) document.head.appendChild(el)
  return () => {
    if (!existente) el.remove()
    else if (previo) for (const a of Array.from(previo.attributes)) existente.setAttribute(a.name, a.value)
  }
}

function meta(atributo: 'name' | 'property', clave: string, contenido: string): Deshacer {
  return fijar(
    `meta[${atributo}="${clave}"]`,
    () => {
      const el = document.createElement('meta')
      el.setAttribute(atributo, clave)
      return el
    },
    (el) => el.setAttribute('content', contenido),
  )
}

/** SEO de la landing: título, descripción, canonical, Open Graph y JSON-LD. Lo deja como estaba al salir. */
export function useSeo({ titulo, descripcion, perritos }: Opciones) {
  useEffect(() => {
    const tituloPrevio = document.title
    document.title = titulo
    const url = `${window.location.origin}/adoptar`
    const deshacer: Deshacer[] = [
      meta('name', 'description', descripcion),
      meta('name', 'robots', 'index, follow'),
      meta('property', 'og:type', 'website'),
      meta('property', 'og:locale', 'es_CO'),
      meta('property', 'og:site_name', 'Fundación Huellitas'),
      meta('property', 'og:title', titulo),
      meta('property', 'og:description', descripcion),
      meta('property', 'og:url', url),
      fijar(
        'link[rel="canonical"]',
        () => {
          const el = document.createElement('link')
          el.setAttribute('rel', 'canonical')
          return el
        },
        (el) => el.setAttribute('href', url),
      ),
    ]
    const primeraFoto = perritos.find((p) => p.foto)?.foto
    if (primeraFoto) deshacer.push(meta('property', 'og:image', primeraFoto))

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'jsonld-adoptar'
    // "<" escapado para que ningún texto de un perfil pueda cerrar la etiqueta
    script.textContent = JSON.stringify(jsonLdAdoptar(url, perritos)).replace(/</g, '\\u003c')
    document.head.appendChild(script)

    return () => {
      document.title = tituloPrevio
      script.remove()
      deshacer.forEach((d) => d())
    }
  }, [titulo, descripcion, perritos])
}

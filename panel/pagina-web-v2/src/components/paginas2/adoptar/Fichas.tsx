'use client'

import { useEffect, useState } from 'react'
import { Chip, Escena, estilosHome as h } from '../../home2/Infografia'
import { lanzarDesde } from '../../efectos/Corazones'
import { foto } from '../../sites/babet/shared'
import { useAcciones } from '../../paginas/acciones'
import type { Animal } from '../../paginas/contenido'
import { escribirGuardados, leerGuardados } from '../../paginas/Modales'
import { FICHAS, type FichaAdopcion } from './datos-fichas'
import a from './Adoptar.module.css'

type Filtro = 'todos' | 'perro' | 'gato'
const FILTROS: [Filtro, string][] = [['todos', 'Todos'], ['perro', 'Perros'], ['gato', 'Gatos']]

/** The shared adoption modal only reads `id` and `titulo`; bank photos have no SlugImagen,
 *  so `slug` is only set when the card uses one. */
function comoAnimal(f: FichaAdopcion): Animal {
  const base = { id: f.id, titulo: f.titulo, especie: f.especie, descripcion: f.rasgo }
  return f.media.tipo === 'imagen' ? { ...base, slug: f.media.slug } : (base as Animal)
}

function Ficha({ f, guardado, onGuardar }: { f: FichaAdopcion; guardado: boolean; onGuardar: (f: FichaAdopcion, el: HTMLElement) => void }) {
  const acciones = useAcciones()
  return (
    <article className={a.ficha}>
      <div className={a.fichaMedia}>
        {f.media.tipo === 'banco' ? (
          <Escena slug={f.media.slug} tono={f.media.tono} className={a.fichaEscena}>
            <Chip className={a.chipFicha}>Ficha de ejemplo</Chip>
          </Escena>
        ) : (
          <figure className={a.fichaFoto}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img {...foto(f.media.slug, '(min-width: 900px) 30vw, 50vw')} loading="lazy" decoding="async" />
            <span className={a.chipQuieto}>Ficha de ejemplo</span>
          </figure>
        )}
        <button
          type="button"
          className={`${a.fav} ${guardado ? a.favOn : ''}`}
          aria-pressed={guardado}
          aria-label={`Guardar a ${f.titulo}`}
          onClick={e => onGuardar(f, e.currentTarget)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
        </button>
      </div>
      <div className={a.fichaTexto}>
        <p className={a.fichaEspecie}>{f.especie === 'perro' ? 'Perro' : 'Gato'}{f.media.tipo === 'imagen' ? ' · Imagen de referencia' : ''}</p>
        <h3>{f.titulo}</h3>
        <p className={a.fichaRasgo}>{f.rasgo}</p>
        <dl className={a.fichaDatos}>
          <div><dt>Edad</dt><dd>Por confirmar</dd></div>
          <div><dt>Carácter</dt><dd>Por confirmar</dd></div>
        </dl>
      </div>
      <button type="button" className={`${h.botonGrande} ${a.botonFicha}`} onClick={() => acciones.adoptar(comoAnimal(f))}>Quiero conocerle</button>
    </article>
  )
}

export default function Fichas() {
  const acciones = useAcciones()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [guardados, setGuardados] = useState<string[]>([])
  useEffect(() => { setGuardados(leerGuardados()) }, [])

  const hayGatos = FICHAS.some(f => f.especie === 'gato')
  const lista = FICHAS.filter(f => filtro === 'todos' || f.especie === filtro)

  const alternar = (f: FichaAdopcion, el: HTMLElement) => {
    const ya = guardados.includes(f.id)
    const nuevo = ya ? guardados.filter(x => x !== f.id) : [...guardados, f.id]
    setGuardados(nuevo)
    escribirGuardados(nuevo)
    if (!ya) { lanzarDesde(el, 3); acciones.avisar('Guardado. Se queda solo en este navegador.') }
  }

  return (
    <>
      {hayGatos && (
        <div className={a.filtros} role="group" aria-label="Filtrar por especie">
          {FILTROS.map(([v, t]) => (
            <button key={v} type="button" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>{t}</button>
          ))}
        </div>
      )}
      <div className={a.fichas} aria-live="polite">
        {lista.map(f => <Ficha key={f.id} f={f} guardado={guardados.includes(f.id)} onGuardar={alternar} />)}
      </div>
    </>
  )
}

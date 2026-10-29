import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { historia } from '../../contenido/historia'
import Boton from '../Boton'
import { EASE_SALIDA } from '../../secciones/comun/movimiento'
import e from './Encabezado.module.css'

const enlaces = [
  { id: 'historia', texto: 'Historia' },
  { id: 'ayudar', texto: 'Cómo ayudar' },
  { id: 'adoptar', texto: 'Adoptar' },
  { id: 'transparencia', texto: 'Transparencia' },
] as const

type IdEnlace = (typeof enlaces)[number]['id']

/** Story sections that belong to each nav chapter (the "Historia" chapter spans three). */
const capitulos: Record<string, IdEnlace> = {
  historia: 'historia',
  'quien-es-ella': 'historia',
  'el-carnicero': 'historia',
  ayudar: 'ayudar',
  adoptar: 'adoptar',
  transparencia: 'transparencia',
}

function useCapituloActivo(): IdEnlace | null {
  const [activo, setActivo] = useState<IdEnlace | null>(null)

  useEffect(() => {
    const elementos = Object.keys(capitulos)
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null && el.tagName === 'SECTION')
    if (elementos.length === 0 || !('IntersectionObserver' in window)) return

    const visibles = new Set<string>()
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) visibles.add(entrada.target.id)
          else visibles.delete(entrada.target.id)
        }
        const actual = elementos.find((el) => visibles.has(el.id))
        setActivo(actual ? capitulos[actual.id] : null)
      },
      // A thin reading band around the middle of the screen.
      { rootMargin: '-45% 0px -50% 0px' },
    )
    elementos.forEach((el) => observador.observe(el))
    return () => observador.disconnect()
  }, [])

  return activo
}

export default function Encabezado() {
  const [abierto, setAbierto] = useState(false)
  const [elevado, setElevado] = useState(false)
  const centinela = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const primerEnlace = useRef<HTMLAnchorElement>(null)
  const activo = useCapituloActivo()
  const reduce = useReducedMotion() ?? false

  // Lift the bar (shadow) only once the page has scrolled under it.
  useEffect(() => {
    const el = centinela.current
    if (!el || !('IntersectionObserver' in window)) return
    const observador = new IntersectionObserver(([entrada]) => setElevado(!entrada.isIntersecting))
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  // Mobile menu: focus the first link, close on Escape, lock page scroll, close past the breakpoint.
  useEffect(() => {
    if (!abierto) return
    primerEnlace.current?.focus()
    const alTeclear = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setAbierto(false)
        boton.current?.focus()
      }
    }
    const escritorio = window.matchMedia('(min-width: 56.25em)')
    const alCambiar = () => escritorio.matches && setAbierto(false)
    const desbordeAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', alTeclear)
    escritorio.addEventListener('change', alCambiar)
    return () => {
      document.body.style.overflow = desbordeAnterior
      document.removeEventListener('keydown', alTeclear)
      escritorio.removeEventListener('change', alCambiar)
    }
  }, [abierto])

  const cerrar = () => setAbierto(false)

  return (
    <>
      <div ref={centinela} className={e.centinela} aria-hidden="true" />
      <header className={e.encabezado} data-elevado={elevado || abierto ? 'si' : 'no'}>
        <div className={`contenedor ${e.barra}`}>
          <a href="#top" className={e.marca} onClick={cerrar}>
            <svg className={e.huella} width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
              <ellipse cx="12" cy="16" rx="4.6" ry="3.8" fill="currentColor" />
              <ellipse cx="5.6" cy="10.4" rx="1.9" ry="2.4" fill="currentColor" />
              <ellipse cx="9.4" cy="6.6" rx="1.9" ry="2.5" fill="currentColor" />
              <ellipse cx="14.6" cy="6.6" rx="1.9" ry="2.5" fill="currentColor" />
              <ellipse cx="18.4" cy="10.4" rx="1.9" ry="2.4" fill="currentColor" />
            </svg>
            <span>{historia.marca.nombre}</span>
          </a>

          <nav aria-label="Principal" className={e.navEscritorio}>
            <ul role="list" className={e.lista}>
              {enlaces.map((enlace) => (
                <li key={enlace.id}>
                  <a
                    href={`#${enlace.id}`}
                    className={e.enlace}
                    aria-current={activo === enlace.id ? 'true' : undefined}
                  >
                    {enlace.texto}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className={e.acciones}>
            <span className={e.donar}>
              <Boton href="#ayudar" conFlecha={false}>
                Donar
              </Boton>
            </span>
            <button
              ref={boton}
              type="button"
              className={e.alternar}
              aria-expanded={abierto}
              aria-controls="menu-movil"
              aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setAbierto((v) => !v)}
              data-abierto={abierto ? 'si' : 'no'}
            >
              <span className={e.linea} />
              <span className={e.linea} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {abierto && (
            <motion.nav
              id="menu-movil"
              aria-label="Principal móvil"
              className={e.panel}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
              transition={{ duration: 0.28, ease: EASE_SALIDA }}
            >
              <ul role="list" className={`contenedor ${e.listaMovil}`}>
                {enlaces.map((enlace, i) => (
                  <motion.li
                    key={enlace.id}
                    initial={{ opacity: 0, y: reduce ? 0 : 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE_SALIDA, delay: reduce ? 0 : Math.min(i * 0.06, 0.4) }}
                  >
                    <a
                      ref={i === 0 ? primerEnlace : undefined}
                      href={`#${enlace.id}`}
                      className={e.enlaceMovil}
                      aria-current={activo === enlace.id ? 'true' : undefined}
                      onClick={cerrar}
                    >
                      {enlace.texto}
                    </a>
                  </motion.li>
                ))}
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
    </>
  )
}

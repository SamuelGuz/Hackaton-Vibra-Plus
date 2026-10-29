import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import Boton from '../../componentes/Boton'
import { historia } from '../../contenido/historia'
import { img } from '../../contenido/imagenes'
import estilos from './HeroRescateReal.module.css'

// Hero 2 — "Rescate real". Every fact comes from branch `silvia-rescate-real`
// (docs/plan-rescate-silvia.md §1-§2) through src/contenido/historia.ts. See docs/historia.md.

const EASE_EXPO = [0.16, 1, 0.3, 1] as const

const { heroRescateReal: hero, marca, secciones, donaciones } = historia

/** Never print a raw "PENDIENTE:" note on the page. */
function Dato({ valor }: { valor: string }) {
  if (valor.startsWith('PENDIENTE:')) {
    return <span className={estilos.porConfirmar}>Por confirmar</span>
  }
  return <>{valor}</>
}

// "Primero hicimos tecnología de oficina." is the mistake (struck through);
// "Doña Gloria no tiene oficina." is the truth (the large line).
function partirTitulo(titulo: string): [string, string] {
  const corte = titulo.indexOf('. ')
  if (corte === -1) return ['', titulo]
  return [titulo.slice(0, corte + 1), titulo.slice(corte + 2)]
}

// Her day, from the "el-problema" section (PLAN §1, §2.1) plus the butcher (PLAN §1).
const problema = secciones.find((s) => s.id === 'el-problema')
const suDia: string[] = [
  ...(problema?.vinetas ?? []),
  'Don Carlos, el carnicero del barrio, le regala o le fía huesos, menudencias y recortes de carne.',
]

const pestanas = [
  { id: 'fallamos', etiqueta: 'Fallamos', titulo: 'Lo que hicimos mal', items: hero.autocritica, marca: 'x' },
  { id: 'su-dia', etiqueta: 'Su día', titulo: 'Cómo es su día de verdad', items: suDia, marca: 'punto' },
  { id: 'ahora', etiqueta: 'Ahora', titulo: 'Lo que hacemos ahora', items: hero.plan, marca: 'check' },
] as const

type Marca = (typeof pestanas)[number]['marca']

function Icono({ tipo }: { tipo: Marca }) {
  const trazo = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  return (
    <svg className={estilos[`icono-${tipo}`]} width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      {tipo === 'x' && <path d="M6 6l12 12M18 6L6 18" {...trazo} />}
      {tipo === 'check' && <path d="M5 12.5l4.5 4.5L19 7" {...trazo} />}
      {tipo === 'punto' && <circle cx="12" cy="12" r="3.5" fill="currentColor" />}
    </svg>
  )
}

const formatoCop = new Intl.NumberFormat('es-CO')
const donacionMinima = donaciones[0]

export default function HeroRescateReal() {
  const reduce = useReducedMotion()
  const base = useId()
  const [activa, setActiva] = useState(0)
  const botones = useRef<(HTMLButtonElement | null)[]>([])

  const [error, verdad] = partirTitulo(hero.titulo)
  const idTitulo = `${base}-titulo`
  const idCuaderno = `${base}-cuaderno`

  function moverFoco(evento: KeyboardEvent<HTMLDivElement>) {
    const total = pestanas.length
    let siguiente: number | null = null
    if (evento.key === 'ArrowRight') siguiente = (activa + 1) % total
    if (evento.key === 'ArrowLeft') siguiente = (activa - 1 + total) % total
    if (evento.key === 'Home') siguiente = 0
    if (evento.key === 'End') siguiente = total - 1
    if (siguiente === null) return
    evento.preventDefault()
    setActiva(siguiente)
    botones.current[siguiente]?.focus()
  }

  const subir = reduce ? 0 : 28

  return (
    <section className={estilos.hero} aria-labelledby={idTitulo}>
      <div className={`contenedor ${estilos.rejilla}`}>
        <div className={estilos.texto}>
          <h1 id={idTitulo} className={estilos.titulo}>
            {error && (
              <>
                <span className={estilos.error}>{error}</span>{' '}
              </>
            )}
            <span className={estilos.verdad}>{verdad}</span>
          </h1>

          <motion.div
            className={estilos.cuerpo}
            initial={{ opacity: 0, y: subir }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: EASE_EXPO }}
          >
            <p className={estilos.lead}>{hero.subtitulo}</p>

            <div className={estilos.acciones}>
              <Boton href="#ayudar">{hero.ctaPrincipal.texto}</Boton>
              <a className={estilos.enlace} href="#adoptar">
                {historia.heroCreativo.ctaSecundario.texto}
              </a>
            </div>

            {donacionMinima && (
              <p className={estilos.nota}>
                <strong className="cifras">${formatoCop.format(donacionMinima.montoCop)}</strong> ={' '}
                {donacionMinima.compra}
              </p>
            )}
          </motion.div>
        </div>

        <figure className={estilos.figura}>
          <div className={estilos.marco}>
            {/* The photo settles from 1.04 inside its frame; it is never hidden, so LCP is not delayed. */}
            <motion.img
              {...img('perros-calle-grupo-ladrillo', '(min-width: 56.25em) 42vw, calc(100vw - 2rem)')}
              className={estilos.foto}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              initial={{ scale: reduce ? 1 : 1.04 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.2, ease: EASE_EXPO }}
            />
          </div>
          <figcaption className={estilos.pie}>
            Foto de referencia. Fotos reales de sus animales, con permiso:{' '}
            <span className={estilos.porConfirmar}>Por confirmar</span>
            <span className={estilos.lugar}>
              Doña Gloria · {marca.nombre} · Colombia, <Dato valor={marca.ubicacion} />
            </span>
          </figcaption>
        </figure>

        <motion.div
          className={estilos.cuaderno}
          aria-labelledby={idCuaderno}
          role="region"
          initial={{ opacity: 0, y: subir }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: EASE_EXPO }}
        >
          <h2 id={idCuaderno} className={estilos.cuadernoTitulo}>
            {hero.antetitulo}
          </h2>

          <div className={estilos.pestanas} role="tablist" aria-label="Partes de la historia" onKeyDown={moverFoco}>
            {pestanas.map((p, i) => (
              <button
                key={p.id}
                ref={(el) => {
                  botones.current[i] = el
                }}
                type="button"
                role="tab"
                id={`${base}-tab-${p.id}`}
                aria-selected={activa === i}
                aria-controls={`${base}-panel-${p.id}`}
                tabIndex={activa === i ? 0 : -1}
                className={estilos.pestana}
                onClick={() => setActiva(i)}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>

          <div className={estilos.paneles}>
            {pestanas.map((p, i) => (
              <div
                key={p.id}
                role="tabpanel"
                id={`${base}-panel-${p.id}`}
                aria-labelledby={`${base}-tab-${p.id}`}
                className={estilos.panel}
                data-activo={activa === i}
                inert={activa !== i}
                tabIndex={activa === i ? 0 : -1}
              >
                <h3 className={estilos.panelTitulo}>{p.titulo}</h3>
                <ul role="list" className={estilos.lista}>
                  {p.items.map((texto, n) => (
                    <li key={texto} className={estilos.item} style={{ '--n': n } as CSSProperties}>
                      <Icono tipo={p.marca} />
                      <span>{texto}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <a className={estilos.enlace} href="#historia">
            Leer la historia completa
          </a>
        </motion.div>
      </div>
    </section>
  )
}

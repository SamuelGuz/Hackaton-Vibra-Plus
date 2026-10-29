'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cuando, useProgreso, pesos } from '../home/progreso'
import { useVisto } from '../home/Reveal'
import { lanzarDesde } from '../efectos/Corazones'
import { fotoBanco, recorteBanco, type SlugBanco } from './banco'
import s from './Infografia.module.css'

/** Shared look for other pages: wrap the page in <div className={estilosHome.home}> and use
 *  estilosHome.seccion / .contenedor / .titulo / .lead / .nota and the pieces below. */
export { s as estilosHome }

// Home story told as an infographic. One idea per section, in this order:
// Ella → Su día → Lo que falta → Dos puertas → Llena un plato → Dale un hogar → Cómo sabes que llega → Cierre.
// Plan: docs/estrategia/HOME-INFOGRAFIA.md. Every unconfirmed fact keeps a "por confirmar" note.

const CAPITULOS = [
  { id: 'ella', label: 'Ella' },
  { id: 'su-dia', label: 'Su día' },
  { id: 'lo-que-falta', label: 'Lo que falta' },
  { id: 'ayudar', label: 'Ayudar' },
  { id: 'confianza', label: 'Confianza' },
] as const

/* ---------- small pieces ---------- */

export function Icono({ nombre }: { nombre: 'plato' | 'cruz' | 'casa' | 'chat' | 'sol' | 'escoba' | 'luna' | 'corazon' | 'mano' | 'check' }) {
  const p: Record<typeof nombre, ReactNode> = {
    plato: <><path d="M3 12h18a9 9 0 0 1-18 0Z" /><path d="M8 8c0-2 2-2 2-4M12 8c0-2 2-2 2-4" /></>,
    cruz: <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v8M8 12h8" /></>,
    casa: <><path d="M4 11 12 4l8 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-5h4v5" /></>,
    chat: <><path d="M4 5h16v11H9l-5 4Z" /><path d="M8 10h8M8 13h5" /></>,
    sol: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" /></>,
    escoba: <><path d="M14 3 9 14" /><path d="M6 14h7l-1 7H5Z" /></>,
    luna: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />,
    corazon: <path d="M20.5 5.7a5 5 0 0 0-7.1 0L12 7.1l-1.4-1.4a5 5 0 0 0-7.1 7.1L12 21l8.5-8.2a5 5 0 0 0 0-7.1Z" />,
    mano: <><path d="M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12" /><path d="M16 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2.5-4a1.5 1.5 0 0 1 2.5-1.7L7 14" /></>,
    check: <path d="m5 12 4 4 10-10" />,
  }
  return <svg className={s.icono} viewBox="0 0 24 24" aria-hidden="true">{p[nombre]}</svg>
}

/** Photo, words, then the same photo cut out on top: the words read as if behind the subject. */
export function Capas({ slug, palabra, children, sizes, className = '', alt = '' }: { slug: SlugBanco; palabra: string; children?: ReactNode; sizes?: string; className?: string; alt?: string }) {
  const [ref, visto] = useVisto<HTMLDivElement>(0.25)
  return (
    <div ref={ref} className={`${s.capas} ${visto ? s.capasVisto : ''} ${className}`}>
      <img className={s.capaFoto} {...fotoBanco(slug, sizes)} alt="" loading="lazy" decoding="async" />
      <span className={s.capaPalabra} style={{ ['--letras' as string]: palabra.length }} aria-hidden="true">{palabra}</span>
      <img className={s.capaRecorte} {...recorteBanco(slug, sizes)} alt={alt} loading="lazy" decoding="async" />
      {children}
    </div>
  )
}

/** A cut-out subject over a drawn backdrop (for images without their original photo). */
export function Escena({ slug, children, tono = 'arena', className = '' }: { slug: SlugBanco; children?: ReactNode; tono?: 'arena' | 'verde' | 'crema'; className?: string }) {
  const [ref, visto] = useVisto<HTMLDivElement>(0.25)
  return (
    <div ref={ref} className={`${s.escena} ${s[`tono_${tono}`]} ${visto ? s.capasVisto : ''} ${className}`}>
      <svg className={s.escenaFondo} viewBox="0 0 400 400" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <circle cx="200" cy="230" r="150" />
        <path d="M-20 330 C 90 290, 300 370, 420 320" />
      </svg>
      <img className={s.escenaRecorte} {...recorteBanco(slug, '(min-width: 900px) 30vw, 70vw')} alt="" loading="lazy" decoding="async" />
      {children}
    </div>
  )
}

export function Chip({ children, className = '', icono }: { children: ReactNode; className?: string; icono?: Parameters<typeof Icono>[0]['nombre'] }) {
  return <span className={`${s.chip} ${className}`}>{icono && <Icono nombre={icono} />}{children}</span>
}

export function Capitulo({ n, children }: { n: string; children: ReactNode }) {
  return <p className={s.capitulo}><span>{n}</span>{children}</p>
}

/* ---------- chapter rail + contextual mobile CTA ---------- */

function Recorrido() {
  const [actual, setActual] = useState<string>('')
  useEffect(() => {
    const obs = new IntersectionObserver(entradas => {
      for (const e of entradas) if (e.isIntersecting) setActual(e.target.id)
    }, { rootMargin: '-45% 0px -50% 0px' })
    for (const c of CAPITULOS) { const el = document.getElementById(c.id); if (el) obs.observe(el) }
    // Back above the first chapter (the hero): no chapter is active.
    const primero = document.getElementById(CAPITULOS[0].id)
    const arriba = () => { if (primero && primero.getBoundingClientRect().top > window.innerHeight * 0.5) setActual('') }
    window.addEventListener('scroll', arriba, { passive: true })
    return () => { obs.disconnect(); window.removeEventListener('scroll', arriba) }
  }, [])
  const indice = CAPITULOS.findIndex(c => c.id === actual)
  const cta = actual === 'ayudar' || actual === 'confianza'
    ? { href: '#llena-un-plato', texto: 'Llenar un plato' }
    : { href: '#dos-puertas', texto: 'Quiero ayudar' }
  return <>
    <nav className={`${s.riel} ${indice >= 0 ? s.rielVisible : ''}`} aria-label="Recorrido de la página">
      <ol>{CAPITULOS.map((c, i) => <li key={c.id} className={i <= indice ? s.rielHecho : ''} aria-current={i === indice ? 'step' : undefined}><a href={`#${c.id}`}><span>{c.label}</span></a></li>)}</ol>
    </nav>
    <div className={`${s.barraMovil} ${indice >= 0 ? s.barraMovilVisible : ''}`}>
      <span>{indice >= 0 ? `${indice + 1}/${CAPITULOS.length} · ${CAPITULOS[indice].label}` : ''}</span>
      <a href={cta.href}>{cta.texto}</a>
    </div>
  </>
}

/* ---------- sections ---------- */

function Ella() {
  return (
    <section id="ella" className={s.seccion} aria-labelledby="ella-titulo">
      <div className={s.contenedor}>
        <div className={s.ellaGrid}>
          <div className={s.ellaTexto}>
            <Capitulo n="1">Ella</Capitulo>
            <h2 id="ella-titulo" className={s.titulo}>Yesenia cuida a decenas de perros y gatos. Casi siempre, sola.</h2>
            <p className={s.lead}>Los rescata, los alimenta, los cura y les busca casa. A veces la comunidad le da una mano.</p>
            <ul className={s.datosRapidos}>
              <li><strong>1</strong><span>persona al frente</span></li>
              <li><strong>~90</strong><span>animales <em>por confirmar</em></span></li>
              <li><strong>365</strong><span>días al año</span></li>
            </ul>
          </div>
          <Capas slug="rescatista-cachorro" palabra="SOLA" className={s.ellaFoto} sizes="(min-width: 900px) 46vw, 92vw" alt="Yesenia carga a un cachorro en el refugio">
            <span className={s.nombreFoto}>Yesenia</span>
            <Chip className={s.chipA} icono="corazon">Rescata y cuida</Chip>
            <Chip className={s.chipB} icono="mano">A veces, la comunidad ayuda</Chip>
          </Capas>
        </div>
        <p className={s.nota}>Yesenia, en su refugio. Cifras en verificación con ella.</p>
      </div>
    </section>
  )
}

const DIA = [
  { hora: 'Al amanecer', icono: 'plato', texto: 'Preparar comida para todos' },
  { hora: 'En la mañana', icono: 'escoba', texto: 'Limpiar patios y camas' },
  { hora: 'En la tarde', icono: 'cruz', texto: 'Curar heridas y dar medicinas' },
  { hora: 'En la noche', icono: 'chat', texto: 'Responder mensajes y buscar hogares' },
] as const

function SuDia() {
  const [ref, visto] = useVisto<HTMLOListElement>(0.25)
  return (
    <section id="su-dia" className={`${s.seccion} ${s.seccionArena}`} aria-labelledby="dia-titulo">
      <div className={s.contenedor}>
        <Capitulo n="2">Su día</Capitulo>
        <h2 id="dia-titulo" className={s.titulo}>Un día suyo, en cuatro momentos.</h2>
        <ol ref={ref} className={`${s.linea} ${visto ? s.lineaVisto : ''}`}>
          {DIA.map((m, i) => (
            <li key={m.hora} style={{ transitionDelay: `${i * 110}ms` }}>
              <span className={s.lineaPunto}><Icono nombre={m.icono} /></span>
              <span className={s.lineaHora}>{m.hora}</span>
              <span className={s.lineaTexto}>{m.texto}</span>
            </li>
          ))}
        </ol>
        <div className={s.diaFotos}>
          <Escena slug="curacion" tono="crema"><Chip className={s.chipC} icono="cruz">Curaciones diarias</Chip></Escena>
          <figure className={s.diaFoto}><img {...fotoBanco('rescatista-alimentando', '(min-width: 900px) 40vw, 92vw')} alt="Rescatista dando de comer a varios perros en el patio del refugio" loading="lazy" decoding="async" /><Chip className={s.chipD} icono="plato">Hora de comer</Chip></figure>
          <Escena slug="perro-estirandose" tono="verde"><Chip className={s.chipE} icono="sol">Y otra vez mañana</Chip></Escena>
        </div>
        <p className={s.nota}>Un día típico descrito para entender su trabajo; los detalles se confirman con Yesenia.</p>
      </div>
    </section>
  )
}

const NECESIDADES = [
  { icono: 'plato', titulo: 'Comida', texto: 'Lo que más se acaba. Todos los días.', slug: 'cachorros-durmiendo' },
  { icono: 'cruz', titulo: 'Salud', texto: 'Vacunas, curaciones y medicinas.', slug: 'perro-abuelo' },
  { icono: 'casa', titulo: 'Techo', texto: 'Cercas, techos y camas secas.', slug: 'perro-blanco-saludo' },
] as const

function LoQueFalta() {
  return (
    <section id="lo-que-falta" className={s.seccion} aria-labelledby="falta-titulo">
      <div className={s.contenedor}>
        <Capitulo n="3">Lo que falta</Capitulo>
        <h2 id="falta-titulo" className={s.titulo}>Amor le sobra. Le faltan tres cosas.</h2>
        <div className={s.necesidades}>
          {NECESIDADES.map(n => (
            <article key={n.titulo} className={s.necesidad}>
              <Escena slug={n.slug} tono="arena" className={s.necesidadEscena} />
              <div className={s.necesidadTexto}>
                <span className={s.necesidadIcono}><Icono nombre={n.icono} /></span>
                <h3>{n.titulo}</h3>
                <p>{n.texto}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function DosPuertas() {
  return (
    <section id="ayudar" className={`${s.seccion} ${s.seccionVerde}`} aria-labelledby="puertas-titulo">
      <span id="dos-puertas" className={s.ancla} />
      <div className={s.contenedor}>
        <Capitulo n="4">Ayudar</Capitulo>
        <h2 id="puertas-titulo" className={s.titulo}>Hay dos formas de cambiar su día.</h2>
        <div className={s.puertas}>
          <a href="#llena-un-plato" className={s.puerta}>
            <Escena slug="cachorros-durmiendo" tono="crema" className={s.puertaEscena}><span className={s.puertaGrande} aria-hidden="true">PLATO</span></Escena>
            <span className={s.puertaTexto}><strong>Llena un plato</strong><span>Un aporte, hoy, desde tu celular.</span><i>Elegir monto <b aria-hidden="true">↓</b></i></span>
          </a>
          <a href="#dale-un-hogar" className={s.puerta}>
            <Escena slug="perro-blanco-sentado" tono="crema" className={s.puertaEscena}><span className={s.puertaGrande} aria-hidden="true">HOGAR</span></Escena>
            <span className={s.puertaTexto}><strong>Dale un hogar</strong><span>Adopta y cambia una vida entera.</span><i>Ver quién espera <b aria-hidden="true">↓</b></i></span>
          </a>
        </div>
      </div>
    </section>
  )
}

const MONTOS = [10000, 20000, 50000]

function LlenaUnPlato() {
  const { datos, cargado } = useProgreso()
  const [monto, setMonto] = useState(20000)
  const [ref, visto] = useVisto<HTMLDivElement>(0.3)
  const boton = useRef<HTMLAnchorElement>(null)
  const meta = datos.metas[0]
  const pct = meta ? Math.min(100, Math.round((meta.recaudado / meta.meta) * 100)) : 0
  return (
    <section id="llena-un-plato" className={s.seccion} aria-labelledby="plato-titulo">
      <div className={s.contenedor}>
        <div className={s.platoGrid}>
          <Capas slug="perro-sonrisa" palabra="GRACIAS" className={s.platoFoto} sizes="(min-width: 900px) 42vw, 92vw">
            <Chip className={s.chipF} icono="corazon">Cada aporte cuenta</Chip>
          </Capas>
          <div className={s.platoPanel}>
            <p className={s.camino}>Camino A · Llena un plato</p>
            <h2 id="plato-titulo" className={s.titulo}>La misión de esta semana.</h2>
            {meta && (
              <div ref={ref} className={s.mision}>
                <div className={s.misionCifras}><strong>{pesos(meta.recaudado)}</strong><span>de {pesos(meta.meta)} para {meta.titulo.toLowerCase()}</span></div>
                <div className={s.pista} role="progressbar" aria-label={meta.titulo} aria-valuemin={0} aria-valuemax={meta.meta} aria-valuenow={meta.recaudado} aria-valuetext={`${pct}% de la meta`}>
                  <div className={s.relleno} style={{ transform: `scaleX(${visto && cargado ? pct / 100 : 0})` }} />
                </div>
                <p className={s.misionNota}>{pct === 0 ? 'Empieza en cero. Tu aporte puede ser el primero.' : `${pct}% de la meta.`} {meta.ejemplo !== false && <em>Meta de ejemplo, por confirmar.</em>}</p>
              </div>
            )}
            <fieldset className={s.montos}>
              <legend>¿Cuánto quieres aportar?</legend>
              {MONTOS.map(m => (
                <label key={m} className={monto === m ? s.montoActivo : ''}>
                  <input type="radio" name="monto-home" value={m} checked={monto === m} onChange={() => setMonto(m)} />
                  {pesos(m)}
                </label>
              ))}
            </fieldset>
            <Link ref={boton} href={`/aportar?monto=${monto}`} className={s.botonGrande} onClick={() => lanzarDesde(boton.current, 4)}>Aportar {pesos(monto)}</Link>
            <p className={s.microcopy}>Elige un valor y continúa para ver cómo donar por Nequi. Número y titular por confirmar.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

const ESPERAN: { slug: SlugBanco; titulo: string; rasgo: string }[] = [
  { slug: 'perro-abuelo', titulo: 'El abuelo', rasgo: 'Tiene una pata vendada' },
  { slug: 'cachorro-en-brazos', titulo: 'El cachorro', rasgo: 'Pequeño, de orejas caídas' },
  { slug: 'perro-blanco-sentado', titulo: 'El peludo', rasgo: 'Blanco con manchas negras' },
]

function DaleUnHogar() {
  return (
    <section id="dale-un-hogar" className={`${s.seccion} ${s.seccionArena}`} aria-labelledby="hogar-titulo">
      <div className={s.contenedor}>
        <p className={s.camino}>Camino B · Dale un hogar</p>
        <h2 id="hogar-titulo" className={s.titulo}>Ellos esperan una casa.</h2>
        <div className={s.fichas}>
          {ESPERAN.map((f, i) => (
            <Link key={f.slug} href="/adoptar" className={s.ficha} style={{ ['--giro' as string]: `${(i - 1) * 1.2}deg` }}>
              <Escena slug={f.slug} tono={i === 1 ? 'verde' : 'crema'} className={s.fichaEscena} />
              <span className={s.fichaTexto}><strong>{f.titulo}</strong><span>{f.rasgo}</span></span>
              <span className={s.fichaBoton}>Conocerle →</span>
            </Link>
          ))}
        </div>
        <div className={s.pasos}>
          {['Escoges quién te gusta', 'Respondes 4 preguntas', 'Hablas con Yesenia'].map((p, i) => <span key={p}><b>{i + 1}</b>{p}</span>)}
        </div>
        <p className={s.nota}>Fichas de ejemplo: los apodos son descriptivos y los perfiles reales los confirma Yesenia.</p>
      </div>
    </section>
  )
}

function Confianza() {
  const { datos } = useProgreso()
  const ultima = [...datos.compras].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))[0]
  return (
    <section id="confianza" className={s.seccion} aria-labelledby="confianza-titulo">
      <div className={s.contenedor}>
        <Capitulo n="5">Confianza</Capitulo>
        <h2 id="confianza-titulo" className={s.titulo}>Así sabes que tu ayuda llega.</h2>
        <ol className={s.flujo}>
          <li><span className={s.flujoIcono}><Icono nombre="mano" /></span><strong>Tú aportas</strong><span>Desde tu celular, en un minuto.</span></li>
          <li><span className={s.flujoIcono}><Icono nombre="chat" /></span><strong>Yesenia compra y avisa</strong><span>Lo confirma por WhatsApp.</span></li>
          <li><span className={s.flujoIcono}><Icono nombre="check" /></span><strong>Lo ves aquí</strong><span>La barra sube y aparece la compra.</span></li>
        </ol>
        <div className={s.confianzaGrid}>
          <div className={s.ultima}>
            <p className={s.ultimaEtiqueta}>Lo último que se compró</p>
            <p className={s.ultimaTexto}>{ultima ? `${cuando(ultima.fecha)} · ${ultima.texto}` : 'Todavía nada esta semana. La primera compra aparecerá aquí.'}</p>
            <a href="#esta-semana" className={s.ultimaEnlace}>Ver todo lo de esta semana</a>
          </div>
          <div className={s.antecedentes}>
            <p className={s.ultimaEtiqueta}>Antecedentes públicos del Refugio Yesenia</p>
            <ul>
              <li><b>2023</b>Voluntariado de la Fundación Dar con Amor: paseos, baños y limpieza.</li>
              <li><b>2024</b>Nota de Vanguardia sobre la remodelación del refugio.</li>
              <li><b>UDES</b>Campaña universitaria “Dona un Ladrillo”.</li>
            </ul>
          </div>
        </div>
        <Capas slug="voluntarios" palabra="JUNTOS" className={s.confianzaFoto} sizes="(min-width: 900px) 80vw, 92vw" />
      </div>
    </section>
  )
}

function Cierre() {
  const boton = useRef<HTMLAnchorElement>(null)
  return (
    <section className={`${s.seccion} ${s.cierre}`} aria-labelledby="cierre-titulo">
      <div className={s.contenedor}>
        <div className={s.cierreGrid}>
          <div>
            <h2 id="cierre-titulo" className={s.titulo}>Hoy puedes ser parte de esto.</h2>
            <p className={s.lead}>Un plato lleno o una casa nueva. Las dos cosas le cambian el día a alguien.</p>
            <div className={s.cierreBotones}>
              <Link ref={boton} href="/aportar" className={s.botonGrande} onClick={() => lanzarDesde(boton.current, 4)}>Llenar un plato</Link>
              <Link href="/adoptar" className={s.botonLinea}>Dar un hogar</Link>
            </div>
          </div>
          <Capas slug="cachorro-en-brazos" palabra="HOY" className={s.cierreFoto} sizes="(min-width: 900px) 40vw, 92vw" />
        </div>
      </div>
    </section>
  )
}

export default function Infografia() {
  return (
    <div className={s.home}>
      <Recorrido />
      <Ella />
      <SuDia />
      <LoQueFalta />
      <DosPuertas />
      <LlenaUnPlato />
      <DaleUnHogar />
      <Confianza />
      <Cierre />
    </div>
  )
}

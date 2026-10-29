'use client'

import { useEffect, useRef, useState } from 'react'
import Boton from '../../componentes/Boton'
import { foto } from '../sites/babet/shared'
import type { SlugImagen } from '../../contenido/imagenes'
import Corazones from './Corazones'
import { Reveal, useVisto } from './Reveal'
import { pesos, useProgreso, type Meta } from './progreso'
import s from './Home.module.css'

/* 2. Frase puente: words light up one by one while the block crosses the screen. */
const FRASE = 'Detrás de cada perro hay un plato que alguien tiene que llenar, todos los días. Casi siempre es una sola persona.'.split(' ')

export function FrasePuente() {
  const ref = useRef<HTMLParagraphElement>(null)
  const [activas, setActivas] = useState(FRASE.length)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setListo(true)
    let raf = 0
    const calcular = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const p = Math.min(1, Math.max(0, (vh * 0.82 - r.top) / (r.height + vh * 0.12)))
      setActivas(Math.round(p * FRASE.length))
    }
    const pedir = () => { if (!raf) raf = requestAnimationFrame(calcular) }
    calcular()
    window.addEventListener('scroll', pedir, { passive: true })
    window.addEventListener('resize', pedir)
    return () => { window.removeEventListener('scroll', pedir); window.removeEventListener('resize', pedir); if (raf) cancelAnimationFrame(raf) }
  }, [])

  return (
    <section className={`${s.seccion} ${s.puente}`} aria-label="Por qué importa">
      <div className={s.contenedor}>
        <p ref={ref} className={s.frase} data-listo={listo || undefined}>
          {FRASE.map((w, i) => <span key={i} className={i < activas ? s.palabraOn : s.palabra}>{w} </span>)}
        </p>
      </div>
    </section>
  )
}

/* 3. Misión compacta: one bar per goal, last purchase, honest empty state. */
function Barra({ meta }: { meta: Meta }) {
  const [ref, visto] = useVisto<HTMLDivElement>(0.4)
  const pct = meta.meta > 0 ? Math.min(100, Math.round((meta.recaudado / meta.meta) * 100)) : 0
  const vacia = meta.recaudado === 0
  return (
    <div className={s.meta}>
      <div className={s.metaTop}>
        <h3 className={s.metaTitulo}>{meta.titulo}</h3>
        <span className={s.metaCifra}>{pesos(meta.recaudado)} <i>de {pesos(meta.meta)}</i></span>
      </div>
      <div ref={ref} className={`${s.pista} ${vacia ? s.pistaVacia : ''}`} role="progressbar" aria-label={meta.titulo} aria-valuemin={0} aria-valuemax={meta.meta} aria-valuenow={meta.recaudado} aria-valuetext={`${pct}% de la meta`}>
        <div className={s.relleno} style={{ transform: `scaleX(${visto ? pct / 100 : 0})` }} />
      </div>
      <p className={s.metaNota}>{meta.detalle}{meta.ejemplo !== false && ' Meta de ejemplo, por confirmar.'}</p>
    </div>
  )
}

export function Mision() {
  const { datos } = useProgreso()
  const ultima = datos.compras[0]
  const todoEnCero = datos.metas.every(m => m.recaudado === 0)
  return (
    <section id="aportes" className={`${s.seccion} ${s.claro}`} aria-labelledby="mision-titulo">
      <div className={`${s.contenedor} ${s.misionGrid}`}>
        <Reveal>
          <p className={s.sobre}>Misión de la semana</p>
          <h2 id="mision-titulo" className={s.titulo}>Llenemos el plato de esta semana</h2>
          <p className={s.cuerpo}>Estas son metas de ejemplo, por confirmar con Yesenia. Cuando ella confirme una compra por WhatsApp, aparece aquí.</p>
          <div className={s.accion}>
            <Boton href="/aportar">Aportar a la misión</Boton>
            <p className={s.micro}>La página no cobra. Tu aporte lo recibe Yesenia directamente.</p>
          </div>
        </Reveal>
        <Reveal retraso={90}>
          <div className={s.metas}>{datos.metas.map(m => <Barra key={m.id} meta={m} />)}</div>
          {todoEnCero && <p className={s.vacioMision}>Esta semana empieza en cero, y eso está bien. El primer aporte abre la barra.</p>}
          <div className={s.ultima} aria-live="polite">
            <h3 className={s.ultimaTitulo}>Lo último que se compró</h3>
            {ultima
              ? <p className={s.ultimaTexto}>{ultima.texto}{typeof ultima.monto === 'number' && ultima.monto > 0 && <> · {pesos(ultima.monto)}</>}</p>
              : <p className={s.ultimaTexto}>Aún no hay compras registradas. Aparecerán cuando Yesenia las confirme por WhatsApp.</p>}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* 5. Quién espera hogar: example sheets, labelled as such. */
interface Ficha { id: string; titulo: string; especie: 'Perro' | 'Gato'; slug: SlugImagen; forma: 'alta' | 'media' }
const FICHAS: Ficha[] = [
  { id: 'cafe', titulo: 'Perro café de orejas caídas', especie: 'Perro', slug: 'perro-cafe-lengua-ladrillo', forma: 'alta' },
  { id: 'chihuahua', titulo: 'Chihuahua negro y fuego', especie: 'Perro', slug: 'chihuahua-primer-plano', forma: 'media' },
  { id: 'gatos', titulo: 'Gatos atigrados', especie: 'Gato', slug: 'gatos-abrazados-foto', forma: 'media' },
  { id: 'cachorro', titulo: 'Cachorro atigrado', especie: 'Perro', slug: 'cachorro-atigrado-ladrillo', forma: 'alta' },
]

function Favorito({ id, titulo }: { id: string; titulo: string }) {
  const [guardado, setGuardado] = useState(false)
  const [rafaga, setRafaga] = useState(0)
  const [aviso, setAviso] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    try { setGuardado((JSON.parse(localStorage.getItem('huellitas:favoritos') ?? '[]') as string[]).includes(id)) } catch { /* storage unavailable */ }
  }, [id])
  useEffect(() => () => clearTimeout(timer.current), [])

  function alternar() {
    const nuevo = !guardado
    setGuardado(nuevo)
    try {
      const actual = new Set(JSON.parse(localStorage.getItem('huellitas:favoritos') ?? '[]') as string[])
      if (nuevo) actual.add(id); else actual.delete(id)
      localStorage.setItem('huellitas:favoritos', JSON.stringify([...actual]))
    } catch { /* storage unavailable */ }
    if (nuevo) {
      setRafaga(n => n + 1)
      setAviso(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setAviso(false), 2500)
    } else setAviso(false)
  }

  return (
    <span className={s.favoritoWrap}>
      <button type="button" className={`${s.favorito} ${guardado ? s.favoritoOn : ''}`} aria-pressed={guardado} aria-label={`Guardar a ${titulo}`} onClick={alternar}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 5.7a5 5 0 0 0-7.1 0L12 7.1l-1.4-1.4a5 5 0 0 0-7.1 7.1L12 21l8.5-8.2a5 5 0 0 0 0-7.1Z" /></svg>
        <span>{guardado ? 'Guardado' : 'Guardar'}</span>
      </button>
      <Corazones rafaga={rafaga} cantidad={3} />
      <span className={s.avisoFav} role="status">{aviso ? 'Guardado. Se queda solo en este navegador.' : ''}</span>
    </span>
  )
}

export function QuienEspera() {
  return (
    <section id="adoptar" className={`${s.seccion} ${s.suelo}`} aria-labelledby="espera-titulo">
      <div className={s.contenedor}>
        <Reveal>
          <h2 id="espera-titulo" className={s.titulo}>Ellos esperan una casa</h2>
          <p className={s.cuerpo}>Fichas de ejemplo con imagen de referencia. Los perfiles reales los confirma Yesenia.</p>
        </Reveal>
        <div className={s.fichas}>
          {FICHAS.map((f, i) => (
            <Reveal key={f.id} retraso={i % 2 ? 90 : 0} className={`${s.ficha} ${i % 2 ? s.fichaBaja : ''}`}>
              <article>
                <div className={`${s.fotoFicha} ${f.forma === 'alta' ? s.fotoAlta : s.fotoMedia}`}>
                  <img {...foto(f.slug, '(min-width: 900px) 40vw, 92vw')} loading="lazy" />
                  <span className={s.rotulo}>Ficha de ejemplo · Imagen de referencia</span>
                </div>
                <div className={s.fichaInfo}>
                  <h3>{f.titulo}</h3>
                  <p>{f.especie} · Edad: Por confirmar<br />Lo que necesita: Por confirmar</p>
                  <div className={s.fichaAcciones}>
                    <a className={s.enlace} href="/adoptar">Quiero conocerle</a>
                    <Favorito id={f.id} titulo={f.titulo} />
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal><div className={s.accionCentro}><Boton href="/adoptar">Ver todos en Adoptar</Boton></div></Reveal>
      </div>
    </section>
  )
}

/* 6. Yesenia: short trust block, no portrait. */
export function Yesenia() {
  return (
    <section id="historia" className={`${s.seccion} ${s.claro}`} aria-labelledby="yesenia-titulo">
      <div className={`${s.contenedor} ${s.yeseniaGrid}`}>
        <Reveal>
          <div className={s.fotoYesenia}>
            <img {...foto('perros-calle-grupo-ladrillo', '(min-width: 900px) 48vw, 92vw')} loading="lazy" />
          </div>
          <p className={s.micro}>Imagen de referencia. Pronto, fotos reales del refugio.</p>
        </Reveal>
        <Reveal retraso={90}>
          <h2 id="yesenia-titulo" className={s.titulo}>Quien lo sostiene</h2>
          <p className={`${s.cuerpo} ${s.capitular}`}>Yesenia cuida del refugio prácticamente sola. A veces la comunidad le ayuda, y esa ayuda se nota. Todo lo que pasa en el refugio lo cuenta por WhatsApp, no en esta página: por eso aquí solo ponemos lo que ella confirma.</p>
          <a className={s.enlace} href="/historia">Leer su historia</a>
        </Reveal>
      </div>
    </section>
  )
}

/* 7. Muro de gente que ayuda: warm empty state until real, consented data exists. */
export function Muro() {
  const { datos } = useProgreso()
  const nombres = (datos.donantes ?? []).filter(d => d.consentimiento !== false && d.nombrePublico)
  return (
    <section className={`${s.seccion} ${s.suelo} ${s.muro}`} aria-labelledby="muro-titulo">
      <div className={s.contenedor}>
        <Reveal>
          <h2 id="muro-titulo" className={s.titulo}>Gente que ya ayudó</h2>
          {nombres.length === 0
            ? <p className={s.fraseMuro}>Aquí aparecerá el nombre de quien ayude, si quiere. El primer apodo puede ser el tuyo.</p>
            : <ul className={s.nombres}>{nombres.map((d, i) => <li key={i}>{d.nombrePublico}</li>)}</ul>}
        </Reveal>
      </div>
    </section>
  )
}

/* 8. FAQ: five real objections. Native <details> keeps it keyboard and screen-reader friendly. */
const PREGUNTAS: [string, string][] = [
  ['¿Es real este refugio?', 'Sí. El Refugio Yesenia aparece en Vanguardia (julio de 2024) y en el informe de gestión 2023 de la Fundación Dar con Amor. Los enlaces están en Historia.'],
  ['¿Cuántos animales hay?', 'Cerca de 90 perros, cifra por confirmar. Gatos: por confirmar.'],
  ['¿Puedo pagar desde esta página?', 'Todavía no. Esta página no procesa cobros. Los datos para aportar están por confirmar.'],
  ['¿Cómo sé que mi aporte se usó?', 'Yesenia confirma las compras por WhatsApp y aparecen en "Lo último que se compró".'],
  ['¿Puedo ayudar sin dinero?', 'Sí: difundir la misión, o acompañar al refugio. Cómo y cuándo, por confirmar con Yesenia.'],
]

export function Faq() {
  return (
    <section id="preguntas" className={`${s.seccion} ${s.claro}`} aria-labelledby="faq-titulo">
      <div className={`${s.contenedor} ${s.faqGrid}`}>
        <Reveal><h2 id="faq-titulo" className={`${s.titulo} ${s.tituloSticky}`}>Preguntas frecuentes</h2></Reveal>
        <Reveal retraso={90}>
          <div className={s.preguntas}>
            {PREGUNTAS.map(([q, a]) => (
              <details key={q} className={s.pregunta}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* 9. Cierre: same invitation as the hero, then the footer. */
export function Cierre() {
  return (
    <section className={`${s.seccion} ${s.suelo} ${s.cierre}`} aria-labelledby="cierre-titulo">
      <div className={s.contenedor}>
        <Reveal>
          <h2 id="cierre-titulo" className={s.titulo}>Un plato lleno o una casa nueva.</h2>
          <p className={s.cuerpo}>Cualquiera de las dos cambia el día de alguien.</p>
          <div className={s.accion}><Boton href="/como-ayudar">Ver cómo ayudar</Boton></div>
        </Reveal>
      </div>
      <Reveal>
        <div className={s.fila}>
          <img {...foto('seis-perros-fila', '100vw')} loading="lazy" data-recorte="" />
          <p className={s.micro}>Imagen de referencia. Los datos marcados &quot;Por confirmar&quot; se actualizan cuando Yesenia los valida.</p>
        </div>
      </Reveal>
    </section>
  )
}

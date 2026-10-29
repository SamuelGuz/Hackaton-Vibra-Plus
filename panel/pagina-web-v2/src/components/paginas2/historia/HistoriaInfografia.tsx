'use client'

import Link from 'next/link'
import { useRef, type ReactNode } from 'react'
import { useVisto } from '../../home/Reveal'
import { lanzarDesde } from '../../efectos/Corazones'
import { Capas, Chip, Escena, Icono, estilosHome as s } from '../../home2/Infografia'
import { fotoBanco } from '../../home2/banco'
import h from './Historia.module.css'

// /historia told with the home's infographic language: who she is → what we know and what we
// don't → public background → the help around her → two buttons.
// Honesty rules: docs/estrategia/PERSONA-YESENIA.md. Level B facts carry their source;
// nothing is quoted in Yesenia's voice, and every unknown says "Por confirmar".

type Extra = 'pregunta' | 'informe' | 'periodico' | 'ladrillo'

/** Icons this page needs that the home set lacks; same stroke and size (`.icono`). */
function IconoExtra({ nombre }: { nombre: Extra }) {
  const p: Record<Extra, ReactNode> = {
    pregunta: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7" /><path d="M12 17h.01" /></>,
    informe: <><path d="M7 3h7l4 4v14H7Z" /><path d="M14 3v4h4M10 12h5M10 15h5M10 18h3" /></>,
    periodico: <><path d="M4 5h13v14H6a2 2 0 0 1-2-2Z" /><path d="M17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 12h7M7 15h4" /></>,
    ladrillo: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 12h18M10 5v7M14 12v7" /></>,
  }
  return <svg className={s.icono} viewBox="0 0 24 24" aria-hidden="true">{p[nombre]}</svg>
}

function Apertura() {
  return (
    <section className={`${s.seccion} ${h.apertura}`} aria-labelledby="historia-titulo">
      <div className={s.contenedor}>
        <div className={h.aperturaGrid}>
          <div className={h.aperturaTexto}>
            <h1 id="historia-titulo" className={s.titulo}>Ella es Yesenia.</h1>
            <p className={s.lead}>Rescata, alimenta y cura a decenas de perros y gatos en su refugio de Bucaramanga. Casi siempre, sola.</p>
            <ul className={h.saltos}>
              <li><a href="#lo-que-sabemos">Lo que sabemos</a></li>
              <li><a href="#fuentes">Fuentes públicas</a></li>
              <li><a href="#comunidad">Quién la apoya</a></li>
            </ul>
          </div>
          <Capas slug="rescatista-cachorro" palabra="ELLA" className={h.aperturaFoto} sizes="(min-width: 900px) 48vw, 92vw" alt="Yesenia carga a un cachorro en el refugio">
            <span className={s.nombreFoto}>Yesenia</span>
            <Chip className={s.chipA} icono="corazon">Rescata y cuida</Chip>
          </Capas>
        </div>
        <p className={s.nota}>Yesenia, en su refugio. Foto real.</p>
      </div>
    </section>
  )
}

const SABEMOS = [
  { icono: 'mano', titulo: 'Trabaja casi sola.', texto: 'Ella está al frente del cuidado de todos los días.' },
  { icono: 'corazon', titulo: 'La comunidad ayuda, a veces.', texto: 'Llega, aunque no sabemos con qué frecuencia.' },
  { icono: 'plato', titulo: 'Cuida a decenas de perros y gatos.', texto: 'Cerca de 90 perros, según se cuenta. Gatos y cifra exacta, por confirmar.' },
  { icono: 'chat', titulo: 'Todo pasa por WhatsApp.', texto: 'Ahí se coordina lo que pasa en el refugio.' },
] as const

const PENDIENTES = [
  'Cómo empezó y desde cuándo.',
  'Cuántos animales hay hoy, con exactitud.',
  'Los perfiles de cada perro y gato.',
  'Qué canales de ayuda están vigentes.',
  'Cómo está el refugio tras la remodelación.',
]

function LoQueSabemos() {
  const [ref, visto] = useVisto<HTMLDivElement>(0.2)
  return (
    <section id="lo-que-sabemos" className={s.seccion} aria-labelledby="sabemos-titulo">
      <div className={s.contenedor}>
        <h2 id="sabemos-titulo" className={s.titulo}>Lo que sabemos. Y lo que todavía no.</h2>
        <p className={s.lead}>Preferimos mostrarte las dos columnas. Lo pendiente lo completará Yesenia.</p>
        <div ref={ref} className={`${h.columnas} ${visto ? h.columnasVisto : ''}`}>
          <div className={h.sabemos}>
            <p className={h.columnaTitulo}><span className={h.columnaSello}><Icono nombre="check" /></span>Lo que sabemos</p>
            <ul className={h.lista}>
              {SABEMOS.map((d, i) => (
                <li key={d.titulo} style={{ transitionDelay: `${i * 70}ms` }}>
                  <span className={h.listaIcono}><Icono nombre={d.icono} /></span>
                  <span><strong>{d.titulo}</strong><span>{d.texto}</span></span>
                </li>
              ))}
            </ul>
            <p className={h.fuente}>Según quien conoce de cerca su trabajo. En verificación con Yesenia.</p>
          </div>
          <div className={h.pendientes}>
            <p className={h.columnaTitulo}><span className={`${h.columnaSello} ${h.selloPendiente}`}><IconoExtra nombre="pregunta" /></span>Lo que aún no sabemos</p>
            <ul className={h.lista}>
              {PENDIENTES.map((t, i) => (
                <li key={t} style={{ transitionDelay: `${(i + SABEMOS.length) * 70}ms` }}>
                  <span className={`${h.listaIcono} ${h.iconoPendiente}`}><IconoExtra nombre="pregunta" /></span>
                  <span><strong>{t}</strong><em className={h.porConfirmar}>Por confirmar</em></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

// Public background only: date and source, no results attributed. No link until a URL is verified.
const FUENTES: { icono: Extra; fecha: string; fuente: string; dice: string; noDice: string; fechaPendiente?: boolean }[] = [
  { icono: 'informe', fecha: '2023', fuente: 'Informe de gestión 2023 · Fundación Dar con Amor', dice: 'Registra paseos, baños y limpieza hechos por voluntarios en el refugio.', noDice: 'No prueba que ese voluntariado siga hoy.' },
  { icono: 'periodico', fecha: '16 jul 2024', fuente: 'Vanguardia', dice: 'Publicó sobre la Fundación Dar con Amor y trabajos de remodelación del refugio, en Bucaramanga.', noDice: 'No confirma cómo está el lugar hoy.' },
  { icono: 'ladrillo', fecha: 'Fecha por confirmar', fuente: 'Trabajo académico · UDES', dice: 'Estrategia de comunicación de la campaña “Dona un Ladrillo” para la remodelación.', noDice: 'Sus resultados no están verificados.', fechaPendiente: true },
]

function Fuentes() {
  const [ref, visto] = useVisto<HTMLOListElement>(0.2)
  return (
    <section id="fuentes" className={s.seccion} aria-labelledby="fuentes-titulo">
      <div className={s.contenedor}>
        <h2 id="fuentes-titulo" className={s.titulo}>El refugio aparece en documentos públicos.</h2>
        <p className={s.lead}>Esto es lo que dice cada fuente, y también lo que no dice.</p>
        <ol ref={ref} className={`${h.tiempo} ${visto ? h.tiempoVisto : ''}`}>
          {FUENTES.map((f, i) => (
            <li key={f.fuente} className={f.fechaPendiente ? h.hitoPendiente : ''} style={{ transitionDelay: `${i * 110}ms` }}>
              <span className={h.hitoPunto}><IconoExtra nombre={f.icono} /></span>
              <span className={h.hitoFecha}>{f.fecha}</span>
              <h3 className={h.hitoFuente}>{f.fuente}</h3>
              <p className={h.hitoDice}>{f.dice}</p>
              <p className={h.hitoNoDice}>{f.noDice}</p>
            </li>
          ))}
        </ol>
        <p className={s.nota}>Antecedentes, no el estado actual. Pondremos los enlaces cuando cada dirección esté verificada.</p>
      </div>
    </section>
  )
}

function Comunidad() {
  return (
    <section id="comunidad" className={s.seccion} aria-labelledby="comunidad-titulo">
      <div className={s.contenedor}>
        <div className={h.comunidadGrid}>
          <Capas slug="voluntarios" palabra="MANOS" className={h.comunidadFoto} sizes="(min-width: 900px) 56vw, 92vw" alt="Personas que apoyan el refugio, con varios perros" />
          <div className={h.comunidadTexto}>
            <h2 id="comunidad-titulo" className={s.titulo}>No está sola del todo.</h2>
            <p className={s.lead}>A veces la comunidad le da una mano. En 2023, voluntarios de la Fundación Dar con Amor ayudaron con estas tareas:</p>
            <ul className={h.tareas}>
              <li><Icono nombre="sol" />Paseos</li>
              <li><Icono nombre="cruz" />Baños</li>
              <li><Icono nombre="escoba" />Limpieza</li>
            </ul>
            <p className={h.comunidadPendiente}>Quién ayuda hoy y con qué frecuencia: <em className={h.porConfirmar}>Por confirmar</em></p>
          </div>
          <Escena slug="curacion" tono="verde" className={h.comunidadMini} />
          <figure className={h.comunidadMini}>
            <img {...fotoBanco('voluntaria-comedero', '(min-width: 900px) 22vw, 46vw')} alt="Una persona sirve comida a los perros del refugio" loading="lazy" decoding="async" />
          </figure>
        </div>
        <p className={s.nota}>Fotos del refugio. No identificamos por nombre a quienes ayudan.</p>
      </div>
    </section>
  )
}

function Cierre() {
  const boton = useRef<HTMLAnchorElement>(null)
  return (
    <section className={`${s.seccion} ${s.cierre}`} aria-labelledby="historia-cierre-titulo">
      <div className={s.contenedor}>
        <div className={h.cierreGrid}>
          <div>
            <h2 id="historia-cierre-titulo" className={s.titulo}>Ya la conoces. Ahora puedes acompañarla.</h2>
            <p className={s.lead}>Un plato lleno o una casa nueva. Las dos cosas le cambian el día a alguien.</p>
            <div className={h.botones}>
              <Link ref={boton} href="/aportar" className={s.botonGrande} onClick={() => lanzarDesde(boton.current, 4)}>Llenar un plato</Link>
              <Link href="/adoptar" className={s.botonLinea}>Dar un hogar</Link>
            </div>
          </div>
          <Escena slug="rescatista-beso" tono="verde" className={h.cierreEscena}>
            <span className={`${s.nombreFoto} ${h.cierreNombre}`}>Yesenia</span>
          </Escena>
        </div>
      </div>
    </section>
  )
}

export default function HistoriaInfografia() {
  return (
    <div className={`${s.home} ${h.historia}`}>
      <Apertura />
      <LoQueSabemos />
      <Fuentes />
      <Comunidad />
      <Cierre />
    </div>
  )
}

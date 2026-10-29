'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { Capas, Capitulo, Chip, Icono, estilosHome as h } from '../home2/Infografia'
import { lanzarDesde } from '../efectos/Corazones'
import { useAcciones } from './acciones'
import { FAQ_ADOPTAR, PREGUNTAS } from './contenido'
import Fichas from '../paginas2/adoptar/Fichas'
import a from '../paginas2/adoptar/Adoptar.module.css'

// /adoptar told with the Home's infographic language, one idea per section:
// Hogar → Cómo funciona → Quiénes esperan → Después → ¿No es el momento? → Preguntas.
// Plan: docs/estrategia/ARQUITECTURA-Y-COPY.md §1 /adoptar, §2 recorrido A, §5. Unconfirmed steps say "Por confirmar".

function Encabezado() {
  return (
    <section className={`${h.seccion} ${a.encabezado}`} aria-labelledby="adoptar-titulo">
      <div className={h.contenedor}>
        <div className={a.encGrid}>
          <div>
            <p className={h.camino}>Adoptar</p>
            <h1 id="adoptar-titulo" className={h.titulo}>Adoptar es para siempre.</h1>
            <p className={h.lead}>Quien llega a tu casa se queda toda su vida. Aquí ves, paso a paso, cómo empieza.</p>
            <ul className={h.datosRapidos} aria-label="El proceso en números">
              <li><strong>3</strong><span>pasos</span></li>
              <li><strong>4</strong><span>preguntas cortas</span></li>
              <li><strong>1</strong><span>conversación con Yesenia</span></li>
            </ul>
            <div className={a.botones}>
              <a href="#quienes-esperan" className={h.botonGrande}>Ver quién espera</a>
              <a href="#como-funciona" className={h.botonLinea}>Cómo funciona</a>
            </div>
          </div>
          <Capas slug="cachorro-en-brazos" palabra="HOGAR" className={a.encFoto} sizes="(min-width: 900px) 46vw, 92vw" alt="Un cachorro café en brazos, en el refugio">
            <Chip className={h.chipA} icono="casa">Para toda su vida</Chip>
            <Chip className={h.chipB} icono="corazon">Sin prisa</Chip>
          </Capas>
        </div>
      </div>
    </section>
  )
}

const PASOS = [
  { icono: 'corazon', titulo: 'Escoges', texto: 'Mira quién espera y elige a quien te llame la atención.' },
  { icono: 'check', titulo: 'Respondes 4 preguntas', texto: 'No es un examen. Sirve para que el animal llegue a un lugar donde pueda quedarse.' },
  { icono: 'chat', titulo: 'Hablas con Yesenia', texto: 'Le escribes con tus respuestas y ella te responde cuando puede.' },
] as const

function ComoFunciona() {
  const acciones = useAcciones()
  return (
    <section id="como-funciona" className={h.seccion} aria-labelledby="funciona-titulo">
      <div className={h.contenedor}>
        <Capitulo n="1">Cómo funciona</Capitulo>
        <h2 id="funciona-titulo" className={h.titulo}>Tres pasos, sin prisa.</h2>
        <ol className={h.flujo}>
          {PASOS.map((p, i) => (
            <li key={p.titulo}>
              <span className={h.flujoIcono}><Icono nombre={p.icono} /></span>
              <b className={a.pasoNumero}>Paso {i + 1}</b>
              <strong>{p.titulo}</strong>
              <span>{p.texto}</span>
            </li>
          ))}
        </ol>
        <div className={a.preguntasCaja}>
          <p className={a.preguntasEtiqueta}>Las cuatro preguntas son sobre</p>
          <ul className={a.preguntas}>
            {PREGUNTAS.map(p => <li key={p.clave}><Icono nombre="check" />{p.clave}</li>)}
          </ul>
          <button type="button" className={`${h.botonLinea} ${a.botonReset}`} onClick={() => acciones.adoptar(null)}>Responder las cuatro preguntas</button>
          <p className={a.preguntasNota}>Nadie te rechaza por una respuesta. Sirven para que Yesenia te conozca antes de escribirte.</p>
        </div>
      </div>
    </section>
  )
}

function QuienesEsperan() {
  return (
    <section id="quienes-esperan" className={h.seccion} aria-labelledby="esperan-titulo">
      <div className={h.contenedor}>
        <Capitulo n="2">Quiénes esperan</Capitulo>
        <h2 id="esperan-titulo" className={h.titulo}>Ellos esperan una casa.</h2>
        <p className={h.lead}>Fichas de ejemplo con fotos del refugio. Los apodos describen la foto; nombre, edad y carácter los confirma Yesenia.</p>
        <Fichas />
        <p className={h.nota}>Toca el corazón para guardar una ficha. Se queda solo en este navegador.</p>
      </div>
    </section>
  )
}

const DESPUES = [
  { icono: 'chat', titulo: 'Yesenia lee tu mensaje', texto: 'Responde cuando puede. Trabaja casi sola, así que a veces tarda. Es normal.', confirmado: true },
  { icono: 'mano', titulo: 'Conversan', texto: 'Te cuenta cómo es el animal y resuelve tus dudas.', confirmado: false },
  { icono: 'casa', titulo: 'Visita', texto: 'Conoces al animal antes de decidir.', confirmado: false },
  { icono: 'corazon', titulo: 'Llega a casa', texto: 'Y el seguimiento después de la adopción.', confirmado: false },
] as const

function Despues() {
  return (
    <section id="despues" className={`${h.seccion} ${h.seccionVerde}`} aria-labelledby="despues-titulo">
      <div className={h.contenedor}>
        <Capitulo n="3">Después</Capitulo>
        <h2 id="despues-titulo" className={h.titulo}>Qué pasa después de escribir.</h2>
        <ol className={a.despues}>
          {DESPUES.map((d, i) => (
            <li key={d.titulo}>
              <span className={a.despuesIcono}><Icono nombre={d.icono} /></span>
              <b>{i + 1}</b>
              <strong>{d.titulo}</strong>
              <span>{d.texto}</span>
              {!d.confirmado && <em className={a.porConfirmar}>Por confirmar</em>}
            </li>
          ))}
        </ol>
        <p className={h.nota}>La visita, la conversación y el seguimiento se confirman con Yesenia.</p>
      </div>
    </section>
  )
}

function NoEsElMomento() {
  const boton = useRef<HTMLAnchorElement>(null)
  return (
    <section id="llena-un-plato" className={h.seccion} aria-labelledby="plato-titulo">
      <div className={h.contenedor}>
        <div className={a.platoGrid}>
          <Capas slug="rescatista-alimentando" palabra="PLATO" className={a.platoFoto} sizes="(min-width: 900px) 42vw, 92vw" alt="Una rescatista da de comer a varios perros en el patio del refugio">
            <Chip className={h.chipA} icono="plato">Comida para hoy</Chip>
          </Capas>
          <div>
            <p className={h.camino}>¿No es el momento?</p>
            <h2 id="plato-titulo" className={`${h.titulo} ${a.platoTitulo}`}>Llena un plato.</h2>
            <p className={h.lead}>No tienes que salvar a todos. Ayudar a uno ya cuenta.</p>
            <Link ref={boton} href="/aportar" className={h.botonGrande} onClick={() => lanzarDesde(boton.current, 4)}>Llenar un plato</Link>
            <p className={h.microcopy}>Te llevamos a la página de aporte. Los canales de pago están por confirmar.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Preguntas() {
  return (
    <section id="preguntas" className={`${h.seccion} ${h.cierre}`} aria-labelledby="preguntas-titulo">
      <div className={h.contenedor}>
        <div className={a.faqGrid}>
          <div>
            <Capitulo n="4">Preguntas</Capitulo>
            <h2 id="preguntas-titulo" className={h.titulo}>Lo que más se pregunta.</h2>
          </div>
          <div className={a.faq}>
            {FAQ_ADOPTAR.map(it => (
              <details key={it.q}>
                <summary><span>{it.q}</span><span className={a.mas} aria-hidden="true" /></summary>
                <p>{it.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Adoptar() {
  return (
    <div className={`${h.home} ${a.adoptar}`}>
      <Encabezado />
      <ComoFunciona />
      <QuienesEsperan />
      <Despues />
      <NoEsElMomento />
      <Preguntas />
    </div>
  )
}

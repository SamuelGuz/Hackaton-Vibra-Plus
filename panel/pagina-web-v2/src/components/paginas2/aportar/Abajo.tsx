'use client'

import { Capitulo, Escena, Icono, estilosHome as h } from '../../home2/Infografia'
import type { SlugBanco } from '../../home2/banco'
import { pesos } from '../../home/progreso'
import Actividad from './Actividad'
import s from './Aportar.module.css'

// Below the fold, for whoever keeps scrolling: where the money goes, proof it arrives,
// the wall of people who help, and a short FAQ. Nothing here is invented: empty data shows warm empty states.

const DESTINOS: { icono: 'plato' | 'cruz' | 'casa'; titulo: string; texto: string; slug: SlugBanco }[] = [
  { icono: 'plato', titulo: 'Comida', texto: 'Carne, huesos y concentrado. Lo que más se acaba.', slug: 'cachorros-durmiendo' },
  { icono: 'cruz', titulo: 'Salud', texto: 'Vacunas, curaciones y medicinas.', slug: 'curacion' },
  { icono: 'casa', titulo: 'Techo', texto: 'Cercas, techos y camas secas.', slug: 'perro-blanco-saludo' },
]

const FAQ = [
  { q: '¿Es seguro?', a: 'Esta página no cobra ni te pide datos bancarios. Le envías el aporte directo a Yesenia por el canal que ella confirme, y ella te responde por WhatsApp.' },
  { q: '¿Puedo ser anónimo?', a: 'Sí, es lo normal. Solo apareces en el muro si tú lo pides después de donar, con el apodo que elijas.' },
  { q: '¿Puedo dar comida en vez de plata?', a: 'Por confirmar con Yesenia. Escríbele por WhatsApp y te dice qué hace falta esa semana y cómo entregarlo.' },
]

export default function Abajo({ monto, onDonar }: { monto: number; onDonar: () => void }) {
  return (
    <>
      <section className={h.seccion} aria-labelledby="destino-titulo">
        <div className={h.contenedor}>
          <Capitulo n="1">Tu aporte</Capitulo>
          <h2 id="destino-titulo" className={h.titulo}>Hacia dónde va tu aporte.</h2>
          <div className={s.origen}>
            <span className={s.origenPildora}><Icono nombre="mano" />Tus {pesos(monto)}</span>
          </div>
          <ol className={s.destinos}>
            {DESTINOS.map(d => (
              <li key={d.titulo} className={s.destino}>
                <Escena slug={d.slug} tono="arena" className={s.destinoEscena} />
                <div className={s.destinoTexto}>
                  <span className={s.destinoIcono}><Icono nombre={d.icono} /></span>
                  <h3>{d.titulo}</h3>
                  <p>{d.texto}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className={h.nota}>Yesenia lo usa en lo que más falte esa semana. El reparto exacto se confirma con ella.</p>
        </div>
      </section>

      <Actividad />

      <section className={h.seccion} aria-labelledby="faq-titulo">
        <div className={h.contenedor}>
          <h2 id="faq-titulo" className={h.titulo}>Antes de donar.</h2>
          <div className={s.faq}>
            {FAQ.map(f => (
              <details key={f.q}>
                <summary><span>{f.q}</span><i aria-hidden="true" /></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <button type="button" className={`${h.botonGrande} ${s.cierreBoton}`} onClick={onDonar}>Donar {pesos(monto)}</button>
        </div>
      </section>
    </>
  )
}

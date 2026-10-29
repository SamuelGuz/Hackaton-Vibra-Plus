'use client'

import { useId, useState, type ReactNode } from 'react'
import { useAcciones } from './acciones'
import { FAQ_COMO_AYUDAR } from './contenido'
import Mision from './Mision'
import { Boton, BotonWhatsApp, Cierre, Encabezado, Faq, Revela } from './ui'
import s from './Pagina.module.css'

type Id = 'adoptar' | 'aportar' | 'acompanar' | 'difundir'

const CAMINOS: { id: Id; nombre: string; texto: string }[] = [
  { id: 'adoptar', nombre: 'Adoptar', texto: 'Una casa para siempre. Antes conversamos cuatro cosas: vivienda, presupuesto, rejas y compromiso con el veterinario.' },
  { id: 'aportar', nombre: 'Aportar', texto: 'Llenas el plato de la misión de esta semana. Tú eliges cuánto y ves en qué se convierte.' },
  { id: 'acompanar', nombre: 'Acompañar', texto: 'Pasear, bañar, limpiar. Hay antecedentes de voluntariado (informe 2023 de Dar con Amor); la disponibilidad actual está por confirmar.' },
  { id: 'difundir', nombre: 'Difundir', texto: 'Compartir la misión toma diez segundos y llega a quien sí puede.' },
]

function Cta({ id, claro = false }: { id: Id; claro?: boolean }) {
  const acciones = useAcciones()
  const v = claro ? 'claro' : 'verde'
  switch (id) {
    case 'adoptar': return <Boton href="/adoptar" variante={v}>Ver quién espera hogar</Boton>
    case 'aportar': return <Boton variante={v} onClick={() => acciones.aportar()}>Aportar a la misión</Boton>
    case 'acompanar': return <BotonWhatsApp variante={v} texto="Hola Yesenia, quisiera saber si puedo acompañar en el refugio (pasear, bañar o limpiar).">Preguntar por WhatsApp</BotonWhatsApp>
    case 'difundir': return <Boton variante={v} onClick={() => acciones.compartir()}>Compartir la misión</Boton>
  }
}

function Camino({ c, abierto, onToggle }: { c: (typeof CAMINOS)[number]; abierto: boolean; onToggle: () => void }): ReactNode {
  const id = useId()
  return (
    <li className={`${s.camino} ${abierto ? s.caminoAbierto : ''}`}>
      <h3>
        <button type="button" aria-expanded={abierto} aria-controls={id} onClick={onToggle}>
          <span>{c.nombre}</span>
          <span className={s.flecha} aria-hidden="true" />
        </button>
      </h3>
      <div id={id} role="region" aria-label={c.nombre} className={s.caminoPanel} hidden={false} inert={!abierto}>
        <div>
          <p>{c.texto}</p>
          <Cta id={c.id} claro />
        </div>
      </div>
    </li>
  )
}

export default function ComoAyudar() {
  const [sel, setSel] = useState<Id | null>(null)
  return (
    <>
      <Encabezado
        titulo="Ayudar no es solo dar plata"
        sub="Elige lo que hoy sí puedes. Ninguna opción es menor."
        slug="tres-perros-sentados"
        recorte
      >
        <Boton href="#elegir">Elegir cómo ayudar</Boton>
      </Encabezado>

      <section id="elegir" className={`${s.sec} ${s.claro}`} aria-labelledby="elegir-t">
        <div className={s.caja}>
          <h2 id="elegir-t" className={s.h2}>Cuatro formas de ayudar</h2>
          <ul className={s.caminos}>
            {CAMINOS.map(c => <Camino key={c.id} c={c} abierto={sel === c.id} onToggle={() => setSel(sel === c.id ? null : c.id)} />)}
          </ul>
        </div>
      </section>

      <section className={`${s.sec} ${s.beige}`} aria-label="Misión de ayuda">
        <div className={s.caja}>
          <Revela><Mision variante="compacta" /></Revela>
        </div>
      </section>

      <section className={`${s.sec} ${s.verde}`} aria-labelledby="nada-t">
        <div className={s.caja}>
          <Revela>
            <h2 id="nada-t" className={s.h2}>Lo que no necesitas hacer</h2>
            <ul className={s.noHacer}>
              <li>No necesitas crear una cuenta.</li>
              <li>No necesitas dar tus datos para aportar.</li>
              <li>No necesitas aportar cada semana.</li>
              <li>No tienes que justificar nada.</li>
            </ul>
          </Revela>
        </div>
      </section>

      <Faq items={FAQ_COMO_AYUDAR} />

      <Cierre titulo="Un plato lleno o una casa nueva." texto="Cualquiera de las dos cambia el día de alguien.">
        <Cta id={sel ?? 'aportar'} claro />
      </Cierre>
    </>
  )
}

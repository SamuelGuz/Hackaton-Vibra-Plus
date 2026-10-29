'use client'

import { useEffect, useRef, useState } from 'react'
import { lanzarDesde } from '../efectos/Corazones'
import { useAcciones } from './acciones'
import { Boton } from './ui'
import {
  esEjemplo, esObsoleto, estadoMeta, fechaCorta, pesos, porcentaje, useProgreso,
  type Meta, type Progreso,
} from './progreso'
import s from './Mision.module.css'

/** Barra de una meta. El relleno entra con scaleX una sola vez al verse; los cambios interpolan 500 ms. */
export function BarraMeta({ meta, datos, previa, conDetalle = true }: { meta: Meta; datos: Progreso; previa?: number; conDetalle?: boolean }) {
  const acciones = useAcciones()
  const ref = useRef<HTMLDivElement>(null)
  const [visto, setVisto] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setVisto(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisto(true); io.disconnect() } }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const pct = porcentaje(meta)
  const estado = estadoMeta(meta)
  const ejemplo = esEjemplo(datos, meta)
  const pctPrevia = previa != null ? Math.min(100, Math.floor(((meta.recaudado + previa) / meta.meta) * 100)) : null
  return (
    <div className={s.meta} ref={ref}>
      <div className={s.metaTop}>
        <h3 className={s.metaTitulo}>
          {conDetalle ? <button type="button" className={s.metaBtn} onClick={() => acciones.detalleMeta(meta)}>{meta.titulo}<span className={s.verMas}>Ver detalle</span></button> : meta.titulo}
        </h3>
        <p className={s.cifra}>{pesos(meta.recaudado)} <span>de {pesos(meta.meta)}</span></p>
      </div>
      <div
        className={`${s.pista} ${estado === 'vacio' ? s.pistaVacia : ''}`}
        role="progressbar"
        aria-label={meta.titulo}
        aria-valuemin={0}
        aria-valuemax={meta.meta}
        aria-valuenow={Math.min(meta.recaudado, meta.meta)}
        aria-valuetext={`${pesos(meta.recaudado)} de ${pesos(meta.meta)}, ${pct} por ciento`}
      >
        {pctPrevia != null && <div className={s.relleno + ' ' + s.rellenoPrevia} style={{ transform: `scaleX(${pctPrevia / 100})` }} />}
        <div className={s.relleno} style={{ transform: `scaleX(${visto ? pct / 100 : 0})` }} />
      </div>
      <p className={s.metaPie}>
        <span>{meta.detalle}</span>
        <span className={s.pct}>{estado === 'cumplida' ? 'Meta cumplida' : estado === 'vacio' ? 'Empieza en cero' : `${pct}%`}</span>
      </p>
      {ejemplo && <p className={s.ejemplo}>Meta de ejemplo, por confirmar</p>}
    </div>
  )
}

function Esqueleto() {
  return (
    <div className={s.esq} aria-hidden="true">
      <div className={s.esqLinea} /><div className={s.esqBarra} /><div className={s.esqLinea} /><div className={s.esqBarra} />
    </div>
  )
}

export function UltimaCompra({ datos }: { datos: Progreso }) {
  const c = datos.compras[0]
  if (!c) return <p className={s.ultima}>Todavía no hay compras. Cuando Yesenia confirme una, aparece aquí.</p>
  return <p className={s.ultima}><span>Lo último que se compró</span> {fechaCorta(c.fecha)} · {c.texto}{c.monto != null && c.monto > 0 ? ` · ${pesos(c.monto)}` : ''}</p>
}

interface MisionProps {
  variante?: 'compacta' | 'completa'
  /** `claro` sobre fondo beige/blanco, `oscuro` sobre verde profundo. */
  tono?: 'claro' | 'oscuro'
}

/** Modulo "Mision de ayuda": estados vacio, en curso, cumplida, error y dato obsoleto. */
export default function Mision({ variante = 'completa', tono = 'claro' }: MisionProps) {
  const { datos, carga, cacheado, recargar } = useProgreso()
  const acciones = useAcciones()
  const cta = useRef<HTMLDivElement>(null)
  const estadoPrevio = useRef<string | null>(null)

  const estados = datos?.metas.map(estadoMeta) ?? []
  const global = estados.length === 0 ? 'vacio' : estados.every(e => e === 'cumplida') ? 'cumplida' : estados.some(e => e !== 'vacio') ? 'en_curso' : 'vacio'
  const obsoleta = datos ? esObsoleto(datos) : false

  // Corazoncitos solo si la meta se cumple durante esta visita (no al cargar ya cumplida).
  useEffect(() => {
    if (carga !== 'listo') return
    if (estadoPrevio.current && estadoPrevio.current !== 'cumplida' && global === 'cumplida') lanzarDesde(cta.current, 6)
    estadoPrevio.current = global
  }, [global, carga])

  const periodo = datos?.periodo?.tipo === 'mes' ? 'del mes' : 'de la semana'
  const mes = datos?.periodo?.tipo === 'mes'
  const tit = global === 'cumplida' ? (mes ? 'Plato lleno este mes' : 'Plato lleno esta semana') : (mes ? 'Llenemos el plato del mes' : 'Llenemos el plato de esta semana')
  const claseTono = tono === 'oscuro' ? s.oscuro : ''

  return (
    <div className={`${s.mision} ${claseTono} ${variante === 'compacta' ? s.compacta : ''}`} id="mision">
      <div className={s.enc}>
        <p className={s.marca}>Misión {periodo}</p>
        <p className={s.actualizado}>{datos?.actualizado ? `Actualizado ${fechaCorta(datos.actualizado)}` : 'Sin actualizar aún'}</p>
      </div>
      <h2 className={s.titulo}>{tit}</h2>

      {carga === 'cargando' && !datos && <Esqueleto />}

      {carga === 'error' && (
        <div className={s.error} role="alert">
          <p>No pudimos cargar la misión. Intenta de nuevo en un momento.{cacheado && datos?.actualizado ? ` Última actualización: ${fechaCorta(datos.actualizado)}.` : ''}</p>
          <Boton variante={tono === 'oscuro' ? 'claro' : 'verde'} onClick={recargar}>Intentar de nuevo</Boton>
        </div>
      )}

      {obsoleta && <p className={s.obsoleta} role="status">Esta misión puede estar desactualizada.</p>}

      {datos && (
        <>
          {global === 'vacio' && <p className={s.estado}>Esta semana empieza en cero, y eso está bien. El primer aporte abre la barra.</p>}
          {global === 'en_curso' && datos.metas[0] && (
            <p className={s.estado}>Van {pesos(datos.metas.reduce((a, m) => a + m.recaudado, 0))} de {pesos(datos.metas.reduce((a, m) => a + m.meta, 0))}. Faltan {pesos(datos.metas.reduce((a, m) => a + Math.max(0, m.meta - m.recaudado), 0))}.</p>
          )}
          {global === 'cumplida' && <p className={s.estado}>Se completó esta misión. La siguiente la define Yesenia.</p>}

          <div className={s.metas}>
            {(variante === 'compacta' ? datos.metas.slice(0, 2) : datos.metas.slice(0, 3)).map(m => <BarraMeta key={m.id} meta={m} datos={datos} />)}
          </div>

          {datos.compras.length > 0 && <UltimaCompra datos={datos} />}
        </>
      )}

      <div className={s.acciones} ref={cta}>
        {global === 'cumplida'
          ? <Boton variante={tono === 'oscuro' ? 'claro' : 'verde'} disabled>Ver la siguiente misión (por confirmar)</Boton>
          : <Boton variante={tono === 'oscuro' ? 'claro' : 'verde'} onClick={() => acciones.aportar()}>Aportar a la misión</Boton>}
        {!obsoleta && datos && <Boton variante="texto" onClick={() => acciones.compartir()}>Compartir la misión</Boton>}
      </div>
      <p className={s.micro}>La página no cobra. Tu aporte lo recibe Yesenia directamente.</p>
    </div>
  )
}

export function ListaCompras({ titulo = 'Lo último que se compró' }: { titulo?: string }) {
  const { datos } = useProgreso()
  const compras = datos?.compras.slice(0, 5) ?? []
  return (
    <div className={s.compras} aria-live="polite">
      <h2 className={s.h2c}>{titulo}</h2>
      {compras.length === 0
        ? <p className={s.vacioTxt}>Todavía no hay compras confirmadas. Cuando Yesenia confirme una por WhatsApp, aparece aquí con su fecha.</p>
        : <ul>{compras.map(c => <li key={c.id ?? c.fecha + c.texto}><time>{fechaCorta(c.fecha)}</time><span>{c.texto}</span>{c.monto != null && c.monto > 0 && <b>{pesos(c.monto)}</b>}</li>)}</ul>}
    </div>
  )
}

export function MuroAyuda({ titulo = 'Gente que ya ayudó' }: { titulo?: string }) {
  const { datos } = useProgreso()
  const lista = (datos?.donantes ?? []).filter(d => d.consentimiento)
  return (
    <div className={s.muro}>
      <h2 className={s.h2c}>{titulo}</h2>
      {lista.length === 0
        ? <p className={s.vacioTxt}>Aquí aparecerá el nombre de quien ayude, si quiere. El primer apodo puede ser el tuyo.</p>
        : <ul className={s.nombres}>{lista.map((d, i) => <li key={d.id ?? i}>{d.nombrePublico}</li>)}</ul>}
    </div>
  )
}

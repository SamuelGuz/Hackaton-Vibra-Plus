'use client'

import { Bone, FirstAidKit, HandHeart, Package, PawPrint, Receipt, ShoppingCart } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { Capitulo, Icono, estilosHome as h } from '../../home2/Infografia'
import { pesos, useProgreso, type TipoCompra } from '../../home/progreso'
import s from './Aportar.module.css'

// Donation progress: the goal bar, what Yesenia did with the money (with the time of each step)
// and the latest donations. Everything comes from /data/progreso.json; empty data shows warm empty states.

const ICONOS: Record<TipoCompra, Icon> = {
  bulto: Package, carne: Bone, salud: FirstAidKit, recibo: Receipt, entrega: PawPrint, otro: ShoppingCart,
}

const ZONA = 'America/Bogota'
const dia = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: ZONA })
const hora = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: ZONA })

function Momento({ iso }: { iso: string }) {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return <time>{iso}</time>
  const d = new Date(t)
  const conHora = iso.includes('T')
  return <time dateTime={iso}>{dia.format(d)}{conHora && ` · ${hora.format(d)}`}</time>
}

const masReciente = (a: { fecha: string }, b: { fecha: string }) => Date.parse(b.fecha) - Date.parse(a.fecha)

/** `inicio`: en la portada, antes del capítulo 1, sin número y con un título que no repite el capítulo Confianza. */
export default function Actividad({ inicio = false }: { inicio?: boolean }) {
  const { datos } = useProgreso()
  const meta = datos.metas[0]
  const pct = meta && meta.meta > 0 ? Math.min(100, Math.round((meta.recaudado / meta.meta) * 100)) : 0
  const falta = meta ? Math.max(0, meta.meta - meta.recaudado) : 0
  const compras = [...datos.compras].sort(masReciente).slice(0, 8)
  const donaciones = [...(datos.donaciones ?? [])].sort(masReciente).slice(0, 8)

  return (
    <section id={inicio ? 'esta-semana' : undefined} className={`${h.seccion} ${s.ap} ${inicio ? s.actividadInicio : ''}`} aria-labelledby="llega-titulo">
      <div className={h.contenedor}>
        {inicio
          ? <p className={h.capitulo}><span><Icono nombre="corazon" /></span>Esta semana</p>
          : <Capitulo n="2">Confianza</Capitulo>}
        <h2 id="llega-titulo" className={h.titulo}>{inicio ? 'Lo que pasó esta semana.' : 'Así sabes que llega.'}</h2>
        {inicio && <p className={h.lead}>Cada aporte y cada compra de Yesenia, con su fecha y hora.</p>}

        <div className={s.tablero}>
        {meta && (
          <div className={s.avance}>
            <p className={s.avanceTitulo}>{meta.titulo}</p>
            <p className={s.avanceCifras}><strong>{pesos(meta.recaudado)}</strong><span>de {pesos(meta.meta)}</span></p>
            <div className={s.avancePista} role="progressbar" aria-label={meta.titulo} aria-valuemin={0} aria-valuemax={meta.meta} aria-valuenow={meta.recaudado} aria-valuetext={`${pct}% de ${pesos(meta.meta)}`}>
              <div className={s.avanceRelleno} style={{ transform: `scaleX(${pct / 100})` }} />
            </div>
            <p className={s.avanceNota}>{falta > 0 ? `Faltan ${pesos(falta)}.` : 'Meta completa.'}</p>
          </div>
        )}

        <div className={s.prueba}>
          <div className={s.tarjeta}>
            <h3 className={s.etiqueta}>Lo que hace Yesenia</h3>
            {compras.length === 0
              ? <p className={s.vacio}>Todavía nada esta semana. Cuando Yesenia compre o entregue algo, aparece aquí con su fecha y hora.</p>
              : (
                <ol className={s.linea}>
                  {compras.map(c => {
                    const Ico = ICONOS[c.tipo ?? 'otro'] ?? ShoppingCart
                    return (
                      <li key={c.fecha + c.texto}>
                        <span className={s.lineaIcono}><Ico size={20} weight="bold" aria-hidden="true" /></span>
                        <div><p>{c.texto}</p><Momento iso={c.fecha} /></div>
                        {c.monto != null && c.monto > 0 && <b>{pesos(c.monto)}</b>}
                      </li>
                    )
                  })}
                </ol>
              )}
          </div>

          <div className={s.tarjeta}>
            <h3 className={s.etiqueta}>Donaciones recientes</h3>
            {donaciones.length === 0
              ? <p className={s.vacio}><HandHeart size={22} weight="bold" aria-hidden="true" />Aquí aparecerán los últimos aportes. El primero puede ser el tuyo.</p>
              : (
                <ul className={s.linea}>
                  {donaciones.map(d => (
                    <li key={d.fecha + d.monto}>
                      <span className={s.lineaIcono}><HandHeart size={20} weight="bold" aria-hidden="true" /></span>
                      <div><p>{d.consentimiento && d.nombrePublico ? d.nombrePublico : 'Anónimo'}</p><Momento iso={d.fecha} /></div>
                      <b>{pesos(d.monto)}</b>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </div>
        </div>
        {datos.ejemplo && <p className={h.nota}>Datos de ejemplo mientras se conecta el registro real de Yesenia.</p>}
      </div>
    </section>
  )
}

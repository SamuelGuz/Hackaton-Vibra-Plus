'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { Capas, Chip, Icono, estilosHome as h } from '../../home2/Infografia'
import { fotoBanco } from '../../home2/banco'
import { pesos, useProgreso } from '../../home/progreso'
import { lanzarDesde } from '../../efectos/Corazones'
import { useAcciones } from '../../paginas/acciones'
import { DATOS_PAGO, waUrl } from '../../paginas/config'
import { copiarTexto } from '../../paginas/ui'
import Abajo from './Abajo'
import { MONTOS, MONTO_DEFECTO, MONTO_MAX, MONTO_MIN, esMontoFijo } from './monto'
import s from './Aportar.module.css'

// Quick-donate flow for /aportar (also the QR destination). One screen, no forced steps:
// elegir (amount) → pagar (payment details, same page) → gracias. Consent for the wall is
// offered only on "gracias", and is optional. The page never charges or verifies a payment.

type Paso = 'elegir' | 'pagar' | 'gracias'

const miles = (n: number) => new Intl.NumberFormat('es-CO').format(n)
const reducido = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const hayDatosPago = DATOS_PAGO.some(d => !!d.valor)

export default function DonarRapido({ montoInicial }: { montoInicial: number | null }) {
  const inicial = montoInicial ?? MONTO_DEFECTO
  const [paso, setPaso] = useState<Paso>('elegir')
  const [monto, setMonto] = useState(inicial)
  const [otro, setOtro] = useState(!esMontoFijo(inicial))
  const [otroTexto, setOtroTexto] = useState(esMontoFijo(inicial) ? '' : miles(inicial))
  const boton = useRef<HTMLButtonElement>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const primerRender = useRef(true)
  const [barra, setBarra] = useState(false)

  const valido = monto >= MONTO_MIN && monto <= MONTO_MAX

  // On every step change: bring the top section back into view and move focus to the new heading.
  useEffect(() => {
    if (primerRender.current) { primerRender.current = false; return }
    document.getElementById('donar')?.scrollIntoView({ behavior: reducido() ? 'auto' : 'smooth', block: 'start' })
    titulo.current?.focus({ preventScroll: true })
  }, [paso])

  // Mobile bottom bar: appears only after scrolling past the main button, while still choosing.
  useEffect(() => {
    const el = boton.current
    if (!el || paso !== 'elegir' || typeof IntersectionObserver === 'undefined') { setBarra(false); return }
    const io = new IntersectionObserver(([e]) => setBarra(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [paso])

  const elegirFijo = (m: number) => { setOtro(false); setMonto(m) }
  const escribirOtro = (t: string) => {
    const digitos = t.replace(/\D/g, '').slice(0, 8)
    const n = digitos ? Number.parseInt(digitos, 10) : 0
    setOtroTexto(digitos ? miles(n) : '')
    setMonto(n)
  }
  const donar = () => {
    if (!valido) return
    lanzarDesde(boton.current, 4)
    setPaso('pagar')
  }
  const volverArriba = () => {
    document.getElementById('donar')?.scrollIntoView({ behavior: reducido() ? 'auto' : 'smooth', block: 'start' })
    window.setTimeout(() => boton.current?.focus({ preventScroll: true }), reducido() ? 0 : 400)
  }

  return (
    <div className={h.home}>
      <div className={s.ap}>
        <section id="donar" className={`${h.seccion} ${s.tope}`} aria-label="Donar">
          <div className={h.contenedor}>
            {paso === 'gracias' ? (
              <Gracias key="gracias" monto={monto} titulo={titulo} onOtra={() => setPaso('elegir')} />
            ) : (
              <div className={s.topeGrid}>
                <div key={paso} className={s.panel}>
                  {paso === 'elegir' ? (
                    <Elegir
                      monto={monto} valido={valido} otro={otro} otroTexto={otroTexto}
                      onFijo={elegirFijo} onOtro={() => { setOtro(true); setMonto(otroTexto ? Number.parseInt(otroTexto.replace(/\D/g, ''), 10) : 0) }}
                      onEscribir={escribirOtro} onDonar={donar} boton={boton} titulo={titulo}
                    />
                  ) : (
                    <Pagar monto={monto} titulo={titulo} onVolver={() => setPaso('elegir')} onListo={() => setPaso('gracias')} />
                  )}
                </div>
                <Capas slug="perro-sonrisa" palabra="PLATO" className={s.topeFoto} sizes="(min-width: 900px) 42vw, 1px">
                  <Chip className={s.topeChip} icono="corazon">Cada aporte cuenta</Chip>
                </Capas>
              </div>
            )}
          </div>
        </section>

        <Abajo monto={valido ? monto : MONTO_DEFECTO} onDonar={volverArriba} />

        <div className={`${s.barra} ${barra ? s.barraVisible : ''}`} aria-hidden={!barra}>
          <span>{valido ? pesos(monto) : 'Elige un valor'}</span>
          <button type="button" tabIndex={barra ? 0 : -1} onClick={volverArriba}>Donar</button>
        </div>
      </div>
    </div>
  )
}

/* ---------- 1 · elegir ---------- */

function Elegir({ monto, valido, otro, otroTexto, onFijo, onOtro, onEscribir, onDonar, boton, titulo }: {
  monto: number; valido: boolean; otro: boolean; otroTexto: string
  onFijo: (m: number) => void; onOtro: () => void; onEscribir: (t: string) => void; onDonar: () => void
  boton: React.RefObject<HTMLButtonElement | null>; titulo: React.RefObject<HTMLHeadingElement | null>
}) {
  const idOtro = useId()
  const idAyuda = useId()
  const corto = otro && !valido
  return (
    <>
      <h1 ref={titulo} tabIndex={-1} className={`${h.titulo} ${s.h1}`}>Hoy puedes llenar un plato.</h1>
      <p className={s.yesenia}>
        <img {...fotoBanco('rescatista-cachorro', '56px')} alt="" className={s.avatar} decoding="async" />
        <span>Tu aporte le llega directo a <strong>Yesenia</strong>, que cuida a decenas de perros y gatos casi sola.</span>
      </p>

      <MisionMini monto={valido ? monto : 0} />

      <form onSubmit={e => { e.preventDefault(); onDonar() }}>
        <fieldset className={`${h.montos} ${s.montos}`}>
          <legend>¿Cuánto quieres donar?</legend>
          {MONTOS.map(m => (
            <label key={m} className={!otro && monto === m ? h.montoActivo : ''}>
              <input type="radio" name="monto" value={m} checked={!otro && monto === m} onChange={() => onFijo(m)} />
              {pesos(m)}
            </label>
          ))}
          <label className={otro ? h.montoActivo : ''}>
            <input type="radio" name="monto" value="otro" checked={otro} onChange={onOtro} />
            Otro valor
          </label>
        </fieldset>

        {otro && (
          <div className={s.otro}>
            <label htmlFor={idOtro}>Escribe el valor</label>
            <div className={s.otroCampo}>
              <span aria-hidden="true">$</span>
              <input
                id={idOtro} inputMode="numeric" autoComplete="off" enterKeyHint="go" placeholder="15.000"
                value={otroTexto} onChange={e => onEscribir(e.target.value)} aria-describedby={idAyuda} aria-invalid={corto || undefined}
                autoFocus={!otroTexto}
              />
            </div>
            <p id={idAyuda} className={s.otroAyuda}>{corto && otroTexto ? `El mínimo es ${pesos(MONTO_MIN)}.` : `Desde ${pesos(MONTO_MIN)}.`}</p>
          </div>
        )}

        <button ref={boton} type="submit" className={`${h.botonGrande} ${s.donar}`} disabled={!valido}>
          {valido ? `Donar ${pesos(monto)}` : 'Escribe un valor'}
        </button>
      </form>
      <p className={s.micro}>Sin registro y sin datos tuyos. Esta página no cobra: le pagas directo a Yesenia.</p>
    </>
  )
}

/** Week's mission with the real bar from /data/progreso.json and a lighter preview of what this amount adds. */
function MisionMini({ monto }: { monto: number }) {
  const { datos, cargado } = useProgreso()
  const meta = datos.metas[0]
  if (!meta) return null
  const pct = Math.min(100, (meta.recaudado / meta.meta) * 100)
  const conTuyo = Math.min(100, ((meta.recaudado + monto) / meta.meta) * 100)
  const suma = monto > 0 ? Math.max(1, Math.round(conTuyo - pct)) : 0
  return (
    <div className={s.mision}>
      <p className={s.misionCifras}>
        <strong>{pesos(meta.recaudado)}</strong>
        <span>de {pesos(meta.meta)} · {meta.titulo}</span>
      </p>
      <div
        className={s.pista} role="progressbar" aria-label={`Misión de la semana: ${meta.titulo}`}
        aria-valuemin={0} aria-valuemax={meta.meta} aria-valuenow={Math.min(meta.recaudado, meta.meta)} aria-valuetext={`${Math.round(pct)}% de la meta`}
      >
        <div className={s.tuyo} style={{ transform: `scaleX(${cargado ? conTuyo / 100 : 0})` }} />
        <div className={s.relleno} style={{ transform: `scaleX(${cargado ? pct / 100 : 0})` }} />
      </div>
      <p className={s.misionNota}>
        {suma > 0 && <b>Tu aporte: +{suma}%</b>}
        <span>{pct === 0 ? 'Empieza en cero.' : `${Math.round(pct)}% de la meta.`}</span>
        {meta.ejemplo !== false && <em>Meta de ejemplo, por confirmar.</em>}
      </p>
    </div>
  )
}

/* ---------- 2 · pagar ---------- */

function Pagar({ monto, titulo, onVolver, onListo }: {
  monto: number; titulo: React.RefObject<HTMLHeadingElement | null>; onVolver: () => void; onListo: () => void
}) {
  const { datos } = useProgreso()
  const meta = datos.metas[0]
  const mensaje = hayDatosPago
    ? `Hola Yesenia, te envié ${pesos(monto)} para la misión de la semana${meta ? ` (${meta.titulo.toLowerCase()})` : ''}. ¿Me confirmas cuando te llegue?`
    : `Hola Yesenia, quiero donar ${pesos(monto)} para la misión de la semana${meta ? ` (${meta.titulo.toLowerCase()})` : ''}. ¿Me dices cómo te lo envío?`
  const wa = waUrl(mensaje)
  return (
    <>
      <button type="button" className={s.volver} onClick={onVolver}>Cambiar valor</button>
      <h1 ref={titulo} tabIndex={-1} className={`${h.titulo} ${s.h1}`}>Vas a donar <span className={s.valor}>{pesos(monto)}</span></h1>
      <p className={s.pagarLead}>Envíalo directo a Yesenia por uno de estos medios. Toma un minuto.</p>

      <dl className={s.datos}>
        {DATOS_PAGO.map(d => <DatoPago key={d.etiqueta} etiqueta={d.etiqueta} valor={d.valor} />)}
      </dl>
      {!hayDatosPago && (
        <p className={s.aviso}>
          <Icono nombre="chat" />
          <span>Los datos de pago están por confirmar con Yesenia, por eso aún no se pueden copiar. Mientras tanto, escríbele y ella te dice cómo enviarlo.</span>
        </p>
      )}

      <div className={s.acciones}>
        {wa
          ? <a href={wa} target="_blank" rel="noopener noreferrer" className={`${h.botonGrande} ${s.conIcono}`}><Icono nombre="chat" />{hayDatosPago ? 'Avisarle por WhatsApp' : 'Escribirle por WhatsApp'}</a>
          : (
            <div>
              <button type="button" className={`${h.botonGrande} ${s.conIcono}`} disabled><Icono nombre="chat" />Escribirle por WhatsApp</button>
              <p className={s.nota}>El número de WhatsApp de Yesenia está por confirmar, por eso este botón aún no funciona.</p>
            </div>
          )}
        <button type="button" className={h.botonLinea} onClick={onListo}>Ya doné</button>
      </div>
      <p className={s.micro}>Esta página no cobra ni ve tu pago. Cuando Yesenia lo confirme por WhatsApp, la barra de la misión sube.</p>
    </>
  )
}

function DatoPago({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  const [ok, setOk] = useState(false)
  const t = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(t.current), [])
  const copiar = async () => {
    if (!valor || !(await copiarTexto(valor))) return
    setOk(true); window.clearTimeout(t.current); t.current = window.setTimeout(() => setOk(false), 1200)
  }
  return (
    <div className={s.dato}>
      <dt>{etiqueta}</dt>
      <dd className={valor ? '' : s.pendiente}>{valor ?? 'Por confirmar'}</dd>
      <button type="button" className={s.copiar} onClick={copiar} disabled={!valor} aria-label={valor ? `Copiar ${etiqueta}` : `Copiar ${etiqueta}: por confirmar`}>
        <span aria-live="polite">{ok ? 'Copiado ✓' : 'Copiar'}</span>
      </button>
    </div>
  )
}

/* ---------- 3 · gracias ---------- */

function Gracias({ monto, titulo, onOtra }: { monto: number; titulo: React.RefObject<HTMLHeadingElement | null>; onOtra: () => void }) {
  const acciones = useAcciones()
  const corazon = useRef<HTMLSpanElement>(null)
  const [muro, setMuro] = useState(false)
  const [apodo, setApodo] = useState('')
  const [enlace, setEnlace] = useState('')
  const idApodo = useId()

  useEffect(() => {
    setEnlace(`${window.location.origin}/aportar`)
    const t = window.setTimeout(() => lanzarDesde(corazon.current, 6), 250)
    return () => window.clearTimeout(t)
  }, [])

  const textoCompartir = `Esta semana el refugio de Yesenia necesita llenar el plato. Yo ya ayudé, ¿te sumas? ${enlace}`
  const compartir = () => {
    if (typeof navigator.share === 'function') navigator.share({ text: textoCompartir, url: enlace }).catch(() => {})
    else acciones.compartir()
  }
  const mensajeMuro = `Hola Yesenia, doné ${pesos(monto)} para la misión de la semana. Si quieres, ponme en el muro de gente que ayuda como: ${apodo.trim() || 'Alguien'}.`
  const waMuro = waUrl(mensajeMuro)

  return (
    <div className={`${s.panel} ${s.gracias}`}>
      <div className={s.graciasTexto}>
        <h1 ref={titulo} tabIndex={-1} className={`${h.titulo} ${s.h1}`}>
          <span ref={corazon} className={s.corazon} aria-hidden="true"><Icono nombre="corazon" /></span>
          Gracias por llenar un plato.
        </h1>
        <p className={s.pagarLead}>Un plato lleno le cambia el día a alguien en el refugio. No tenías que hacerlo, y lo hiciste.</p>
      </div>

      <Capas slug="rescatista-cachorro" palabra="GRACIAS" className={s.graciasFoto} sizes="(min-width: 900px) 42vw, 92vw" alt="Yesenia carga a un cachorro en el refugio">
        <span className={h.nombreFoto}>Yesenia</span>
      </Capas>

      <div className={s.graciasResto}>
        <h2 className={s.h2}>Qué pasa ahora</h2>
        <ol className={s.ahora}>
          <li><span><Icono nombre="chat" /></span><strong>Yesenia confirma</strong><em>Te responde por WhatsApp cuando le llega.</em></li>
          <li><span><Icono nombre="check" /></span><strong>La barra sube</strong><em>Tu aporte se suma a la misión de la semana.</em></li>
          <li><span><Icono nombre="plato" /></span><strong>Ves la compra</strong><em>Aparece en “Lo último que se compró”.</em></li>
        </ol>

        <h2 className={s.h2}>¿Le cuentas a alguien?</h2>
        <p className={s.pagarLead}>Compartir toma diez segundos y llega a quien sí puede.</p>
        <div className={s.acciones}>
          <button type="button" className={h.botonGrande} onClick={compartir}>Compartir la misión</button>
          <a className={h.botonLinea} href={`https://wa.me/?text=${encodeURIComponent(textoCompartir)}`} target="_blank" rel="noopener noreferrer">Enviar por WhatsApp</a>
        </div>

        <div className={s.muroOpcional}>
          <label className={s.check}>
            <input type="checkbox" checked={muro} onChange={e => setMuro(e.target.checked)} />
            <span><strong>¿Quieres aparecer en el muro?</strong> Es opcional. Si no marcas nada, no se publica nada.</span>
          </label>
          {muro && (
            <div className={s.muroCampos}>
              <label htmlFor={idApodo}>Apodo (opcional)</label>
              <input id={idApodo} value={apodo} maxLength={24} autoComplete="off" onChange={e => setApodo(e.target.value)} placeholder="Alguien" />
              <p className={s.nota}>Solo se publica el apodo que escribas, o “Alguien” si lo dejas vacío. Nunca tu nombre completo, teléfono ni monto. Puedes pedirle a Yesenia que lo quite cuando quieras.</p>
              {waMuro
                ? <a className={h.botonLinea} href={waMuro} target="_blank" rel="noopener noreferrer">Pedirle a Yesenia que me ponga</a>
                : (
                  <>
                    <button type="button" className={h.botonLinea} disabled>Pedirle a Yesenia que me ponga</button>
                    <p className={s.nota}>El número de WhatsApp de Yesenia está por confirmar, por eso este botón aún no funciona.</p>
                  </>
                )}
            </div>
          )}
        </div>

        <div className={s.graciasPie}>
          <button type="button" className={s.volver} onClick={onOtra}>Hacer otro aporte</button>
          <Link href="/" className={s.volver}>Volver al inicio</Link>
        </div>
      </div>
    </div>
  )
}

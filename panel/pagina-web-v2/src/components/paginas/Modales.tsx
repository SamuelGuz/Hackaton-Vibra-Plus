'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { lanzarDesde } from '../efectos/Corazones'
import { AccionesCtx, type Acciones } from './acciones'
import { DATOS_PAGO } from './config'
import { esAunNo, PREGUNTAS, type Animal } from './contenido'
import { Modal, Paso } from './Modal'
import { BotonCopiar, BotonWhatsApp, Boton } from './ui'
import SelectorMonto from './SelectorMonto'
import { fechaCorta, pesos, useProgreso, type Meta } from './progreso'
import s from './Modales.module.css'

/* ------------------------------------------------------------------ */
/* Aportar: #1 elegir monto, #3 consentimiento, #2 como aportar, #4 gracias */
/* ------------------------------------------------------------------ */

type PasoAporte = 'monto' | 'consent' | 'pasos' | 'gracias'
const TITULOS: Record<PasoAporte, string> = {
  monto: 'Elige cuánto',
  consent: '¿Quieres aparecer en el muro?',
  pasos: 'Cómo aportar',
  gracias: 'Gracias',
}

function Gracias({ onCerrar }: { onCerrar: () => void }) {
  const corazon = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const t = window.setTimeout(() => lanzarDesde(corazon.current, 5), 250)
    return () => window.clearTimeout(t)
  }, [])
  return (
    <div className={s.gracias}>
      <svg ref={corazon} className={s.corazonGrande} viewBox="0 0 24 24" width="72" height="72" aria-hidden="true">
        <path fill="#1f5a3a" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <p className={s.fuerte}>Gracias. Yesenia lo confirmará por WhatsApp y lo verás en la página.</p>
      <p>Gracias por no mirar a otro lado.</p>
      <Boton onClick={onCerrar}>Listo</Boton>
    </div>
  )
}

function AportarModal({ abierto, onCerrar, inicial }: { abierto: boolean; onCerrar: () => void; inicial: { monto?: number; metaId?: string; mensual?: boolean } }) {
  const { datos } = useProgreso()
  const [paso, setPaso] = useState<PasoAporte>('monto')
  const [dir, setDir] = useState<1 | -1 | 0>(0)
  const [monto, setMonto] = useState<number | null>(null)
  const [mensual, setMensual] = useState(false)
  const [metaId, setMetaId] = useState<string | undefined>(undefined)
  const [acepta, setAcepta] = useState(false)
  const [apodo, setApodo] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!abierto) return
    setPaso('monto'); setDir(0); setMonto(inicial.monto ?? null); setMensual(inicial.mensual ?? false)
    setMetaId(inicial.metaId); setAcepta(false); setApodo(''); setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  const meta = datos?.metas.find(m => m.id === metaId) ?? datos?.metas[0]
  const ir = (p: PasoAporte, d: 1 | -1) => { setDir(d); setPaso(p) }

  const mensaje = useMemo(() => {
    let t = 'Hola Yesenia, quiero aportar a la misión de la semana.'
    if (monto) t += ` Monto: ${pesos(monto)}${mensual ? ' cada mes' : ''}.`
    if (meta) t += ` Meta: ${meta.titulo}.`
    t += acepta ? ` Mi apodo en el muro de gente que ayuda: ${apodo.trim() || 'Alguien'}.` : ' Prefiero no aparecer en el muro.'
    return t
  }, [monto, mensual, meta, acepta, apodo])

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={TITULOS[paso]}>
      {paso === 'monto' && (
        <Paso key="monto" dir={dir}>
          <p>Estas metas son de ejemplo, por confirmar con Yesenia. Elige un valor y mira en qué se convierte.</p>
          {datos && datos.metas.length > 1 && (
            <div className={s.campo}>
              <label htmlFor="ap-meta">Para qué meta</label>
              <select id="ap-meta" value={meta?.id} onChange={e => setMetaId(e.target.value)}>
                {datos.metas.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}
              </select>
            </div>
          )}
          <SelectorMonto monto={monto} onMonto={n => { setMonto(n); setError('') }} mensual={mensual} onMensual={setMensual} meta={meta} datos={datos} />
          {error && <p className={s.error} role="alert">{error}</p>}
          <div className={s.botones}>
            <Boton onClick={() => { if (!monto || monto < 1000) { setError('Elige un valor de al menos $1.000.'); return } ir('consent', 1) }}>Continuar</Boton>
            <Boton variante="texto" onClick={onCerrar}>Ahora no</Boton>
          </div>
        </Paso>
      )}

      {paso === 'consent' && (
        <Paso key="consent" dir={dir}>
          <label className={s.check}>
            <input type="checkbox" checked={acepta} onChange={e => setAcepta(e.target.checked)} />
            <span>Quiero que mi apodo aparezca en el muro de gente que ayuda.</span>
          </label>
          <div className={`${s.desliza} ${acepta ? s.abierto : ''}`} aria-hidden={!acepta}>
            <div>
              <div className={s.campo}>
                <label htmlFor="ap-apodo">Apodo (opcional)</label>
                <input id="ap-apodo" value={apodo} maxLength={24} onChange={e => setApodo(e.target.value)} tabIndex={acepta ? 0 : -1} autoComplete="off" />
              </div>
            </div>
          </div>
          <p className={s.pequeno}>Solo se publica el apodo que escribas, o &quot;Alguien&quot; si lo dejas vacío. No publicamos tu nombre completo, teléfono ni monto. Puedes pedirle a Yesenia que lo quite cuando quieras. Si la casilla queda sin marcar, no se publica nada.</p>
          <div className={s.botones}>
            <Boton onClick={() => ir('pasos', 1)}>Guardar y continuar</Boton>
            <Boton variante="texto" onClick={() => { setAcepta(false); ir('pasos', 1) }}>Prefiero no aparecer</Boton>
            <Boton variante="texto" onClick={() => ir('monto', -1)}>Atrás</Boton>
          </div>
        </Paso>
      )}

      {paso === 'pasos' && (
        <Paso key="pasos" dir={dir}>
          <p>Esta página no cobra. Tu aporte lo recibe Yesenia directamente. Los canales de pago están por confirmar, así que por ahora el camino es escribirle.</p>
          <dl className={s.datos}>
            {DATOS_PAGO.map(d => (
              <div key={d.etiqueta}>
                <dt>{d.etiqueta}</dt>
                <dd>{d.valor ?? 'Por confirmar'}{d.valor && <BotonCopiar texto={d.valor} />}</dd>
              </div>
            ))}
          </dl>
          <p className={s.mensaje}>{mensaje}</p>
          <div className={s.botones}>
            <BotonWhatsApp texto={mensaje}>Escribir a Yesenia para aportar</BotonWhatsApp>
            <BotonCopiar texto={mensaje} etiqueta="Copiar mensaje" />
          </div>
          <div className={s.botones}>
            <Boton variante="texto" onClick={() => ir('gracias', 1)}>Ya le escribí</Boton>
            <Boton variante="texto" onClick={() => ir('consent', -1)}>Atrás</Boton>
          </div>
        </Paso>
      )}

      {paso === 'gracias' && <Paso key="gracias" dir={dir}><Gracias onCerrar={onCerrar} /></Paso>}
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Compartir (#5)                                                      */
/* ------------------------------------------------------------------ */

function CompartirModal({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [texto, setTexto] = useState('')
  const [enlace, setEnlace] = useState('')
  const [nativo, setNativo] = useState(false)
  useEffect(() => {
    if (!abierto) return
    const url = `${window.location.origin}/aportar`
    setEnlace(url)
    setTexto(`Esta semana el refugio de Yesenia necesita completar la misión. Si puedes, ayuda: ${url}`)
    setNativo(typeof navigator.share === 'function')
  }, [abierto])
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Compartir esta misión">
      <Paso>
        <p>Compartir toma diez segundos y llega a quien sí puede. Puedes editar el texto antes de enviarlo. No usamos rastreo.</p>
        <div className={s.campo}>
          <label htmlFor="co-texto">Mensaje</label>
          <textarea id="co-texto" rows={4} value={texto} onChange={e => setTexto(e.target.value)} />
        </div>
        <div className={s.botones}>
          <Boton href={`https://wa.me/?text=${encodeURIComponent(texto)}`}>WhatsApp</Boton>
          <BotonCopiar texto={enlace || texto} etiqueta="Copiar enlace" onCopiado={el => lanzarDesde(el, 3)} />
          {nativo && <Boton variante="claro" onClick={() => { navigator.share({ text: texto, url: enlace }).catch(() => {}) }}>Más opciones</Boton>}
        </div>
        <div className={s.botones}><Boton variante="texto" onClick={onCerrar}>Cerrar</Boton></div>
      </Paso>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Detalle de meta (#6)                                                */
/* ------------------------------------------------------------------ */

function MetaModal({ abierto, meta, onCerrar, onAportar }: { abierto: boolean; meta: Meta | null; onCerrar: () => void; onAportar: (id: string) => void }) {
  const { datos } = useProgreso()
  if (!meta) return null
  const compras = (datos?.compras ?? []).filter(c => !c.metaId || c.metaId === meta.id)
  const falta = Math.max(0, meta.meta - meta.recaudado)
  const ejemplo = meta.ejemplo ?? datos?.ejemplo ?? true
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={meta.titulo}>
      <Paso>
        <p>{meta.detalle}</p>
        {ejemplo && <p className={s.rotulo}>Meta de ejemplo, por confirmar con Yesenia.</p>}
        <dl className={s.datos}>
          <div><dt>Llevan</dt><dd>{pesos(meta.recaudado)}</dd></div>
          <div><dt>Meta</dt><dd>{pesos(meta.meta)}</dd></div>
          <div><dt>Falta</dt><dd>{pesos(falta)}</dd></div>
        </dl>
        <h3 className={s.sub}>Qué se compró ya</h3>
        {compras.length === 0
          ? <p>Todavía nada. Cuando Yesenia confirme una compra, aparece aquí.</p>
          : <ul className={s.lista}>{compras.slice(0, 5).map((c, i) => <li key={c.id ?? c.fecha + c.texto} style={{ animationDelay: `${i * 60}ms` }}><time>{fechaCorta(c.fecha)}</time> {c.texto}</li>)}</ul>}
        <div className={s.botones}>
          <Boton onClick={() => onAportar(meta.id)}>Aportar a esta meta</Boton>
          <Boton variante="texto" onClick={onCerrar}>Cerrar</Boton>
        </div>
      </Paso>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Adopcion responsable (#7)                                           */
/* ------------------------------------------------------------------ */

const CLAVE_GUARDADOS = 'huellitas:guardados'
export function leerGuardados(): string[] {
  try { const g = localStorage.getItem(CLAVE_GUARDADOS); const a = g ? JSON.parse(g) : []; return Array.isArray(a) ? a.filter(x => typeof x === 'string') : [] } catch { return [] }
}
export function escribirGuardados(ids: string[]) {
  try { localStorage.setItem(CLAVE_GUARDADOS, JSON.stringify(ids)) } catch { /* sin almacenamiento */ }
}

function AdopcionModal({ abierto, animal, onCerrar, acciones }: { abierto: boolean; animal: Animal | null; onCerrar: () => void; acciones: Acciones }) {
  const [paso, setPaso] = useState(0)
  const [dir, setDir] = useState<1 | -1 | 0>(0)
  const [resp, setResp] = useState<string[]>(['', '', '', ''])
  useEffect(() => { if (abierto) { setPaso(0); setDir(0); setResp(['', '', '', '']) } }, [abierto])
  const fin = paso >= PREGUNTAS.length
  const algunAunNo = resp.some(esAunNo)
  const quien = animal ? animal.titulo : 'quienes esperan hogar'
  const mensaje = `Hola Yesenia, quiero conocer a ${quien}. Mis respuestas: ${PREGUNTAS.map((p, i) => `${p.clave}: ${resp[i] || 'sin responder'}`).join('. ')}.`

  const mover = (a: number, d: 1 | -1) => { setDir(d); setPaso(a) }
  const q = PREGUNTAS[Math.min(paso, PREGUNTAS.length - 1)]

  const guardar = (el: HTMLElement) => {
    if (animal) { const g = leerGuardados(); if (!g.includes(animal.id)) escribirGuardados([...g, animal.id]) }
    acciones.avisar('Guardado. Se queda solo en este navegador.')
    lanzarDesde(el, 3)
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={fin ? 'Tu resumen' : animal ? `Conocer a ${animal.titulo}` : 'Cuatro preguntas antes de escribir'}>
      {!fin ? (
        <Paso key={paso} dir={dir}>
          <ol className={s.puntos} aria-label={`Pregunta ${paso + 1} de ${PREGUNTAS.length}`}>
            {PREGUNTAS.map((p, i) => <li key={p.clave} className={i === paso ? s.puntoActual : i < paso ? s.puntoHecho : ''} />)}
          </ol>
          <fieldset className={s.pregunta}>
            <legend>{q.texto}</legend>
            {q.opciones.map(o => (
              <label key={o} className={s.opcion}>
                <input type="radio" name={`pq-${paso}`} checked={resp[paso] === o} onChange={() => setResp(r => r.map((x, i) => (i === paso ? o : x)))} />
                <span>{o}</span>
              </label>
            ))}
          </fieldset>
          <p className={s.pequeno}>No es un examen. Sirve para que el animal llegue a un lugar donde pueda quedarse.</p>
          <div className={s.botones}>
            <Boton disabled={!resp[paso]} onClick={() => mover(paso + 1, 1)}>{paso === PREGUNTAS.length - 1 ? 'Ver resumen' : 'Siguiente'}</Boton>
            {paso > 0 && <Boton variante="texto" onClick={() => mover(paso - 1, -1)}>Atrás</Boton>}
            <Boton variante="texto" onClick={onCerrar}>Seguir mirando</Boton>
          </div>
        </Paso>
      ) : (
        <Paso key="fin" dir={dir}>
          <dl className={s.datos}>
            {PREGUNTAS.map((p, i) => <div key={p.clave}><dt>{p.clave}</dt><dd>{resp[i]}</dd></div>)}
          </dl>
          <p>Gracias. Esto sirve para que Yesenia te conozca antes de escribirte. No decide nada por sí solo.</p>
          {algunAunNo && <p>Si alguna respuesta es &quot;aún no&quot;, no pasa nada: nadie te rechaza. Puedes guardar este animal para después o ayudar mientras tanto.</p>}
          <p className={s.pequeno}>Yesenia responde cuando puede. Trabaja casi sola, así que a veces tarda. Es normal.</p>
          <div className={s.botones}>
            <BotonWhatsApp texto={mensaje}>Escribir a Yesenia por WhatsApp</BotonWhatsApp>
          </div>
          <div className={s.botones}>
            {algunAunNo && <Boton variante="claro" onClick={e => guardar(e.currentTarget)}>Guardar para después</Boton>}
            {algunAunNo && <Boton variante="claro" href="/aportar" onClick={onCerrar}>Ayudar mientras tanto</Boton>}
            <Boton variante="texto" onClick={() => mover(0, -1)}>Cambiar respuestas</Boton>
          </div>
        </Paso>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Aviso tipo popover (#8)                                             */
/* ------------------------------------------------------------------ */

function Aviso({ texto, id }: { texto: string | null; id: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!texto) return
    setVisible(true)
    const cerrar = () => setVisible(false)
    const t = window.setTimeout(cerrar, 2500)
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar() }
    document.addEventListener('keydown', tecla)
    return () => { window.clearTimeout(t); document.removeEventListener('keydown', tecla) }
  }, [texto, id])
  return <div className={s.avisoCaja} role="status" aria-live="polite">{visible && texto && <p key={id} className={s.aviso}>{texto}</p>}</div>
}

/* ------------------------------------------------------------------ */
/* Proveedor                                                           */
/* ------------------------------------------------------------------ */

export function AccionesProvider({ children }: { children: ReactNode }) {
  const [aporte, setAporte] = useState<{ abierto: boolean; monto?: number; metaId?: string; mensual?: boolean }>({ abierto: false })
  const [comp, setComp] = useState(false)
  const [det, setDet] = useState<{ abierto: boolean; meta: Meta | null }>({ abierto: false, meta: null })
  const [adop, setAdop] = useState<{ abierto: boolean; animal: Animal | null }>({ abierto: false, animal: null })
  const [aviso, setAviso] = useState<{ texto: string | null; id: number }>({ texto: null, id: 0 })

  const acciones = useMemo<Acciones>(() => ({
    aportar: (o) => setAporte({ abierto: true, monto: o?.monto, metaId: o?.metaId, mensual: o?.mensual }),
    compartir: () => setComp(true),
    detalleMeta: (meta) => setDet({ abierto: true, meta }),
    adoptar: (animal) => setAdop({ abierto: true, animal }),
    avisar: (texto) => setAviso(a => ({ texto, id: a.id + 1 })),
  }), [])

  const cerrarAporte = useCallback(() => setAporte(a => ({ ...a, abierto: false })), [])
  return (
    <AccionesCtx.Provider value={acciones}>
      {children}
      <AportarModal abierto={aporte.abierto} onCerrar={cerrarAporte} inicial={aporte} />
      <CompartirModal abierto={comp} onCerrar={() => setComp(false)} />
      <MetaModal
        abierto={det.abierto}
        meta={det.meta}
        onCerrar={() => setDet(d => ({ ...d, abierto: false }))}
        onAportar={id => { setDet(d => ({ ...d, abierto: false })); window.setTimeout(() => setAporte({ abierto: true, metaId: id }), 180) }}
      />
      <AdopcionModal abierto={adop.abierto} animal={adop.animal} onCerrar={() => setAdop(a => ({ ...a, abierto: false }))} acciones={acciones} />
      <Aviso texto={aviso.texto} id={aviso.id} />
    </AccionesCtx.Provider>
  )
}


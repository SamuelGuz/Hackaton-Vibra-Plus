'use client'

import { useId, useState } from 'react'
import { MONTOS } from './contenido'
import { BarraMeta } from './Mision'
import { pesos, porcentaje, type Meta, type Progreso } from './progreso'
import s from './Mision.module.css'

interface Props {
  monto: number | null
  onMonto: (n: number | null) => void
  mensual: boolean
  onMensual: (v: boolean) => void
  meta?: Meta
  datos?: Progreso | null
}

/** Chips de monto + "esto compra..." (ejemplo, por confirmar) + barra mini que muestra cuanto moverias la mision. */
export default function SelectorMonto({ monto, onMonto, mensual, onMensual, meta, datos }: Props) {
  const grupo = useId()
  const [otro, setOtro] = useState(false)
  const [texto, setTexto] = useState('')
  const preset = MONTOS.find(m => m.valor === monto)

  const elegirOtro = (v: string) => {
    const limpio = v.replace(/\D/g, '').slice(0, 9)
    setTexto(limpio)
    onMonto(limpio ? Number(limpio) : null)
  }

  return (
    <div className={s.sel}>
      <fieldset className={s.chips}>
        <legend className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Elige un monto</legend>
        {MONTOS.map(m => (
          <label key={m.valor} className={s.chip}>
            <input type="radio" name={grupo} checked={!otro && monto === m.valor} onChange={() => { setOtro(false); onMonto(m.valor) }} />
            <span>{pesos(m.valor)}</span>
          </label>
        ))}
        <label className={s.chip}>
          <input type="radio" name={grupo} checked={otro} onChange={() => { setOtro(true); onMonto(texto ? Number(texto) : null) }} />
          <span>Otro valor</span>
        </label>
      </fieldset>

      {otro && (
        <div className={s.otro}>
          <label htmlFor={grupo + '-otro'}>Valor en pesos</label>
          <input id={grupo + '-otro'} inputMode="numeric" autoComplete="off" placeholder="$ 0" value={texto ? new Intl.NumberFormat('es-CO').format(Number(texto)) : ''} onChange={e => elegirOtro(e.target.value)} />
        </div>
      )}

      <p className={s.compra} aria-live="polite">
        {monto ? (
          <span key={monto}>
            <strong>{pesos(monto)}</strong>
            <em>
              {preset ? `${preset.compra[0].toUpperCase()}${preset.compra.slice(1)} (equivalencia por confirmar).` : 'Cada aporte cuenta. Qué compra, lo define Yesenia (por confirmar).'}
            </em>
          </span>
        ) : (
          'Elige un monto para ver en qué se convierte.'
        )}
      </p>

      {meta && datos && monto != null && monto > 0 && (
        <div className={s.minibarra}>
          <BarraMeta meta={meta} datos={datos} previa={monto} conDetalle={false} />
          <p>Vista previa: la barra pasaría de {porcentaje(meta)}% a {Math.min(100, Math.floor(((meta.recaudado + monto) / meta.meta) * 100))}%. Se mueve de verdad cuando Yesenia confirme tu aporte.</p>
        </div>
      )}

      <label className={s.mensual}>
        <input type="checkbox" checked={mensual} onChange={e => onMensual(e.target.checked)} />
        <span>Aportar cada mes. Si puedes, un aporte pequeño cada mes le da certeza de la comida. El canal recurrente está por confirmar.</span>
      </label>
    </div>
  )
}

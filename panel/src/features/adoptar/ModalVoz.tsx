import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useLlamada, type Fase } from './useLlamada'
import styles from './ModalVoz.module.css'

const ENFOCABLES = 'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

const ESTADO: Record<Fase, string> = {
  quieta: 'Toca el micrófono y cuéntame qué compañero buscas.',
  escuchando: 'Te escucho…',
  pensando: 'Pensando la mejor respuesta…',
  hablando: 'Huellitas está hablando. Toca el micrófono si quieres interrumpir.',
}

function Microfono() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5c-1.7 0-3 1.3-3 3v5.2c0 1.7 1.3 3 3 3s3-1.3 3-3V6.5c0-1.7-1.3-3-3-3z" />
      <path d="M5.5 11.4c0 3.6 2.7 6.3 6.5 6.3s6.5-2.7 6.5-6.3M12 17.8v3M8.6 20.8h6.8" />
    </svg>
  )
}

interface Props {
  onCerrar: () => void
  perroId?: string
}

/** Llamada con el agente de voz: el navegador escucha, el agente responde y se lee en voz alta. */
export function ModalVoz({ onCerrar, perroId }: Props) {
  const llamada = useLlamada(perroId)
  const { mensajes, fase, error, silenciado, enLlamada, soloTexto, perritos, accion } = llamada
  const dialogo = useRef<HTMLDivElement>(null)
  const idTitulo = useId()
  const [escrito, setEscrito] = useState('')

  // Foco dentro del diálogo al abrir, y de vuelta al botón que lo abrió al cerrar
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogo.current?.querySelector<HTMLElement>(ENFOCABLES)?.focus()
    return () => {
      document.body.style.overflow = overflow
      previo?.focus?.()
    }
  }, [])

  // Lo último de la conversación siempre a la vista
  const lista = useRef<HTMLOListElement>(null)
  useEffect(() => {
    lista.current?.scrollTo?.({ top: lista.current.scrollHeight })
  }, [mensajes])

  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onCerrar()
      return
    }
    if (e.key !== 'Tab' || !dialogo.current) return
    const items = Array.from(dialogo.current.querySelectorAll<HTMLElement>(ENFOCABLES))
    if (items.length === 0) return
    const primero = items[0]
    const ultimo = items[items.length - 1]
    const activo = document.activeElement
    if (e.shiftKey && (activo === primero || !dialogo.current.contains(activo))) {
      e.preventDefault()
      ultimo.focus()
    } else if (!e.shiftKey && (activo === ultimo || !dialogo.current.contains(activo))) {
      e.preventDefault()
      primero.focus()
    }
  }

  function enviarEscrito(e: FormEvent) {
    e.preventDefault()
    const texto = escrito.trim()
    if (!texto || fase === 'pensando') return
    setEscrito('')
    void llamada.enviar(texto)
  }

  const etiquetaMic =
    fase === 'escuchando'
      ? 'Te estoy escuchando. Toca para enviar lo que dijiste'
      : fase === 'hablando'
        ? 'Interrumpir y hablar'
        : fase === 'pensando'
          ? 'Pensando'
          : 'Tocar para hablar con el agente'

  return (
    <div
      className={styles.fondo}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div
        ref={dialogo}
        className={styles.dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onKeyDown={alTeclear}
      >
        <header className={styles.cabecera}>
          <h2 id={idTitulo} className={styles.titulo}>
            Agente de Voz de Huellitas
          </h2>
          <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        <p className={styles.estado} role="status">
          {enLlamada && fase === 'quieta' ? 'Llamada en curso. Toca el micrófono para hablar.' : ESTADO[fase]}
        </p>

        <ol ref={lista} className={styles.conversacion} aria-label="Conversación con el agente">
          {mensajes.length === 0 && (
            <li className={styles.vacio}>Hola, soy la voz de Huellitas. Cuéntame cómo es tu casa y buscamos a tu compañero ideal.</li>
          )}
          {mensajes.map((m) => (
            <li key={m.id} className={m.rol === 'tu' ? styles.tu : styles.agente}>
              <span className={styles.quien}>{m.rol === 'tu' ? 'Tú' : 'Huellitas'}</span>
              {m.texto}
            </li>
          ))}
        </ol>

        {perritos.length > 0 && (
          <ul className={styles.mencionados} aria-label="Perritos de los que hablamos">
            {perritos.map((p) => (
              <li key={p.id}>
                {p.nombre} · {p.edadTexto}
              </li>
            ))}
          </ul>
        )}

        {accion === 'visita_agendada' && (
          <p className={styles.exito} role="status">
            ¡Quedó agendada tu visita! El equipo de Huellitas te escribirá para confirmarla.
          </p>
        )}
        {accion === 'padrinazgo' && (
          <p className={styles.exito} role="status">
            ¡Gracias por querer apadrinar! Con tu ayuda cuidamos a quienes aún esperan hogar.
          </p>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {soloTexto ? (
          <form className={styles.escribir} onSubmit={enviarEscrito}>
            <p className={styles.aviso}>
              Este navegador no permite hablar por micrófono (pasa en Firefox, por ejemplo). Escríbele al agente y te
              responderá igual; en Chrome, Edge o Safari puedes llamarlo con tu voz.
            </p>
            <label htmlFor={`${idTitulo}-texto`} className={styles.etiqueta}>
              Tu mensaje
            </label>
            <div className={styles.fila}>
              <input
                id={`${idTitulo}-texto`}
                className={styles.campo}
                value={escrito}
                onChange={(e) => setEscrito(e.target.value)}
                placeholder="Ej.: vivo en apartamento y busco un perro tranquilo"
                autoComplete="off"
              />
              <button type="submit" className={styles.enviar} disabled={fase === 'pensando' || !escrito.trim()}>
                Enviar
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.controles}>
            <button
              type="button"
              className={`${styles.mic} ${fase === 'escuchando' ? styles.escuchando : ''}`}
              onClick={llamada.tocarMicrofono}
              disabled={fase === 'pensando'}
              aria-label={etiquetaMic}
            >
              <Microfono />
            </button>
          </div>
        )}

        <div className={styles.acciones}>
          <button
            type="button"
            className={styles.secundario}
            onClick={llamada.alternarSilencio}
            aria-pressed={silenciado}
          >
            {silenciado ? '🔇 Sin sonido' : '🔊 Con sonido'}
          </button>
          {enLlamada && (
            <button type="button" className={styles.colgar} onClick={llamada.colgar}>
              Colgar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

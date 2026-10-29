// Botón flotante para chatear con el agente de adopciones y donaciones, que vive en el WhatsApp del refugio.
// Abre el chat con "Hola" ya escrito: el agente responde con el menú (adoptar, donar, saber más).
import s from './ChatAgente.module.css'

/** Solo dígitos con indicativo; se fija al compilar con NEXT_PUBLIC_WA_AGENTE */
const NUMERO = (process.env.NEXT_PUBLIC_WA_AGENTE ?? '').replace(/\D/g, '')

export default function ChatAgente() {
  if (!NUMERO) return null
  const url = `https://wa.me/${NUMERO}?text=${encodeURIComponent('Hola')}`
  return (
    <a className={s.boton} href={url} target="_blank" rel="noopener noreferrer" aria-label="Chatear por WhatsApp con el asistente de adopciones y donaciones">
      <svg viewBox="0 0 32 32" aria-hidden="true" className={s.icono}>
        <path fill="currentColor" d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.5.7 4.8 2 6.8L3.2 29l6.8-2.1c1.9 1 4 1.6 6.1 1.6 7 0 12.7-5.7 12.7-12.7S23 3 16 3Zm0 23.2c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4 1.2 1.3-3.9-.3-.4a10.4 10.4 0 0 1-1.6-5.7C5.6 9.9 10.3 5.3 16 5.3s10.4 4.6 10.4 10.3S21.7 26.2 16 26.2Zm5.7-7.7c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.5 8.5 0 0 1-4.2-3.7c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1 2.9 1.2 3.1c.2.2 2 3.1 4.9 4.3 1.8.8 2.5.8 3.4.7.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4l-.6-.3Z" />
      </svg>
      <span className={s.texto}>Chatea con nosotros</span>
    </a>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { ErrorPublico, hablarConAgente } from './api'
import type { PerritoMencionado, RespuestaAgenteVoz } from './tipos'
import { callar, crearReconocimiento, hablar, hayReconocimiento, type Reconocimiento } from './voz'

export type Fase = 'quieta' | 'escuchando' | 'pensando' | 'hablando'

export interface Mensaje {
  id: number
  rol: 'tu' | 'agente'
  texto: string
}

function mensajeDeError(e: unknown): string {
  if (e instanceof ErrorPublico) {
    if (e.estado === 429) return 'Hay muchas personas llamando ahora mismo. Espera un minuto y vuelve a intentarlo.'
    if (e.estado === 0) return 'No pude conectarme con Huellitas. Revisa tu internet e inténtalo de nuevo.'
    if (e.estado >= 400 && e.estado < 500 && e.message) return e.message
  }
  return 'Algo salió mal al hablar con el agente. Inténtalo de nuevo en un momento.'
}

/** Lógica de la "llamada": escucha, manda el texto al agente, lo lee en voz alta y vuelve a escuchar. */
export function useLlamada(perroId?: string) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [fase, setFaseEstado] = useState<Fase>('quieta')
  const [error, setError] = useState<string | null>(null)
  const [silenciado, setSilenciado] = useState(false)
  const [enLlamada, setEnLlamada] = useState(false)
  const [soloTexto, setSoloTexto] = useState(() => !hayReconocimiento())
  const [perritos, setPerritos] = useState<PerritoMencionado[]>([])
  const [accion, setAccion] = useState<RespuestaAgenteVoz['accion']>('ninguna')

  const faseRef = useRef<Fase>('quieta')
  const vivo = useRef(true)
  const llamada = useRef(false)
  const silencio = useRef(false)
  const reconocimiento = useRef<Reconocimiento | null>(null)
  const pedido = useRef<AbortController | null>(null)
  const sesionId = useRef<string | undefined>(undefined)
  const contador = useRef(0)

  const poner = useCallback((f: Fase) => {
    faseRef.current = f
    setFaseEstado(f)
  }, [])

  const agregar = useCallback((rol: Mensaje['rol'], texto: string) => {
    contador.current += 1
    const id = contador.current
    setMensajes((m) => [...m, { id, rol, texto }])
  }, [])

  const soltarReconocimiento = useCallback(() => {
    const r = reconocimiento.current
    reconocimiento.current = null
    if (r) {
      r.onresult = r.onerror = r.onend = null
      try {
        r.abort()
      } catch {
        // ya estaba detenido
      }
    }
  }, [])

  const escucharRef = useRef<() => void>(() => {})

  const enviar = useCallback(
    async (texto: string) => {
      const limpio = texto.trim()
      if (!limpio) return
      callar()
      soltarReconocimiento()
      pedido.current?.abort()
      const control = new AbortController()
      pedido.current = control
      setError(null)
      agregar('tu', limpio)
      poner('pensando')
      try {
        const r = await hablarConAgente({ texto: limpio, sesionId: sesionId.current, perroId }, control.signal)
        if (control.signal.aborted || !vivo.current) return
        sesionId.current = r.sesionId
        agregar('agente', r.respuesta)
        setPerritos(r.perritos ?? [])
        setAccion(r.accion ?? 'ninguna')
        const seguir = () => {
          if (!vivo.current) return
          poner('quieta')
          if (llamada.current) escucharRef.current()
        }
        if (silencio.current) {
          seguir()
        } else {
          poner('hablando')
          hablar(r.guionVoz || r.respuesta, seguir)
        }
      } catch (e) {
        if (control.signal.aborted || !vivo.current) return
        poner('quieta')
        setError(mensajeDeError(e))
      }
    },
    [agregar, perroId, poner, soltarReconocimiento],
  )

  const escuchar = useCallback(() => {
    callar()
    soltarReconocimiento()
    const r = crearReconocimiento()
    if (!r) {
      setSoloTexto(true)
      return
    }
    setError(null)
    let recibido = false
    r.onresult = (e) => {
      recibido = true
      const texto = e.results[0]?.[0]?.transcript?.trim()
      if (texto) void enviar(texto)
      else {
        poner('quieta')
        setError('No alcancé a escucharte. Toca el micrófono y cuéntame otra vez.')
      }
    }
    r.onerror = (e) => {
      recibido = true
      if (e.error === 'aborted') return
      poner('quieta')
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        llamada.current = false
        setEnLlamada(false)
        setSoloTexto(true)
        setError('No pude usar tu micrófono. Revisa el permiso del navegador o escríbele al agente aquí abajo.')
      } else if (e.error === 'no-speech') {
        setError('No te escuché. Toca el micrófono y háblame cuando quieras.')
      } else {
        setError('Se cortó la escucha. Toca el micrófono para intentarlo otra vez.')
      }
    }
    r.onend = () => {
      if (reconocimiento.current !== r) return
      reconocimiento.current = null
      if (!recibido && faseRef.current === 'escuchando') poner('quieta')
    }
    reconocimiento.current = r
    poner('escuchando')
    try {
      r.start()
    } catch {
      reconocimiento.current = null
      poner('quieta')
      setError('No pude abrir el micrófono. Inténtalo otra vez.')
    }
  }, [enviar, poner, soltarReconocimiento])
  escucharRef.current = escuchar

  /** Botón del micrófono: empieza la llamada, o corta lo que dice el agente, o termina de escuchar */
  const tocarMicrofono = useCallback(() => {
    if (faseRef.current === 'pensando') return
    if (faseRef.current === 'escuchando') {
      reconocimiento.current?.stop()
      return
    }
    llamada.current = true
    setEnLlamada(true)
    escuchar()
  }, [escuchar])

  const colgar = useCallback(() => {
    llamada.current = false
    setEnLlamada(false)
    soltarReconocimiento()
    pedido.current?.abort()
    callar()
    poner('quieta')
    setError(null)
  }, [poner, soltarReconocimiento])

  const alternarSilencio = useCallback(() => {
    const ahora = !silencio.current
    silencio.current = ahora
    setSilenciado(ahora)
    if (ahora && faseRef.current === 'hablando') {
      callar()
      poner('quieta')
      if (llamada.current) escucharRef.current()
    }
  }, [poner])

  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
      llamada.current = false
      soltarReconocimiento()
      pedido.current?.abort()
      callar()
    }
  }, [soltarReconocimiento])

  return {
    mensajes,
    fase,
    error,
    silenciado,
    enLlamada,
    soloTexto,
    perritos,
    accion,
    enviar,
    tocarMicrofono,
    colgar,
    alternarSilencio,
  }
}

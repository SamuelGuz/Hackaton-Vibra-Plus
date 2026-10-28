// Punto único de acceso a los datos del albergue. Dos modos, y las pantallas no notan la diferencia:
// - demo: datos en memoria (sin servidor, o con ?demo=1)
// - servidor: /api/hoy del bot, cada toque va a una cola en el celular y se manda cuando hay señal
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { PantallaAviso } from '../app/PantallaAviso'
import { ErrorApi, mandar, olvidarToken, pedirHoy, tomarToken, urlApi, type DatosServidor, type Envio } from './api'
import { crearCola, type Cola } from './cola'
import { crearDatosDemo } from './demo'
import type { DatosAlbergue } from './tipos'

interface ContextoDatos {
  datos: DatosAlbergue
  /** Aplica un cambio a los datos en pantalla, al instante */
  cambiar: (fn: (d: DatosAlbergue) => DatosAlbergue) => void
  /** Manda un cambio al servidor (en modo demo no hace nada) */
  enviar: (e: Envio) => void
  modo: 'demo' | 'servidor'
  /** Id de la persona del enlace (solo en modo servidor) */
  yo: string | null
  /** Cambios guardados en el celular que todavía no llegan al servidor */
  pendientes: number
  /** Algo que el servidor no aceptó */
  problema: string | null
  /** Token del enlace, para las pantallas que hablan directo con el servidor (Equipo) */
  token: string | null
  /** Gente que le escribió al bot sin estar en el equipo (solo para la administradora) */
  solicitudesEquipo: number
}

const Contexto = createContext<ContextoDatos | null>(null)
const RECARGAR_CADA_MS = 20_000
const CLAVE_COPIA = 'huellitas.ultimoHoy'

function ProveedorDemo({ children }: { children: React.ReactNode }) {
  const [datos, setDatos] = useState<DatosAlbergue>(() => crearDatosDemo())
  const valor: ContextoDatos = {
    datos,
    cambiar: setDatos,
    enviar: () => {},
    modo: 'demo',
    yo: null,
    pendientes: 0,
    problema: null,
    token: null,
    solicitudesEquipo: 0,
  }
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

function leerCopia(): DatosServidor | null {
  try {
    const texto = localStorage.getItem(CLAVE_COPIA)
    return texto ? (JSON.parse(texto) as DatosServidor) : null
  } catch {
    return null
  }
}

function guardarCopia(d: DatosServidor) {
  try {
    localStorage.setItem(CLAVE_COPIA, JSON.stringify(d))
  } catch {
    // Sin espacio: la próxima vez abre sin la copia
  }
}

function ProveedorServidor({ token, children }: { token: string; children: React.ReactNode }) {
  const [datos, setDatos] = useState<DatosServidor | null>(leerCopia)
  const [fase, setFase] = useState<'cargando' | 'listo' | 'sin_sesion' | 'sin_datos'>(() =>
    leerCopia() ? 'listo' : 'cargando',
  )
  const [pendientes, setPendientes] = useState(0)
  const [problema, setProblema] = useState<string | null>(null)
  // Una sola cola mientras viva la pestaña. No se cierra al desmontar: en desarrollo React monta
  // todo dos veces, y cerrar la base mientras se abre deja la libreta trabada en "Abriendo…".
  const [cola] = useState<Cola>(() =>
    crearCola({
      enviar: (e) => mandar(token, e),
      alRechazar: (m) => setProblema(`El servidor no aceptó un registro: ${m}`),
    }),
  )
  const nPendientes = useRef(0)

  const contar = useCallback(async () => {
    nPendientes.current = await cola.pendientes()
    setPendientes(nPendientes.current)
  }, [cola])

  const recargar = useCallback(async () => {
    // La cola se manda por su lado: si el almacenamiento del celular se demora, igual se ven los datos
    void cola.procesar().then(contar)
    try {
      const hoy = await pedirHoy(token)
      // Si hay toques sin enviar, se queda lo que se ve en pantalla hasta que lleguen
      if (nPendientes.current > 0) return
      setDatos(hoy)
      guardarCopia(hoy)
      setFase('listo')
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 401) {
        olvidarToken()
        setFase('sin_sesion')
      } else {
        setFase((f) => (f === 'cargando' ? 'sin_datos' : f))
      }
    }
  }, [token, cola, contar])

  useEffect(() => {
    void recargar()
    const reloj = setInterval(() => void recargar(), RECARGAR_CADA_MS)
    const alVolver = () => void recargar()
    window.addEventListener('online', alVolver)
    window.addEventListener('focus', alVolver)
    return () => {
      clearInterval(reloj)
      window.removeEventListener('online', alVolver)
      window.removeEventListener('focus', alVolver)
    }
  }, [recargar])

  const enviar = useCallback(
    (e: Envio) => {
      nPendientes.current += 1
      setPendientes(nPendientes.current)
      void cola
        .encolar(e)
        .then(() => cola.procesar())
        .then(contar)
        .then(() => recargar())
    },
    [cola, recargar],
  )

  if (fase === 'sin_sesion') {
    return (
      <PantallaAviso titulo="Tu enlace para entrar ya no sirve">
        <p>Pídele al bot un enlace nuevo por WhatsApp y ábrelo en este celular.</p>
      </PantallaAviso>
    )
  }
  if (!datos) {
    return fase === 'sin_datos' ? (
      <PantallaAviso titulo="No hay señal">
        <p>Este celular todavía no tiene los datos del albergue. Apenas vuelva la señal, se cargan solos.</p>
      </PantallaAviso>
    ) : (
      <PantallaAviso titulo="Abriendo la libreta…" />
    )
  }

  const valor: ContextoDatos = {
    datos,
    cambiar: (fn) => setDatos((d) => (d ? { ...fn(d), yo: d.yo } : d)),
    enviar,
    modo: 'servidor',
    yo: datos.yo,
    pendientes,
    problema,
    token,
    solicitudesEquipo: datos.solicitudesEquipo ?? 0,
  }
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function DatosProvider({ children }: { children: React.ReactNode }) {
  // Se decide una sola vez al abrir: con servidor y enlace, modo servidor; si no, demo
  const [token] = useState(() => {
    const demo = new URLSearchParams(window.location.search).has('demo')
    return urlApi() && !demo ? tomarToken() : null
  })
  return token ? <ProveedorServidor token={token}>{children}</ProveedorServidor> : <ProveedorDemo>{children}</ProveedorDemo>
}

export function useDatos(): ContextoDatos {
  const c = useContext(Contexto)
  if (!c) throw new Error('useDatos debe usarse dentro de <DatosProvider>')
  return c
}

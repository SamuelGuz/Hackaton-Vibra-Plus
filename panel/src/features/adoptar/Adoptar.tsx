import { useEffect, useMemo, useState } from 'react'
import { Huella } from '../../components/Huella'
import { pesos } from '../../lib/formato'
import { buscarPerritos, listarPerritos } from './api'
import { PADRINO_DESDE_COP } from './enlaces'
import { ModalVoz } from './ModalVoz'
import { TarjetaPerrito } from './TarjetaPerrito'
import type { ItemTarjeta } from './tipos'
import { DESCRIPCION_ADOPTAR, TITULO_ADOPTAR, useSeo } from './useSeo'
import styles from './Adoptar.module.css'

/** Espera antes de buscar mientras la persona sigue escribiendo */
export const ESPERA_BUSQUEDA_MS = 300

/** ¿La URL pide la landing pública? (`/adoptar` o `?vista=adoptar`) */
export function esVistaAdoptar(ubicacion: Pick<Location, 'pathname' | 'search'> = window.location): boolean {
  const ruta = ubicacion.pathname.replace(/\/+$/, '')
  return ruta === '/adoptar' || new URLSearchParams(ubicacion.search).get('vista') === 'adoptar'
}

type Carga = 'cargando' | 'listo' | 'error'

/** Landing pública de adopción: sin sesión, sin datos internos, pensada para encontrarse en Google. */
export function Adoptar() {
  const [consulta, setConsulta] = useState('')
  const [items, setItems] = useState<ItemTarjeta[]>([])
  const [whatsapp, setWhatsapp] = useState<string | null>(null)
  const [carga, setCarga] = useState<Carga>('cargando')
  const [llamando, setLlamando] = useState(false)

  const perritos = useMemo(() => items.map((i) => i.perrito), [items])
  useSeo({ titulo: TITULO_ADOPTAR, descripcion: DESCRIPCION_ADOPTAR, perritos })

  // Lista completa al entrar o al borrar la búsqueda; con texto, búsqueda con espera y sin respuestas viejas
  useEffect(() => {
    const q = consulta.trim()
    const control = new AbortController()

    async function cargar() {
      setCarga('cargando')
      try {
        if (q) {
          const r = await buscarPerritos(q, control.signal)
          if (control.signal.aborted) return
          setItems(r.resultados.map((x) => ({ perrito: x.perrito, motivo: x.motivo })))
          setWhatsapp(r.contacto.whatsapp)
        } else {
          const r = await listarPerritos(control.signal)
          if (control.signal.aborted) return
          setItems(r.perritos.map((perrito) => ({ perrito })))
          setWhatsapp(r.contacto.whatsapp)
        }
        setCarga('listo')
      } catch {
        if (!control.signal.aborted) setCarga('error')
      }
    }

    if (!q) {
      void cargar()
      return () => control.abort()
    }
    const espera = setTimeout(() => void cargar(), ESPERA_BUSQUEDA_MS)
    return () => {
      clearTimeout(espera)
      control.abort()
    }
  }, [consulta])

  const q = consulta.trim()
  const estado =
    carga === 'cargando'
      ? q
        ? 'Buscando a tu compañero…'
        : 'Cargando a los peluditos…'
      : carga === 'error'
        ? ''
        : q
          ? `${items.length} ${items.length === 1 ? 'resultado' : 'resultados'} para “${q}”`
          : `${items.length} ${items.length === 1 ? 'peludito espera' : 'peluditos esperan'} un hogar`

  return (
    <div className={styles.pagina}>
      <header className={styles.cabecera}>
        <nav className={styles.nav} aria-label="Secciones de la página">
          <span className={styles.marca}>
            <Huella tamano={28} />
            Fundación Huellitas
          </span>
          <a href="#buscar">Buscar</a>
          <a href="#perritos">Perritos</a>
        </nav>
        <h1 className={styles.titulo}>Adopta un perrito y cambia dos vidas</h1>
        <p className={styles.intro}>
          En Huellitas cuidamos a perros y gatos rescatados hasta que encuentran familia. Cuéntanos cómo es tu casa y te
          ayudamos a encontrar al compañero ideal.
        </p>
        <button type="button" className={styles.llamar} onClick={() => setLlamando(true)}>
          📞 Llamar al Agente de Voz de Huellitas
        </button>
      </header>

      <main className={styles.principal}>
        <section id="buscar" aria-labelledby="titulo-buscar" className={styles.buscador}>
          <h2 id="titulo-buscar" className={styles.subtitulo}>
            ¿Cómo es tu casa y tu día a día?
          </h2>
          <form role="search" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="busqueda" className={styles.etiqueta}>
              Describe al compañero que buscas
            </label>
            <input
              id="busqueda"
              type="search"
              className={styles.campo}
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder="Ej.: perro tranquilo para apartamento, bueno con niños"
              autoComplete="off"
              enterKeyHint="search"
            />
          </form>
          <p className={styles.estado} role="status" aria-live="polite">
            {estado}
          </p>
        </section>

        <section id="perritos" aria-labelledby="titulo-perritos">
          <h2 id="titulo-perritos" className={styles.subtitulo}>
            Perritos y gatitos que esperan hogar
          </h2>

          {carga === 'error' && (
            <p className={styles.aviso} role="alert">
              No pudimos cargar a los peluditos ahora mismo. Revisa tu conexión e inténtalo de nuevo en un momento.
            </p>
          )}
          {carga === 'listo' && items.length === 0 && (
            <p className={styles.aviso}>
              No encontramos a alguien que encaje con eso todavía. Prueba con otras palabras o llama a nuestro agente de
              voz: él te ayuda a elegir.
            </p>
          )}

          <ul className={styles.lista} aria-busy={carga === 'cargando'}>
            {items.map((i) => (
              <li key={i.perrito.id}>
                <TarjetaPerrito perrito={i.perrito} whatsapp={whatsapp} motivo={i.motivo} />
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className={styles.pie}>
        <p>
          ¿Aún no puedes adoptar? Apadrina a un peludito desde {pesos(PADRINO_DESDE_COP)} al mes y ayuda con su comida y
          sus medicinas.
        </p>
        <p className={styles.firma}>Fundación Huellitas</p>
      </footer>

      {llamando && <ModalVoz onCerrar={() => setLlamando(false)} />}
    </div>
  )
}

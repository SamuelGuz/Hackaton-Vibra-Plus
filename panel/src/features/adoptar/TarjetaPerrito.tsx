import { FotoInstantanea } from '../../components/FotoInstantanea'
import { pesos } from '../../lib/formato'
import { enlaceWhatsapp, PADRINO_DESDE_COP } from './enlaces'
import type { ActividadHoy, PerritoPublico } from './tipos'
import styles from './TarjetaPerrito.module.css'

/** Lo que de verdad pasó hoy, en frases cortas; solo lo que tiene registro */
export function frasesDeHoy(hoy: ActividadHoy): string[] {
  const frases: string[] = []
  if (hoy.comioHoy === true) frases.push('Ya comió hoy')
  if (hoy.comioHoy === false) frases.push('Todavía no ha comido hoy')
  if (hoy.medicinas.programadas > 0) {
    frases.push(`Medicinas tomadas ${hoy.medicinas.tomadas} de ${hoy.medicinas.programadas}`)
  }
  return frases
}

interface Props {
  perrito: PerritoPublico
  whatsapp: string | null
  motivo?: string
}

export function TarjetaPerrito({ perrito: p, whatsapp, motivo }: Props) {
  const enlace = enlaceWhatsapp(whatsapp, p.nombre)
  const hoy = frasesDeHoy(p.hoy)
  const pct = Math.max(0, Math.min(100, Math.round(p.meta.cubiertoPct)))

  return (
    <article id={p.id} className={styles.tarjeta} aria-labelledby={`${p.id}-nombre`}>
      {motivo && <p className={styles.motivo}>{motivo}</p>}

      <div className={styles.cabecera}>
        <FotoInstantanea animal={p} ancho={132} />
        <div className={styles.datos}>
          {/* El nombre se ve en la foto; el título queda para quien navega por encabezados */}
          <h3 id={`${p.id}-nombre`} className="solo-lector">
            {p.nombre}
          </h3>
          <p className={styles.sub}>
            {p.especie === 'gato' ? 'Gato' : 'Perro'} · {p.edadTexto}
          </p>
          {p.personalidad.length > 0 && (
            <ul className={styles.chips} aria-label={`Cómo es ${p.nombre}`}>
              {p.personalidad.map((rasgo) => (
                <li key={rasgo}>{rasgo}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className={styles.historia}>{p.historia}</p>

      {(hoy.length > 0 || p.hoy.notaDelDia) && (
        <section className={styles.hoy} aria-label={`Cómo está ${p.nombre} hoy`}>
          <h4 className={styles.hoyTitulo}>Hoy en el albergue</h4>
          <ul>
            {hoy.map((f) => (
              <li key={f}>{f}</li>
            ))}
            {p.hoy.notaDelDia && <li className={styles.nota}>“{p.hoy.notaDelDia}”</li>}
          </ul>
        </section>
      )}

      <div className={styles.meta}>
        <div
          className={styles.barra}
          role="progressbar"
          aria-label={`Apadrinamiento cubierto de ${p.nombre}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <span className={styles.relleno} style={{ width: `${pct}%` }} />
        </div>
        <p className={styles.metaTexto}>
          {pct}% del apadrinamiento cubierto · <strong>Apadrina desde {pesos(PADRINO_DESDE_COP)}/mes</strong>
        </p>
      </div>

      {enlace ? (
        <a className={styles.whatsapp} href={enlace} target="_blank" rel="noopener noreferrer">
          Quiero conocer a {p.nombre} por WhatsApp
        </a>
      ) : (
        <p className={styles.sinWhatsapp} aria-disabled="true">
          El WhatsApp de la fundación no está disponible ahora. Prueba con el agente de voz.
        </p>
      )}
    </article>
  )
}

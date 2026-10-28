// "¿Qué hago hoy?": lo urgente arriba y grande (comida), luego las medicinas en orden
// de hora, y al final lo que se logró hoy (para cuidar el ánimo del equipo).
import { useState } from 'react'
import { useSesion } from '../../app/sesion'
import { AvisoDeshacer } from '../../components/AvisoDeshacer'
import { Boton } from '../../components/Boton'
import { FotoInstantanea } from '../../components/FotoInstantanea'
import { Sello } from '../../components/Sello'
import { useDatos } from '../../data/DatosProvider'
import type { DatosAlbergue, PorConfirmar } from '../../data/tipos'
import { useAcciones } from '../../data/useAcciones'
import { dosisDeHoy, type DosisDelDia } from '../../lib/calculos'
import { fechaLocal, horaBonita, saludo } from '../../lib/formato'
import { TarjetaComida } from '../comida/TarjetaComida'
import { describir } from '../confirmar/describir'
import styles from './Hoy.module.css'

function nombreDe(datos: DatosAlbergue, personaId: string): string {
  return datos.personas.find((p) => p.id === personaId)?.nombre ?? 'alguien'
}

/** '2026-10-27T08:12' → '08:12' */
const horaDe = (fechaHora: string) => fechaHora.slice(11, 16)

/**
 * Dosis que alguien ya reportó por audio: no se puede dar otra vez. Se confirma el audio
 * completo, y por eso antes se muestra todo lo demás que dice.
 */
function Reportada({ d, reporte, alConfirmar }: { d: DosisDelDia; reporte: PorConfirmar; alConfirmar: () => void }) {
  const { datos } = useDatos()
  const otras = reporte.propuestas.filter(
    (p) => !(p.tipo === 'dosis' && p.tratamientoId === d.tratamiento.id && p.hora === d.hora),
  )
  return (
    <>
      <p className={styles.reportada}>
        {`Reportada a las ${horaBonita(horaDe(reporte.fechaHora))} por ${nombreDe(datos, reporte.quien)}`}
      </p>
      {otras.length > 0 && (
        <div className={styles.tambien}>
          <p>El audio también dice:</p>
          <ul>
            {otras.map((p, i) => {
              const { grande, texto } = describir(datos, p)
              return <li key={i}>{grande ? `${grande}: ${texto}` : texto}</li>
            })}
          </ul>
        </div>
      )}
      <Boton icono="check" ancho onClick={alConfirmar}>
        {otras.length > 0 ? 'Confirmar todo' : 'Confirmar'}
      </Boton>
    </>
  )
}

export function Hoy() {
  const { datos } = useDatos()
  const { persona } = useSesion()
  const acciones = useAcciones()
  const [recien, setRecien] = useState<string | null>(null)
  const [aviso, setAviso] = useState<{ id: string; mensaje: string } | null>(null)

  const dosis = dosisDeHoy(datos)
  const dadas = dosis.filter((d) => d.estado === 'dada').length
  const hoy = fechaLocal()
  const bultosHoy = datos.inventario.filter((m) => m.cambio < 0 && m.fechaHora.startsWith(hoy)).length
  const fecha = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  const dar = (d: DosisDelDia) => {
    const id = acciones.darDosis(d.tratamiento, d.hora)
    setRecien(id)
    setAviso({ id, mensaje: `Listo: ${d.tratamiento.medicamento}` })
  }

  return (
    <div className={styles.hoy}>
      <header>
        <p className={styles.fecha}>{fecha}</p>
        <h1 className={styles.saludo}>
          {saludo()}, {persona?.nombre}
        </h1>
      </header>

      <TarjetaComida />

      <section className={styles.medicinas} aria-labelledby="titulo-medicinas">
        <div className={styles.encabezado}>
          <h2 id="titulo-medicinas">Medicinas de hoy</h2>
          <p className={styles.cuenta}>
            {dadas} de {dosis.length} dadas
          </p>
        </div>
        {dosis.length === 0 && <p>Hoy no hay medicinas. ¡Qué buena noticia!</p>}
        <ol className={styles.lista}>
          {dosis.map((d) => {
            const animal = datos.animales.find((a) => a.id === d.tratamiento.animalId)
            if (!animal) return null
            return (
              <li key={`${d.tratamiento.id}-${d.hora}`}>
                <article
                  className={`${styles.dosis} ${d.estado === 'atrasada' && !d.reporte ? styles.atrasada : ''}`}
                  aria-label={`${animal.nombre} · ${d.tratamiento.medicamento} · ${horaBonita(d.hora)}`}
                >
                  <FotoInstantanea animal={animal} ancho={92} />
                  <div className={styles.detalle}>
                    <p className={styles.hora}>
                      <span>{horaBonita(d.hora)}</span>
                      {d.estado === 'atrasada' && !d.reporte && <span className={styles.marcaAtrasada}>Atrasada</span>}
                    </p>
                    <p className={styles.medicamento}>{d.tratamiento.medicamento}</p>
                    <p className={styles.cantidad}>{d.tratamiento.dosis}</p>
                  </div>
                  <div className={styles.accion}>
                    {d.dada ? (
                      <Sello
                        texto="Dada"
                        hora={horaDe(d.dada.fechaHora)}
                        quien={nombreDe(datos, d.dada.quien)}
                        animar={d.dada.id === recien}
                      />
                    ) : d.reporte ? (
                      <Reportada d={d} reporte={d.reporte} alConfirmar={() => acciones.confirmar(d.reporte!, d.reporte!.propuestas)} />
                    ) : (
                      <Boton icono="check" ancho onClick={() => dar(d)}>
                        Ya se la di
                      </Boton>
                    )}
                  </div>
                </article>
              </li>
            )
          })}
        </ol>
      </section>

      <section className={styles.logros} aria-labelledby="titulo-logros">
        <h2 id="titulo-logros">Lo que se logró hoy</h2>
        <ul>
          <li>
            {dadas} {dadas === 1 ? 'medicina dada' : 'medicinas dadas'} a tiempo y anotadas
          </li>
          <li>
            {bultosHoy} {bultosHoy === 1 ? 'bulto abierto' : 'bultos abiertos'}: nadie se quedó sin comer
          </li>
          <li>{datos.vidasCambiadas} animales ya tienen hogar gracias a ustedes</li>
        </ul>
      </section>

      {aviso && (
        <AvisoDeshacer
          mensaje={aviso.mensaje}
          alDeshacer={() => {
            acciones.deshacer(aviso.id)
            setAviso(null)
          }}
          alCerrar={() => setAviso(null)}
        />
      )}
    </div>
  )
}

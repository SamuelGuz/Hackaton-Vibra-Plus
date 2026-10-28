// "¿Qué hago hoy?": lo urgente arriba y grande (comida), luego las medicinas en orden
// de hora, y al final lo que se logró hoy (para cuidar el ánimo del equipo).
import { useState } from 'react'
import { useSesion } from '../../app/sesion'
import { AvisoDeshacer } from '../../components/AvisoDeshacer'
import { Boton } from '../../components/Boton'
import { FotoInstantanea } from '../../components/FotoInstantanea'
import { Sello } from '../../components/Sello'
import { useDatos } from '../../data/DatosProvider'
import type { DatosAlbergue } from '../../data/tipos'
import { confirmarDosisReportada, darDosis, deshacer } from '../../lib/acciones'
import { dosisDeHoy, type DosisDelDia } from '../../lib/calculos'
import { fechaLocal, horaBonita, saludo } from '../../lib/formato'
import { TarjetaComida } from '../comida/TarjetaComida'
import styles from './Hoy.module.css'

function nombreDe(datos: DatosAlbergue, personaId: string): string {
  return datos.personas.find((p) => p.id === personaId)?.nombre ?? 'alguien'
}

/** '2026-10-27T08:12' → '08:12' */
const horaDe = (fechaHora: string) => fechaHora.slice(11, 16)

export function Hoy() {
  const { datos, cambiar } = useDatos()
  const { persona } = useSesion()
  const [recien, setRecien] = useState<string | null>(null)
  const [aviso, setAviso] = useState<{ id: string; mensaje: string } | null>(null)

  const dosis = dosisDeHoy(datos)
  const dadas = dosis.filter((d) => d.estado === 'dada').length
  const hoy = fechaLocal()
  const bultosHoy = datos.inventario.filter((m) => m.cambio < 0 && m.fechaHora.startsWith(hoy)).length
  const fecha = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  const dar = (d: DosisDelDia) => {
    if (!persona) return
    const r = darDosis(datos, d.tratamiento.id, d.hora, persona.id)
    cambiar(() => r.datos)
    setRecien(r.id)
    setAviso({ id: r.id, mensaje: `Listo: ${d.tratamiento.medicamento}` })
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
                      <>
                        <p className={styles.reportada}>
                          {`Reportada a las ${horaBonita(horaDe(d.reporte.fechaHora))} por ${nombreDe(datos, d.reporte.quien)}`}
                        </p>
                        <Boton
                          icono="check"
                          ancho
                          onClick={() => cambiar((x) => confirmarDosisReportada(x, d.reporte!.id, d.tratamiento.id, d.hora))}
                        >
                          Confirmar
                        </Boton>
                      </>
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
            cambiar((x) => deshacer(x, aviso.id))
            setAviso(null)
          }}
          alCerrar={() => setAviso(null)}
        />
      )}
    </div>
  )
}

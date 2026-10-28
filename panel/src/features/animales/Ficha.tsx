// Ficha de equipo de un animal: lo que NO puede pasar va arriba y en rojo (caso Bruno).
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSesion } from '../../app/sesion'
import { AvisoDeshacer } from '../../components/AvisoDeshacer'
import { Boton } from '../../components/Boton'
import { Cinta } from '../../components/Cinta'
import { FotoInstantanea } from '../../components/FotoInstantanea'
import { Icono } from '../../components/Icono'
import { useDatos } from '../../data/DatosProvider'
import type { EstadoAnimal } from '../../data/tipos'
import { cambiarEstado } from '../../lib/acciones'
import { NOMBRE_ESTADO } from '../../lib/calculos'
import { cuandoFue, fechaLocal, horaBonita } from '../../lib/formato'
import styles from './Ficha.module.css'

const OPCIONES: EstadoAnimal[] = ['cuarentena', 'tratamiento', 'adoptable', 'hogar_temporal', 'adoptado', 'fallecido']

function tiempoConNosotros(fechaIngreso: string): string {
  const dias = Math.round((Date.now() - new Date(`${fechaIngreso}T00:00`).getTime()) / 86_400_000)
  if (dias < 60) return `${dias} ${dias === 1 ? 'día' : 'días'}`
  return `${Math.round(dias / 30)} meses`
}

export function Ficha() {
  const { id } = useParams()
  const { datos, cambiar } = useDatos()
  const { persona } = useSesion()
  const [eligiendo, setEligiendo] = useState(false)
  const [aviso, setAviso] = useState<{ antes: EstadoAnimal; mensaje: string } | null>(null)

  const animal = datos.animales.find((a) => a.id === id)
  if (!animal) {
    return (
      <p>
        No encontramos ese animal. <Link to="/animales">Volver a Animales</Link>
      </p>
    )
  }

  const puedeCambiar = persona?.rol === 'bienestar' || persona?.rol === 'admin'
  const hoy = fechaLocal()
  const tratamientos = datos.tratamientos.filter((t) => t.animalId === animal.id && t.fin >= hoy)
  const notas = datos.notas
    .filter((n) => n.animalId === animal.id)
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))

  const elegir = (estado: EstadoAnimal) => {
    const antes = animal.estado
    cambiar((d) => cambiarEstado(d, animal.id, estado))
    setEligiendo(false)
    setAviso({ antes, mensaje: `${animal.nombre} quedó en "${NOMBRE_ESTADO[estado]}"` })
  }

  return (
    <article className={styles.ficha}>
      <Link to="/animales" className={styles.volver}>
        <Icono nombre="atras" tamano={24} />
        Animales
      </Link>

      {animal.advertencias.length > 0 && (
        <section className={styles.advertencias}>
          <h2>¡Ojo con esto!</h2>
          <ul aria-label="Advertencias">
            {animal.advertencias.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      )}

      <header className={styles.cabecera}>
        <FotoInstantanea animal={animal} ancho={168} />
        <div className={styles.datos}>
          <h1>{animal.nombre}</h1>
          <Cinta>{NOMBRE_ESTADO[animal.estado]}</Cinta>
          <p>
            {animal.especie === 'perro' ? 'Perro' : 'Gato'} · lleva {tiempoConNosotros(animal.fechaIngreso)} con nosotros
          </p>
          {animal.padrino && <p>Padrino: {animal.padrino}</p>}
        </div>
      </header>

      {puedeCambiar && (
        <section className={styles.estado}>
          <Boton icono="lapiz" variante="secundario" ancho aria-expanded={eligiendo} onClick={() => setEligiendo(!eligiendo)}>
            Cambiar estado
          </Boton>
          {eligiendo && (
            <div className={styles.opciones}>
              {OPCIONES.filter((e) => e !== animal.estado).map((e) => (
                <button key={e} type="button" className={styles.opcion} onClick={() => elegir(e)}>
                  {NOMBRE_ESTADO[e]}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <section className={styles.bloque}>
        <h2>Cómo es</h2>
        <p>{animal.caracter}</p>
      </section>

      {tratamientos.length > 0 && (
        <section className={styles.bloque}>
          <h2>Tratamientos</h2>
          <ul className={styles.tratamientos}>
            {tratamientos.map((t) => (
              <li key={t.id}>
                <span className={styles.medicamento}>{t.medicamento}</span>
                <span className={styles.dosis}>{t.dosis}</span>
                <span className={styles.horas}>{t.horas.map(horaBonita).join(' · ')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notas.length > 0 && (
        <section className={styles.bloque}>
          <h2>Lo último que se dijo</h2>
          <ul className={styles.notas}>
            {notas.map((n) => (
              <li key={n.id}>
                <p className={styles.nota}>{n.texto}</p>
                <p className={styles.quien}>
                  {cuandoFue(n.fechaHora)} · {datos.personas.find((p) => p.id === n.quien)?.nombre ?? 'Alguien'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {aviso && (
        <AvisoDeshacer
          mensaje={aviso.mensaje}
          alDeshacer={() => {
            cambiar((d) => cambiarEstado(d, animal.id, aviso.antes))
            setAviso(null)
          }}
          alCerrar={() => setAviso(null)}
        />
      )}
    </article>
  )
}

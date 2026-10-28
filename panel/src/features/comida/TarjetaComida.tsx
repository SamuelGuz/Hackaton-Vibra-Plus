// Tarjeta gigante de comida: un costal por especie, −1 al abrir un bulto y +N cuando llegan.
import { useState } from 'react'
import { useSesion } from '../../app/sesion'
import { AvisoDeshacer } from '../../components/AvisoDeshacer'
import { Boton } from '../../components/Boton'
import { Costal } from '../../components/Costal'
import { useDatos } from '../../data/DatosProvider'
import type { Especie } from '../../data/tipos'
import { deshacer, moverBultos } from '../../lib/acciones'
import { bultosEnBodega, bultosParaPedir, diasDeComida, nivelComida } from '../../lib/calculos'
import { diasHablados } from '../../lib/formato'
import styles from './TarjetaComida.module.css'

const ESPECIES: Especie[] = ['perro', 'gato']

export function TarjetaComida() {
  const { datos, cambiar } = useDatos()
  const { persona } = useSesion()
  const [pidiendo, setPidiendo] = useState<Especie | null>(null)
  const [aviso, setAviso] = useState<{ id: string; mensaje: string } | null>(null)

  const mover = (especie: Especie, cambio: number) => {
    if (!persona) return
    const r = moverBultos(datos, especie, cambio, persona.id)
    cambiar(() => r.datos)
    setPidiendo(null)
    navigator.vibrate?.(40)
    const n = Math.abs(cambio)
    setAviso({
      id: r.id,
      mensaje: cambio < 0 ? `Listo: se abrió un bulto de ${especie}` : `Listo: llegaron ${n} ${n === 1 ? 'bulto' : 'bultos'} de ${especie}`,
    })
  }

  // La frase de arriba habla de la especie que más preocupa
  const peor = ESPECIES.map((e) => ({ e, dias: diasDeComida(datos, e) })).sort((a, b) => a.dias - b.dias)[0]
  const nivelPeor = nivelComida(datos, peor.dias)
  const pedir = bultosParaPedir(datos, peor.e)
  const frase =
    nivelPeor === 'urgente'
      ? `Quedan ${diasHablados(peor.dias)} de comida de ${peor.e}. Toca pedir hoy.`
      : nivelPeor === 'ojo'
        ? `Quedan ${diasHablados(peor.dias)} de comida de ${peor.e}. Pidan ${pedir} ${pedir === 1 ? 'bulto' : 'bultos'} esta semana.`
        : 'Hay comida para toda la semana.'

  return (
    <section className={styles.tarjeta} aria-labelledby="titulo-comida">
      <h2 id="titulo-comida" className={styles.titulo}>
        Comida
      </h2>
      <p className={`${styles.frase} ${styles[nivelPeor]}`}>{frase}</p>

      {ESPECIES.map((especie) => {
        const dias = diasDeComida(datos, especie)
        const bultos = bultosEnBodega(datos, especie)
        return (
          <section key={especie} className={styles.especie} aria-label={`Comida de ${especie}`}>
            <div className={styles.fila}>
              <Costal especie={especie} dias={dias} nivel={nivelComida(datos, dias)} />
              <p className={styles.bultos}>
                {bultos} {bultos === 1 ? 'bulto cerrado' : 'bultos cerrados'}
              </p>
            </div>
            <div className={styles.botones}>
              <Boton icono="menos" tamano="grande" onClick={() => mover(especie, -1)} disabled={bultos === 0}>
                Abrí un bulto
              </Boton>
              <Boton
                icono="mas"
                variante="secundario"
                tamano="grande"
                aria-expanded={pidiendo === especie}
                onClick={() => setPidiendo(pidiendo === especie ? null : especie)}
              >
                Llegaron bultos
              </Boton>
            </div>
            {pidiendo === especie && (
              <div className={styles.cuantos}>
                <p>¿Cuántos llegaron?</p>
                <div className={styles.numeros}>
                  {[1, 2, 3, 4, 5, 10].map((n) => (
                    <button key={n} type="button" className={styles.numero} onClick={() => mover(especie, n)}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )
      })}

      {aviso && (
        <AvisoDeshacer
          mensaje={aviso.mensaje}
          alDeshacer={() => {
            cambiar((d) => deshacer(d, aviso.id))
            setAviso(null)
          }}
          alCerrar={() => setAviso(null)}
        />
      )}
    </section>
  )
}

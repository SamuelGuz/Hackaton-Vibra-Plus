// Bandeja "Por confirmar": lo que el bot entendió de audios y fotos. La IA sugiere,
// una persona confirma o corrige. Nada de esto se guarda sin pasar por aquí.
import { useState } from 'react'
import { Boton } from '../../components/Boton'
import { TecladoMonto } from '../../components/TecladoMonto'
import { useDatos } from '../../data/DatosProvider'
import type { PorConfirmar, Propuesta } from '../../data/tipos'
import { confirmarPorConfirmar, descartarPorConfirmar } from '../../lib/acciones'
import { cuandoFue, fechaLocal, horaBonita } from '../../lib/formato'
import { conMonto, describir, montoDe } from './describir'
import styles from './Confirmar.module.css'

function Tarjeta({ item }: { item: PorConfirmar }) {
  const { datos, cambiar } = useDatos()
  const [corrigiendo, setCorrigiendo] = useState(false)
  const [propuestas, setPropuestas] = useState<Propuesta[]>(item.propuestas)
  const [editando, setEditando] = useState<number | null>(null)

  const quien = datos.personas.find((p) => p.id === item.quien)?.nombre ?? 'Alguien'
  const hora = horaBonita(item.fechaHora.slice(11, 16))
  const deHoy = item.fechaHora.startsWith(fechaLocal())
  const titulo = `${item.origen === 'audio' ? 'Audio' : 'Foto'} de ${quien} · ${hora}`

  const guardar = (lista: Propuesta[]) => cambiar((d) => confirmarPorConfirmar(d, item.id, lista))
  const cancelar = () => {
    setPropuestas(item.propuestas)
    setEditando(null)
    setCorrigiendo(false)
  }

  return (
    <article className={styles.tarjeta} aria-label={titulo}>
      <header className={styles.cabecera}>
        <span className={styles.origen}>{titulo}</span>
        {!deHoy && <span className={styles.dia}>{cuandoFue(item.fechaHora)}</span>}
      </header>

      <blockquote className={styles.original}>
        <span className={styles.etiqueta}>{item.origen === 'audio' ? 'Lo que dijo:' : 'Lo que se leyó en la foto:'}</span>
        {item.textoOriginal}
      </blockquote>

      <p className={styles.entendi}>Entendí esto:</p>
      <ul className={styles.propuestas}>
        {propuestas.map((p, i) => {
          const { grande, texto } = describir(datos, p)
          const monto = montoDe(p)
          return (
            <li key={i} className={styles.propuesta}>
              {grande && <span className={`numero ${styles.grande}`}>{grande}</span>}
              <span>{texto}</span>
              {corrigiendo && (
                <div className={styles.arreglos}>
                  {monto !== null && editando !== i && (
                    <Boton icono="lapiz" variante="secundario" onClick={() => setEditando(i)}>
                      Cambiar monto
                    </Boton>
                  )}
                  <Boton
                    icono="menos"
                    variante="peligro"
                    onClick={() => {
                      setEditando(null)
                      setPropuestas(propuestas.filter((_, j) => j !== i))
                    }}
                  >
                    Quitar
                  </Boton>
                </div>
              )}
              {editando === i && monto !== null && (
                <div className={styles.teclado}>
                  <TecladoMonto
                    monto={monto}
                    alCambiar={(m) => setPropuestas(propuestas.map((x, j) => (j === i ? conMonto(x, m) : x)))}
                  />
                  <Boton icono="check" ancho onClick={() => setEditando(null)}>
                    Listo
                  </Boton>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {corrigiendo ? (
        <div className={styles.acciones}>
          <Boton icono="check" tamano="grande" disabled={propuestas.length === 0} onClick={() => guardar(propuestas)}>
            Guardar corregido
          </Boton>
          <Boton icono="menos" variante="peligro" onClick={() => cambiar((d) => descartarPorConfirmar(d, item.id))}>
            Descartar todo
          </Boton>
          <Boton icono="atras" variante="secundario" onClick={cancelar}>
            Cancelar
          </Boton>
        </div>
      ) : (
        <div className={styles.acciones}>
          <Boton icono="check" tamano="grande" onClick={() => guardar(item.propuestas)}>
            Confirmar
          </Boton>
          <Boton icono="lapiz" variante="secundario" tamano="grande" onClick={() => setCorrigiendo(true)}>
            Corregir
          </Boton>
        </div>
      )}
    </article>
  )
}

export function Confirmar() {
  const { datos } = useDatos()
  const pendientes = datos.porConfirmar
    .filter((p) => p.estado === 'pendiente')
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))

  return (
    <div className={styles.confirmar}>
      <h1 className={styles.titulo}>Por confirmar</h1>
      <p className={styles.ayuda}>Lo que el bot entendió de audios y fotos. Revisa las cantidades antes de confirmar.</p>
      {pendientes.length === 0 && <p className={styles.vacio}>Todo está confirmado. ¡Gracias!</p>}
      {pendientes.map((item) => (
        <Tarjeta key={item.id} item={item} />
      ))}
    </div>
  )
}

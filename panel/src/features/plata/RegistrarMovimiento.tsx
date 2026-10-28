// Anotar plata en pasos de una sola pregunta: (1) entró/salió → (2) cuánto →
// (3) para qué → (4) revisar, foto opcional y guardar. El paso 1 son los dos botones de Plata.
import { useState } from 'react'
import { useSesion } from '../../app/sesion'
import { Boton } from '../../components/Boton'
import { Icono } from '../../components/Icono'
import { PasoAPaso } from '../../components/PasoAPaso'
import { TecladoMonto } from '../../components/TecladoMonto'
import { useDatos } from '../../data/DatosProvider'
import type { Movimiento } from '../../data/tipos'
import { registrarMovimiento } from '../../lib/acciones'
import { comprimirFoto } from '../../lib/foto'
import { pesos } from '../../lib/formato'
import { CATEGORIAS, nombreCategoria } from './categorias'
import styles from './RegistrarMovimiento.module.css'

interface Props {
  tipo: Movimiento['tipo']
  alTerminar: (guardado: boolean) => void
}

export function RegistrarMovimiento({ tipo, alTerminar }: Props) {
  const { datos, cambiar } = useDatos()
  const { persona } = useSesion()
  const [paso, setPaso] = useState(2)
  const [monto, setMonto] = useState(0)
  const [categoria, setCategoria] = useState<Movimiento['categoria'] | null>(null)
  const [clinicaId, setClinicaId] = useState<string | null>(null)
  const [foto, setFoto] = useState<string | null>(null)

  const salio = tipo === 'gasto'
  const clinica = datos.clinicas.find((c) => c.id === clinicaId)

  const volver = () => {
    if (paso === 2) return alTerminar(false)
    if (paso === 4) setClinicaId(null)
    setCategoria(null)
    setPaso(paso - 1)
  }

  const elegir = (id: Movimiento['categoria']) => {
    setCategoria(id)
    if (id !== 'veterinaria') setPaso(4)
  }

  const guardar = () => {
    if (!persona || !categoria) return
    cambiar((d) =>
      registrarMovimiento(
        d,
        { tipo, monto, categoria, clinicaId, abonoDeuda: clinicaId !== null, foto, nota: '' },
        persona.id,
      ),
    )
    alTerminar(true)
  }

  if (paso === 2) {
    return (
      <PasoAPaso paso={2} total={4} pregunta={salio ? '¿Cuánta plata salió?' : '¿Cuánta plata entró?'} alVolver={volver}>
        <TecladoMonto monto={monto} alCambiar={setMonto} />
        <Boton icono="flecha" tamano="grande" ancho disabled={monto === 0} onClick={() => setPaso(3)}>
          Siguiente
        </Boton>
      </PasoAPaso>
    )
  }

  if (paso === 3) {
    return (
      <PasoAPaso paso={3} total={4} pregunta={salio ? '¿Para qué fue?' : '¿De dónde vino?'} alVolver={volver}>
        <div className={styles.categorias}>
          {CATEGORIAS[tipo].map((c) => (
            <button
              key={c.id}
              type="button"
              className={styles.categoria}
              aria-pressed={categoria === c.id}
              onClick={() => elegir(c.id)}
            >
              <Icono nombre={c.icono} tamano={36} />
              <span>{c.texto}</span>
            </button>
          ))}
        </div>
        {categoria === 'veterinaria' && (
          <div className={styles.clinicas}>
            <p className={styles.subpregunta}>¿Fue un abono a la deuda?</p>
            {datos.clinicas.map((c) => (
              <Boton
                key={c.id}
                icono="medicina"
                variante="secundario"
                ancho
                onClick={() => {
                  setClinicaId(c.id)
                  setPaso(4)
                }}
              >
                {`Abono a ${c.nombre}`}
              </Boton>
            ))}
            <Boton icono="plata" variante="secundario" ancho onClick={() => setPaso(4)}>
              No, se pagó de contado
            </Boton>
          </div>
        )}
      </PasoAPaso>
    )
  }

  return (
    <PasoAPaso paso={4} total={4} pregunta="Revisa y guarda" alVolver={volver}>
      <div className={styles.resumen}>
        <p className={`numero ${styles.monto} ${salio ? styles.salio : styles.entro}`}>
          {`${salio ? 'Salió' : 'Entró'} ${pesos(monto)}`}
        </p>
        <p className={styles.para}>{categoria && nombreCategoria(tipo, categoria)}</p>
        {clinica && (
          <p className={styles.deuda}>
            La deuda con {clinica.nombre} baja a {pesos(Math.max(0, clinica.deuda - monto))}
          </p>
        )}
      </div>

      <label className={styles.foto}>
        {foto ? (
          <img src={foto} alt="Foto del recibo" />
        ) : (
          <>
            <Icono nombre="camara" tamano={30} />
            <span>Tomar foto del recibo (opcional)</span>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="solo-lector"
          onChange={async (e) => {
            const archivo = e.target.files?.[0]
            if (archivo) setFoto(await comprimirFoto(archivo))
          }}
        />
      </label>

      <Boton icono="check" tamano="grande" ancho onClick={guardar}>
        Guardar
      </Boton>
    </PasoAPaso>
  )
}

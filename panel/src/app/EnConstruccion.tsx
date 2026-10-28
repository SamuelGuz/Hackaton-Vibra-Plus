// Pantalla temporal mientras se construye "Hoy" (Fase 2).
import { Link } from 'react-router-dom'
import { useSesion } from './sesion'
import { useDatos } from '../data/DatosProvider'
import { bultosEnBodega, diasDeComida, dosisDeHoy, plataEnCaja } from '../lib/calculos'
import { diasHablados, pesos } from '../lib/formato'

export function EnConstruccion() {
  const { persona, salir } = useSesion()
  const { datos } = useDatos()
  const dosis = dosisDeHoy(datos)

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: 16, display: 'grid', gap: 16 }}>
      <h1>Hola, {persona?.nombre}</h1>
      <p>Esta pantalla se construye en la Fase 2. Mientras tanto, los cálculos con los datos demo:</p>
      <ul>
        <li>Perro: {bultosEnBodega(datos, 'perro')} bultos · {diasHablados(diasDeComida(datos, 'perro'))}</li>
        <li>Gato: {bultosEnBodega(datos, 'gato')} bultos · {diasHablados(diasDeComida(datos, 'gato'))}</li>
        <li>En caja: {pesos(plataEnCaja(datos))}</li>
        <li>
          Dosis de hoy: {dosis.length} ({dosis.filter((d) => d.estado === 'dada').length} dadas)
        </li>
      </ul>
      <p>
        <Link to="/kit">Ver el kit de diseño</Link>
      </p>
      <button type="button" onClick={salir} style={{ minHeight: 64 }}>
        Cambiar de persona
      </button>
    </main>
  )
}

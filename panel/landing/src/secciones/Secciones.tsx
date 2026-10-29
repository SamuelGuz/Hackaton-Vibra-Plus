import type { JSX } from 'react'
import { historia, type Seccion } from '../contenido/historia'
import ElProblema from './ElProblema'
import QuienEsElla from './QuienEsElla'
import ElCarnicero from './ElCarnicero'
import ComoAyuda from './ComoAyuda'
import Adoptar from './Adoptar'
import Transparencia from './Transparencia'
import LlamadoFinal from './LlamadoFinal'
import CtaSeccion from './comun/CtaSeccion'
import c from './comun/comun.module.css'

type ComponenteSeccion = (props: { seccion: Seccion }) => JSX.Element

// Each story section id from src/contenido/historia.ts maps to its own composition.
const composiciones: Record<string, ComponenteSeccion> = {
  'el-problema': ElProblema,
  'quien-es-ella': QuienEsElla,
  'el-carnicero': ElCarnicero,
  'como-ayuda-tu-aporte': ComoAyuda,
  adoptar: Adoptar,
  transparencia: Transparencia,
  'llamado-final': LlamadoFinal,
}

// Fallback so a section added to the content later still renders (plainly) instead of vanishing.
function SeccionSimple({ seccion }: { seccion: Seccion }) {
  return (
    <section id={seccion.id} aria-labelledby={`titulo-${seccion.id}`} className={c.seccion}>
      <div className="contenedor">
        <h2 id={`titulo-${seccion.id}`} className={c.titulo}>
          {seccion.titulo}
        </h2>
        <p className={c.entrada}>{seccion.cuerpo}</p>
        {seccion.vinetas && (
          <ul>
            {seccion.vinetas.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        )}
        {seccion.cta && (
          <div className={c.acciones}>
            <CtaSeccion cta={seccion.cta} />
          </div>
        )}
      </div>
    </section>
  )
}

/** Everything below the hero: the story chapters, in the order of the content file. */
export default function Secciones() {
  return (
    <>
      {historia.secciones.map((seccion) => {
        const Componente = composiciones[seccion.id] ?? SeccionSimple
        return <Componente key={seccion.id} seccion={seccion} />
      })}
    </>
  )
}

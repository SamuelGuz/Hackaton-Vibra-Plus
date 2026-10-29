import { historia } from '../../contenido/historia'
import { enlaceWhatsapp, esPendiente, mostrar, POR_CONFIRMAR } from '../../secciones/comun/contenido'
import e from './Pie.module.css'

const enlaces = [
  { href: '#historia', texto: 'Historia' },
  { href: '#ayudar', texto: 'Cómo ayudar' },
  { href: '#adoptar', texto: 'Adoptar' },
  { href: '#transparencia', texto: 'Transparencia' },
]

// Designed close on the ink field: contacts, honest notes, and the name at full width.
export default function Pie() {
  const { marca, mediosPago } = historia
  const whatsapp = enlaceWhatsapp()
  const ubicacion = esPendiente(marca.ubicacion) ? 'Colombia. Barrio y ciudad por confirmar.' : marca.ubicacion

  return (
    <footer className={e.pie} data-campo="oscuro">
      <div className={`contenedor ${e.rejilla}`}>
        <p className={e.lema}>{marca.lema}</p>

        <nav aria-label="Pie de página" className={`${e.columna} ${e.colEnlaces}`}>
          <h2 className={e.titulo}>La página</h2>
          <ul role="list" className={e.lista}>
            {enlaces.map((enlace) => (
              <li key={enlace.href}>
                <a href={enlace.href} className={e.enlace}>
                  {enlace.texto}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={`${e.columna} ${e.colContacto}`}>
          <h2 className={e.titulo}>Contacto y aportes</h2>
          <dl className={e.datos}>
            <div>
              <dt>WhatsApp para adoptar</dt>
              <dd>
                {whatsapp ? (
                  <a href={whatsapp} className={e.enlace} target="_blank" rel="noopener noreferrer">
                    {historia.adopcion.whatsapp}
                  </a>
                ) : (
                  <span className={e.pendiente}>{POR_CONFIRMAR}</span>
                )}
              </dd>
            </div>
            {mediosPago.map((medio) => (
              <div key={medio.nombre}>
                <dt>{medio.nombre}</dt>
                <dd className={esPendiente(medio.numero) ? e.pendiente : 'cifras'}>{mostrar(medio.numero)}</dd>
              </div>
            ))}
            <div>
              <dt>Dónde estamos</dt>
              <dd>{ubicacion}</dd>
            </div>
          </dl>
        </div>

        <div className={`${e.columna} ${e.notas}`}>
          <h2 className={e.titulo}>Para que confíes</h2>
          <p>Las fotos de esta página son de referencia y no corresponden a animales del refugio.</p>
          <p>Los datos de contacto se publican aquí apenas estén confirmados.</p>
        </div>
      </div>

      <div className={`contenedor ${e.cierre}`}>
        <p className={e.nombre} aria-hidden="true">
          {marca.nombre}
        </p>
        <p className={e.legal}>
          {marca.nombre} · Refugio de Doña Gloria · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}

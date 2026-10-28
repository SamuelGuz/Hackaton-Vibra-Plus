import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { clasificar, ordenarPorCalidad } from '@huellitas/shared/adopcion/clasificar'
import type { Monton, Solicitud } from '@huellitas/shared/adopcion/tipos'
import { Boton } from '../../components/Boton'
import { Icono, type NombreIcono } from '../../components/Icono'
import { useDatos } from '../../data/DatosProvider'
import { useSesion } from '../../app/sesion'
import { crearSolicitudesDemo } from './demo-solicitudes'
import { guardarCambios, leerCambios, type CambiosDemo } from './persistencia'
import styles from './Adopciones.module.css'

const MONTONES: readonly Monton[] = ['verde', 'amarillo', 'rojo']
const ETIQUETA: Record<Monton, string> = {
  verde: 'Para llamar',
  amarillo: 'Revisar',
  rojo: 'Descartadas',
}
const ICONO_MONTON: Record<Monton, NombreIcono> = {
  verde: 'check',
  amarillo: 'lapiz',
  rojo: 'deshacer',
}

function fechaHora(valor: string): string {
  return new Date(valor).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function textoPasaporte(nombre: string, advertencias: string[], caracter: string, cuidados: string[]): string {
  const partes = [
    `Hola, te compartimos el pasaporte de ${nombre}.`,
    ...advertencias.map((advertencia) => `Advertencia: ${advertencia}`),
    `Carácter: ${caracter}`,
    cuidados.length > 0
      ? `Tratamientos registrados: ${cuidados.join('; ')}`
      : 'No hay tratamientos registrados en la ficha.',
    'No hay información de dieta registrada en esta ficha.',
  ]
  return partes.join(' ')
}

export function Adopciones() {
  const { persona } = useSesion()
  const { datos, modo } = useDatos()
  const ruta = useLocation().pathname.split('/').filter(Boolean)
  const animalId = ruta[1] === 'pasaporte' ? ruta[2] : undefined
  const id = ruta[1] && ruta[1] !== 'pasaporte' ? ruta[1] : undefined
  const navegar = useNavigate()
  const [cambios, setCambios] = useState<CambiosDemo>(() => leerCambios())
  const [aviso, setAviso] = useState('')

  if (!persona || !['admin', 'adopciones'].includes(persona.rol)) {
    return (
      <main className={styles.pagina}>
        <p role="alert">No tienes permiso para ver solicitudes de adopción.</p>
        <Link to="/">Volver</Link>
      </main>
    )
  }

  // Fixtures solo existen en el prototipo: nunca presentar la semilla como dato real del servidor.
  if (modo !== 'demo') {
    return (
      <main className={styles.pagina}>
        <p className={styles.etiqueta}>MÓDULO DE ADOPCIÓN</p>
        <h1>Aún no está conectada</h1>
        <p>Las solicitudes de adopción todavía no están disponibles en el servidor. Esta pantalla no muestra datos de ejemplo en modo servidor.</p>
      </main>
    )
  }

  const base = crearSolicitudesDemo()
  const solicitudes = base.map((solicitud) => ({
    ...solicitud,
    ...cambios[solicitud.id],
  }))
  const animal = animalId ? datos.animales.find((registro) => registro.id === animalId) : undefined
  const solicitud = id ? solicitudes.find((registro) => registro.id === id) : undefined

  const actualizar = (solicitudId: string, parche: Partial<Solicitud>) => {
    const siguiente = {
      ...cambios,
      [solicitudId]: { ...cambios[solicitudId], ...parche },
    }
    setCambios(siguiente)
    if (!guardarCambios(siguiente)) {
      setAviso('No se pudo guardar en este celular. Este cambio es provisional y se perderá al cerrar o recargar esta pestaña.')
    } else {
      setAviso('')
    }
  }

  const mover = (destino: Monton | null) => {
    if (solicitud) actualizar(solicitud.id, { montonManual: destino })
  }

  if (animalId) {
    if (!animal) {
      return (
        <main className={styles.pagina}>
          <h1>No encontramos ese animal</h1>
          <Link to="/adopciones">Volver a solicitudes</Link>
        </main>
      )
    }

    const tratamientos = datos.tratamientos.filter((tratamiento) => tratamiento.animalId === animal.id)
    const cuidados = tratamientos.map(
      (tratamiento) => `${tratamiento.medicamento}: ${tratamiento.dosis} · ${tratamiento.horas.join(', ')}`,
    )
    const mensaje = textoPasaporte(animal.nombre, animal.advertencias, animal.caracter, cuidados)
    const enlaceWhatsApp = `https://wa.me/?text=${encodeURIComponent(mensaje)}`

    return (
      <main className={styles.pagina}>
        <Link className={styles.volver} to="/adopciones">
          <Icono nombre="atras" /> Solicitudes
        </Link>
        <p className={styles.etiqueta}>PASAPORTE · DATOS DE DEMOSTRACIÓN</p>
        <h1>{animal.nombre}</h1>
        {animal.advertencias.length > 0 && (
          <section className={styles.advertencias} aria-label="Advertencias">
            <h2>Antes de entregar</h2>
            {animal.advertencias.map((advertencia) => <p key={advertencia}>{advertencia}</p>)}
          </section>
        )}
        <section className={styles.bloque}>
          <h2>Carácter</h2>
          <p>{animal.caracter}</p>
          <h2>Cuidados registrados</h2>
          {cuidados.length > 0
            ? cuidados.map((cuidado) => <p key={cuidado}>{cuidado}</p>)
            : <p>No hay tratamientos registrados.</p>}
          <p>No hay información de dieta registrada en esta ficha.</p>
        </section>
        <a className={styles.linkBoton} href={enlaceWhatsApp} target="_blank" rel="noreferrer">
          <Icono nombre="corazon" />
          <span>Preparar WhatsApp</span>
        </a>
        <p>Se abrirá WhatsApp con un mensaje preparado. Tú decides si lo envías; no se manda automáticamente.</p>
      </main>
    )
  }

  if (id) {
    if (!solicitud) {
      return (
        <main className={styles.pagina}>
          <h1>No encontramos esa solicitud</h1>
          <Link to="/adopciones">Volver a solicitudes</Link>
        </main>
      )
    }

    const sugerencia = clasificar(solicitud)
    const destinoPasaporte = solicitud.animalId
      ? `/adopciones/pasaporte/${solicitud.animalId}`
      : null
    const animalSolicitado = datos.animales.find((registro) => registro.id === solicitud.animalId)

    return (
      <main className={styles.pagina}>
        <Boton className={styles.volver} variante="secundario" icono="atras" onClick={() => navegar('/adopciones')}>
          Solicitudes
        </Boton>
        {aviso && <p className={styles.aviso} role="alert">{aviso}</p>}
        <p className={styles.etiqueta}>SOLICITUD DE DEMOSTRACIÓN · FICTICIA</p>
        <h1>{solicitud.nombre}</h1>
        <p>{animalSolicitado?.nombre ?? 'Consulta general'} · {fechaHora(solicitud.fecha)}</p>
        <p className={styles.sugerencia}>
          <Icono nombre={ICONO_MONTON[sugerencia.monton]} />
          Sugerencia: {ETIQUETA[sugerencia.monton]}. {sugerencia.razon}
        </p>
        {solicitud.montonManual && (
          <p role="status">Decisión humana: {ETIQUETA[solicitud.montonManual]}</p>
        )}
        <section className={styles.bloque}>
          <h2>Respuestas clave</h2>
          <p>Familia de acuerdo: {solicitud.familiaDeAcuerdo ? 'Sí' : 'No'}</p>
          <p>Vivienda: {solicitud.vivienda} · {solicitud.viviendaConMallas ? 'con cerramientos' : 'sin cerramientos'}</p>
          <p>Plan de emergencia: {solicitud.planEmergencia || 'Sin respuesta'}</p>
          <p>Mascotas anteriores: {solicitud.mascotasAnteriores || 'Sin respuesta'}</p>
          <p>Preguntó por carácter/rutina: {solicitud.preguntoPorCaracter ? 'Sí' : 'No'}</p>
        </section>
        {solicitud.nota && <p className={styles.nota}>Nota: {solicitud.nota}</p>}
        <label className={styles.campo}>
          Nota de llamada
          <textarea
            value={cambios[solicitud.id]?.nota ?? solicitud.nota}
            onChange={(evento) => actualizar(solicitud.id, { nota: evento.target.value })}
          />
        </label>
        <label className={styles.campo}>
          Agendar llamada
          <input
            type="datetime-local"
            value={cambios[solicitud.id]?.llamadaAgendada ?? solicitud.llamadaAgendada ?? ''}
            onChange={(evento) => actualizar(solicitud.id, { llamadaAgendada: evento.target.value || null })}
          />
        </label>
        {solicitud.telefono && (
          <a className={styles.linkBoton} href={`tel:${solicitud.telefono}`}>
            <Icono nombre="corazon" />
            <span>Llamar</span>
          </a>
        )}
        <div className={styles.acciones}>
          {MONTONES.map((monton) => (
            <Boton
              key={monton}
              className={styles.botonAccion}
              icono={ICONO_MONTON[monton]}
              variante={monton === 'rojo' ? 'peligro' : 'secundario'}
              onClick={() => mover(monton)}
            >
              Mover a {ETIQUETA[monton]}
            </Boton>
          ))}
          {solicitud.montonManual && (
            <Boton
              className={styles.botonAccion}
              icono="deshacer"
              variante="secundario"
              onClick={() => mover(null)}
            >
              Quitar decisión manual
            </Boton>
          )}
        </div>
        {destinoPasaporte && (
          <Link className={styles.linkBoton} to={destinoPasaporte}>
            <Icono nombre="huella" />
            <span>Ver pasaporte del animal</span>
          </Link>
        )}
      </main>
    )
  }

  const ordenadas = ordenarPorCalidad(solicitudes)

  return (
    <main className={styles.pagina}>
      <p className={styles.etiqueta}>PROTOTIPO · DATOS FICTICIOS · SOLO ESTE CELULAR</p>
      <h1>Solicitudes</h1>
      <p>La clasificación orienta; la decisión siempre es humana. Ningún mensaje se envía automáticamente.</p>
      {aviso && <p className={styles.aviso} role="alert">{aviso}</p>}
      <div className={styles.montones}>
        {MONTONES.map((monton) => {
          const lista = ordenadas.filter((registro) => (registro.montonManual ?? clasificar(registro).monton) === monton)
          return (
            <section className={styles.monton} key={monton}>
              <h2>
                <Icono nombre={ICONO_MONTON[monton]} />
                {ETIQUETA[monton]} <span>({lista.length})</span>
              </h2>
              {lista.map((registro) => (
                <Link className={styles.tarjeta} key={registro.id} to={`/adopciones/${registro.id}`}>
                  <strong>{registro.nombre}</strong>
                  <span>{registro.animalId ? datos.animales.find((a) => a.id === registro.animalId)?.nombre : 'Consulta general'}</span>
                  <span>{clasificar(registro).razon}</span>
                  {registro.montonManual && <small>Decisión humana: {ETIQUETA[registro.montonManual]}</small>}
                </Link>
              ))}
            </section>
          )
        })}
      </div>
    </main>
  )
}

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DatosProvider, useDatos } from '../data/DatosProvider'
import { inicioDe } from './pestanas'
import { SesionProvider, useSesion } from './sesion'
import { QuienEres } from '../features/entrar/QuienEres'
import { Kit } from '../features/kit/Kit'
import { Hoy } from '../features/hoy/Hoy'
import { Plata } from '../features/plata/Plata'
import { Comida } from '../features/comida/Comida'
import { Animales } from '../features/animales/Animales'
import { Ficha } from '../features/animales/Ficha'
import { Confirmar } from '../features/confirmar/Confirmar'
import { Equipo } from '../features/equipo/Equipo'
import { Marco } from './Marco'

/** Con el enlace del bot no se pregunta quién es: se entra directo a la primera pestaña */
function Inicio() {
  const { persona } = useSesion()
  const { modo } = useDatos()
  return modo === 'servidor' && persona ? <Navigate to={inicioDe(persona.rol)} replace /> : <QuienEres />
}

function RutaConSesion({ children }: { children: React.ReactNode }) {
  const { persona } = useSesion()
  return persona ? children : <Navigate to="/" replace />
}

function SoloAdmin({ children }: { children: React.ReactNode }) {
  const { persona } = useSesion()
  return persona?.rol === 'admin' ? children : <Navigate to="/" replace />
}

export function App() {
  return (
    <DatosProvider>
      <SesionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/kit" element={<Kit />} />
            <Route
              element={
                <RutaConSesion>
                  <Marco />
                </RutaConSesion>
              }
            >
              <Route path="/hoy" element={<Hoy />} />
              <Route path="/animales" element={<Animales />} />
              <Route path="/animales/:id" element={<Ficha />} />
              <Route path="/confirmar" element={<Confirmar />} />
              <Route path="/plata" element={<Plata />} />
              <Route path="/comida" element={<Comida />} />
              <Route
                path="/equipo"
                element={
                  <SoloAdmin>
                    <Equipo />
                  </SoloAdmin>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SesionProvider>
    </DatosProvider>
  )
}

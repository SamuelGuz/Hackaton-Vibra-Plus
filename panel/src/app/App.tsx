import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DatosProvider } from '../data/DatosProvider'
import { SesionProvider, useSesion } from './sesion'
import { QuienEres } from '../features/entrar/QuienEres'
import { Kit } from '../features/kit/Kit'
import { Hoy } from '../features/hoy/Hoy'
import { Plata } from '../features/plata/Plata'
import { Comida } from '../features/comida/Comida'
import { Animales } from '../features/animales/Animales'
import { Ficha } from '../features/animales/Ficha'
import { Confirmar } from '../features/confirmar/Confirmar'
import { Marco } from './Marco'

function RutaConSesion({ children }: { children: React.ReactNode }) {
  const { persona } = useSesion()
  return persona ? children : <Navigate to="/" replace />
}

export function App() {
  return (
    <DatosProvider>
      <SesionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<QuienEres />} />
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
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SesionProvider>
    </DatosProvider>
  )
}

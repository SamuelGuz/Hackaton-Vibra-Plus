import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DatosProvider } from '../data/DatosProvider'
import { SesionProvider, useSesion } from './sesion'
import { QuienEres } from '../features/entrar/QuienEres'
import { Kit } from '../features/kit/Kit'
import { Hoy } from '../features/hoy/Hoy'
import { Marco } from './Marco'

function RutaConSesion({ children }: { children: React.ReactNode }) {
  const { persona } = useSesion()
  return persona ? children : <Navigate to="/" replace />
}

function Pendiente() {
  return <p>Esta pantalla todavía se está construyendo.</p>
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
              <Route path="/animales" element={<Pendiente />} />
              <Route path="/confirmar" element={<Pendiente />} />
              <Route path="/plata" element={<Pendiente />} />
              <Route path="/comida" element={<Pendiente />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SesionProvider>
    </DatosProvider>
  )
}

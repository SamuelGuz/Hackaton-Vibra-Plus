import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DatosProvider } from '../data/DatosProvider'
import { SesionProvider, useSesion } from './sesion'
import { QuienEres } from '../features/entrar/QuienEres'
import { Kit } from '../features/kit/Kit'
import { EnConstruccion } from './EnConstruccion'

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
              path="/hoy"
              element={
                <RutaConSesion>
                  <EnConstruccion />
                </RutaConSesion>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SesionProvider>
    </DatosProvider>
  )
}

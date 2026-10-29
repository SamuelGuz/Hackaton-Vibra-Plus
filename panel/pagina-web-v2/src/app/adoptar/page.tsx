import type { Metadata } from 'next'
import PaginaShell from '../../components/paginas/PaginaShell'
import Adoptar from '../../components/paginas/Adoptar'

export const metadata: Metadata = {
  title: 'Adoptar · Huellitas',
  description: 'Una casa para siempre. Conoce cómo empieza la adopción responsable con el refugio de Yesenia.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <PaginaShell actual="/adoptar">
      <Adoptar />
    </PaginaShell>
  )
}

import type { Metadata } from 'next'
import PaginaShell from '../../components/paginas/PaginaShell'
import ComoAyudar from '../../components/paginas/ComoAyudar'

export const metadata: Metadata = {
  title: 'Cómo ayudar · Huellitas',
  description: 'Adoptar, aportar, acompañar o difundir: elige lo que hoy sí puedes para ayudar al refugio de Yesenia.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <PaginaShell actual="/como-ayudar">
      <ComoAyudar />
    </PaginaShell>
  )
}

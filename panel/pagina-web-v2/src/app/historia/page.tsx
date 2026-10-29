import type { Metadata } from 'next'
import PaginaShell from '../../components/paginas/PaginaShell'
import Historia from '../../components/paginas/Historia'

export const metadata: Metadata = {
  title: 'Su historia · Huellitas',
  description: 'Quién es Yesenia, lo que sabemos y lo que aún no, qué dicen las fuentes públicas y quién la apoya.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <PaginaShell actual="/historia">
      <Historia />
    </PaginaShell>
  )
}

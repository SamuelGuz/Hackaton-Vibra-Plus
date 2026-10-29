import type { Metadata } from 'next'
import PaginaShell from '../../components/paginas/PaginaShell'
import Aportar from '../../components/paginas/Aportar'
import { leerMonto } from '../../components/paginas2/aportar/monto'

export const metadata: Metadata = {
  title: 'Donar · Huellitas',
  description: 'Dona en un minuto desde tu celular para llenar el plato de esta semana en el refugio de Yesenia.',
  robots: { index: false, follow: false },
}

type Busqueda = Record<string, string | string[] | undefined>

// `?monto=` (link from the Home) or `?m=` (short form for QR codes) preselects the amount.
export default async function Page({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const q = await searchParams
  const montoInicial = leerMonto(q.monto) ?? leerMonto(q.m)
  return (
    <PaginaShell actual="/aportar">
      <Aportar montoInicial={montoInicial} />
    </PaginaShell>
  )
}

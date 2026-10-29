import type { Metadata } from 'next'
import '../../estilos/tokens.css'
import '../../estilos/base.css'

export const metadata: Metadata = {
  title: 'Huellitas · Hero v5 preservado',
  description: 'Base del refugio conservada para la edición posterior al clon de referencia.',
}

export default function PreservedLayout({ children }: { children: React.ReactNode }) {
  return children
}

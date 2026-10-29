import type { Metadata } from 'next'
import './globals.css'
import '../estilos/tokens.css'
import '../estilos/base.css'
import '../components/sites/babet/fonts.css'
import HeaderSitio from '../components/marca/HeaderSitio'
import FooterSitio from '../components/marca/FooterSitio'
import ChatAgente from '../components/marca/ChatAgente'

export const metadata: Metadata = {
  title: 'Huellitas · Un hogar para los que rescata Yesenia',
  description: 'Ayuda a alimentar, cuidar y encontrar un hogar para los perros y gatos rescatados de Yesenia.',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" data-hero="5"><body><HeaderSitio />{children}<FooterSitio /><ChatAgente /></body></html>
}

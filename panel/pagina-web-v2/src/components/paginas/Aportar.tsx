'use client'

import DonarRapido from '../paginas2/aportar/DonarRapido'

/** /aportar ("Donar" in the menu): quick, mobile-first donation page. Built in paginas2/aportar. */
export default function Aportar({ montoInicial = null }: { montoInicial?: number | null }) {
  return <DonarRapido montoInicial={montoInicial} />
}

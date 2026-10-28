// Formatos en español de Colombia. Los montos siempre con separador de miles
// para que nadie confunda $150.000 con $1.500.000.

const miles = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/** 1240000 → "$1.240.000" */
export function pesos(monto: number): string {
  const signo = monto < 0 ? '−' : ''
  return `${signo}$${miles.format(Math.abs(Math.round(monto)))}`
}

/** 2600000 → "$2,6 millones"; 450000 → "$450 mil". Para frases habladas. */
export function pesosHablados(monto: number): string {
  const m = Math.abs(monto)
  if (m >= 1_000_000) {
    const millones = (m / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })
    return `$${millones} ${m >= 2_000_000 ? 'millones' : 'millón'}`
  }
  if (m >= 1_000) return `$${Math.round(m / 1_000)} mil`
  return pesos(m)
}

/** '08:00' → '8:00 a. m.' */
export function horaBonita(hora: string): string {
  const [h, min] = hora.split(':').map(Number)
  const sufijo = h < 12 ? 'a. m.' : 'p. m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(min).padStart(2, '0')} ${sufijo}`
}

/** Fecha local en formato 'AAAA-MM-DD' */
export function fechaLocal(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

/** Fecha y hora local sin zona, como se guardan los registros: '2026-10-27T09:30' */
export function momentoLocal(d: Date = new Date()): string {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${fechaLocal(d)}T${h}:${m}`
}

/** '2026-10-26T15:30' → 'lun 26 · 3:30 p. m.' */
export function cuandoFue(fechaHora: string): string {
  const [fecha, hora] = fechaHora.split('T')
  const dia = new Date(`${fecha}T00:00`).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })
  return `${dia} · ${horaBonita(hora)}`
}

/** 4.4 → "4 días"; 1 → "1 día"; 0.6 → "menos de 1 día" */
export function diasHablados(dias: number): string {
  if (dias < 1) return 'menos de 1 día'
  const n = Math.floor(dias)
  return n === 1 ? '1 día' : `${n} días`
}

/** Saludo según la hora, como lo diría alguien del equipo */
export function saludo(d: Date = new Date()): string {
  const h = d.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

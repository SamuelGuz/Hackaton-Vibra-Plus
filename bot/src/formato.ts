// Formatos en español de Colombia, iguales a panel/src/lib/formato.ts.

const miles = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/** 1240000 → "$1.240.000" */
export function pesos(monto: number): string {
  const signo = monto < 0 ? '−' : ''
  return `${signo}$${miles.format(Math.abs(Math.round(monto)))}`
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

/** '2026-10-27T14:01' → '2:01 p. m.' */
export function horaDe(fechaHora: string): string {
  return horaBonita(fechaHora.slice(11, 16))
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

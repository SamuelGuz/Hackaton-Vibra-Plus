// Hora de Bogotá (America/Bogota, UTC−05:00, sin horario de verano). Sin E/S: el reloj entra por parámetro.

const MS_DESFASE_BOGOTA = 5 * 60 * 60 * 1000

/** Fecha, hora y marca ISO (con -05:00) de un instante, vistos desde Bogotá. */
export function ahoraBogota(d: Date = new Date()): { fecha: string; hora: string; iso: string } {
  // Corremos el reloj 5 h atrás y leemos las partes UTC: son las de Bogotá
  const local = new Date(d.getTime() - MS_DESFASE_BOGOTA).toISOString()
  const fecha = local.slice(0, 10)
  const hora = local.slice(11, 16)
  return { fecha, hora, iso: `${fecha}T${local.slice(11, 19)}-05:00` }
}

/** '14:01' -> '2:01 PM'. También acepta un ISO: con zona se pasa a Bogotá; sin zona se lee como está escrito. */
export function horaCorta(isoOrHHmm: string): string {
  let hhmm = isoOrHHmm
  if (isoOrHHmm.includes('T')) {
    const tieneZona = /(Z|[+-]\d{2}:?\d{2})$/.test(isoOrHHmm)
    hhmm = tieneZona ? ahoraBogota(new Date(isoOrHHmm)).hora : isoOrHHmm.slice(isoOrHHmm.indexOf('T') + 1, isoOrHHmm.indexOf('T') + 6)
  }
  const [h = '0', m = '00'] = hhmm.split(':')
  const hora = Number(h)
  const sufijo = hora >= 12 ? 'PM' : 'AM'
  const en12 = hora % 12 === 0 ? 12 : hora % 12
  return `${en12}:${m.slice(0, 2)} ${sufijo}`
}

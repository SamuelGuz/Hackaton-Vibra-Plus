// HTML y texto de la campaña. Todo dato dinámico (Gemini, base o cliente) se escapa: no es confiable.
import type { Campana, CampanaEstructura, PerritoCampana } from './tipos.js'

const COLOR = {
  fondo: '#f6efe4',
  tarjeta: '#fffaf2',
  texto: '#3b2a20',
  suave: '#8a7666',
  terracota: '#c4623a',
  borde: '#ead9c4',
}
const NOMBRE_FUNDACION = 'Fundación Huellitas'
const POR_QUE = `Recibes este correo porque te interesa apoyar a los animales rescatados de ${NOMBRE_FUNDACION}.`
const AVISO_BAJA = 'Responde BAJA a este correo para no recibir más.'

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function escapar(valor: unknown): string {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c])
}

/** Solo http(s): nada de javascript:, data: ni rutas que apunten a otro lado. Devuelve la URL normalizada o null. */
export function esUrlHttp(url: unknown): string | null {
  if (typeof url !== 'string' || !url.trim()) return null
  try {
    const u = new URL(url.trim())
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}

/** Une HTML y texto plano a partir de la estructura ya validada */
export function completar(base: CampanaEstructura): Campana {
  return { ...base, html: renderHtml(base), texto: renderTexto(base) }
}

function tarjetaPerrito(p: PerritoCampana): string {
  const foto = esUrlHttp(p.foto)
  const imagen = foto
    ? `<img src="${escapar(foto)}" width="120" height="120" alt="${escapar(p.nombre)}" style="display:block;width:120px;height:120px;border-radius:12px;object-fit:cover;border:0;">`
    : `<div style="width:120px;height:120px;border-radius:12px;background:${COLOR.borde};font-size:48px;line-height:120px;text-align:center;">🐾</div>`
  const historia = p.historiaCorta
    ? `<div style="font-size:15px;line-height:1.5;color:${COLOR.texto};">${escapar(p.historiaCorta)}</div>`
    : ''
  return `<tr><td style="padding:0 0 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${COLOR.borde};border-radius:14px;">
<tr>
<td width="136" valign="top" style="padding:8px;">${imagen}</td>
<td valign="top" style="padding:12px 14px 12px 4px;">
<div style="font-size:20px;font-weight:bold;color:${COLOR.texto};">${escapar(p.nombre)}</div>
<div style="font-size:14px;color:${COLOR.suave};margin:2px 0 8px;">${escapar(p.edadTexto)}</div>
${historia}
</td>
</tr>
</table>
</td></tr>`
}

function boton(texto: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px auto 4px;">
<tr><td align="center" bgcolor="${COLOR.terracota}" style="border-radius:999px;background:${COLOR.terracota};">
<a href="${escapar(url)}" style="display:inline-block;padding:14px 28px;font-size:17px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">${escapar(texto)}</a>
</td></tr>
</table>`
}

export function renderHtml(c: CampanaEstructura): string {
  const parrafos = c.parrafos
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${COLOR.texto};">${escapar(p)}</p>`)
    .join('\n')
  const perritos = c.perritos.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;">${c.perritos.map(tarjetaPerrito).join('')}</table>`
    : ''
  const url = esUrlHttp(c.llamado.url) ?? '#'

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapar(c.asunto)}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.fondo};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapar(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.fondo};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${COLOR.tarjeta};border-radius:16px;">
<tr><td style="padding:22px 28px;background:${COLOR.terracota};border-radius:16px 16px 0 0;font-size:20px;font-weight:bold;color:#ffffff;">${NOMBRE_FUNDACION}</td></tr>
<tr><td style="padding:28px 28px 8px;">
<p style="margin:0 0 16px;font-size:18px;color:${COLOR.texto};">${escapar(c.saludo)}</p>
${parrafos}
${perritos}
<div style="text-align:center;padding:8px 0 12px;">${boton(c.llamado.texto, url)}</div>
</td></tr>
<tr><td style="padding:18px 28px 24px;border-top:1px solid ${COLOR.borde};font-size:12px;line-height:1.5;color:${COLOR.suave};">
<p style="margin:0 0 8px;">${POR_QUE}</p>
<p style="margin:0;">${AVISO_BAJA}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

export function renderTexto(c: CampanaEstructura): string {
  const perritos = c.perritos.map((p) => `- ${p.nombre}, ${p.edadTexto}${p.historiaCorta ? `. ${p.historiaCorta}` : ''}`)
  const url = esUrlHttp(c.llamado.url) ?? ''
  return [
    c.saludo,
    c.parrafos.join('\n\n'),
    perritos.join('\n'),
    `${c.llamado.texto}: ${url}`,
    `${POR_QUE} ${AVISO_BAJA}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

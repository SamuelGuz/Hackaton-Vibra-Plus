import type { EstadoDosisFicha, FichaVM } from '@huellitas/shared/vistas'
import { esc } from './html'

const CSS = `body{margin:0;padding:12px;font:20px/1.4 system-ui,sans-serif;background:#fff;color:#111}
h1{font-size:32px;margin:0}h2{font-size:22px;margin:16px 0 6px}
.canil{font-size:20px;color:#333}.foto{width:72px;height:72px;object-fit:cover;border-radius:8px;float:left;margin-right:12px}
.adv{background:#b00020;color:#fff;font-weight:700;padding:10px 12px;margin:6px 0;border-radius:6px}
.dosis{padding:10px 12px;margin:6px 0;border-radius:6px;border:3px solid #111}
.dada{background:#c8f7c5;border-color:#0a6b1d}.por_confirmar{background:#fff3a0;border-color:#8a6d00}
.pendiente{background:#fff;border-color:#111}.atrasada{background:#ffd6d6;border-color:#b00020}
.btn{display:block;text-align:center;font-size:24px;font-weight:700;padding:16px;margin:12px 0;border-radius:8px;background:#111;color:#fff;text-decoration:none}
.llamar{display:inline-block;margin-top:6px;padding:8px 14px;background:#111;color:#fff;border-radius:6px;text-decoration:none}`

const ETIQUETA: Record<EstadoDosisFicha, string> = {
  dada: 'Dada',
  por_confirmar: 'Por confirmar',
  pendiente: 'Pendiente',
  atrasada: 'Atrasada',
}

/** Solo enlaces web, de teléfono o WhatsApp; cualquier otro esquema (javascript:, data:) no se vuelve enlace. */
function href(url: string): string {
  return /^(https?:|tel:)/i.test(url) ? esc(url) : '#'
}

function comida(c: FichaVM['comida']): string {
  if (c.estado === 'no_consta') return 'No consta que haya comido'
  const base = c.estado === 'comio' ? 'Comió' : 'Reportado, sin confirmar'
  return c.texto ?? (c.hora ? `${base} a las ${c.hora}` : base)
}

function filaDosis(d: FichaVM['dosis'][number], vista: FichaVM['vista']): string {
  const llamar = vista === 'equipo' && d.llamarA ? `<br><a class="llamar" href="${href(d.llamarA)}">Llamar</a>` : ''
  const texto = d.texto ? `<br>${esc(d.texto)}` : ''
  return `<div class="dosis ${d.estado}"><strong>${esc(d.hora)}</strong> ${esc(d.medicamento)} – ${ETIQUETA[d.estado]}${texto}${llamar}</div>`
}

/** Ficha de HOY de un animal: HTML sin JavaScript, de arriba abajo como diseno §5.2. */
export function renderFicha(vm: FichaVM): string {
  const publica = vm.vista === 'publica'
  const foto = vm.fotoUrl ? `<img class="foto" src="${href(vm.fotoUrl)}" alt="Foto de ${esc(vm.nombre)}">` : ''
  const advertencias = vm.advertencias.map((a) => `<div class="adv">⚠ ${esc(a)}</div>`).join('')
  const dosis = vm.dosis.length ? vm.dosis.map((d) => filaDosis(d, vm.vista)).join('') : '<p>Sin medicamentos hoy</p>'
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(vm.nombre)} – Huellitas</title><style>${CSS}</style></head><body>
<header>${foto}<h1>${esc(vm.nombre)}</h1><div class="canil">${esc(vm.canil)}</div></header>
${publica ? `<p>${esc(vm.encabezadoPublico)}</p>` : ''}${advertencias}
<h2>Comida de hoy</h2><p>${esc(comida(vm.comida))}</p>
<h2>Medicamentos de hoy</h2>${dosis}
<a class="btn" href="${href(vm.registrarUrl)}">Registrar</a>
${publica ? `<a class="btn" href="${href(vm.contactoUrl)}">Llamar al albergue</a>` : ''}
</body></html>`
}

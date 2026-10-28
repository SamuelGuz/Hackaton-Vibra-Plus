// Hoja de informe en HTML, con el mismo diseño del panel ("la libreta que no se moja"):
// papel claro, tinta azul, letras grandes y semáforo verde / arcilla / rojo.
// Se dibuja a 540 px de ancho con el doble de densidad: sale una imagen de 1080 px que se lee bien en el celular.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

export const ANCHO = 540

const requerir = createRequire(import.meta.url)
function fuente(paquete: string, archivo: string): string {
  try {
    return readFileSync(requerir.resolve(`${paquete}/files/${archivo}`)).toString('base64')
  } catch {
    return ''
  }
}
let fuentes: string | null = null
function cssFuentes(): string {
  fuentes ??= [
    ['Bricolage', fuente('@fontsource-variable/bricolage-grotesque', 'bricolage-grotesque-latin-wght-normal.woff2')],
    ['Atkinson', fuente('@fontsource-variable/atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-wght-normal.woff2')],
  ]
    .filter(([, datos]) => datos)
    .map(([nombre, datos]) => `@font-face{font-family:'${nombre}';src:url(data:font/woff2;base64,${datos}) format('woff2');font-weight:200 800;}`)
    .join('')
  return fuentes
}

export type Tono = 'bien' | 'ojo' | 'urgente' | 'neutro'

export const esc = (t: string) =>
  t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const ESTILOS = `
:root{--papel:#f5efe3;--hondo:#ebe2d0;--claro:#fbf8f1;--tinta:#1f2a44;--lapiz:#595449;
--bien:#2f6b3b;--ojo:#a8432c;--urgente:#b3261e;--bien-s:#dce8d4;--ojo-s:#f3dccf;--urgente-s:#f5d3cf;--neutro:#1f2a44;--neutro-s:#e3e6ee}
*{box-sizing:border-box;margin:0;padding:0}
body{width:${ANCHO}px;background:var(--papel);color:var(--tinta);font-family:'Atkinson',Verdana,sans-serif;font-size:17px;line-height:1.35}
.hoja{padding:28px 24px 22px;display:grid;gap:18px}
h1,h2,.numero{font-family:'Bricolage','Trebuchet MS',sans-serif}
.cabeza{display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:3px solid var(--tinta)}
.cabeza svg{flex:none}
.marca{font-size:14px;font-weight:700;color:var(--ojo);letter-spacing:.02em;text-transform:uppercase}
h1{font-size:30px;line-height:1.05;font-weight:800}
.fecha{font-size:14px;color:var(--lapiz);margin-top:2px}
.tarjeta{background:var(--claro);border-radius:6px;padding:16px 16px 14px;box-shadow:0 1px 0 rgb(31 42 68/.06),0 8px 18px -12px rgb(31 42 68/.4);display:grid;gap:10px}
h2{font-size:19px;font-weight:700}
.sub{font-size:14px;color:var(--lapiz)}
.numero{font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.02em;line-height:1}
.grande{font-size:52px}
.medio{font-size:30px}
.cifras{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
.cifra{border-radius:6px;padding:12px;display:grid;gap:6px}
.cifra .etq{font-size:14px;font-weight:700}
.cifras.tres{grid-template-columns:repeat(3,1fr);gap:8px}
.cifras.tres .cifra{padding:10px}
.cifras.tres .medio{font-size:21px;letter-spacing:-.03em}
.t-bien{color:var(--bien)}.t-ojo{color:var(--ojo)}.t-urgente{color:var(--urgente)}.t-neutro{color:var(--tinta)}
.f-bien{background:var(--bien-s)}.f-ojo{background:var(--ojo-s)}.f-urgente{background:var(--urgente-s)}.f-neutro{background:var(--neutro-s)}
.b-bien{background:var(--bien)}.b-ojo{background:var(--ojo)}.b-urgente{background:var(--urgente)}.b-neutro{background:var(--tinta)}
.fila{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:baseline}
.fila .nombre{font-weight:700}
.fila .valor{font-weight:700;font-variant-numeric:tabular-nums;font-family:'Bricolage',sans-serif}
.riel{grid-column:1/-1;height:14px;border-radius:999px;background:var(--hondo);overflow:hidden}
.riel>div{height:100%;border-radius:999px}
.columnas{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;align-items:end;height:170px;padding-top:18px;border-bottom:2px solid var(--tinta)}
.col{display:flex;gap:3px;align-items:flex-end;justify-content:center;height:100%}
.col>div{width:16px;border-radius:4px 4px 0 0;min-height:2px;position:relative}
.col>div>span{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:3px;font-size:12px;font-weight:800;font-family:'Bricolage',sans-serif;white-space:nowrap}
.dias{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;font-size:13px;color:var(--lapiz);text-align:center;margin-top:4px}
.dias b{display:block;color:var(--tinta);font-size:14px}
.leyenda{display:flex;gap:16px;font-size:14px;font-weight:700}
.leyenda span{display:inline-flex;align-items:center;gap:6px}
.leyenda i{width:14px;height:14px;border-radius:3px;display:inline-block}
.lista{display:grid;gap:8px}
.item{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:8px 0;border-bottom:2px dashed var(--hondo)}
.item:last-child{border-bottom:0}
.hora{font-family:'Bricolage',sans-serif;font-weight:800;font-size:16px;min-width:76px}
.que{display:grid}.que b{font-size:16px}.que span{font-size:13px;color:var(--lapiz)}
.chip{font-size:13px;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap}
.pie{font-size:12px;color:var(--lapiz);text-align:center;padding-top:4px}
`

const HUELLA = `<svg width="44" height="44" viewBox="110 130 300 310" fill="#a8432c" aria-hidden="true">
<path d="M256 268c-52 2-104 52-110 104-5 40 22 62 56 58 22-3 36-14 56-14s33 12 56 14c35 3 60-20 54-60-8-52-60-104-112-102z"/>
<path d="M150 238c-22 4-34 30-27 56 7 25 29 39 49 33 20-7 27-32 20-56-7-23-23-37-42-33z"/>
<path d="M214 150c-24 2-38 30-34 62 4 30 24 50 46 46 23-4 33-32 28-62-5-29-19-48-40-46z"/>
<path d="M300 148c-22-1-38 18-42 46-5 31 6 58 29 62 22 3 41-17 45-48 4-31-11-59-32-60z"/>
<path d="M366 234c-19-5-37 9-44 31-8 25 0 50 20 57 21 6 42-9 49-34 7-26-5-49-25-54z"/></svg>`

export function fechaLarga(ahora: Date): string {
  const dia = ahora.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  const hora = ahora.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${hora}`
}

/** Hoja completa: encabezado con la marca, el título y la fecha; las tarjetas; y una nota al pie */
export function hoja(titulo: string, ahora: Date, cuerpo: string[]): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${cssFuentes()}${ESTILOS}</style></head>
<body><main class="hoja">
<header class="cabeza">${HUELLA}<div><p class="marca">Refugio Yesenia</p><h1>${esc(titulo)}</h1><p class="fecha">${esc(fechaLarga(ahora))}</p></div></header>
${cuerpo.join('\n')}
<p class="pie">Con los datos confirmados en el panel · lo que falta confirmar no se cuenta</p>
</main></body></html>`
}

export function tarjeta(titulo: string, contenido: string, sub?: string): string {
  return `<section class="tarjeta"><div><h2>${esc(titulo)}</h2>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>${contenido}</section>`
}

/** Cuadritos de colores con un número grande y su nombre */
export function cifras(lista: { etiqueta: string; valor: string; tono: Tono; nota?: string }[]): string {
  return `<div class="cifras${lista.length >= 3 ? ' tres' : ''}">${lista
    .map(
      (x) =>
        `<div class="cifra f-${x.tono}"><span class="etq t-${x.tono}">${esc(x.etiqueta)}</span>` +
        `<span class="numero medio t-${x.tono}">${esc(x.valor)}</span>${x.nota ? `<span class="sub">${esc(x.nota)}</span>` : ''}</div>`,
    )
    .join('')}</div>`
}

/** Barras horizontales: nombre, valor y un riel que se llena según la proporción (0 a 1) */
export function barras(lista: { nombre: string; valor: string; proporcion: number; tono: Tono; nota?: string }[]): string {
  return `<div class="lista">${lista
    .map(
      (x) =>
        `<div class="fila"><span class="nombre">${esc(x.nombre)}</span><span class="valor t-${x.tono}">${esc(x.valor)}</span>` +
        `<div class="riel"><div class="b-${x.tono}" style="width:${Math.round(Math.min(1, Math.max(0, x.proporcion)) * 100)}%"></div></div>` +
        `${x.nota ? `<span class="sub" style="grid-column:1/-1">${esc(x.nota)}</span>` : ''}</div>`,
    )
    .join('')}</div>`
}

/** Columnas por día, con una o varias series lado a lado. Encima de cada barra va su valor. */
export function columnas(
  dias: { etiqueta: string; dia: string }[],
  series: { nombre: string; tono: Tono; valores: number[] }[],
  formato: (n: number) => string = String,
): string {
  const max = Math.max(1, ...series.flatMap((s) => s.valores))
  const cols = dias
    .map(
      (_, i) =>
        `<div class="col">${series
          .map((s) => {
            const v = s.valores[i]
            const etiqueta = v > 0 ? `<span class="t-${s.tono}">${esc(formato(v))}</span>` : ''
            return `<div class="b-${s.tono}" style="height:${(v / max) * 100}%">${etiqueta}</div>`
          })
          .join('')}</div>`,
    )
    .join('')
  const etiquetas = dias.map((d) => `<span><b>${esc(d.dia)}</b>${esc(d.etiqueta)}</span>`).join('')
  const leyenda = series.map((s) => `<span><i class="b-${s.tono}"></i>${esc(s.nombre)}</span>`).join('')
  return `<div class="leyenda">${leyenda}</div><div class="columnas">${cols}</div><div class="dias">${etiquetas}</div>`
}

/** Renglones con hora, qué y una etiqueta de color al final */
export function renglones(lista: { hora: string; titulo: string; detalle: string; chip: string; tono: Tono }[]): string {
  return `<div class="lista">${lista
    .map(
      (x) =>
        `<div class="item"><span class="hora">${esc(x.hora)}</span><span class="que"><b>${esc(x.titulo)}</b><span>${esc(x.detalle)}</span></span>` +
        `<span class="chip f-${x.tono} t-${x.tono}">${esc(x.chip)}</span></div>`,
    )
    .join('')}</div>`
}

export function numeroGrande(valor: string, tono: Tono, nota?: string): string {
  return `<div><p class="numero grande t-${tono}">${esc(valor)}</p>${nota ? `<p class="sub" style="margin-top:6px">${esc(nota)}</p>` : ''}</div>`
}

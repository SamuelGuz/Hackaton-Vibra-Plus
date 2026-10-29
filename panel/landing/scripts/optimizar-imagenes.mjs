#!/usr/bin/env node
// Regenerates every web image from `fuentes/` deterministically.
//
//   node scripts/optimizar-imagenes.mjs
//
// Outputs:
//   public/media/img/<slug>-<480|960|1600>.webp   (always the three names, never upscaled)
//   src/contenido/imagenes.ts                      (typed manifest, generated)
//   docs/imagenes.md                               (catalog table, generated)
//
// The IMAGENES table below maps each original filename to a stable slug. When an
// image is replaced in `fuentes/` (for example after removing its background),
// keep the same base name (the extension may change, e.g. .jpg -> .png) and
// rerun this script: paths stay the same, and `conFondo` / `tipo` are recomputed
// from the real alpha channel.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FUENTES = path.join(RAIZ, 'fuentes');
const SALIDA = path.join(RAIZ, 'public', 'media', 'img');
const MANIFIESTO = path.join(RAIZ, 'src', 'contenido', 'imagenes.ts');
const DOC = path.join(RAIZ, 'docs', 'imagenes.md');
const URL_BASE = '/media/img';

const ANCHOS = [480, 960, 1600];
const CALIDAD = 80;
// A source counts as a real cut-out when at least this share of its border
// pixels is transparent (alpha < 16).
const UMBRAL_BORDE_TRANSPARENTE = 0.3;

/**
 * original: exact filename inside fuentes/ (matched by base name, extension may change)
 * tipo: type used while the image still has a background; becomes 'recorte'
 *       automatically when the source turns out to be transparent
 *       ('hoja-personaje' is never changed).
 * recorte: optional { left, top, width, height } crop in source pixels
 *          (used to extract a single view from a character turnaround sheet).
 */
const IMAGENES = [
  { original: '1.png', slug: 'beagle-asomado', tipo: 'recorte',
    alt: 'Beagle tricolor asomado sobre un borde, con las patas apoyadas y mirando hacia arriba',
    sugerencia: 'Solapado entre secciones: apoyar el borde inferior sobre el corte de una sección o encima de una tarjeta' },
  { original: '2.png', slug: 'beagle-asomado-pata', tipo: 'recorte',
    alt: 'Beagle asomado sobre un borde mostrando la almohadilla de una pata y mirando hacia arriba',
    sugerencia: 'Variante del beagle asomado: borde de formulario de donación o pie de página' },
  { original: '3.png', slug: 'tres-perros-sentados', tipo: 'recorte',
    alt: 'Tres perros sentados: uno blanco de perfil, un dálmata de frente y uno negro de perfil',
    sugerencia: 'Decoración lateral de sección (adopción, requisitos); funciona sobre fondos claros u oscuros' },
  { original: '301CBBDA-25E3-4A7A-A419-FA77A2996EEF.png', slug: 'gatos-abrazados-foto', tipo: 'escena',
    alt: 'Dos gatos atigrados dormidos abrazados',
    sugerencia: 'Tiene fondo y un borde blanco inclinado a la izquierda; existe la versión recortada gatos-abrazados. Usar en tarjeta de gatos si se prefiere la foto' },
  { original: '4.png', slug: 'seis-perros-fila', tipo: 'recorte',
    alt: 'Seis perros de distintas razas asomados en fila, entre ellos dos dálmatas y un cachorro negro',
    sugerencia: 'Franja inferior del hero o separador de secciones a todo el ancho' },
  { original: '47FF83B5-8D14-47C1-9894-FF04B5DA1F35.png', slug: 'dos-perros-juntos', tipo: 'recorte',
    alt: 'Dos perros mestizos juntos: uno de pelo hirsuto sonriendo y uno blanco y negro sentado detrás',
    sugerencia: 'Hero secundario o sección "Quiénes somos"; el borde inferior está cortado, anclar abajo' },
  { original: '48E99E06-B03D-4486-B736-6C0567622CB0.png', slug: 'cachorro-atigrado-ladrillo', tipo: 'escena',
    alt: 'Cachorro atigrado de orejas caídas mirando a la cámara frente a una pared de ladrillo',
    sugerencia: 'Tarjeta vertical de adopción; existe la versión recortada cachorro-atigrado' },
  { original: '5.png', slug: 'perro-cafe-sonriente', tipo: 'recorte',
    alt: 'Perro mestizo café de pelo largo sonriendo con la lengua afuera',
    sugerencia: 'Hero principal: expresión alegre y contorno completo, se puede flotar sobre cualquier color' },
  { original: '6.png', slug: 'perro-abuelo-pata-vendada', tipo: 'recorte',
    alt: 'Perro mayor de pelo gris y blanco acostado con una pata vendada',
    sugerencia: 'Sección de historias de rescate o donaciones para tratamientos; el pelaje toca los bordes, anclar a una esquina' },
  { original: '8A6F3FE0-D7F5-423B-B01E-6EC433EF0FD1.png', slug: 'perro-cafe-lengua-ladrillo', tipo: 'escena',
    alt: 'Perro café de orejas caídas sonriendo con la lengua afuera frente a una pared de ladrillo',
    sugerencia: 'Tarjeta de adopción o testimonio; mismo perro que perro-cafe-lengua-cuadros' },
  { original: '924AF46E-E62E-4D96-B682-68D25CB44F21.png', slug: 'perros-calle-grupo-ladrillo', tipo: 'escena',
    alt: 'Grupo de perros mestizos rescatados juntos frente a una pared de ladrillo',
    sugerencia: 'Sección "El refugio hoy" o fondo de bloque de donación con overlay oscuro' },
  { original: 'A9E56DAD-841D-4A2E-BE58-DF984D1A28E7.png', slug: 'perro-cafe-lengua-cuadros', tipo: 'estudio',
    alt: 'Perro café de orejas caídas sonriendo con la lengua afuera',
    sugerencia: 'ATENCIÓN: el fondo es un patrón de cuadros falso pintado (no es transparencia real) con marca de agua; quitar el fondo antes de usar' },
  { original: 'B52490AF-B0FE-4B36-9911-B01254F38F41.png', slug: 'chihuahua-primer-plano', tipo: 'escena',
    alt: 'Chihuahua negro y fuego en primer plano sonriendo sobre un piso de madera',
    sugerencia: 'Tarjeta de adopción de perros pequeños' },
  { original: 'Brown_dogs_looking_up_9eb197f5_2K.jpg', slug: 'cinco-perros-mirando-arriba', tipo: 'estudio',
    alt: 'Cinco perros mestizos cafés y atigrados juntos mirando hacia arriba sobre fondo blanco',
    sugerencia: 'Banner horizontal de llamada a la acción ("Ellos te esperan"); fondo blanco fácil de recortar' },
  { original: 'Chihuahua_character_turnaround_s…_07003b4e_2K.jpg', slug: 'hoja-chihuahua', tipo: 'hoja-personaje',
    alt: 'Hoja de personaje de un chihuahua con vistas de frente, tres cuartos, perfil, espalda y primer plano',
    sugerencia: 'No usar tal cual (varias vistas en una imagen). Usar chihuahua-cara' },
  { original: 'Chihuahua_character_turnaround_s…_07003b4e_2K.jpg', slug: 'chihuahua-cara', tipo: 'estudio',
    recorte: { left: 1820, top: 870, width: 676, height: 666 },
    alt: 'Cara de un chihuahua negro y fuego sonriendo de frente',
    sugerencia: 'Avatar o tarjeta pequeña de adopción (extraída de hoja-chihuahua)' },
  { original: 'DA31A476-1850-415D-AA2B-6396C71B1BAD.png', slug: 'gatos-abrazados', tipo: 'recorte',
    alt: 'Dos gatos atigrados dormidos abrazados',
    sugerencia: 'Sección de gatos o hero alternativo; transmite calma y cuidado' },
  { original: 'Dog_character_design_turnaround_…_c46c8138_2K.jpg', slug: 'hoja-perro-blanco-negro', tipo: 'hoja-personaje',
    alt: 'Hoja de personaje de un perro grande blanco y negro con varias vistas',
    sugerencia: 'No usar tal cual (varias vistas en una imagen). Usar perro-blanco-negro-cara' },
  { original: 'Dog_character_design_turnaround_…_c46c8138_2K.jpg', slug: 'perro-blanco-negro-cara', tipo: 'estudio',
    recorte: { left: 1948, top: 872, width: 700, height: 584 },
    alt: 'Cara de frente de un perro grande blanco y negro de orejas caídas',
    sugerencia: 'Tarjeta de adopción (extraída de hoja-perro-blanco-negro)' },
  { original: 'Dog_character_turnaround_sheet_ffdb7c0b_2K.jpg', slug: 'hoja-perro-crema', tipo: 'hoja-personaje',
    alt: 'Hoja de personaje de un perro crema llamado Milo con varias vistas',
    sugerencia: 'No usar tal cual (varias vistas en una imagen). Usar perro-crema-cara' },
  { original: 'Dog_character_turnaround_sheet_ffdb7c0b_2K.jpg', slug: 'perro-crema-cara', tipo: 'estudio',
    recorte: { left: 1908, top: 880, width: 740, height: 564 },
    alt: 'Cara de frente de un perro crema sonriendo con la lengua afuera',
    sugerencia: 'Tarjeta de adopción (extraída de hoja-perro-crema)' },
  { original: 'Dog_character_turnaround_sheet_l…_c3cde602_2K.jpg', slug: 'hoja-perro-negro-fuego', tipo: 'hoja-personaje',
    alt: 'Hoja de personaje de un perro negro y fuego llamado Buddy con varias vistas',
    sugerencia: 'No usar tal cual (varias vistas en una imagen). Usar perro-negro-fuego-cara' },
  { original: 'Dog_character_turnaround_sheet_l…_c3cde602_2K.jpg', slug: 'perro-negro-fuego-cara', tipo: 'estudio',
    recorte: { left: 1668, top: 884, width: 668, height: 572 },
    alt: 'Cara de frente de un perro negro y fuego de orejas caídas',
    sugerencia: 'Tarjeta de adopción (extraída de hoja-perro-negro-fuego)' },
  { original: 'E04B29E9-9A06-4DF1-BF3B-CEC2557EDF1B.png', slug: 'perros-calle-grupo-cuadros', tipo: 'escena',
    alt: 'Grupo de perros mestizos rescatados juntos',
    sugerencia: 'ATENCIÓN: la parte superior tiene un patrón de cuadros falso pintado (no es transparencia real) con marca de agua; quitar el fondo antes de usar' },
  { original: 'F427C150-77B6-4C2A-83C8-DD74BCAB5CDE.png', slug: 'cachorro-atigrado', tipo: 'recorte',
    alt: 'Cachorro atigrado de orejas caídas mirando a la cámara con la cabeza inclinada',
    sugerencia: 'Hero o bloque de adopción: mirada directa muy emotiva; anclar al borde inferior' },
  { original: 'Four_dogs_posing_in_studio_86943680_2K.jpg', slug: 'cuatro-perros-collares', tipo: 'estudio',
    alt: 'Cuatro perros mestizos sentados en fila con collares de colores sobre fondo gris claro',
    sugerencia: 'Sección de adopción o "Conoce a la manada"; formato panorámico' },
  { original: 'Gemini_Generated_Image_dtrkpddtrkpddtrk.jpg', slug: 'manada-perros-rescatados', tipo: 'estudio',
    alt: 'Grupo de perros mestizos delgados y con el pelo maltratado sobre fondo blanco',
    sugerencia: 'Historia de "antes del rescate"; imagen generada con IA, revisar si se usa' },
  { original: 'Rescued_dogs_posing_for_adoption_a52d8bc5_2K.jpg', slug: 'dos-perros-adopcion', tipo: 'estudio',
    alt: 'Dos perros rescatados de pie, uno blanco y negro y otro crema, sobre fondo blanco',
    sugerencia: 'Llamada a la acción de adopción; mucho aire alrededor para texto' },
  { original: 'Tabby_cat_character_turnaround_s…_87e62f67_2K.jpg', slug: 'hoja-gato-atigrado', tipo: 'hoja-personaje',
    alt: 'Hoja de personaje de un gato atigrado con varias vistas',
    sugerencia: 'No usar tal cual (varias vistas en una imagen). Usar gato-atigrado-cara' },
  { original: 'Tabby_cat_character_turnaround_s…_87e62f67_2K.jpg', slug: 'gato-atigrado-cara', tipo: 'estudio',
    recorte: { left: 1940, top: 850, width: 572, height: 602 },
    alt: 'Cara de frente de un gato atigrado con pecho blanco',
    sugerencia: 'Tarjeta de adopción de gatos (extraída de hoja-gato-atigrado)' },
  { original: 'Tabby_kitten_character_turnaroun…_94a90708_2K.jpg', slug: 'hoja-gatito-atigrado', tipo: 'hoja-personaje',
    alt: 'Hoja de personaje de un gatito atigrado llamado Tito con varias vistas',
    sugerencia: 'No usar tal cual (varias vistas en una imagen). Usar gatito-atigrado-cara' },
  { original: 'Tabby_kitten_character_turnaroun…_94a90708_2K.jpg', slug: 'gatito-atigrado-cara', tipo: 'estudio',
    recorte: { left: 1668, top: 880, width: 592, height: 560 },
    alt: 'Cara de frente de un gatito atigrado con la boca abierta',
    sugerencia: 'Tarjeta de adopción de gatitos (extraída de hoja-gatito-atigrado)' },
  { original: 'Terrier_character_turnaround_sheet_ed195a64_2K.jpg', slug: 'hoja-terrier-gris', tipo: 'hoja-personaje',
    alt: 'Hoja de personaje de un terrier gris de pelo hirsuto con varias vistas',
    sugerencia: 'No usar tal cual (varias vistas en una imagen). Usar terrier-gris-cara' },
  { original: 'Terrier_character_turnaround_sheet_ed195a64_2K.jpg', slug: 'terrier-gris-cara', tipo: 'estudio',
    recorte: { left: 2012, top: 888, width: 640, height: 564 },
    alt: 'Cara de frente de un terrier gris de pelo hirsuto',
    sugerencia: 'Tarjeta de adopción (extraída de hoja-terrier-gris)' },
  { original: 'Two_rescue_dogs_sitting_f287165b_2K.jpg', slug: 'chihuahua-y-perro-grande', tipo: 'estudio',
    alt: 'Un chihuahua y un perro grande blanco y negro sentados juntos sobre fondo blanco',
    sugerencia: 'Sección "Todos los tamaños" o llamada a la acción de adopción' },
];

const quitarExtension = (nombre) => nombre.replace(/\.[^.]+$/, '');

function resolverFuente(original, archivos) {
  if (archivos.includes(original)) return original;
  const base = quitarExtension(original).normalize('NFC');
  const candidatos = archivos.filter((f) => quitarExtension(f).normalize('NFC') === base).sort();
  return candidatos[0] ?? null;
}

async function analizarTransparencia(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().extractChannel(3).raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  let borde = 0;
  let bordeTransparente = 0;
  const contar = (x, y) => { borde++; if (data[y * W + x] < 16) bordeTransparente++; };
  for (let x = 0; x < W; x++) { contar(x, 0); contar(x, H - 1); }
  for (let y = 1; y < H - 1; y++) { contar(0, y); contar(W - 1, y); }
  // Bounding box of visible pixels, used to trim empty margins of cut-outs.
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[y * W + x] >= 8) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  const caja = x1 < 0 ? null : { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
  return { proporcionBorde: bordeTransparente / borde, caja };
}

async function procesar(entrada, archivos) {
  const archivo = resolverFuente(entrada.original, archivos);
  if (!archivo) throw new Error(`Missing source in fuentes/: ${entrada.original} (slug ${entrada.slug})`);

  // Normalize orientation and optional crop into one in-memory PNG.
  let tubo = sharp(path.join(FUENTES, archivo)).rotate();
  if (entrada.recorte) tubo = tubo.extract(entrada.recorte);
  let base = await tubo.png().toBuffer();
  const meta = await sharp(base).metadata();

  let conFondo = true;
  if (meta.hasAlpha) {
    const { proporcionBorde, caja } = await analizarTransparencia(base);
    if (proporcionBorde >= UMBRAL_BORDE_TRANSPARENTE) {
      conFondo = false;
      if (caja && (caja.width < meta.width || caja.height < meta.height)) {
        base = await sharp(base).extract(caja).png().toBuffer();
      }
    }
  }
  if (conFondo) base = await sharp(base).flatten({ background: '#ffffff' }).png().toBuffer();

  const { width: ancho, height: alto } = await sharp(base).metadata();
  const tipo = entrada.tipo === 'hoja-personaje' ? 'hoja-personaje' : (conFondo ? entrada.tipo : 'recorte');

  // Always write the three names so paths are stable; never upscale.
  const reales = new Map();
  for (const objetivo of ANCHOS) {
    const real = Math.min(objetivo, ancho);
    const destino = path.join(SALIDA, `${entrada.slug}-${objetivo}.webp`);
    await sharp(base)
      .resize({ width: real, withoutEnlargement: true })
      .webp({ quality: CALIDAD, alphaQuality: 90, effort: 5 })
      .toFile(destino);
    if (!reales.has(real)) reales.set(real, `${URL_BASE}/${entrada.slug}-${objetivo}.webp`);
  }
  const srcset = [...reales].map(([w, url]) => `${url} ${w}w`).join(', ');

  return {
    id: entrada.slug,
    original: archivo,
    ...(entrada.recorte ? { recorteDe: entrada.recorte } : {}),
    alt: entrada.alt,
    conFondo,
    tipo,
    ancho,
    alto,
    src: `${URL_BASE}/${entrada.slug}-960.webp`,
    srcset,
    sugerencia: entrada.sugerencia,
  };
}

function generarManifiesto(lista) {
  const cuerpo = lista.map((i) => `  ${JSON.stringify(i.id)}: ${JSON.stringify(i, null, 2).replace(/\n/g, '\n  ')},`).join('\n');
  return `// GENERATED by scripts/optimizar-imagenes.mjs — do not edit by hand.
// To change alt text, type or suggestion edit the IMAGENES table in that script and rerun it.

export type TipoImagen = 'recorte' | 'estudio' | 'escena' | 'hoja-personaje';

export interface Imagen {
  /** Stable slug; also the file prefix in /media/img. */
  id: string;
  /** Source filename inside fuentes/. */
  original: string;
  /** Crop (source pixels) when this asset was extracted from a larger sheet. */
  recorteDe?: { left: number; top: number; width: number; height: number };
  alt: string;
  /** true while the source still has a background; false for real transparent cut-outs. */
  conFondo: boolean;
  tipo: TipoImagen;
  /** Intrinsic size of the processed image (after crop/trim). */
  ancho: number;
  alto: number;
  /** 960 variant (never upscaled). */
  src: string;
  srcset: string;
  /** Where it fits on the page. */
  sugerencia: string;
}

export const imagenes = {
${cuerpo}
} as const satisfies Record<string, Imagen>;

export type SlugImagen = keyof typeof imagenes;

export interface AtributosImg {
  src: string;
  srcSet: string;
  sizes: string;
  width: number;
  height: number;
  alt: string;
}

/**
 * Spreadable <img> attributes for a slug:
 *   <img {...img('perro-cafe-sonriente', '(max-width: 768px) 90vw, 40vw')} loading="lazy" />
 */
export function img(slug: SlugImagen, sizes = '(max-width: 768px) 100vw, 50vw'): AtributosImg {
  const i: Imagen = imagenes[slug];
  return { src: i.src, srcSet: i.srcset, sizes, width: i.ancho, height: i.alto, alt: i.alt };
}
`;
}

function generarDoc(lista) {
  const fila = (i) => `| \`${i.id}\` | ${i.conFondo ? 'sí' : 'no'} | ${i.tipo} | ${i.ancho}×${i.alto} | ${i.original.replace(/\|/g, '\\|')}${i.recorteDe ? ' (recorte)' : ''} | ${i.sugerencia.replace(/\|/g, '\\|')} |`;
  const conFondo = lista.filter((i) => i.conFondo && i.tipo !== 'hoja-personaje').length;
  const sinFondo = lista.filter((i) => !i.conFondo).length;
  const hojas = lista.filter((i) => i.tipo === 'hoja-personaje').length;
  return `# Imágenes del sitio

> Generado por \`scripts/optimizar-imagenes.mjs\`. No editar a mano: cambiar la tabla \`IMAGENES\` del script y volver a ejecutarlo.

Resumen: **${lista.length}** imágenes — ${sinFondo} sin fondo (recortes), ${conFondo} con fondo, ${hojas} hojas de personaje (no usar tal cual; de cada una se extrajo la cara de frente como imagen propia).

Cada imagen se publica como \`/media/img/<slug>-480.webp\`, \`-960.webp\` y \`-1600.webp\`. Los tres nombres existen siempre; si el original es más pequeño no se amplía (el archivo queda al tamaño original y el \`srcset\` solo lista anchos reales).

En React:

\`\`\`tsx
import { img } from '../contenido/imagenes';

<img {...img('perro-cafe-sonriente', '(max-width: 768px) 90vw, 40vw')} loading="lazy" />
\`\`\`

| slug | conFondo | tipo | tamaño | original | uso sugerido |
| --- | --- | --- | --- | --- | --- |
${lista.map(fila).join('\n')}

## Cómo reemplazar una imagen después de quitarle el fondo

1. Exportar la imagen sin fondo como **PNG con transparencia**.
2. Guardarla en \`fuentes/\` con **el mismo nombre** que el original (la extensión puede cambiar, por ejemplo \`Four_dogs_posing_in_studio_86943680_2K.jpg\` → \`Four_dogs_posing_in_studio_86943680_2K.png\`) y borrar o mover el archivo viejo.
3. Ejecutar desde la raíz del proyecto:

   \`\`\`
   node scripts/optimizar-imagenes.mjs
   \`\`\`

4. Listo: las rutas \`/media/img/<slug>-*.webp\` no cambian. El script detecta la transparencia real, marca \`conFondo: false\`, cambia el tipo a \`recorte\` y recorta los márgenes vacíos. Las caras extraídas de hojas de personaje usan las mismas coordenadas, así que una hoja sin fondo también produce caras sin fondo.

Notas:

- \`perro-cafe-lengua-cuadros\` y \`perros-calle-grupo-cuadros\` tienen un **patrón de cuadros pintado** que imita transparencia (no es transparencia real) y marca de agua: hay que quitarles el fondo.
- \`gatos-abrazados-foto\` tiene un borde blanco inclinado a la izquierda; ya existe la versión recortada \`gatos-abrazados\`.
- Para agregar una imagen nueva: copiarla a \`fuentes/\`, añadir una fila a \`IMAGENES\` en el script con su \`slug\`, \`alt\`, \`tipo\` y \`sugerencia\`, y ejecutar el script.
`;
}

async function main() {
  fs.mkdirSync(SALIDA, { recursive: true });
  const archivos = fs.readdirSync(FUENTES).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));

  const slugs = new Set();
  for (const e of IMAGENES) {
    if (slugs.has(e.slug)) throw new Error(`Duplicate slug: ${e.slug}`);
    slugs.add(e.slug);
  }

  const usados = new Set();
  const lista = [];
  for (const entrada of IMAGENES) {
    const r = await procesar(entrada, archivos);
    usados.add(r.original);
    lista.push(r);
    console.log(`${r.conFondo ? 'con fondo' : 'sin fondo'}  ${r.tipo.padEnd(14)} ${r.id} (${r.ancho}x${r.alto})`);
  }

  // Remove stale outputs so the folder mirrors the table exactly.
  const esperados = new Set(IMAGENES.flatMap((e) => ANCHOS.map((w) => `${e.slug}-${w}.webp`)));
  for (const f of fs.readdirSync(SALIDA)) {
    if (f.endsWith('.webp') && !esperados.has(f)) fs.unlinkSync(path.join(SALIDA, f));
  }

  fs.mkdirSync(path.dirname(MANIFIESTO), { recursive: true });
  fs.writeFileSync(MANIFIESTO, generarManifiesto(lista));
  fs.mkdirSync(path.dirname(DOC), { recursive: true });
  fs.writeFileSync(DOC, generarDoc(lista));

  const sinTabla = archivos.filter((f) => !usados.has(f));
  if (sinTabla.length) console.warn(`\nNot in IMAGENES table (ignored): ${sinTabla.join(', ')}`);
  console.log(`\n${lista.length} images -> ${esperados.size} webp files in public/media/img`);
}

main().catch((err) => { console.error(err); process.exit(1); });

// Real refuge photos from the user's image bank, processed by scripts/procesar-banco.mjs.
// `foto` keeps its background; `recorte` is the same frame with a real alpha channel, so the
// two stack pixel-for-pixel and text can sit between them.

export type SlugBanco =
  | 'rescatista-alimentando' | 'perros-pared-ladrillo' | 'perro-detras-reja' | 'perro-estirandose'
  | 'rescatista-beso' | 'perro-blanco-saludo' | 'perro-blanco-sentado' | 'rescatista-cachorro'
  | 'voluntaria-comedero' | 'curacion' | 'perro-sonrisa' | 'cachorro-en-brazos' | 'voluntarios'
  | 'cachorros-durmiendo' | 'perro-abuelo'

const base = (slug: SlugBanco, tipo: 'foto' | 'recorte') => `/media/banco/${slug}-${tipo}`

export function fotoBanco(slug: SlugBanco, sizes = '(min-width: 900px) 50vw, 100vw') {
  const b = base(slug, 'foto')
  return { src: `${b}-1400.webp`, srcSet: `${b}-800.webp 800w, ${b}-1400.webp 1400w`, sizes, width: 1400, height: 1400 }
}

export function recorteBanco(slug: SlugBanco, sizes = '(min-width: 900px) 50vw, 100vw') {
  const b = base(slug, 'recorte')
  return { src: `${b}-1400.webp`, srcSet: `${b}-800.webp 800w, ${b}-1400.webp 1400w`, sizes, width: 1400, height: 1400 }
}

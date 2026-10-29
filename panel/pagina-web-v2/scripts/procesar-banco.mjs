// Builds the web assets from the user's image bank (BANCO DE IMAGENES.zip).
// The "sin fondo" files arrive on solid white, so their alpha comes from an ML matte
// (scripts/videos/segmentar.mjs in the v5 lab) and the white fringe is unmixed.
//
//   node scripts/procesar-banco.mjs <bancoDir> <maskDir>
// Run it with the lab's sharp: NODE_PATH=<lab>/node_modules
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const [banco, masks] = process.argv.slice(2)
const OUT = path.resolve('public/media/banco')
fs.mkdirSync(OUT, { recursive: true })

/** slug -> source numbers. `foto`: full photo with its background; `recorte`: subject on white. */
const BANCO = {
  'rescatista-alimentando': { foto: 7, recorte: 8 },
  'perros-pared-ladrillo': { foto: 9 },
  'perro-detras-reja': { foto: 10 },
  'perro-estirandose': { recorte: 12 },
  'rescatista-beso': { recorte: 14 },
  'perro-blanco-saludo': { recorte: 15 },
  'perro-blanco-sentado': { recorte: 16 },
  'rescatista-cachorro': { foto: 17, recorte: 18 },
  'voluntaria-comedero': { foto: 19 },
  'curacion': { recorte: 22 },
  'perro-sonrisa': { foto: 23, recorte: 24 },
  'cachorro-en-brazos': { foto: 25, recorte: 26 },
  'voluntarios': { foto: 27, recorte: 28 },
  'cachorros-durmiendo': { foto: 29, recorte: 30 },
  'perro-abuelo': { foto: 31, recorte: 32 },
}

const manifest = {}
for (const [slug, src] of Object.entries(BANCO)) {
  const entry = {}
  if (src.foto) {
    const p = path.join(banco, `${src.foto}.png`)
    for (const w of [800, 1400]) await sharp(p).resize(w).webp({ quality: 80 }).toFile(path.join(OUT, `${slug}-foto-${w}.webp`))
    entry.foto = `/media/banco/${slug}-foto-1400.webp`
  }
  if (src.recorte) {
    const p = path.join(banco, `${src.recorte}.png`)
    const m = path.join(masks, `${String(src.recorte).padStart(2, '0')}.png`)
    const { data: rgb, info } = await sharp(p).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const { data: ma } = await sharp(m).resize(info.width, info.height).ensureAlpha().extractChannel(3).blur(0.6).raw().toBuffer({ resolveWithObject: true })
    const out = Buffer.alloc(info.width * info.height * 4)
    for (let i = 0; i < info.width * info.height; i++) {
      let a = ma[i] / 255
      if (a < 0.06) a = 0
      if (a > 0.96) a = 1
      for (let c = 0; c < 3; c++) {
        const v = rgb[i * 3 + c]
        // Unmix the white backdrop from semi-transparent edge pixels.
        out[i * 4 + c] = a > 0 && a < 1 ? Math.max(0, Math.min(255, Math.round((v - (1 - a) * 255) / a))) : v
      }
      out[i * 4 + 3] = Math.round(a * 255)
    }
    const img = sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    for (const w of [800, 1400]) await img.clone().resize(w).webp({ quality: 82, alphaQuality: 92 }).toFile(path.join(OUT, `${slug}-recorte-${w}.webp`))
    entry.recorte = `/media/banco/${slug}-recorte-1400.webp`
  }
  manifest[slug] = entry
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(Object.keys(manifest).length, 'slugs ->', OUT)

# V2 asset map

All runtime assets are local and copied from the current public site's `public/media`.
The manifest in `src/contenido/imagenes.ts` is copied byte-for-byte and remains generated.
Current imagery is reference imagery, not confirmed records of the shelter's animals.

| Asset | Local path | Current use |
| --- | --- | --- |
| Brindle puppy video | `/media/video/perro-2.mp4` | Wild v5 capsule, muted/looping/inline; paused offscreen |
| Puppy poster | `/media/video/perro-2-poster.webp` | Poster and reduced-motion/Save-Data fallback |
| Alternate dog media | `/media/video/perro-{1,3}.{mp4,webm}` and posters | Available for future sections; not loaded by v5 |
| Puppy alpha video | `/media/video/perro-2.webm` | Available for future use; v5 uses its existing MP4 |
| Inter variable | `/media/fonts/inter-latin-variable.woff2` | Self-hosted font; license in the same folder |
| Project photos/cut-outs | `/media/img/*.webp` | Responsive variants resolved via `img(slug)` |

Main image slugs: `gatos-abrazados-foto`, `perro-cafe-lengua-ladrillo`,
`cachorro-atigrado-ladrillo`, `chihuahua-primer-plano`, `beagle-asomado`.
All other existing manifest entries and optimized variants are included for future work.

Original uploaded images/videos remain in the original project's read-only `fuentes/`.
Do not regenerate the manifest from an absent originals directory or edit it by hand.
For new processing, use the original Node pipeline and copy regenerated media and manifest
together after verification. Runtime never needs originals, Python, sharp or ffmpeg.

The baked MP4 backdrop must keep matching `--fondo-hero`. Never multiply-blend the video.

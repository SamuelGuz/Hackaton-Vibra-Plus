# Hero videos: background removal with a soft edge

Two dog clips sit in the top corners of the hero (`perro-1` top left, `perro-2` top right,
or the other way round: the files are symmetric in use). Their studio background is removed
and the cut-out edge is feathered so it melts into the page instead of looking clipped.

## Files

| File | What | Size |
|---|---|---|
| `public/media/video/perro-1.webm` | VP9 + alpha, 894×720, 30 fps, 8.73 s loop | ~0.6 MB |
| `public/media/video/perro-1.mp4` | H.264 over `#F3EEE7` (Safari) | ~0.8 MB |
| `public/media/video/perro-1-poster.webp` | first frame, with alpha | ~53 KB |
| `public/media/video/perro-2.webm` | VP9 + alpha, 554×720 portrait (black bars removed), 30 fps, 18.67 s ping-pong loop | ~1.5 MB |
| `public/media/video/perro-2.mp4` | H.264 over `#F3EEE7` (Safari) | ~1.1 MB |
| `public/media/video/perro-2-poster.webp` | first frame, with alpha | ~43 KB |

Sources (read-only): `fuentes/VIDEOS/VIDEO 1.mp4`, `fuentes/VIDEOS/VIDEO 2.mp4`.

## Markup

WebM first (Chrome, Edge, Firefox play the alpha channel); Safari cannot decode VP9 alpha,
skips the WebM and plays the MP4, which already has the hero colour baked in.

```html
<video class="hero__perro hero__perro--izquierda"
       autoplay muted loop playsinline preload="auto"
       poster="/media/video/perro-1-poster.webp"
       aria-hidden="true">
  <source src="/media/video/perro-1.webm" type="video/webm; codecs=vp9">
  <source src="/media/video/perro-1.mp4" type="video/mp4">
</video>
```

Notes:

- `muted` + `playsinline` are required for autoplay on iOS.
- The videos are decorative: `aria-hidden="true"`, no captions needed (no audio track).
- Honour `prefers-reduced-motion`: pause the video (or show only the poster) when it is set.
- The MP4 fallback is opaque. It only looks right when the hero background is exactly
  `--fondo-hero` (`#F3EEE7`). If that token changes, rerun the script.
- Do not add a CSS `border-radius`/`box-shadow` to the `<video>`: the soft edge is in the pixels.

## Rerun

```bash
node scripts/videos/quitar-fondo.mjs                   # both videos, fondo from tokens.css
node scripts/videos/quitar-fondo.mjs --fondo=#F3EEE7   # force the MP4 background colour
node scripts/videos/quitar-fondo.mjs --solo=perro-2    # one video only
node scripts/videos/quitar-fondo.mjs --trabajo=<dir>   # keep/reuse frames and masks in <dir>
```

MP4 background colour: `--fondo=` wins; otherwise `--fondo-hero` from `src/estilos/tokens.css`
(if it is a `#RRGGBB` value); otherwise `#F3EEE7`.

Runtime: about 7 minutes per video on a laptop CPU (the ML matte is ~1.5 s per frame).
Without `--trabajo` the work directory is created under the OS temp dir and deleted at the end.

## Method

1. **Frames**: `ffmpeg-static` extracts every frame as PNG. VIDEO 2 is a vertical clip
   pillarboxed in 1920×1080, so it is cropped to `776:1080:572:0` first (black bars out).
2. **ML matte**: `scripts/videos/segmentar.mjs` runs `@imgly/background-removal-node`
   (ISNet, "medium" model, bundled in the package, no network) on each frame. It runs in a
   child process because the library ships sharp 0.32, whose libvips DLL clashes on Windows
   with the project's sharp 0.35.
3. **Backdrop plate**: per-pixel average of the pixels the model marks as background
   (every 6th frame), holes filled by a wide normalised blur. Used for the key and the unmix below.
4. **Framing**: union bounding box of the dog over all frames + 6 % padding, scaled to
   720 px tall (even dimensions).
5. **Soft edge** (`scripts/videos/mate.mjs`, values at output resolution):

   | Step | perro-1 | perro-2 |
   |---|---|---|
   | Temporal average of the matte, weights `1 2 3 2 1` (anti-flicker) | ✓ | ✓ |
   | Backdrop key: where matte < 0.985, scale it by `smoothstep(12, 34, RGB distance to plate)` | ✓ | ✓ |
   | Levels: matte < 0.1 → 0, > 0.9 → 1 | ✓ | ✓ |
   | Closing (fill holes), `closePx` | 0 (off) | 0 (off) |
   | Erode (square min filter) | 3 px | 3 px |
   | Gaussian feather (σ) | 7 px | 6 px |
   | Border fade (fraction of the frame) | bottom 24 %, sides/top 3 % | 3 % all sides |

   The long bottom fade on perro-1 hides the line where the chest is cut by the frame.
   The backdrop key matters on perro-2: the model marks the grey gap between tail and thigh as
   ~92 % dog, which showed as a light sliver; the key opens it. Closing is left off because it
   would fill that real gap again.
6. **Colour decontamination**: confident fur colour is pushed outwards with a normalised
   Gaussian (σ 10 px) and partially covered pixels are unmixed against the measured grey
   backdrop plate, so the semi-transparent fringe shows fur, not studio grey (no grey halo).
7. **Seamless loop** (`loop` per video):
   - perro-1 `crossfade`: the last 15 frames (0.5 s) are cross-faded (premultiplied) into the
     first 15 and dropped. Start and end poses match, so no ghosting.
   - perro-2 `pingpong`: the puppy changes pose (no start/end match; a cross-fade showed a
     ghost leg), so it plays forward then backward. Seamless, at the cost of a doubled length.
8. **Encode**:
   - WebM: `libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -crf 34 -b:v 0`, BT.709 tags.
   - MP4: frames composited in RGB over a PNG of the fondo colour, then one RGB → BT.709
     conversion (`accurate_rnd`), `libx264 -crf 22 -preset slow -profile high`, `+faststart`.
     The decoded corner matches the CSS hex within ±1–2 levels. (ffmpeg's `lavfi color` source
     is not used: it is generated in BT.601 YUV and was 2–4 levels off.)
   - Poster: first output frame as WebP with alpha (sharp, q 82, alpha q 90).

Tunables live at the top of `scripts/videos/quitar-fondo.mjs` (`VIDEOS` and `COMMON`).

## Known limitations

- Fine single hairs and whiskers past the silhouette are softened away by design (erode + blur).
- The soft fringe uses extrapolated fur colour, so on a very dark page the outline reads as a
  gentle glow of fur colour rather than real hair detail.
- perro-2's ping-pong loop reverses motion at both ends (a small "bounce" if you watch closely).
- On a dark page the soft fringe of perro-2 reads as a faint warm glow; on the light hero
  (`#F3EEE7`) it is invisible.
- The tail/thigh gap on perro-2 opens with a slightly crisper edge than the outer silhouette.
- The ML model sees each frame squashed to 1024×1024; temporal averaging hides most of the
  resulting edge jitter, but very fine edge "breathing" remains on the puppy's moving legs.

## Licences

- `@imgly/background-removal-node` 1.4.5 — **AGPL-3.0** (or IMG.LY commercial licence). Used only
  as a build-time devDependency to produce the matte; it is not bundled or served with the site.
  The output videos are our media, not a derivative of the library. If the AGPL is a concern for
  the repository, remove the devDependency after generating the files (the outputs stay valid).
- `ffmpeg-static` — GPL-3.0 build of FFmpeg (with libx264/libvpx); build-time only.
- `sharp` — Apache-2.0 (libvips LGPL-3.0).

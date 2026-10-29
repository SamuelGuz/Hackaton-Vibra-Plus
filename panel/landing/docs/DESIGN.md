# DESIGN.md — Refugio de Doña Gloria

## Full-page editorial continuation (2026-10-29)

The user explicitly asked to bring the entire page up to the quality of the Wild v5 hero.
The shared body now uses `src/secciones/Editorial/EditorialSections.tsx`: an oversized
photo-interrupted statement, a dark photographic rescuer chapter, a short neighbourhood
chapter, an amount selector with one payment panel, varied adoption portraits, native
adoption accordions, editorial transparency commitments, and a large photographic close.
The existing hero variants are retained. This is a continuation of the established Wild
world, not a new brand. Capsule/arch photographs and paper/ink fields carry its visual language.

Use short, explicitly broken two-line headings, `--texto-editorial` / `--texto-manifiesto`,
and `--esp-editorial`. Keep copy readable; do not revive animated numerical claims or demo
animal identities in the public body. There is one decorative cut-out in the body (the
beagle in transparency); other animals appear in clearly captioned photographs.

The donation presets are selectable amounts, not verified food prices. Their equivalence is
`PENDIENTE:` in content and renders “Por confirmar”. Payment contacts remain disabled until
confirmed. The comparison toolbar disappears after the hero so it does not obscure content.

## Additional option: Wild v5 (2026-10-29)

The user requested another option based on the supplied Wild capsule reveal, featuring an
emotionally engaging dog video. `/?hero=5` uses a scoped paper/black palette, self-hosted Inter,
the AD [video] PTA word, and the requested 2.1-second capsule reveal. This explicitly overrides
earlier uppercase, display leading, paper-line decoration, and entrance-duration restrictions
for this hero. V4 remains available with its own style. See `docs/HERO-V5.md`.

## Current override: Reelmark v4 (2026-10-29)

The user explicitly requested a fourth hero based on the supplied Reelmark prompt and its
typography and CSS across the entire page. This instruction supersedes the previous orange
palette, font choices, centred-heading restriction, badge/doodle bans, and hero layout rules.
See `docs/HERO-V4.md` for the current implementation. The older direction below remains as
context for variants 1–3. Content honesty, local assets, React, CSS Modules, shared buttons,
accessibility, reduced motion, and read-only originals still apply.

Current global tokens: off-white `#F5F8EF`, forest green `#08482D`, mint `#DAE7C7`, ink
`#101410`, secondary copy `#5E5E61`. Headings use Inter Tight, UI uses Inter, handwritten
notes use Caveat. The existing MP4 videos retain their bone backdrop token for correct blending.

Read this whole file before building a hero or a section. Tokens live in `src/estilos/tokens.css`;
global defaults in `src/estilos/base.css`. Components use CSS Modules and **only** token variables
(no raw hex, no raw px for colour, type, space, radius, motion).

---

## 1. Concept

**"Naranja rescate."** The orange of a rescuer's vest and leash is the one loud colour on a calm,
bone-coloured page; everything else is fur, earth and deep monte green.
**The animals step out of the page:** real cut-out dogs and cats peek over section edges, sit on
cards and cross from one chapter to the next, so scrolling feels like walking through the refuge.
**Honest, warm, specific:** real faces, real names, real numbers from Doña Gloria; no stock sentiment.

Idea sentence (use it to judge every section): *On this page, the moment a rescued dog looks over
the edge at you becomes the device that carries the visitor from one chapter to the next.*

---

## 2. Palette and usage

| Token | Hex | Role | Rules |
|---|---|---|---|
| `--color-fondo` | `#F3EEE7` | Ground (bone) | 75–85% of the page. Default section background. |
| `--color-superficie` | `#E9E1D6` | One tone step | Cards, panels, inputs. Separates by tone, never by border or shadow. |
| `--color-crema` | `#FBF8F3` | Paper | Text on dark fields; inner surface of a card sitting on `--color-superficie`. |
| `--color-tinta` | `#17221B` | Ink (monte green-black) | All body text and headings. Also one inverted section. 14.2:1 on fondo. |
| `--color-tinta-suave` | `#4F4842` | Muted | Captions, meta, dates only. 7.8:1 on fondo. Never for paragraphs. |
| `--color-acento` | `#FF5A1F` | Naranja rescate | **Fills only**: the primary button, one marker per screen (a tag "Urgente", the active filter, a progress bar fill). Under 5% of any screen. Text on it is always `--color-acento-tinta` (5.3:1). Never orange text on light grounds (2.7:1). |
| `--color-acento-hover` | `#FF7440` | Hover fill | Primary button hover only. |
| `--color-acento-fuerte` | `#A33508` | Accent as text | Inline links that must be orange, focus ring, small icons. 5.9:1 on fondo. |
| `--color-secundario` | `#1D3A2C` | Verde monte field | Donation chapter and/or footer. Text `--color-secundario-tinta` (#F3EEE7, 10.7:1). Orange on it only for large text/UI (4.0:1). |
| `--color-caramelo` | `#D4914F` | Fur field | **One** section per page (e.g. the rescuer's story or "Cómo ayudar"). Text `--color-tinta` (6.2:1). |
| `--color-exito` | `#246B41` | Success | "Adoptado", form confirmation. |
| `--color-error` | `#9E1C1C` | Error | Inline form errors. |
| `--color-velo` | `rgb(23 34 27 / .55)` | Scrim | Under text placed on a photograph, over the text area only. |
| `--fondo-hero` | `#F3EEE7` | Video hero ground | Hero variant 3 only. See §5. |

**Chapters, not decoration.** The page changes field colour like chapters, with hard edges (no
fades): `fondo` → `fondo`/`superficie` panel → `caramelo` (once) → `fondo` → `secundario`
(donate) → `tinta` or `secundario` footer. Two neighbouring sections never share the same field
**and** the same layout. Mark dark sections with `data-campo="oscuro"` so the focus ring flips to paper.

**Why bone and not yellow cream:** cream + rust/terracotta is the stock "AI page" look. Our ground is
low-chroma bone, our ink is green-black, and our accent is a hot safety orange used sparingly, never
a clay or burnt orange.

---

## 3. Typography

- **Display:** `Bricolage Grotesque` (variable: `opsz` 12–96, `wdth` 75–100, `wght` 400–800). Headings,
  statements, figures, the big word. Characterful, chunky, full Spanish set (á é í ó ú ü ñ ¿ ¡).
- **Text:** `Figtree` (400–700). Body, buttons, forms, captions.
- Loaded in `index.html` with `display=swap`. No third family, no monospace, no italics.

| Use | Token | Weight | Leading | Tracking |
|---|---|---|---|---|
| One-word statement ("Adopta.") | `--texto-mega` 60→184px | 800, `font-stretch: 85%` | 0.95 | -0.04em |
| Hero `h1` | `--texto-display` 46→128px | 750–800 | `--interlineado-display` 0.95 | `--tracking-display` -0.035em |
| Section `h2` | `--texto-3xl` 38→72px | 750 | 1.05 | -0.02em |
| Figures (stats, COP amounts) | `--texto-2xl` 30→48px | 800 + `.cifras` | 1 | -0.02em |
| Card title `h3`, pull quote | `--texto-xl` 22→30px | 700 | 1.3 | -0.01em |
| Lead sentence under a headline | `--texto-lg` 19→23px | 400–500 | 1.45 | 0 |
| Body | `--texto-base` 16→18px | 400 | 1.55 | 0 |
| Meta, caption, small button | `--texto-sm` 14→16px | 500–600 | 1.4 | 0 |
| Legal, photo credit | `--texto-xs` 13→14px | 400 | 1.4 | 0 |

Rules:
- **Every headline fits in two lines at every width** (≈ 32 characters, max ≈ 40). Cut words before
  shrinking type. `max-width: var(--medida-titulo)` (16ch) on `h1`/`h2` to force meaningful breaks.
- Leading never below 0.95: Spanish capitals carry accents (¿CÓMO, ÉL) and collide at 0.85.
- Sentence case everywhere. No ALL-CAPS tracked labels, no eyebrow text above headings.
- Body text is full ink; grey (`--tinta-suave`) only for secondary notes. Paragraph measure ≤ 62ch.
- Left aligned by default. Centre only the video hero (variant 3) and at most one statement.
- Numbers: Colombian format `$50.000`, `1.250 kg`; `.cifras` for tabular figures.
- No hyphens as sentence punctuation in headings; use a period or a comma.

---

## 4. Layout grid and breakpoints

Mobile first, designed at **360px** and checked at 390, 768, 1024, 1440.

| Name | Min width | Columns | Notes |
|---|---|---|---|
| base | 0 (design at 360) | 4 | Single column stack; cut-outs at 55–70vw. |
| `sm` | 600px | 8 | Two-up cards. |
| `md` | 900px | 12 | Split layouts (text 5–6 cols / image 6–7 cols), full nav. |
| `lg` | 1200px | 12 | Container caps at `--ancho-contenedor` (1280px). |
| `xl` | 1440px | 12 | Type scale stops growing. |

- Media queries use these literal values (CSS variables cannot be used inside `@media`):
  `@media (min-width: 37.5em)`, `(min-width: 56.25em)`, `(min-width: 75em)`, `(min-width: 90em)`.
- Wrap section content in `.contenedor` (max 1280px + equal `--margen` gutters 16→40px).
  Long story text uses `.contenedor.contenedor--estrecho` (768px).
- Grid gap: `--hueco` (16→32px). Vertical gap between sections: `--esp-seccion` (80→192px),
  clearly larger than any gap inside a section (max `--esp-8` 64px inside).
- Asymmetry lives inside the grid, never in the frame: if text sits left, the right holds the photo,
  the animal, a list or a figure. No half-empty screens.
- Touch targets ≥ 48×48px; 8px minimum between targets. No horizontal scroll at 360px
  (`body { overflow-x: clip }` is set; still keep cut-outs inside the viewport).

---

## 5. Hero variants (shared rules)

All three: one `h1` (two lines max), one lead sentence 24–40px below it, **one** primary action
(`Quiero adoptar` or `Donar ahora`) plus at most one secondary text link. Headline, lead and button
are in the first paint; entrance settles within 1.2s and animates ≤ 4 elements. No preloader.

**Variant 1 — creative.** Bone ground, `--texto-mega` statement, a cut-out dog peeking over the
bottom edge of the hero (paws on the seam: `fuentes/1.png` / `2.png` are made for this).
**Variant 2 — Doña Gloria's story.** Real, first-person, specific (place, year, number of animals). A real
photo ≥ 40% of the first screen, `--radio-xl` corners, caption with name and date. No invented quotes.
**Variant 3 — two dog videos + centred text** on `--fondo-hero: #F3EEE7` (the page bone).

Video recipe for variant 3 (backgrounds removed at build time, see docs/videos.md):
- `public/media/video/perro-1.webm` / `perro-2.webm` are VP9 with a soft, feathered alpha matte;
  `perro-1.mp4` / `perro-2.mp4` are the Safari fallback composited on `#F3EEE7`. Use
  `<video muted autoplay loop playsinline poster>` with the webm source first, mp4 second.
- Never set a different background behind the videos: the mp4 fallback only blends on `--fondo-hero`.
- VIDEO 2 is already cropped to portrait when re-encoded.
- Layout ≥ 900px: three columns `1fr minmax(0, 1.1fr) 1fr`, videos left and right, text centred.
  Below 900px: text first, then the two videos side by side at 50% each (or one video only, with the
  second as a poster image, to save data). Never text on top of a dog's face.
- - Never use `mix-blend-mode: multiply` on the videos (it darkens the dog and the ground differently).

---

## 6. Cut-out animals crossing section edges

The signature of the site. Source: transparent PNGs in `fuentes/` (export to WebP/AVIF with alpha).

```css
.seccion { position: relative; }               /* the section the animal belongs to */
.recorte {
  position: absolute;
  z-index: var(--z-recorte);
  bottom: 0;
  translate: 0 32%;                            /* crosses the seam by 25–40% of its height */
  width: clamp(11rem, 28vw, 24rem);            /* 176 → 384px */
  inset-inline-end: var(--margen);             /* alternate start/end on each seam */
  pointer-events: none;
  filter: drop-shadow(var(--sombra-recorte));  /* only when it "sits" on a surface */
}
.seccion + .seccion { padding-top: max(var(--esp-seccion), 9rem); } /* room for the overhang */
```

Rules:
- Max **one** animal per seam, max **four** seams per page; alternate left and right.
- The "peek": a head + paws cut-out (`1.png`, `2.png`) sits with its paws exactly on the top edge of
  a card or section (`bottom: 100%; translate: 0 18%`), as if looking over a wall.
- A cut-out never covers text, a button or another face. Text that must sit near it gets
  `position: relative; z-index: var(--z-contenido)`.
- Below 600px: width 55–70vw, pinned to one side, overlap reduced to 15–20%; hide decorative
  duplicates rather than shrinking them below 160px.
- Decorative cut-outs use `alt=""` + `aria-hidden="true"`; an animal that is a real adoptable
  individual gets an `alt` with its name.
- Never rotate, outline, add a sticker border or place a coloured blob behind a cut-out.

---

## 7. Motion language (`motion` package, `motion/react`)

Durations and curves mirror the tokens; in JS use these constants:

```ts
export const EASE_SALIDA = [0.22, 1, 0.36, 1] as const   // < 600ms
export const EASE_EXPO   = [0.16, 1, 0.3, 1] as const    // reveals >= 800ms
export const EASE_VIAJE  = [0.76, 0, 0.24, 1] as const   // wipes, panels
```

- **Signature move — "asomarse" (the peek):** each seam animal rises from behind its edge once, as
  the seam enters: `initial={{ y: "40%", opacity: 0 }}`, `whileInView={{ y: 0, opacity: 1 }}`,
  `viewport={{ once: true, amount: 0.4 }}`, `transition={{ duration: 1.1, ease: EASE_EXPO }}`.
  This is the only loud move; keep everything else quiet.
- **Section entrances:** parts arrive in reading order (heading → text → picture → details), stagger
  0.07s (`staggerChildren`), rise 28px (`--dist-revelar`) with opacity, 0.8s `EASE_EXPO`,
  `viewport={{ once: true, amount: 0.3 }}`. Vary per content: lists row by row, photos settle from
  `scale: 1.04`, figures count up once (≤ 1.2s), statements rise line by line (0.09s per line).
  Max 4 steps per sequence. Nothing above the fold waits for scroll.
- **Parallax:** `useScroll({ target, offset: ["start end", "end start"] })` + `useTransform` on
  cut-outs and photos only, never on text. Limits: ±48px desktop, ±24px below 900px, linear.
  At most two parallax elements per screen.
- **Hover/press:** buttons lift `y: -2px` + fill change 200ms, press `scale: 0.97` 140ms; animal
  card photo `scale: 1.04` inside `overflow: hidden`, 400ms `EASE_SALIDA`; links underline thickens.
  Not every card lifts; pick photo zoom **or** lift, not both.
- **Loops:** only the hero videos. Pause them off-screen (IntersectionObserver) and when the tab is hidden.
- **Reduced motion:** wrap with `const reduce = useReducedMotion()`; when true, set every `y`/`scale`
  offset to 0, keep opacity only, disable parallax, and show video posters instead of autoplay.
  Tokens already zero CSS distances/durations under `prefers-reduced-motion: reduce`.
- Animate `transform`, `opacity`, `clip-path` only. No bounce/elastic/overshoot, no scroll
  hijacking, no smooth-scroll library, no custom cursor, no typewriter/scramble text.

---

## 8. Component recipes

**Primary button** (`Quiero adoptar`, `Donar ahora`): `display:inline-flex; align-items:center;
gap: var(--esp-2); min-height: 3rem; padding: var(--esp-3) var(--esp-5); border-radius:
var(--radio-pill); background: var(--color-acento); color: var(--color-acento-tinta);
font: var(--peso-semi) var(--texto-base)/1 var(--fuente-texto); letter-spacing: var(--tracking-boton);`
Hover: `--color-acento-hover`, `translateY(-2px)`. Active: `scale(var(--escala-presion))`. Arrow icon
is an inline SVG (1.5px stroke) that moves `4px` right on hover. One primary button per screen.

**Secondary button:** same shape, `background: var(--color-tinta); color: var(--color-crema)`.
On dark fields: `background: var(--color-crema); color: var(--color-tinta)`.
**Text link:** ink, underline 0.08em, offset 0.18em; hover thickens to 0.14em.
**WhatsApp/Nequi actions** are real links (`https://wa.me/...`, Nequi number shown as copyable
text with a "Copiar" button and confirmation "Número copiado"). Never a fake payment form.

**Animal card:** `background: var(--color-superficie); border-radius: var(--radio-lg);
padding: var(--esp-3);` photo `aspect-ratio: 4/5; border-radius: calc(var(--radio-lg) -
var(--esp-3))` (nested radius 16px), `object-fit: cover`. Name `h3` (`--texto-xl`), meta line
(`Perra · 2 años · Mediana`) in `--texto-sm` muted, max two traits as plain text. No heart icon, no
border, no shadow at rest. "Urgente" marker = small pill in `--color-acento` with ink text (the one
accent on that screen). Grid: 1 col → 2 at 600px → 3 at 900px → 4 at 1200px.

**Donation tier card** (on `--color-secundario` field): `background: var(--color-crema);
color: var(--color-tinta); border-radius: var(--radio-lg); padding: var(--esp-6);` amount in
Bricolage `--texto-2xl` 800 `.cifras` (`$30.000`), one concrete line of what it buys (from
Doña Gloria's real costs; mark as pending until confirmed), button full width. The recommended tier is
filled `--color-caramelo` instead of crema, not scaled, not badged. Include a "Otro valor" option
and a monthly/one-time switch with real `<input type="radio">`s.

**Stat:** figure in Bricolage `--texto-2xl`–`--texto-3xl` 800 `.cifras`, label below in
`--texto-sm` ink (not muted), max 4 per row, no icons, no boxes, no zero padding. Only real numbers
supplied by the rescuer; a missing number is omitted, never estimated.

**Section header:** `h2` left aligned, `max-width: 16ch`, then one lead sentence (`--texto-lg`,
ink) `margin-top: var(--esp-4)`. The right side holds a "Ver todos" text link or a photo/cut-out.
No eyebrow label, no numbering (01/02), no divider line. Header to content gap: `--esp-7` (48px).

**Inputs:** filled `--color-superficie`, no border, `--radio-md`, min-height 3rem, visible label
above (`--texto-sm` 600), error text below in `--color-error` tied with `aria-describedby`.

---

## 9. Performance budget

- **LCP < 2.5s** on a mid Android over 4G; **CLS < 0.1**; **INP < 200ms**. Many visitors are on
  prepaid data: design for that.
- LCP element is the hero `h1` (text) or a hero poster ≤ 120KB (AVIF/WebP), with
  `fetchpriority="high"` and no `loading="lazy"`.
- Every other image: `loading="lazy" decoding="async"`, explicit `width`/`height` or
  `aspect-ratio`, `srcset` at 480/800/1200/1600w with `sizes`. Photos AVIF/WebP ≤ 180KB at 1200w;
  cut-outs WebP/AVIF with alpha ≤ 150KB at 800w. Never ship the 2K originals from `fuentes/`.
- **Hero video: at most 2 videos**, each ≤ 2.5MB (current sources are 19.8MB and 14.9MB: must be
  re-encoded), 720p or less, H.264 MP4 (+ optional WebM), 6–10s loop, no audio track,
  `muted autoplay loop playsinline preload="metadata" poster="..."`. Under `prefers-reduced-motion`
  or `navigator.connection.saveData`, render the poster only.
- Fonts: 2 variable families via Google Fonts with `display=swap` (already in `index.html`).
- JS: initial bundle ≤ 150KB gzip; load below-the-fold sections with `React.lazy` when heavy.
- No third-party trackers or widgets in the first load.

---

## 10. Don'ts

- No generic AI look: centred headline + small label + three icon cards + soft gradient.
- No purple/violet/indigo anywhere. No gradients on backgrounds, buttons or text (only the scrim
  over photos and the video feather mask).
- No yellow-cream ground, no terracotta/rust/clay accent. Orange is `#FF5A1F` and only as a fill.
- No emoji as icons or decoration. Icons, when needed, are simple inline SVG with 1.5px strokes.
- No eyebrows, pill badges above headlines, tiny tracked uppercase labels, 01/02/03 numbering,
  monospace, hairline dividers or 1px outlined cards.
- No shadows or glows on resting elements; no glassmorphism / backdrop blur; no floating pill nav.
- No rows of identical cards except the animal grid; vary composition section to section.
- No styled accent word inside a headline (no coloured/italic/underlined word). One face, one colour.
- No stock sentiment copy ("haz la diferencia hoy", "transforma vidas") without a concrete fact.
- No invented testimonials, adoption counts, donors, logos or press. Placeholders are marked
  `PENDIENTE` in content files and listed for the team to confirm.
- No sad/guilt imagery as the first impression (wounds, cages) in the hero; honesty goes in the story.
- No text over a dog's face; no cut-out covering text or buttons.
- No preloaders, counters before content, autoplay sound, custom cursors or scroll hijacking.
- No raw hex/px values in components: tokens only.

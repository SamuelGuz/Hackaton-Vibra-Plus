# Component research and integration

Reviewed 2026-10-29. The user approved preserving hero v5 and integrating a navigable photo
gallery, animated adoption answers and restrained entrances. This report distinguishes
catalog screening, source inspection and actual integration; these are not interchangeable.

## Sources

| Source | Inspection | Code/access result | Decision |
| --- | --- | --- | --- |
| [Magic UI](https://magicui.design/docs/components) | 77 component links indexed; Blur Fade manual source inspected | Full manual source acquired; MIT license saved | Local Reveal adaptation, without blur, hidden first paint or exit effects |
| [Rare UI](https://www.rareui.com/components) | 27 component links indexed; FAQ source and keyboard logic inspected | Source shown by Get code; license saved | AdoptionAnswers adapts the model to existing copy, tokens, CSS Modules and non-spring movement |
| [Canvas UI](https://canvasui.dev/docs/installation) | 35 component links indexed; rendering requirements and Peel inspected | Source is offered, but the selected effect adds GPU/experimental rendering complexity | Not imported; no effect is needed to operate or read the rescue page |
| [OriginKit](https://www.originkit.dev/components/coverflowgallery) | Partial gallery-category inventory, Coverflow documentation and copy flow inspected | Copy Code opens sign-in; no source acquired. Free plan has daily copy limits | Original ReferenceGallery implementation; visual inspiration only |
| [Pryzm](https://pryzm.design/) | Gallery samples, feature list and pricing inspected | Live React export belongs to Pro; free video is watermarked | Not imported; gradient/glass backgrounds also conflict with the current design |
| [Lottielab](https://www.lottielab.com/templates/icons) | 45 icon-template links indexed; Central icons Cat and pricing inspected | Editor/template workflow; current pricing places Lottie export in Pro | Not imported; no Lottie player or additional decorative loop added |
| [Epic Easing](https://epiceasing.com/) | Ease, Out, Quint selected and CSS export inspected | CSS export acquired: cubic-bezier(0.23, 1, 0.32, 1) | Mirrored as --ease-editorial and EDITORIAL_EASE; transform/opacity only |
| [Jitter](https://jitter.video/) | Homepage templates and official free-plan/export documentation inspected | Motion-design editor, not React component source; free exports have watermark/quality limits | Not imported; useful later for campaign assets rather than site runtime |
| [MotionSites](https://motionsites.ai/) | Free and Sections filters; Pet Diagnostics prompt copied and read | Public prompt acquired; premium prompts left locked | Existing Wild v5 and Reelmark v4 references retained; Pet Diagnostics rejected because its table, type and hero replacement conflict with the approved direction |

## Honest limits

The inventories in `artifacts/component-research/` record observed catalog entries, not a
complete source audit of every effect on every service. OriginKit advertises 756 components;
only the relevant gallery subset was screened. Template catalogs can load more entries
dynamically. No claim is made that all 756 sources or all Jitter templates were acquired.
The user narrowed and approved the integration after these constraints were explained.

No account was created, no paid export was requested, no access gate was bypassed, and no
third-party media was copied into the public assets. Research snapshots and copied prompts
are local artifacts, not bundled into the shipped page.

## Implementation

- `src/componentes/editorial/Reveal.tsx`: Magic UI-derived, visible by default, once per view.
- `src/componentes/editorial/AdoptionAnswers.tsx`: Rare UI-derived single-open answers;
  Arrow Up/Down, Home/End move focus; Enter/Space toggle the focused control.
- `src/componentes/editorial/ReferenceGallery.tsx`: original, three existing reference photos;
  previous/next, selection dots, Arrow Left/Right, Home/End, bounded horizontal swipe.
- `src/estilos/tokens.css`: dimensions and easing for those controls.
- `src/contenido/historia.ts`: gallery control labels only. No factual copy changed.

No new runtime dependencies. Reference captions, pending payments/WhatsApp and all hero
variants remain present. Gallery motion has no autoplay. Reduced motion uses immediate
gallery/answer state changes and removes entrance travel. Touch controls are at least 48px.

## Attribution and license preservation

See the visible credit links in [README.md](../README.md), source copyright comments and
full licenses in `docs/licenses/magicui.txt` and `docs/licenses/rareui.txt`.
Rare UI is licensed MIT + Commons Clause + Attribution, not unmodified MIT. Its source is
embedded only as part of this application, not sold or repackaged as a component library.

## Validation

- `npm run build` passed (`tsc --noEmit && vite build`). Build output: JS 439.87 kB /
  138.57 kB gzip, CSS 50.48 kB / 10.79 kB gzip; no new dependency added.
- Layout inspected at 360, 390, 768, 1024 and 1440 CSS pixels; no horizontal page overflow
  or broken images. The existing heading copy remains intact, with the existing two-line
  breaks. Gallery controls measure 48 x 48 CSS pixels.
- Previous/next, direct selection, wraparound, Arrow Left/Right, Home/End and pointer swipe
  exercised in the browser. FAQ single-open state, close-all, Arrow Down focus movement and
  repeated toggles exercised. The first answer is open initially.
- Built preview inspected as well as Vite development. Puppy video reached readyState 4,
  videoWidth 490 and played on screen; it paused while reading the body. Donation $60,000
  selection still works; copy controls remain disabled and pending strings render safely.
- No captured browser console errors. Impeccable mechanical detector returned `[]`.
  Independent read-only review reported no P1/P2 findings.
- Reduced-motion branches were reviewed in source; the browser tool could not emulate that
  preference, so live reduced-motion rendering was not verified. No physical-phone or Safari
  test was performed. No claim about live payments or WhatsApp backend availability.
- Static local mobile asset estimate: 965,493 bytes (about 0.97 MB), including the full puppy
  MP4, selected mobile WebP files, poster, self-hosted Inter and gzipped HTML/JS/CSS. This is
  a file-size estimate, not a measured network transfer or initial-load size; it excludes
  HTTP headers and the remote font stylesheet, and caching/range requests affect transfer.
  Details are in `artifacts/component-research/weight.json`.
- Evidence: `gallery-390.png`, `answers-390.png`, `gallery-1440.png` and
  `responsive-checks.json` in `artifacts/component-research/`.

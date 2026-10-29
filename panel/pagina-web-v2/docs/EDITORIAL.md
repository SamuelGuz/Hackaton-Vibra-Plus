# Full-page editorial continuation

## Intent

On 2026-10-29 the user asked to bring every section up to the quality of the Wild v5 hero.
The hero remains intact. The shared body now extends its Inter typography, paper/ink
contrast, photographic capsules, and simple motion across the public rescue narrative.

## Structure

1. Oversized affection/sustenance statement interrupted by a small cat photograph.
2. Dark chapter about Doña Gloria, with a large arched reference portrait.
3. Short neighbourhood-support chapter about Don Carlos.
4. Donation amount selector, large selected amount, and one honest payment panel.
5. Three differently framed animal portraits and native adoption accordions.
6. Transparency commitments with one decorative beagle cut-out.
7. Photographic adoption close, followed by a full-width Huellitas footer wordmark.

`src/App.tsx` imports `src/secciones/Editorial/EditorialSections.tsx`. All new public copy
is in the exported `editorial` object in `src/contenido/historia.ts`. The old section
compositions remain as legacy source and are not included in the active body.

## Functional and content boundaries

- Presets and custom COP amounts update the displayed contribution; no money is collected.
- Payment numbers and account holders render “Por confirmar”; copy controls remain disabled.
- Food equivalence is explicitly `PENDIENTE:` and is never inferred from a selected amount.
- WhatsApp remains disabled until its real number is confirmed.
- Adoption details expand natively with mouse, touch, or keyboard.
- No disputed animal counts, demo adoption names, mock donor receipts, or calendar guarantees.
- Photographs are references, captioned accordingly, and loaded through the generated `img()` helper.
- Original uploads and the generated image manifest are unchanged.
- The hero comparison toolbar hides below the hero instead of covering the page.

## Verification

- `npx tsc --noEmit && npx vite build` passes.
- Browser review at 1440, 1024, 768, 390, and 360 CSS pixels; no horizontal overflow found.
- Main section headings fit two text lines at the checked widths.
- Verified preset change, a custom $18.000 amount, disabled copy controls, and adoption accordions.
- Verified the hero video pauses while the donation chapter is on screen.
- Static code review found no P1/P2 issues in the new body.
- Source detector returned no findings for the editorial component and footer CSS.
- Current build: JS 137.36 kB gzip, CSS 10.54 kB gzip, HTML 0.48 kB gzip. These exclude media/fonts.

Safari, physical phones, real payments, and real WhatsApp/adoption integrations were not tested.

# Babet homepage clone brief

Source: https://html.themehour.net/babet/demo/index.html
Local route: `/` (Next.js). English demonstration content stays isolated from the rescue site preserved at `/huellitas-v5`.

## Ownership and implementation

- `src/components/sites/babet/BabetPage.tsx`: page composition, floating/sticky header, desktop dropdowns, mobile navigation, fading hero, story, services carousel and theme chooser.
- `MiddleSections.tsx`: specialties, video dialog, marquee, before/after range comparison, six-photo lightbox, testimonials, groomer tabs and brands.
- `LowerSections.tsx`: pricing, FAQ, appointment preview, articles, footer and scroll-to-top.
- Each component uses authored CSS Modules; `Shared.module.css` contains scoped Babet tokens and shared geometry. `fonts.css` contains local, renamed Fredoka and Onest font faces.
- `public/sites/babet/`: original source images, masks, SVGs, local fonts and font licenses.
- `scripts/acquire-babet-assets.mjs`: reproducible acquisition from the observed source HTML and original font provider. `asset-map.json` records individual origins and byte sizes.
- `source.html` and `source-style.css` are research references only; production does not import or serve the source page as an iframe.

## Reference rules

Source orange `#F8721F`, dark `#02000F`, body `#6C6D71`, bone `#F6F2ED`; body Onest 16px/26px and headings Fredoka. Desktop container1320px plus24px gutters. Main section padding120px, below1200px80px. Hero at1440px uses84px/95.928px heading and250px/348px content top/bottom padding. Background inset32px with original decorative mask. Mobile390px uses34px/45.9px heading,180px/200px content padding and unmasked full-width photograph.

Homepage order: navigation → hero/reviews/counters → story → services → specialties → video → word marquee → process/comparison → gallery → testimonials → groomers → brands → pricing → FAQ → appointment → articles → footer CTA/widgets.

## Behavior and destination policy

Local home links resolve `/`. Other original demo pages remain absolute links to the supplied origin because only its homepage is in scope. Phone/email links retain source demonstration values. Header menus, hero slideshow, services carousel, theme colors, before/after range, gallery modal with keyboard controls, testimonials, team tabs and FAQ have editable React state. Reduced-motion preference disables CSS motion and hero/services autoplay. No heavy preloader is included.

Appointment is a client-side validated preview and explicitly says no request was sent. Source backend endpoint is not copied. Video dialog embeds the original YouTube destination and needs connectivity. No booking, newsletter or payment integration was added.

## Verification and known comparison work

Orchestrator checks: TypeScript passed; ESLint `--quiet` passed; all literal asset paths in authored components/CSS resolve locally. Parent owns source/local browser comparisons and final production checks; screenshots in this folder record those actual views.

Remaining fidelity limits to evaluate in browser: source Font Awesome glyphs are approximated by lightweight text glyphs in some controls; brand strip is responsive static instead of automatically cycling; entrance effects are simplified to settled visible content; homepage navigation targets outside scope stay remote. No pixel-perfect claim is made without the parent comparison.

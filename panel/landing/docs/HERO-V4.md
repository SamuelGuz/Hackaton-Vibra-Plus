# Reelmark-inspired rescue hero v4

Requested by the user on 2026-10-29. This replaces the previous task's hero-comparison
checkpoint with a concrete fourth option based on the attached Reelmark specification.

- Route: `/?hero=4`; also the default when no valid hero parameter is supplied.
- Component: `src/heroes/HeroReel/HeroReel.tsx` and its CSS Module.
- The existing React app is retained. No Tailwind or extra dependencies.
- Global tokens and Google Fonts now apply the supplied off-white/mint/forest palette,
  Inter Tight 700 headings, Inter UI, and Caveat 600 notes across the page.
- Desktop composition follows the 1440×1080 reference: centred two-line heading,
  mint badge, handwritten annotations, cylinder-shaped gallery, and dashed CTA ring.
- Ten cards use eight project images through `img(slug)` and two local dog videos.
  No marketplace product clips or invented adoption identities are used.
- Rounded four-sided clips recalculate from each card's distance from the centre.
  A long Web Animations clock drives time-based travel, with pointer drag, momentum,
  keyboard arrows, and a visible pause control.
- Videos are muted, inline, looped, and paused off-screen, on hidden tabs, or by the
  gallery pause control. Reduced motion and Save-Data replace videos with images.
  Reduced motion also disables automatic travel and entrances.
- Mobile uses a stacked composition, a shorter gallery band, and a visible adoption CTA.
- A reference-image caption makes clear that the gallery is not an adoption catalogue.
- Variants 1–3 and the temporary selector remain available; no hero choice was inferred.

Original uploads and the generated image manifest are unchanged.

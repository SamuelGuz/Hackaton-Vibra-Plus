# BRANDING-HERO — design rules extracted from the v5 hero

Source of truth: `src/heroes/HeroWild/HeroWild.module.css` + `HeroWild.tsx` (localhost:5392).
An agent that reads this file must be able to design any section so it looks like the hero.
Only the hero is the reference; the other sections of the lab are NOT.

## 1. Character
Editorial, quiet, large type, lots of empty space, one living image. No cards, no shadows,
no gradients, no icons-in-circles. Warmth comes from the photo and the words, not from decoration.

## 2. Typography
- Family: **Inter** (variable, weights 400–800). Display and body use the same family.
- Display: weight **800**, letter-spacing **-0.045em**, line-height **0.8–1.05**, never uppercase except the split hero word.
- Hero word scale: `--fs = min(19.6svh, 13.2vw)` (mobile `min(34vw, 16.5svh)`); the word is 1em.
- Section headings: 800 / `clamp(2.4rem, 1.2rem + 5vw, 5.5rem)` / -0.035em / max 16ch, break into 2 meaningful lines.
- Body: 450–500 weight, `clamp(16px, 1.3vw, 20px)`, line-height 1.5, colour = secondary ink.
- Small / meta: `13–14px`, secondary ink. Nav: `12–15px`, weight 450.
- Drop cap on the first paragraph of a story block: `::first-letter`, 2.35em, weight 650, line-height 0.95, float left.
- Never mix a second display face. Caveat is not part of this look.

## 3. Colour (hero original → Huellitas beige + green)
| Role | Hero v5 | Huellitas |
| --- | --- | --- |
| Ground | `#f2f2f1` | **beige** `#f1e9d8` |
| Lightest | `#ffffff` | `#fbf7ee` |
| Ink | `#1d1d1d` | `#14201a` |
| Secondary ink | `#3a3a3a` | `#3d4a41` |
| Rule / hairline | `#a9a9a6` | `#b9ad94` |
| Accent (buttons, fills) | `#1b1b1b` | **green** `#1f5a3a` (hover `#2a7149`) |
| Dark field | `#1d1d1d` | deep green `#0f3d2a` with beige text |
Two colours do the work: beige ground, green action. Text on green is always `#fbf7ee`.
The 15 diagonal white lines on the ground (SVG strokes, 1.2–4px, opacity .55–.85) are the only ornament.

## 4. Shape and spacing
- Buttons and the media pill: fully rounded (`999px`). Photos elsewhere: `28px`; no square corners on images.
- Page gutter: `max(24px, fs*0.27)` on desktop, `20px` on mobile; same left and right.
- Section rhythm: 80–190px vertical. Content width 1280px; long text 62ch.
- Button: min-height 52px, padding-inline 32px, weight 500, no border, one primary per screen.
- Hit targets ≥ 48px.

## 5. Layout grammar of the hero
1. Huge split word with a pill-shaped media window in the middle ("AD [video] PTA").
2. One centred sentence under it (statement).
3. Bottom row: short paragraph with drop cap | hairline rule | actions. A small "reference media" note under the paragraph.
4. Top nav: text links left, one grey location line right. No logo box, no background.

## 6. Motion
- Intro timeline 2.1s: pill opens from a hairline (clip-path inset), word gap widens, nav drops in, footer rises, rule scales from the centre.
- Easing: `cubic-bezier(.4,0,.2,1)` for opens, `cubic-bezier(.2,.8,.2,1)` for UI entrances, `cubic-bezier(.22,1,.36,1)` on hover.
- Hover: -2px lift on buttons, underline on links. Press: `scale(.97)`.
- `prefers-reduced-motion`: no clip, no travel; keep opacity only. Video pauses off-screen and has a pause button.
- Scroll reveals elsewhere: rise 28px + fade, 800ms, stagger 70ms.

## 7. Imagery
- One emotional photo or video per screen, shown large and uncropped in a pill or a 28px-rounded frame.
- Animals look at the camera. No stock-photo grooming/shop imagery. Label reference media: "Imagen de referencia".

## 8. Copy
Short sentences, concrete nouns (plato, carne, patio, frío). Spanish, neutral Colombian, "tú", no voseo,
no slang, no exclamation marks. Never invent numbers or testimonials; unknowns say "Por confirmar".

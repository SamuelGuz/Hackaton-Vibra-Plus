# HOME-INFOGRAFIA — the home as a guided story

Code: `src/components/home2/Infografia.tsx` (+ `.module.css`, `banco.ts`). Images: `public/media/banco/`,
built by `scripts/procesar-banco.mjs` from the user's "BANCO DE IMAGENES.zip".

## Principle
One story, one decision, two roads. The visitor only reads and scrolls. Every section answers one
question, shows it visually first (photo, icons, numbers), and hands over to the next one.

| # | id | Question | Visual device |
|---|---|---|---|
| 0 | `top` | What is this? | Hero "AD[video]PTA" (unchanged). CTA "Conoce su historia" → `#ella` |
| 1 | `ella` | Who is she? | Layered photo (word SOLA behind the subject), 3 big numbers, 2 floating chips |
| 2 | `su-dia` | What does her day look like? | 4-step timeline with icons that draws on scroll + 3 photos |
| 3 | `lo-que-falta` | What is missing? | 3 needs (Comida, Salud, Techo): cut-out dog + icon + one line |
| 4 | `ayudar` | How can I help? | Two doors (PLATO / HOGAR words behind cut-outs). The only decision |
| A | `llena-un-plato` | How much is missing? | Mission bar + 3 amount pills + one big button → `/aportar?monto=` |
| B | `dale-un-hogar` | Who is waiting? | 3 example cards + 3-step adoption path → `/adoptar` |
| 5 | `confianza` | Can I trust this? | 3-step flow (you give → she confirms by WhatsApp → you see it), last purchase, public background |
| 6 | — | Closing | Layered photo (HOY), two buttons |

Donation road goes before adoption (lower commitment converts more).

## Layered image technique
`foto` (with background) → big word → `recorte` (same frame, real alpha). Both files share framing,
so they stack pixel-for-pixel and the word reads as being behind the subject. Images that only exist
as cut-outs use `Escena`: a drawn backdrop (circle + dashed ground line) behind the cut-out.

## Wayfinding
Desktop: chapter rail on the right (Ella · Su día · Lo que falta · Ayudar · Confianza).
Mobile: bottom bar with "n/5 · chapter" and a contextual button. Header nav: Su historia · Adoptar · [Donar].

## Honesty
"~90 animales" carries "por confirmar". Day timeline and example cards say they are descriptive/examples.
Goals keep "Meta de ejemplo, por confirmar". The user confirmed the woman in the red shirt
(`rescatista-cachorro`, `rescatista-beso`) is Yesenia; the green-shirt photo (`rescatista-alimentando`)
is not confirmed and stays unnamed.

## Image notes for the designer
- The "sin fondo" files came on white (no alpha); alpha was rebuilt with a local ML matte.
- `rescatista-alimentando` (8.png): the matte dropped several dogs, so only the full photo is used.
- Duplicates in the bank: 10=11, 13=14, 19=20, 21=22 (same file twice). 13/14 and 21/22 lack the
  full-background version; 10/11 and 19/20 lack the cut-out.

# Babet reference clone — page V2

The user requested a faithful recreation of https://html.themehour.net/babet/demo/index.html
before customization, using the installed JCodesMore cloning workflow and a subagent orchestrator.

## Routes and ownership

- `/`: Babet Home One, original English demo identity and reference assets.
- `/huellitas-v5`: preserved rescue hero v5, editorial sections and original local media.
- Other Babet pages remain absolute links to the reference; only index.html is in scope.
- `src/components/sites/babet/`: editable React components, scoped tokens, fonts and CSS Modules.
- `public/sites/babet/`: source media and self-hosted fonts.
- `docs/research/babet/`: source observations, asset map and comparison evidence.

Branch: `pagina-web-v2`, based on `monoga/mejoras-web` at `4e641a9`.
App: `panel/pagina-web-v2`; previous `panel/landing` and backend remain unchanged.
No commit or push is authorized for this stage.

## Run and verify

Node 24+: `npm ci`, then `npm run dev`. Preview: http://127.0.0.1:5394/.
`npm run check` runs ESLint, TypeScript and the Next production build.
Use only one server on port 5394. Production: `npm run build`, then `npm start`.

## Scope and provenance

Canonical skill: `.agents/skills/clone-website/SKILL.md`.
Template: https://github.com/JCodesMore/ai-website-cloner-template,
revision ee3f5a2f31fd549b9593fa4f7cf6d2955ee593bb; MIT license retained in LICENSE.
Upstream README: `docs/UPSTREAM-CLONER.md`.
Babet design and media belong to their reference owners; template MIT does not relicense them.

The Babet demo copy, counts, team, prices and testimonials are source recreation, not facts
about Doña Gloria. Keep both identities separate until the user requests customization.
Forms are local demonstrations and do not transmit bookings. No heavy preloader is included.
Source HTML/CSS are research evidence; the app renders editable React components.

Preserved rescue content remains in `src/contenido/`, `src/heroes/HeroWild/`,
`src/secciones/Editorial/` and `public/media/`. Its generated image manifest must not be
edited by hand. Original uploads and unrelated repository changes remain untouched.

## Latest validation

Babet homepage implemented and npm run check passed. See docs/research/babet/verification.md for evidence and remaining fidelity differences. Latest repairs were code-only at the user's explicit request. Production preview uses port5394. No commit or push performed.

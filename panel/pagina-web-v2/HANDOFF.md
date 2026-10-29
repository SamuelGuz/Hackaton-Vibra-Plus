# Entrega actual: pagina-web-final

La petición directa más reciente autoriza commit y push del sitio actual y luego ajustes
de columnas móviles. Rama de entrega: `pagina-web-final`. El primer respaldo publicado
es `31d2cb1`, antes de los ajustes móviles. No se borran otras ramas ni se modifica el backend.

La raíz actual ya es Huellitas con fondo blanco y pepitas, HeroWild y la infografía de
Yesenia; `/aportar`, `/adoptar`, `/historia` y `/como-ayudar` son páginas locales existentes.
La instrucción histórica de mantener Babet en inglés ya no describe esta entrega.

Los ajustes móviles usan 4 columnas para momentos y montos breves, 3 para necesidades y
explicaciones, y 2 para fichas, actividad y bloques amplios. `/aportar` incluye un plato
ilustrativo que cambia con el monto elegido, sin atribuirle una equivalencia alimentaria.
El único canal de pago es Nequi. Número, titular y WhatsApp siguen por confirmar;
no se inventaron datos ni se conectó una pasarela. Los datos de actividad siguen siendo ejemplos.

## Historial anterior

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

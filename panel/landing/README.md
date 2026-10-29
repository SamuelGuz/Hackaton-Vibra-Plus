# Public rescue website

Standalone public landing page for Doña Gloria's rescue in Colombia. Vite, React and TypeScript.

## Run

Requires Node.js 24 and npm. From this directory:

```sh
npm ci
npm run dev -- --port 5390
```

Open http://localhost:5390/?hero=5. Hero variants 1–5 remain available through the comparison controls.

## Verify and build

```sh
npm run build
```

The build runs TypeScript checks and writes the static site to `dist/`. The current hero is Wild v5, followed by the shared editorial sections.

## Project boundary

This is an independent project under `panel/landing`. It does not replace the existing parent `panel` application and does not modify backend routes or packages. No deployment or integration with the operational panel is configured here.

## Content and assets

- Public copy lives in `src/contenido/historia.ts`. Unconfirmed values are marked `PENDIENTE:` and render as “Por confirmar”.
- Payment numbers, account holders and the adoption WhatsApp contact are pending. The page does not collect payments or confirm adoptions.
- Current imagery is labelled as reference media. Generated delivery assets are included in `public/media/`.
- The image manifest is generated; use `img(slug)` rather than editing it manually.
- Original uploads in `fuentes/`, local design skills and review artifacts are intentionally not included. They are needed only to regenerate media, not to run or build the site.
- Fonts include a self-hosted Inter subset and its OFL licence. Media pipeline tooling and licence notes are documented in `docs/videos.md`.

See `docs/DESIGN.md`, `docs/HERO-V5.md` and `docs/EDITORIAL.md` for the current design and verification notes.

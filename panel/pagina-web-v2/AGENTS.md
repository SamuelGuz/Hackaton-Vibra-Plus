# Page V2 — project-specific rules

## Current user override: exact Babet clone first

The user explicitly requested a faithful clone of
https://html.themehour.net/babet/demo/index.html before any customization. The root route
is therefore Babet in its original English demo identity. Preserve the authored rescue seed
at `/huellitas-v5` for the later editing stage. Do not combine the two designs yet.
Babet's measured typography, colors, source media, demo copy and component layout supersede
the rescue-specific visual/content rules only inside `src/components/sites/babet/`.
Keep these values in dedicated scoped Babet tokens; no Tailwind. Preserve source attribution
and do not imply Babet's demo figures/testimonials belong to Doña Gloria. No heavy preloader,
secret keys, real form submission, commit, merge or push is authorized by this clone request.
The supplied scope is the complete index.html page and its states; unrequested destination
pages remain links to their original source, not fake local routes.

This app belongs to branch `pagina-web-v2` of SamuelGuz/Hackaton-Vibra-Plus.
Read HANDOFF.md, docs/DESIGN.md and docs/historia.md first. User communication is Spanish.
The instructions in this section override the unmodified upstream template description below.

- Keep HeroWild v5, its copy, local puppy video, palette and animation when cloning sections.
  Ask the user before replacing the hero or making new product decisions.
- Use CSS Modules, `src/estilos/tokens.css`, shared `Boton`, generated `img(slug)` helper.
  No Tailwind or shadcn installation. The template was adapted to remove both dependencies.
- Never invent rescue facts, numbers or testimonials. Unknown facts stay `PENDIENTE:` in
  `src/contenido/historia.ts` and display as "Por confirmar". Reference media stays labelled.
- Do not touch `../landing`, the original standalone folders, `bot/`, `db/` or `shared/`.
- No git init, commit, merge or push without the user's authorization. Do not stage unrelated dirt.
- Use Node. No Python. Original upload folders are read-only and are not required at runtime.
- Dev: `npm run dev` at port 5394. Validate `npm run check` and browser layouts from 360px.
- The canonical cloning skill is `.agents/skills/clone-website/SKILL.md`; the Babet Home One target
  is selected. Use its observe/build/compare process only for the supplied target URL.
- Every local route and hero animation must work with Next server rendering/hydration.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Website Reverse-Engineer Template

## What This Is
A Next.js workspace for reverse-engineering reference sections with AI coding agents,
seeded with the preserved Huellitas v5 hero and local media. Supply a reference URL to
the local clone-website skill before beginning a clone.

## Tech Stack
- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **UI:** shared Boton, local editorial components, motion
- **Icons:** existing inline SVGs
- **Styling:** CSS Modules and src/estilos/tokens.css, no Tailwind
- **Deployment:** Vercel

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint check
- `npm run typecheck` — TypeScript check
- `npm run check` — Run lint + typecheck + build

## Code Style
- TypeScript strict mode, no `any`
- Named exports, PascalCase components, camelCase utils
- CSS Modules and project tokens; inline styles only for behavior-driven dynamic values
- 2-space indentation
- Responsive: mobile-first

## Design Principles
- **Pixel-perfect emulation** — match the target's spacing, colors, typography exactly
- **No personal aesthetic changes during emulation phase** — match 1:1 first, customize later
- **Real content** — use actual text and assets from the target site, not placeholders
- **Beauty-first** — every pixel matters

## Project Structure
```
src/
  app/              # Next.js routes
  components/       # React components
    ui/             # shadcn/ui primitives
    sites/<site>/   # Source-specific components, including extracted SVGs
  lib/
    utils.ts        # cn() utility (shadcn)
  types/            # TypeScript interfaces
  hooks/            # Custom React hooks
public/
  sites/<site>/     # Source-specific images, fonts, video, and other assets
docs/
  research/<site>/  # Page brief, asset map, and inspection evidence
  design-references/ # Screenshots and visual references
scripts/            # Asset download scripts
.agents/
  skills/
    clone-website/  # Canonical cross-agent cloning workflow
.claude/
  commands/
    clone-website.md # Thin Claude Code invocation bridge
```

## Agent Workflow
- Edit `.agents/skills/clone-website/` for cloning-workflow changes. It is the canonical skill used by Codex, Cursor, and OpenCode.
- Keep `.claude/commands/clone-website.md` as a thin Claude Code bridge to the canonical skill; do not duplicate the workflow there.


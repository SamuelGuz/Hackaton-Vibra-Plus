# Adoption design archives

User-supplied source exports included for transferring the prototype between computers.

| File | Original filename | SHA-256 | Status |
|---|---|---|---|
| `v1.zip` | `pet-adoption-app-development.zip` | `781abf1fdf41270e576b011ac48d9081ce4f9d53d45e82f8d482782f3d7cb86e` | Alternative reference |
| `v2.zip` | `pet-adoption-app-development (2).zip` | `113275f8e9547232e1196119ab04fef03b4cf3f68417165252135548329e8037` | **Selected design** |

- Copies are byte-identical to the user-provided archives; originals remain unchanged.
- ZIP integrity, relative paths and a bounded credential-pattern scan were checked before inclusion. This is not a security or license audit.
- `drizzle.config.json` contains a generic local PostgreSQL example in each archive, not production credentials. Do not reuse it as a real credential.
- No archive scripts were executed. The exports use Next.js/Drizzle; the active panel uses React/Vite. Adapt the design, do not replace the existing application or database.
- Referenced image files are missing from the exports. Use project-local assets or honest no-photo fallbacks.
- Extract to a temporary directory outside the repository, rejecting absolute paths, parent traversal and symlinks.
- Full context and next action: [Codex handoff](../../handoff-monoga-codex.md).

# Storytelling of the public site

## Current public narrative (2026-10-29)

The shared body now uses the exported `editorial` content object and
`src/secciones/Editorial/EditorialSections.tsx`. Its arc is affection → Doña Gloria's home →
neighbourhood support → a food contribution → responsible adoption → clear information → action.
The animal count and food-price equivalences below are historical plan values, not verified
public claims. They are omitted from the new body or explicitly pending. Demo animal names,
technical self-criticism, mock donor messages and calendar guarantees are not in the new body.
Media remains labelled as reference imagery. The original source notes below are retained.

Content lives in `src/contenido/historia.ts`. This document explains the arc, why each section exists, and where every fact comes from.

## Goal

The site is not for the rescuer: it exists to get people to **donate, adopt, and support** (user request). Visitors arrive skeptical, so the story builds trust first and asks second.

## Sources

All facts come from git branch `silvia-rescate-real` of the `mejoras-web` repo. Abbreviations used below:

| Key | File in the branch |
| --- | --- |
| PLAN | `docs/plan-rescate-silvia.md` |
| RES | `docs/resumen-solucion-silvia.html` |
| REQ | `docs/Huellitas_Requerimientos_VibraPlus.md` |
| USER | Instructions given by the user in chat (not in the branch) |

Note: **Silvia is the author of the plan, not the rescuer.** The rescuer is **Doña Gloria** (PLAN §1, RES §1).

## The arc

| # | Section (`id`) | Why it exists | Facts and source |
| --- | --- | --- | --- |
| Hero A | `heroCreativo` | Emotional hook: the dogs eat from generosity, not a budget. | 90 dogs and cats in her own home (PLAN §1); butcher donates food (PLAN §1). |
| Hero B | `heroRescateReal` | Trust through honest self-critique, as the user asked: "100% en información a la rama". | Recycler, 90 animals, cracked phone (PLAN §1). Self-critique: email campaigns, heavy panel, 70 fake dogs, voice that was plain text (PLAN §1 "La crítica necesaria" items 1-4; RES §2). Plan: WhatsApp assistant, butcher donations, voice notes for medicine, 100% WhatsApp (PLAN §2 solutions 1, 2, 3, 5). |
| Hero C | `heroVideos` | Short text between two dog videos; one feeling, two actions. | 90 animals, butcher (PLAN §1). |
| 1 | `el-problema` | Name the real problem before asking for anything. | "Un refugio no fracasa por falta de amor..." (PLAN §4 pitch). No fixed budget, no money for concentrate (PLAN §1). 14 hours/day with wet hands (PLAN §1). 3 hours/day answering curious people (PLAN §2.1). Prepaid data packs of $3.000 COP, no Wi-Fi (PLAN §1). |
| 2 | `quien-es-ella` | People give to a person, not to an organization. | Recycler, 90 dogs and cats at home, by vocation; low-end Android, cracked screen, worn battery (PLAN §1, RES §1). |
| 3 | `el-carnicero` | A concrete local ally makes the help feel real and traceable. | Don Carlos gives or lends bones, offal and meat scraps (PLAN §1). |
| 4 | `como-ayuda-tu-aporte` | Turn money into kilos: people distrust "a generic bank account". | Amounts and what they buy (PLAN §2.2, RES §3.2). |
| 5 | `adoptar` | Explain adoption in one breath: WhatsApp, 4 questions, a visit. | 4 questions: housing, budget, fences, vet commitment (PLAN §2.1). Visit is booked when the person qualifies (PLAN §2.1). Visit lands in her Google Calendar (USER). |
| 6 | `transparencia` | Admitting mistakes is the strongest trust signal. | 70 fake dogs and broken promises in the first version (PLAN §1). Donor notification after giving (PLAN §2.2). |
| 7 | `llamado-final` | Close with the smallest possible action. | $10.000 = 2 kg of meat (PLAN §2.2). |

## Donations (`donaciones`)

| Amount (COP) | What it buys | Source |
| --- | --- | --- |
| 10.000 | 2 kg of meat with the butcher | PLAN §2.2 option 1, RES §3.2 |
| 25.000 | Offal for 10 dogs for one day | PLAN §2.2 option 2, RES §3.2 |
| 60.000 | One bag of concentrate to mix with the meat | PLAN §2.2 option 3, RES §3.2 |

The impact messages follow the notification the plan describes: "Gracias a tus $10.000, Rocky comió hoy carne con Don Carlos el carnicero" (PLAN §2.2). The dog name was removed from the copy because no source confirms Rocky is a real animal.

Earlier chat context mentioned "$10.000 = 3 kg" and "$50.000 = un bulto". The branch says 2 kg and $60.000, so the branch values are used.

## Adoption (`adopcion.pasos`)

1. Write on WhatsApp; an assistant answers 24/7 (RES §3.1).
2. Answer the 4 questions (PLAN §2.1).
3. If the person qualifies (≥75 points in PLAN §2.1, not shown publicly), a visit is booked. The plan says a weekend or Saturday visit (PLAN §2.1, RES §3.1); the calendar destination comes from USER.
4. Doña Gloria receives a clean summary (PLAN §2.1).

If the person does not qualify, the assistant redirects them to donate or sponsor food (PLAN §2.1). The site should not promise adoption to everyone.

## Demo animals

`Rocky` and `El Tuerto` appear in the plan as examples (PLAN §2.2, §2.3). They are marked `esDemo: true` until a human confirms they are real.

## Not used on purpose

- "83 pruebas con falla oculta" and "cables desconectados" (PLAN §1 item 5, RES §2): true, but technical; a donor does not need them.
- "Un teléfono de $150.000 pesos" (PLAN §4): pitch for judges, not for donors.
- REQ numbers (45 dogs + 25 cats, 3 founders, borrowed land, clinic debt): they describe a different profile from the plan. The user asked to build on the plan, so REQ is only used to flag the contradiction.

## PENDIENTE (a human must fill these in)

- Consent from Doña Gloria and Don Carlos to appear by name on a public page.
- Neighborhood and city (the plan only says Colombia).
- Nequi and Daviplata numbers and account holders.
- WhatsApp number of the assistant.
- Real photos and videos of the animals, with permission.
- Confirm the donation amounts are still valid with the butcher.
- Confirm the donor notification and calendar booking already work before promising them.
- Clarify the animal count: PLAN says 90, REQ §1 says 45 dogs and 25 cats.

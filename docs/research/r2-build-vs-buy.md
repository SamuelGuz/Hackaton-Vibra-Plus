# R2 Build vs Buy vs Reuse - Huellitas (2026-10-27)

## Recommendation
Build a thin own backend (WhatsApp/Telegram bot + Gemini + Google Sheets or Supabase), designed on a REA spine. Do NOT build on Odoo; do NOT adopt ASM3. Optionally steal ideas from both (ASM3 field lists for animals/medical; Odoo stock/accounting duality) and cite them in the pitch.

## 1. Odoo (evidence)
- WhatsApp: official Odoo 19 docs: "WhatsApp is an Odoo Enterprise-only application that does not work in Odoo Community edition". Needs Meta Business account, developer app, WhatsApp Business Platform number, permanent token, webhooks, pre-approved templates. Not in One App Free / Standard Online (custom plan only). Source: odoo.com/documentation/19.0/applications/productivity/whatsapp.html
- Community WhatsApp options are paid or third-party: ECOSIRE from $299; EBITDA "WhatsApp Odoo" ~$59.62; Open WhatsApp Connector $39; GreenAPI free module but service ~$15/mo; OCA mail_gateway_whatsapp (OCA/social, PyPI) exists and is free but needs Meta Cloud API webhook setup by a developer. (apps.odoo.com, ecosire, pypi)
- Odoo Online "One App Free": $0, 1 app, unlimited users; installing a 2nd app moves to Standard $24.90-31.10/user/mo. Sources conflict on Studio/multi-company. A $0 shelter needs Inventory+Accounting+Contacts = multi-app -> not free on Online.
- Self-host Community: free software but needs a server. Oracle Always Free ARM (4 OCPU/24 GB; one 2026 article claims cut to ~2 vCPU/12 GB, unverified; "out of capacity" errors common). Odoo RAM: sources say 2-4 GB min, 4-8 GB recommended for v19/20. Feasible at $0 but that is a VM someone must patch, back up, upgrade (Odoo major upgrades are painful). Violates "maintained without programmer".
- Shelter modules: Probuse "Animal Shelter and Rescue" (18.0, $116.69, intake/adoption/foster/volunteers/medical; depends Employees, Project, Website, Discuss; paid, third-party). OCA "animal" module is a basic record only. Vet-clinic modules (Veterinary Pro OPL-1, acs_hms_veterinary not for Odoo Online) are clinic-side, not shelter-side. No Colombian/LatAm shelter module found.
- AI: Odoo 19 AI layer (agents, Ask AI, invoice OCR, AI fields) is Enterprise-only per vendor comparisons; Community needs third-party "AI Agent Hub" etc. Native mobile apps Enterprise-only; web UI is responsive but heavy on bad signal; offline editing reported only for Odoo 20 (unverified, vendor blog).
- UX: Odoo is an ERP; learning in 15-20 min on a phone with dirty hands is not credible. WhatsApp-first constraint means Odoo would only be a back office the shelter never opens.
- Verdict: fails $0 (or fails maintainability), fails WhatsApp (Enterprise or paid/dev-heavy), fails mobile-only simplicity. Judges may see it as "installed an ERP", low originality.

## 2. Animal Shelter Manager (ASM3)
- GPL-3.0, github.com/bobintetley/asm3, ~9.9k commits, 149 stars, 89 forks, 65 open issues. Python 3 + JS; MySQL/PostgreSQL/SQLite; Apache mod_wsgi; daily cron. Optional PDF, Excel, QR codes, Stripe, S3. (README; last-commit date not retrievable.)
- Features per listings: intake, adoption, case, fundraising, medical records, volunteers. Foster/stock/donation depth and API not verified by me (ASM3 is known to have a service API and online forms, but I did not confirm in this research).
- Hosting: sheltermanager.com SaaS $105/3mo, $185/6mo, $340/yr per shelter (Capterra; a free version is listed, terms unverified; pricing page 404'd). Self-host free but needs Apache/Python/DB server = same maintenance problem.
- Fit: UI is desktop-first, English/US/UK shelter model (kennels, microchips, legal holds), no WhatsApp, no voice/photo capture, no days-of-food prediction, no cash vs vet debt. Hacks needed to bolt on bot = building a thin backend anyway, plus learning a 10-year codebase in 36h.
- Verdict: good reference for animal/medical field design; poor base.

## 3. Other tools
Shelterluv, Petstablished, ShelterBuddy, Shelter Pro, PetPoint: commercial SaaS, USD per month, US-oriented, adoption/foster CRM, none WhatsApp-first, none $0. No Latin American OSS shelter system found in searches (not exhaustive). Self-hosted guide (pistack.xyz 2026) calls ASM3 the most mature OSS option, i.e. no better OSS alternative surfaced.

## 4. REA model
- McCarthy 1982 (The Accounting Review, "The REA Accounting Model"); standardized in ISO/IEC 15944-4 (business transaction ontology). Core: Resources (things with economic value), Events (things that happen, change resources), Agents (parties who participate). Rules: every event affects a resource and has participating agents; economic events come in duality pairs (increment <-> decrement), e.g. give cash <-> receive goods; commitment/contract layer precedes events. No debits/credits stored; ledgers derive from events.
- Mapping Huellitas:
  - Resources: food (kg bags, by brand), medicines/vaccines stock, money (cash, bank, nominal vet debt), animals (as care subjects; capacity = cages/foster slots), volunteer hours.
  - Events: purchase, donation (money or in-kind), consumption (daily feed), dose given, vaccination, vet service/invoice, adoption, return, foster placement, volunteer shift, check-in.
  - Agents: caregiver, founder, volunteer, donor/padrino, clinic, supplier, adopter, foster home, animal (as agent only for medical subject).
  - Duality pairs: donation(money) <-> cash increase; in-kind food donation <-> stock increase; purchase <-> cash decrease + stock increase; vet service <-> debt increase (payable); payment to clinic <-> cash decrease + debt decrease; dose <-> medicine stock decrease; adoption <-> capacity freed (+ commitment: follow-up check-ins at 2/5/15/30/90 days as commitments fulfilled by check-in events); padrino pledge (commitment) <-> monthly donation events.
- Useful as design spine? Yes, cheaply: collapses 24 tables into ~3 patterns (resource, event with resource_id/agent ids/qty/amount/ts, agent) plus commitment. One event log gives audit trail, voice-note to event extraction is natural (LLM outputs one JSON event type), caja vs deuda and days-of-food are derived views, and "ecosystem" claim is a coherent pitch (donation visibly turns into kg of food and doses). Caveat: do not expose REA vocabulary to users; keep to Sheets tabs: Eventos, Recursos, Personas. Risk: over-abstraction in 36h; keep typed event columns, not EAV.
- Suggested minimal schema: agents(id,type,name,phone), resources(id,kind,unit,name,min_level), events(id,ts,type,agent_id,resource_id,qty,amount,animal_id,source=voice|photo|manual,media_url,confirmed), commitments(id,type,agent_id,due,status,link_event_id), animals. 5 tables + views.

## Scorecard (0-5, 5 best)
| Criterion | Odoo | ASM3 | Own thin (REA) |
|---|---|---|---|
| $0/month | 2 (Online free=1 app; self-host needs VM) | 2 (SaaS $340/yr; self-host VM) | 5 (Sheets/Cloud Run/Gemini free tiers) |
| Mobile only | 2 | 2 | 5 |
| Bad signal/offline | 1 | 1 | 4 (WhatsApp queues messages) |
| <20 min learning | 1 | 2 | 5 |
| Maintainable without programmer | 1 | 2 | 4 (Sheets editable; bot is code but small) |
| WhatsApp/Sheets familiarity | 1 | 1 | 5 |
| Wow for judges | 2 | 1 | 5 (voice, photo invoices, predictive food, REA ecosystem) |
| Feasible in 36h by 5 devs | 2 | 2 | 4 |
| Total /40 | 12 | 13 | 37 |

## Caveats
Pricing and Odoo 20 claims come from vendor/third-party pages; ASM3 feature depth and free tier not confirmed from official site. Verify WhatsApp Business API cost/approval time (Meta templates, number verification) before demo; Telegram for internal team is the lower-risk fallback. Maintainability risk of own backend is the main weakness: mitigate with Sheets as data source of truth, documented runbook, and keep bot stateless.

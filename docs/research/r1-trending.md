# R1 - Repos para Huellitas Bot (fecha de corte 2026-10-27)

Nota de método: no se instaló ni ejecutó nada. Las páginas de GitHub que se pudieron leer no mostraron fechas de último commit en la mayoría de casos; donde dice "no verificado" hay que comprobarlo en la pestaña Commits antes de decidir. Licencias marcadas "(conocida, no verificada hoy)" vienen de conocimiento previo, no de la página.

## 1. Trending (lo que hay hoy)

**Daily:** elayadesign/ai-design-skills (9.3k), Nutlope/hallmark (39k), nightly-labs/openbot (2.4k), obra/superpowers (306k), pbakaus/impeccable (90k), makecindy/cindy (7.5k), gitroomhq/postiz-app (39k), affaan-m/ECC (291k), HKUDS/DeepTutor (46k), JetBrains/thinkrail (4k), togg53192-cmd/jailbreaks (5.5k; no es útil y tiene pinta de spam, descartar).

**Weekly:** cloudflare/security-audit-skill (50k), anthropics/knowledge-work-plugins (33k), AgriciDaniel/claude-seo (23k), multica-ai/andrej-karpathy-skills (225k), TauricResearch/TradingAgents (117k), Graphify-Labs/graphify (137k), ruvnet/ruflo (80k), anomalyco/opencode (222k), stablyai/orca (108k), android/skills (10k), akitaonrails/ai-memory (14k), pingdotgg/t3code (31k), fastapi/fastapi (104k).

**Monthly:** casi todo es tooling de agentes IA. Destacados fuera de eso: heygen-com/hyperframes (video desde HTML), debpalash/VoiceStudio (91k, clonación de voz local, pesado y no encaja con WhatsApp), tashfeenahmed/freellmapi (42k, enruta a LLM gratuitos con failover, solo "uso personal": no apto para producción), supabase/supabase (114k), flutter/flutter (180k).

**Python semanal:** anthropics/knowledge-work-plugins, AgriciDaniel/claude-seo, TradingAgents, Graphify, fastapi, vllm, sglang, luongnv89/claude-howto, aws/agent-toolkit-for-aws, SnailSploit/Claude-Red, higgsfield-ai/skills, shiyu-coder/Kronos. Ninguno es integrable en el producto.

**TypeScript semanal:** ruflo, opencode, orca, t3code, hyperframes, gemini-cli, remotion, cindy, ziwei-doushu, freellmapi, microsoft/skill-recorder, anthropics/sandbox-runtime, video-shotcraft, openbot, thesysdev/openui, infinite-canvas, google/brotli, rakazo, postiz-app, vite. Solo postiz-app y vite son candidatos.

Conclusión de trending: no hay nada específico de albergues ni de mascotas. Lo útil está en la búsqueda dirigida (sección 2).

## 2. Repos integrables al producto (ranking)

| # | Repo | URL | Estrellas | Último commit | Licencia | Parte del producto | Esfuerzo 36h | Fit (1-5) |
|---|---|---|---|---|---|---|---|---|
| 1 | python-telegram-bot | https://github.com/python-telegram-bot/python-telegram-bot | 29.5k | no verificado | LGPL-3.0 (biblioteca; la página también lista GPL-3.0) | Bot interno del equipo (Telegram): alertas, resúmenes 6:30/20:00, aprobaciones de registros | S | 5 |
| 2 | WhatsApp Cloud API de Meta (sin SDK oficial en GitHub) | https://developers.facebook.com/docs/whatsapp/cloud-api | n/a | n/a | Documentación de Meta | Canal principal del cliente (M1 registro, M5 alertas, M6 adopciones). Llamadas REST directas con requests/httpx, sin SDK | M (la verificación de negocio de Meta puede tardar más que las 36 h) | 5 (producto) / riesgo de tiempo |
| 3 | EvolutionAPI/evolution-api | https://github.com/EvolutionAPI/evolution-api | 10.0k | no verificado | Apache-2.0 con condiciones de marca (aviso obligatorio) | Plan B de WhatsApp si Meta no aprueba a tiempo. Sobre Baileys (WhatsApp Web) | S-M | 3 (riesgo de baneo) |
| 4 | faster-whisper (SYSTRAN) | https://github.com/SYSTRAN/faster-whisper | 26.2k | no verificado | MIT | Transcripción de notas de voz como respaldo o modo offline del backend (M1). Gemini Flash ya cubre audio, así que es opcional | S-M (requiere CPU/servidor) | 3 |
| 5 | gspread | https://github.com/burnash/gspread | no verificado | no verificado | MIT (conocida, no verificada hoy) | Google Sheets como BD desde Python: lectura/escritura de las 24 tablas (o pestañas) | S | 5 |
| 6 | FastAPI | https://github.com/fastapi/fastapi | 104k | no verificado en la página | MIT (conocida, no verificada hoy) | Backend del webhook de WhatsApp/Telegram, endpoints de la PWA y cron | S | 5 |
| 7 | n8n | https://github.com/n8n-io/n8n | 208.8k | no verificado | Sustainable Use License (fair-code, no OSI). Uso interno permitido, no revender | Orquestador de alertas y flujos (cron, escalamiento) si el equipo prefiere no programar el cron | M | 3 (otra herramienta que aprender) |
| 8 | Postiz (gitroomhq/postiz-app) | https://github.com/gitroomhq/postiz-app | 39.4k | no verificado | AGPL-3.0 (modificar y servir por red obliga a publicar código) | Publicación en Instagram/Facebook para M7 (posts). Mejor como herramienta externa que como código integrado | L si se integra; S si se usa aparte | 2 |
| 9 | Baileys (WhiskeySockets) | https://github.com/WhiskeySockets/Baileys | 11.5k | no verificado | MIT. No oficial, sin afiliación con WhatsApp | Solo si se elige Evolution. Mismo riesgo de baneo | M-L | 2 |
| 10 | bhimrazy/receipt-ocr | https://github.com/bhimrazy/receipt-ocr | ~348 (de búsqueda, no de la página) | no verificado | no verificado | Respaldo de OCR de facturas (M4) si Gemini no basta | M | 2 |
| 11 | ohmybugs/invoice-data-extractor | https://github.com/ohmybugs/invoice-data-extractor | no verificado | no verificado | no verificado | Referencia: pdfplumber + OCR + LLM local, salida JSON. Útil como patrón, no como dependencia | M | 2 |
| 12 | ASM3 (sheltermanager) | https://sourceforge.net/projects/sheltermanager/ (no está en GitHub) | no aplica | no verificado | GPL | Referencia de modelo de datos de albergue (animales, adopciones, ingresos). No integrar, solo copiar ideas de esquema | S como referencia | 3 (referencia) |
| 13 | Pet-ReID-IMAG / PetFace | https://github.com/muzishen/Pet-ReID-IMAG ; PetFace (ECCV 2024) | no verificado | no verificado | no verificado | Reconocimiento de nariz/rostro de perros y gatos. Requiere GPU y entrenamiento | L | 1 (fuera de alcance en 36 h) |

**NFC (no es un repo).** No encontré un proyecto open source de tag NFC para mascotas con repo serio. El repo SimpleNFC es un lector de iOS, sin relación. Para el collar basta grabar en el tag una URL NDEF que apunte a la página del perro, sin librería. La lectura desde el navegador usa la Web NFC API, que solo funciona en Chrome de Android, no en iPhone. Esto importa porque el equipo es solo móvil: validar qué celulares usan los cuidadores y voluntarios antes de prometer el escaneo.

## 3. Dev accelerators (no van en el producto)

| Repo | URL | Estrellas | Licencia | Para qué |
|---|---|---|---|---|
| obra/superpowers | https://github.com/obra/superpowers | 306k | no verificada | Flujo de trabajo de agentes con planes y revisiones |
| multica-ai/andrej-karpathy-skills | https://github.com/multica-ai/andrej-karpathy-skills | 225k | no verificada | Un CLAUDE.md con reglas anti-errores de LLM. Ya lo tienen en su CLAUDE.md global |
| cloudflare/security-audit-skill | https://github.com/cloudflare/security-audit-skill | 50k | no verificada | Auditoría de seguridad antes de la demo (claves en el código, datos de adoptantes) |
| xing5/mcp-google-sheets | https://github.com/xing5/mcp-google-sheets | 1.0k | MIT | Que Claude/los devs lean y escriban las hojas mientras prototipan el esquema de 24 tablas. Último push reportado: 2026-03-15 |
| Graphify-Labs/graphify | https://github.com/Graphify-Labs/graphify | 137k | no verificada | Mapa del código del repo para que los 5 devs no se pierdan |

## 4. Recomendación inicial

Base sugerida (todo gratis y mantenido): FastAPI + gspread (Sheets como BD) + python-telegram-bot para el equipo + WhatsApp Cloud API por HTTP directo. Evolution API solo como plan B, con el riesgo de baneo explicado al cliente. Postiz y n8n se descartan para el día 1 salvo que alguien del equipo ya los domine.

## 5. Pendientes de verificación (antes de decidir)

- Fechas de último commit y licencias exactas de casi todos los repos (la lectura de GitHub no las mostró).
- Estado de verificación de empresa en Meta para WhatsApp Cloud API (puede ser el cuello de botella de las 36 h).
- Que el número de WhatsApp del albergue no esté ya en uso con la API de WhatsApp Business.

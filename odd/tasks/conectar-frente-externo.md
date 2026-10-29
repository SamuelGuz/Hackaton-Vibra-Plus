# conectar-frente-externo

Objetivo: que el bot que ya corre sirva también el frente externo (RAG, agente de adopciones, campañas) sin romper el flujo del equipo.
Rama: `samuel/conectar-externo` desde `master`. Entrega: `ask-on-risk`. Pruebas: vitest (`bot`), con fakes (`bot/test/externo/fakes.ts`).

## Specs

Tomado de [plan para esta noche.md](../../plan%20para%20esta%20noche.md), Fase 1, tarea de SAMUEL, y del contrato mínimo de Fase 0.

- S1. "Wiring del contexto externo en el servidor existente: RAG/Gemini/WhatsApp/correo, rutas públicas y ruta de desconocidos; mantener el flujo de usuarios internos." Archivos: `bot/src/index.ts`, `bot/src/app.ts`, `bot/src/rag/**`, `bot/src/adopciones-agente/**`, `bot/src/campanas/**`.
- S2. Resultado: "Una sola app Hono recibe `externo`; número desconocido entra al agente y personal registrado conserva flujo interno."
- S3. Aceptación: "Prueba local con fakes prueba los dos recorridos y rutas; no requiere servicios Meta, Gemini o correo reales."
- S4. Fase 2.1: "Integrar backend con la app Hono existente, no levantar otro servidor: una ruta para catálogo/búsqueda, una para agente/voz, y las rutas internas existentes."
- S5. Fase 2.2: "Acordar y cablear `/api/publico/voz-adopcion` **o** el nombre existente `/api/publico/agente-voz`; no dejar dos implementaciones divergentes. Si se mantiene un alias, ambas rutas llaman al mismo handler y comparten validación/respuesta."
- S6. Fase 3: "No llamar WhatsApp, Gemini, correo o DB productiva para esta validación." y "No enviar campañas en demo."
- S7. Interno: "conservar contratos actuales de `/api/hoy`, `/api/eventos` y cola offline."

## Lo que ya existe (mapa)

- `app.ts` ya acepta `externo?: ConfigExterno`. Con él, un número desconocido va a `atenderInteresadoExterno` y se montan `montarRutasRag`, `montarRutasAgente` y `montarRutasCampanas`, antes de `exigirSesion` y del CORS del panel.
- `index.ts` **no** arma `externo`. Por eso hoy no hay rutas públicas y los desconocidos reciben el aviso de siempre.
- Piezas: `crearRag({ datos, llm?, ahora })`, `crearLlmGemini({ apiKey, modelo })`, `crearRespuestas({ rag, datos, conocimiento, llm?, ahora, medicinas? })` y `leerConfigCorreo(env, urlBase, whatsappPublico)` con `crearCorreo`.
- Las sesiones del agente viven en memoria (`adopciones-agente/sesiones.ts`, un `Map`). Persistirlas es otra tarea del plan (Fase 2.4).
- `master` trae `exceljs` y `nodemailer` en `bot/package.json`. Hay que correr `npm install` antes de arrancar.

## Tasks

| ID | Specs | Qué | Ruta | Estado |
|---|---|---|---|---|
| T1 | S1, S2, S6 | `src/externo.ts` (`armarExterno`) arma `ContextoExterno`: LLM Gemini solo si hay `GEMINI_API_KEY`; RAG y respuestas sobre `repo.hoy`; `whatsappPublico` desde `WA_NUMERO_BOT`; correo con `leerConfigCorreo` y **sin enviador** si no hay `RESEND_API_KEY`/`SMTP_HOST`. `index.ts` se lo pasa a `crearApp`. | inline | hecha |
| T2 | S2, S3, S7 | Prueba de integración con fakes (`test/externo/arranque.test.ts`): número desconocido → agente y no el aviso; miembro del equipo → menú; catálogo sin sesión; `/api/hoy` 401; sin frente externo no hay rutas públicas. | inline | hecha |
| T3 | S4, S5 | `/api/publico/voz-adopcion` como alias del mismo handler de `/api/publico/agente-voz` (D1), con prueba de respuesta idéntica. | inline | hecha |
| T4 | S4 | CORS de `/api/publico/*` para el panel: ya existía (`origin: '*'` y límite por IP); queda fijado con una prueba. | inline | hecha |
| T5 | S1 | `.env.example` y README con las variables nuevas, y aclaración de que sin Resend/SMTP y `CAMPANAS_CLAVE` no sale ningún correo. | inline | hecha |
| T6 | S3, S6 | Prueba manual con el bot en vivo (puerto 8787): catálogo 200 con animales reales, búsqueda 200, `/api/hoy` 401, alias de voz 400 con el mismo error, y un turno real del agente por texto. Falta: un mensaje de WhatsApp desde un número que no sea del equipo. | inline | casi: falta el WhatsApp real |

No se delega a otro agente: es una sola unidad de trabajo, de unas 150 líneas, sobre archivos que se leen de todas formas.

## Decisiones abiertas

- D1 (con MONOGA): nombre de la ruta de voz. Recomendación: dejar `/api/publico/agente-voz`, que ya existe y tiene pruebas, y agregar `/api/publico/voz-adopcion` como alias del mismo handler mientras el frontend se cambia.
- D2: el arreglo de audios del bot interno (rama `samuel/equipo`, sin commit) se pasa a `master` antes de empezar T1, para no trabajar sobre dos bases distintas.

## Riesgo

- Item 3 (contratos): cambia lo que reciben los números desconocidos: pasan del aviso al agente. Está pedido, pero lo cubre T2.
- Item 2 (seguridad): rutas públicas sin sesión. Se exige el límite de peticiones (T4) y que las respuestas públicas no traigan teléfonos, stock ni precios (`nivel: 'publico'`).

## Log

- L1 (2026-10-28) Pedido de Samuel, literal: "ya empieza a hacer el planning de la primera tare de plan para esta noche".
- L2 (2026-10-28) Mapa hecho sobre `master` en `e1cc978`. Copia de recuperación en Engram: pendiente (la herramienta de memoria no está disponible en esta sesión).
- L3 (2026-10-28) Samuel, literal: "Si haz commit del arreglo de audios, y si, como recomiendas me parece bien, sigue con el plan". D1: queda `agente-voz` y `voz-adopcion` como alias. D2: arreglo de audios en `samuel/equipo` (6f0c7b9), pasado a esta rama con cherry-pick (559e5a9).
- L4 (2026-10-28) RED: `arranque.test.ts` falló porque no existía `src/externo.ts`. GREEN: 10/10; suite completa 617 pasan, 83 fallos esperados declarados, `tsc` limpio. El bot en vivo pasó a correr desde esta rama.

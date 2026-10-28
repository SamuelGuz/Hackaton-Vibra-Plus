# frente-externo

Objetivo: frente externo de Huellitas (RAG de animales, agente emocional de adopciones por WhatsApp/voz, campañas de correo, landing SEO).
Rama: `daniel/externo` (sale de `origin/samuel/conectar`). Entrega: `ask-on-risk`. Pruebas: vitest (`bot`, `panel`).

## Specs

- S1. Si escribe por WhatsApp un número que NO es usuario interno (`!usuario`), `bot/src/app.ts` lo enruta a `atenderInteresadoExterno(deps, m.de, m.entrada)` en vez de `textos.desconocido`.
- S2. Todo el backend nuevo vive en `bot/src/rag/`, `bot/src/adopciones-agente/` y `bot/src/campanas/`. Rutas públicas bajo `/api/publico/*`, montadas en `app.ts` ANTES de `exigirSesion`.
- S3. RAG: índice rico (animales de `deps.repo.hoy()` + perfil: historia, personalidad, edad, tamaño, compatibilidad niños/gatos/apartamento, necesidades médicas, meta de apadrinamiento), búsqueda híbrida con Gemini + eventos reales de hoy (comió / medicina). `GET /api/publico/rag/perritos` y `GET /api/publico/rag/buscar?q=...`.
- S4. Agente emocional: saluda con calidez, consulta el RAG, cuenta la historia ("Mira, te cuento la historia de Toby..."), evalúa discretamente con JSON de Gemini (`suitability_score` 0-100, `risk_score` 0-100; vivienda/permiso de arriendo, presupuesto veterinario, tiempo). Si no puede adoptar pero conectó: persuadir a ser Padrino desde $20.000 COP o donar comida. Si `suitability_score >= 75`: agenda visita y avisa por WhatsApp a las administradoras: "Doña María, filtré a un adoptante excelente para [Perro] (Score X%). Viene el sábado a las 10 AM".
- S5. `POST /api/publico/agente-voz`: recibe voz/texto, devuelve respuesta persuasiva + guion de voz emocional.
- S6. Campañas: `POST /api/publico/campanas/generar` y `POST /api/publico/campanas/enviar` (SMTP/Resend + preview HTML instantáneo).
- S7. Landing pública en el panel (`?vista=adoptar` o `/adoptar`), SEO "Adoptar perrito - Fundación Huellitas", buscador RAG en vivo, tarjetas con botón a WhatsApp, modal "📞 Llamar al Agente de Voz de Huellitas" (Web Speech API STT + síntesis de voz) contra `/api/publico/agente-voz`.

## Tasks

- [x] T1 (S3) RAG + perfiles de 70 animales — delegada (writer en paralelo). bot: 81 tests rag
- [x] T2 (S1,S4,S5) Agente emocional + WhatsApp + voz — delegada (arquitecto). 116 tests; cableado en app.ts (S1,S2) con test de integración
- [x] T3 (S6) Campañas — delegada. 56 tests
- [x] T4 (S7) Landing panel — delegada. panel: 100 tests (tsc falla por error previo en integracion.test.tsx)
- Commits: pendientes (git sin identidad configurada)

## Log

- L1 (2026-10-28) Petición original de Daniel: ver S1-S7 (texto literal arriba).
- L3 (2026-10-28) Decisión de Daniel, literal: "Portalo a master, todo tiene que ser segun lo que esta en master". Rama `daniel/externo-master` (de `origin/master`). `master` NO tiene `app.ts`/`server.ts`/flujos (T13-T20 de `backend-y-adopcion.md` pendientes): mi frente se entrega como piezas que esa integración enchufa. Cambios del port: (a) datos desde `Repo` (`animales`, `tratamientos`, `registrosDelDia`, `padrinazgosActivos`; "comió hoy" = registro `comida` real); (b) Gemini por REST con `generarJSON` + `quitarDatosSensibles` (sin `@google/genai`); (c) WhatsApp por el buzón durable: `crearProcesadorExterno(base, deps, ctx)` devuelve `RespuestaNueva` en vez de enviar directo; (d) sesiones del agente en `Kv` (no en memoria); (e) avisos a administradoras respetan la ventana de 24 h (`ventanaAbierta`); (f) número público = `WA_NUMERO_BOT`. La rama vieja `daniel/externo` (sobre samuel/conectar) queda como referencia, sin push.
- L2 Hallazgos: `PLAN_DANIEL.md` no existe en el repo; `bot/src/app.ts` etc. solo existen en `origin/samuel/conectar`. `deps.repo.datosAlbergue()` no existe: el equivalente es `deps.repo.hoy(ahora)`. `Repo` no lista administradoras: se derivan de `hoy().personas` (rol admin/adopciones) + `usuarioPorId`.

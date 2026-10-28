# Auditoría: campañas y panel

Auditoría estática de `bot/src/campanas`, `bot/test/campanas` y `panel/`. Se contrastó con el plan de módulos 3 y 4 indicado para esta revisión y con `docs/PLAN_INTEGRADO.md` / `docs/PLAN_PANEL.md` donde aplican. No se leyeron `.env` ni secretos, no se contactaron servicios externos y no se ejecutó la suite.

## Resumen ejecutivo

- **Módulo 3 — campañas:** generación basada en animales urgentes vía RAG, texto redactado con Gemini y fallback, plantilla HTML y texto, CTA de apadrinamiento/comida, preview y envío real Resend/SMTP ya están implementados. Faltan métricas de apertura/conversión y `GET /api/publico/campanas/preview/:animalId`; el preview actual es respuesta HTML dentro de `POST /enviar`.
- **Módulo 4 — experiencia pública de adopción:** el servidor ya tiene búsqueda RAG pública y endpoint de agente de voz. El panel no implementa `/adoptar`, landing pública, tarjetas públicas, buscador/CTA de voz ni `LlamadaAgenteVoz.tsx`; el enrutador actual es el panel operativo interno con sesión. El HTML base y PWA tienen metadatos de la libreta interna, sin SEO específico de adopciones ni JSON-LD `AnimalShelter`.
- `panel/src/features/adopciones/` **no es** el portal público: solo contiene datos demo/tests de solicitudes para el flujo de gestión interna. La ruta de animales (`/animales`) también está dentro del panel autenticado.
- **Disponibilidad de producción:** aunque el bot registra las rutas públicas cuando existe `cfg.externo` (`bot/src/app.ts:145-150`), `bot/src/index.ts:51-66` llama `crearApp` sin pasar `externo`. En el entrypoint actual RAG público, voz y campañas quedan apagados; además, ese bloque es también el que habilita el agente de WhatsApp para contactos externos (`bot/src/app.ts:50-60`). Se necesita cablear esa configuración antes de considerar los endpoints operativos.

## Módulo 3: campañas de correo

| Requisito | Estado | Evidencia / detalle |
|---|---|---|
| Seleccionar casos urgentes desde RAG por tratamiento/comida | **Implementado parcialmente** | `generarCampana` obtiene `ctx.rag.urgentes(...)` cuando no llegan IDs (`bot/src/campanas/generar.ts:66-71,111-118`). El RAG construye `urgencia` con edad, tratamientos activos y advertencias (`bot/src/rag/perfil.ts:205`) y ordena/sugiere por puntaje (`bot/src/rag/servicio.ts:111-113`; `bot/src/rag/buscar.ts:546`). El objetivo de campaña puede ser `padrinos` o `comida`; la selección del conjunto urgente no cambia por objetivo y no calcula urgencia específica por días de inventario de comida. Si el plan requiere ranking por agotamiento real de alimento además de tratamiento, ese criterio no está demostrado aquí. |
| Redacción emotiva por Gemini con hechos RAG | **Implementado** | Prompt en español cercano, límite a datos reales, sin inventar historia ni urgencia falsa; estructura validada y fallback ante error (`bot/src/campanas/generar.ts:42-52,125-139,142-159,162-198`). |
| Correo HTML y CTA apadrinar / donar comida | **Implementado** | Renderiza HTML compatible con email y texto plano con escape de variables (`bot/src/campanas/plantilla.ts:16-35,68-104,107-119`). CTA selecciona apadrinar o donar comida y genera WhatsApp cuando hay número (`bot/src/campanas/generar.ts:37-40,212-223`). |
| Preview HTML sin envío | **Implementado, interfaz distinta a GET** | `POST /api/publico/campanas/enviar` usa `modo: "preview"` por defecto, devuelve asunto, HTML y estructura, y no envía (`bot/src/campanas/rutas.ts:48-63,83-92`). `POST /generar` también devuelve preview (`:37-46`). No existe ruta GET de preview por animal. |
| Envío real por SMTP o Resend | **Implementado, condicionado a configuración** | Resend tiene prioridad; SMTP usa Nodemailer; sin ambos devuelve `null` (`bot/src/campanas/enviar.ts:27-31,69-100`). Enviar requiere clave configurada y correo activo (`bot/src/campanas/rutas.ts:57-63`). La configuración se lee del entorno en `bot/src/campanas/index.ts:12-30`; se omitió inspeccionar valores locales. |
| `POST /api/publico/campanas/generar` | **Implementado** | Ruta pública, límite por IP, valida opciones, genera y devuelve HTML/texto (`bot/src/campanas/rutas.ts:12-17,21-45`). |
| `POST /api/publico/campanas/enviar` | **Implementado** | Acepta preview o real, valida destinatarios/campaña, rehace HTML desde estructura y en modo real informa enviados/fallidos (`bot/src/campanas/rutas.ts:48-95`). La ruta se monta si existe `cfg.externo` y antes de middleware de sesión (`bot/src/app.ts:145-161`). |
| `GET /api/publico/campanas/preview/:animalId` | **Faltante** | En `bot/src/campanas/rutas.ts:37-48` solo se registran POST `/generar` y POST `/enviar`; no hay `GET`. Para un caso individual puede enviarse `perroIds`, pero es POST. |
| Métricas de apertura y conversión | **Faltante** | El resultado de envío informa contadores de entregas/fallos, no aperturas ni conversiones (`bot/src/campanas/enviar.ts:22-25,47-66`; `bot/src/campanas/rutas.ts:94-95`). No se encontró almacenamiento, pixel/redirect de tracking, ni eventos de campaña en `bot/src/campanas` o `bot/test/campanas`. |

### Resumen de carpetas y archivos de campañas

- `bot/src/campanas/`: `generar.ts` selecciona perfiles RAG, compone prompt/schema Gemini, valida y crea fallback; `plantilla.ts` escapa y renderiza HTML/texto; `enviar.ts` adapta Resend/SMTP y procesa destinatarios; `rutas.ts` implementa preview/envío públicos, validación y límites; `tipos.ts` define contratos; `index.ts` exporta API y lee configuración.
- `bot/test/campanas/`: `config.test.ts` verifica lectura de config sin secretos reales; `generar.test.ts` cubre contenido/validación y fallback; `plantilla.test.ts` verifica escape, URL y salida HTML/texto; `enviar.test.ts` cubre adaptadores y fallos/concurrencia; `rutas.test.ts` cubre endpoints, preview, clave, límite y envío simulado; `fakes.ts` contiene correo falso. Las pruebas evidencian cobertura diseñada, no se ejecutaron en esta auditoría.

## Módulo 4: panel público de adopción

| Requisito | Estado | Evidencia / detalle |
|---|---|---|
| Ruta pública `/adoptar`, sin login | **Faltante** | `panel/src/app/App.tsx:33-64` define `/`, `/kit` y rutas bajo `RutaConSesion`; `/adoptar` no figura. Todas las rutas comodín redirigen a `/` (`:63`). |
| Título, meta y JSON-LD `AnimalShelter` | **Faltante / base genérica** | `panel/index.html:2-10` contiene `lang`, viewport, descripción “La libreta del Refugio Yesenia…” y título “Refugio Yesenia”; no hay Organization/AnimalShelter JSON-LD ni metadatos particulares de adopción. Vite PWA declara la misma descripción de libreta y `start_url: '/'` (`panel/vite.config.ts:18-27`). |
| Tarjetas de historias para adopción | **Faltante en experiencia pública** | No existe `panel/src/features/adoptar/`. Hay fichas operativas internas (`panel/src/features/animales/Animales.tsx`, `Ficha.tsx`) y perfiles públicos disponibles desde RAG, pero no una vista pública de adopción enlazada al panel. |
| Buscador `GET /api/publico/rag/buscar?q=` | **Backend listo; cliente UI faltante** | Endpoint público valida `q`, aplica límite y devuelve resultados RAG (`bot/src/rag/rutas.ts:125-145`). En el panel no aparece consumidor público ni `fetch` a esta ruta; `panel/src/data/api.ts` gestiona exclusivamente API interna con token (`:1-3,65-90`). |
| Botón flotante que inicia llamada IA y voz de navegador | **Faltante en panel** | Backend de voz existe como `POST /api/publico/agente-voz`, acepta texto o audio y devuelve transcripción, respuesta, guion de voz y animales (`bot/src/adopciones-agente/rutas.ts:18-50,53-94`). No hay `LlamadaAgenteVoz.tsx`, uso de `SpeechRecognition`/`webkitSpeechRecognition`, ni `speechSynthesis` en `panel/src`. La voz conversacional natural está respaldada por `guionVoz` en el contrato del servidor, pero falta la interfaz y reproducción cliente. |
| Endpoint requerido `POST /api/publico/voz-adopcion` | **Faltante con nombre distinto disponible** | El servidor publica `/api/publico/agente-voz` (`bot/src/adopciones-agente/rutas.ts:53-57`), no `/voz-adopcion`. El endpoint se monta junto con otras rutas públicas (`bot/src/app.ts:147-150`). Hay que decidir si renombrar/alias o cambiar el requerimiento del cliente. |
| CTA de correo apunta al portal público | **Incompleto / destino inexistente** | Si no hay WhatsApp configurado, campañas enlazan `/?vista=adoptar` (`bot/src/campanas/generar.ts:212-223`); router de panel no consume `vista` ni tiene landing pública (`panel/src/app/App.tsx:37-64`). |

### Revisión de router, build y SEO

- `App.tsx` tiene `BrowserRouter`, guards de sesión y de admin. El guard de sesión envuelve `Marco` y subrutas operativas, mientras el acceso inicial `/` pide identidad; no hay rama paralela para visitante público (`panel/src/app/App.tsx:23-30,33-64`).
- `main.tsx` monta React y registra Service Worker (`panel/src/main.tsx:1-13`). `vite.config.ts` configura React, PWA y `navigateFallback: '/index.html'`, compatible con SPA fallback de rutas, pero no agrega prerender/SSR ni SEO por ruta (`panel/vite.config.ts:9-40`).
- El entrypoint del bot instancia `crearApp` sin propiedad `externo` (`bot/src/index.ts:51-66`); por tanto, las rutas de RAG, voz y campañas auditadas no se montan con ese arranque, aunque existan en sus módulos. `app.ts` las registra dentro del `if (cfg.externo)` (`bot/src/app.ts:145-151`).
- `index.html` solo tiene descripción y título estáticos de la libreta interna. No existe manejo dinámico de `<title>` o `<meta>` en `panel/src` ni marcado JSON-LD.
- Dependencias de panel incluyen React Router y Vite/PWA, sin paquete de head/SEO identificado (`panel/package.json:6-35`). Build configurado como `tsc --noEmit && vite build` (`:6-11`); no se ejecutó.

### Resumen de subcarpetas del panel

- `panel/src/app/`: router, sesión, marco de navegación y pestañas por rol. Las rutas descritas son privadas/operativas; el rol `adopciones` tiene solamente pestaña Animales (`pestanas.ts:17-25`), no módulo público.
- `panel/src/components/`: kit visual compartido (botones, cinta, costal, sello, termómetro, fotos, teclado y avisos). No es un flujo de landing pública.
- `panel/src/data/`: adaptador de API con token, proveedor de datos, demo y cola offline (`api.ts:1-10,65-90`); sus pruebas son del panel interno.
- `panel/src/design/`: tokens y estilos base globales.
- `panel/src/features/adopciones/`: solo `demo-solicitudes.ts` y su test; crea 25 solicitudes ficticias de gestión y verifica grupos de clasificación, no pantallas públicas (`demo-solicitudes.ts:1-7`; test `:8-15`).
- `panel/src/features/animales/`: lista/filtros y ficha operativa de animales (`App.tsx:48-50`). La ficha presenta información de cuidado al equipo; no es catálogo público.
- `panel/src/features/comida/`: interfaz interna de inventario de alimento.
- `panel/src/features/confirmar/`: revisión/confirmación de registros propuestos.
- `panel/src/features/entrar/`: selección de identidad/rol para el panel demo.
- `panel/src/features/equipo/`: administración interna del equipo; además protegida por rol admin (`App.tsx:54-60`).
- `panel/src/features/hoy/`: tablero de operación diaria.
- `panel/src/features/kit/`: guía y acceso al kit visual de componentes.
- `panel/src/features/plata/`: caja/finanzas y registro de movimientos.
- `panel/src/lib/`: cálculos de comida/dosis/estados, formato, fotos, acciones y utilidades del panel.
- `panel/src/prueba/`: preparación para pruebas; no contiene aplicación pública.
- **Subcarpeta ausente:** `panel/src/features/adoptar/` (ni otra carpeta pública equivalente).

## Tareas faltantes concretas

1. Crear una ruta visitante `/adoptar` fuera de los guards de sesión y un feature separado de `features/adopciones` para el catálogo público.
2. Implementar carga de perfiles/historias, tarjetas públicas y búsqueda conectada a `GET /api/publico/rag/buscar?q=` con estados de carga/error/vacío.
3. Crear `LlamadaAgenteVoz.tsx` o equivalente: botón flotante, sesión, captura de voz del navegador, llamada al backend y reproducción `guionVoz` con voz del navegador; contemplar permiso/soporte de micrófono.
4. Alinear endpoint requerido `/api/publico/voz-adopcion` con el endpoint actual `/api/publico/agente-voz` (alias o actualización coordinada del contrato).
5. Añadir SEO de landing: título/descripción propios y JSON-LD tipo `AnimalShelter`; valorar cómo servir metadata si se requiere rastreo social/SEO que no ejecute JavaScript.
6. Añadir `GET /api/publico/campanas/preview/:animalId` si se necesita una URL GET individual, usando perfil público, escape y misma plantilla.
7. Diseñar registro de eventos de apertura/conversión, persistencia e identificación de campaña/CTA; los proveedores pueden limitar medición de aperturas, así que acordar semántica de métricas antes de integrarla.
8. Conectar CTA de campañas a `/adoptar` y dejar de depender de `/?vista=adoptar`, o implementar formalmente ese alias.
9. Definir si el criterio de urgencia de comida debe consultar inventario/días restantes además de los indicadores RAG actuales de tratamiento, necesidades médicas, padrinos/urgencia.

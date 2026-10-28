# R4 - Costos del stack a $0/mes (verificado a 2026-10-27)

Convención: "No verificado" = no pude confirmar en la fuente oficial. No se estimó nada sin fuente.

## Tabla de hechos

| Servicio | Dato | Valor verificado | Fuente | Estado |
|---|---|---|---|---|
| WhatsApp Cloud API | Modelo de precios | Por mensaje desde 1 jul 2025 (no por conversación) | https://developers.facebook.com/docs/whatsapp/pricing | Verificado |
| WhatsApp Cloud API | Mensajes de servicio dentro de ventana 24h | Gratis solo hasta 1.000/mes por número desde 1 oct 2026; del 1.001 se cobra | https://developers.facebook.com/docs/whatsapp/pricing | Verificado |
| WhatsApp Cloud API | Plantillas utility dentro de ventana 24h | Gratis desde 1 jul 2025, se cobran desde 1 oct 2026 | https://developers.facebook.com/docs/whatsapp/pricing | Verificado |
| WhatsApp Cloud API | Tarifas Colombia (marketing/utility/auth/service) | No verificado (tabla dinámica no visible en la página) | https://whatsappbusiness.com/es-la/products/platform-pricing/ | No verificado |
| WhatsApp Cloud API | Conversaciones iniciadas desde anuncio Click to WhatsApp (entry point gratis) | Ventana gratis de hasta 7 días | https://developers.facebook.com/docs/whatsapp/pricing | Verificado |
| WhatsApp Cloud API | Límite de números de prueba, verificación de negocio | No verificado (página no lo detalla) | https://developers.facebook.com/docs/whatsapp/cloud-api/get-started | No verificado |
| Telegram Bot API | Costo | Gratis; "at no cost" para mensajes a usuarios | https://core.telegram.org/bots/faq | Verificado |
| Telegram Bot API | Límites de envío | 1 msg/s por chat; 20 msg/min en grupo; ~30 msg/s broadcast gratis | https://core.telegram.org/bots/faq | Verificado |
| Telegram Bot API | Descarga de archivos (getFile) | Hasta 20 MB | https://core.telegram.org/bots/faq | Verificado |
| Gemini API | Modelos Flash con free tier | Gemini 3.8 Flash, 3.6 Flash, 3 Flash Preview, 2.5 Flash (input/output gratis) | https://ai.google.dev/gemini-api/docs/pricing | Verificado (página actualizada 2026-10-27) |
| Gemini API | Precio pagado de referencia (audio) | 3 Flash Preview $1,00/M audio; 2.5 Flash $1,00/M audio; 3.8/3.6 Flash $0,75 hasta 31 dic 2026 | https://ai.google.dev/gemini-api/docs/pricing | Verificado |
| Gemini API | Límites RPM/RPD free | No publicados en la página; solo "ver en AI Studio". RPD se reinicia a medianoche Pacífico | https://ai.google.dev/gemini-api/docs/rate-limits | Números concretos: No verificado |
| Gemini API | Datos del free tier usados para entrenar/mejorar | Sí: Google usa el contenido para "provide, improve, and develop"; revisores humanos pueden leerlo | https://ai.google.dev/gemini-api/terms | Verificado |
| Gemini API | Salida JSON estructurada | Sí, vía `response_format` (mime `application/json` + schema) en Interactions API; soporte por modelo y con audio/imagen no confirmado | https://ai.google.dev/gemini-api/docs/structured-output | Parcial |
| Groq Whisper | Precio por hora de audio | whisper-large-v3 $0,111/h; whisper-large-v3-turbo $0,04/h | https://console.groq.com/docs/speech-to-text | Verificado |
| Groq Whisper | Tamaño máximo | 25 MB free; 100 MB dev. Formato ogg listado (opus no mencionado) | https://console.groq.com/docs/speech-to-text | Verificado |
| Groq Whisper | Límites | Tabla "base del plan Developer": 20 RPM, 2K RPD, 7,2K audio-seg/h, 28,8K audio-seg/día. Si esto aplica al free plan: No verificado | https://console.groq.com/docs/rate-limits | Parcial |
| Cloud Run | Free tier mensual | 2 M requests; 180.000 vCPU-s; 360.000 GiB-s; 1 GB salida Norteamérica | https://docs.cloud.google.com/free/docs/free-tier (cloud.google.com/run/pricing no cargó) | Verificado (página de free tier) |
| Cloud Run | Requiere cuenta de facturación (tarjeta) | No verificado en esta sesión | - | No verificado |
| Cloud Scheduler | Jobs gratis | 3 por cuenta de facturación/mes; $0,10/job/mes extra | Snippet de búsqueda de cloud.google.com/scheduler/pricing (página no cargó) | No verificado en página |
| Cloudflare Workers Free | Requests | 100.000/día (reinicio 00:00 UTC); error 1027 al exceder | https://developers.cloudflare.com/workers/platform/limits/ | Verificado |
| Cloudflare Workers Free | CPU por request | 10 ms | https://developers.cloudflare.com/workers/platform/limits/ | Verificado |
| Cloudflare Workers Free | Cron Triggers | 5 por cuenta (Paid: 250) | https://developers.cloudflare.com/workers/platform/limits/ | Verificado |
| Cloudflare Workers Free | Subrequests por invocación | 50 | https://developers.cloudflare.com/workers/platform/limits/ | Verificado |
| Cloudflare Cron | Granularidad mínima | 1 minuto | https://developers.cloudflare.com/workers/configuration/cron-triggers/ | Verificado |
| Render Free | Horas | 750 h instancia gratis por workspace/mes | https://render.com/docs/free | Verificado |
| Render Free | Sleep | Se duerme tras 15 min sin tráfico; ~1 min para despertar; no escala, no disco persistente | https://render.com/docs/free | Verificado |
| Render Free | Postgres | Expira a los 30 días; 14 días de gracia; 1 GB | https://render.com/docs/free | Verificado |
| Vercel Hobby | Cron | 100 crons/proyecto; mínimo una vez al día; precisión ±59 min | https://vercel.com/docs/cron-jobs/usage-and-pricing | Verificado |
| Vercel Hobby | Límites de funciones y uso comercial | No verificado (página de límites truncada) | https://vercel.com/docs/limits | No verificado |
| Supabase Free | Límites | 500 MB BD; 50.000 MAU; 1 GB storage; 5 GB egress; 500.000 invocaciones de Edge Functions | https://supabase.com/pricing | Verificado |
| Supabase Free | Pausa | Proyecto se pausa tras 1 semana sin actividad; máx. 2 proyectos activos | https://supabase.com/pricing | Verificado |
| Google Sheets API | Cuota | 300 lect/min y 300 escr/min por proyecto; 60 lect/min y 60 escr/min por usuario-proyecto; sin límite diario | https://developers.google.com/workspace/sheets/api/limits | Verificado |
| Apps Script (cuenta gmail) | Cuotas | 20.000 UrlFetch/día; 90 min/día de trigger; 6 min por ejecución; 30 ejecuciones simultáneas; 20 triggers/usuario/script | https://developers.google.com/apps-script/guides/services/quotas | Verificado |

## Recomendación de stack $0 (condicionada a lo verificado)

1. **Alertas proactivas y equipo interno: Telegram Bot API.** Gratis, sin verificación de negocio reportada, sin costo por mensaje. Las alertas de WhatsApp fuera de ventana 24h serían plantillas cobradas desde oct 2026 (tarifa Colombia no verificada), así que no son $0.
2. **Entrada/salida con padrinos y adoptantes: WhatsApp Cloud API solo para respuestas dentro de la ventana 24h.** Son gratis hasta 1.000 mensajes de servicio/mes por número. Confirmar límites de número de prueba y verificación antes de comprometerse.
3. **IA: Gemini Flash (free tier).** Sin costo, pero Google usa ese contenido para mejorar productos y revisores humanos pueden leerlo. Riesgo: no enviar datos personales de donantes/adoptantes; solo datos de animales o texto anonimizado. Si el equipo no acepta esto, el stack deja de ser $0 con datos reales.
4. **Transcripción de notas de voz: Groq whisper-large-v3-turbo** ($0,04/h en pago). Límite de cuota free no confirmado; alternativa es Gemini audio directo (menos piezas).
5. **Backend + cron: Cloudflare Workers Free** (100k req/día, 5 crons, granularidad 1 min). Restricción: 10 ms de CPU por request.
6. **Base de datos: Google Sheets API** (60 req/min por usuario). Viable para ~45 perros y 25 gatos; no para tráfico alto. Supabase Free como alternativa, con riesgo de pausa tras 7 días sin actividad.
7. **Evitar:** Render Free (se duerme a 15 min y Postgres expira a 30 días), Vercel Hobby (cron diario mínimo), Cloud Run/Scheduler (requieren cuenta de facturación; no verificado en esta sesión).

## Pendientes no verificados
- Tarifas WhatsApp Colombia (COP) por categoría.
- Números de prueba WhatsApp y verificación de negocio.
- Límites RPM/RPD reales del free tier de Gemini y de Groq.
- Requisitos de facturación de Cloud Run y precio exacto de Cloud Scheduler (página oficial no cargó).
- Uso comercial en Vercel Hobby.

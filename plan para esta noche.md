# Plan para esta noche

**Fecha:** 28 de octubre de 2026 (America/Bogota)
**Objetivo:** dejar una demo coherente del portal público de adopciones, el panel administrativo y el agente externo, con fronteras claras entre lo que funciona, lo que usa datos demo y lo que sigue pendiente. No se fija una hora de entrega ni se promete completar todos los módulos esta noche.

Este plan usa como referencia los hallazgos de auditoría [00–07](docs/auditoria-daniel/00-resumen-general.md). Para este plan, el reparto vigente es **MONOGA = todo el frontend** y **SAMUEL = todo el backend**. Esta asignación reemplaza las asignaciones antiguas por persona de esos informes; sus hallazgos técnicos siguen aplicando.

## Resultado mínimo que buscamos

- MONOGA puede mostrar `/adoptar` con tarjetas de animales, búsqueda y entrada de voz en navegador, y el panel administrativo actual con el módulo de solicitudes de adopción conectado o claramente marcado como demo.
- SAMUEL deja el servidor capaz de servir las rutas externas junto con el flujo interno, congela el contrato de agente/adopciones y conecta la persistencia mínima necesaria para que una solicitud y una invitación a visita no sean solo estado de memoria.
- La demo distingue datos confirmados de demo, respuesta de texto de audio reproducible, invitación a visita de cita persistida y aviso de agenda.
- Las alertas completas, métricas, QR/NFC, diario de padrinos y conexión de farmacia no bloquean esta demo y no se presentan como terminados.

## Fase 0 — Checkpoint, coordinación y contratos

| Tarea | Responsable | Resultado | Criterio de cierre |
|---|---|---|---|
| Confirmar los dos espacios de trabajo: MONOGA desarrolla el frontend en su copia y SAMUEL el backend en la suya. Definir `master` como base de integración si el equipo lo confirma; conservar la rama y cambios actuales de cada checkout. | MONOGA + SAMUEL | Acuerdo de ramas, responsables de hotspots y de quién integra `app.ts`/`index.ts`. | Ninguno cambia o limpia el checkout sucio del otro; se identifica dueño temporal de `bot/src/app.ts`, `bot/src/index.ts`, auth/permisos y scheduler. |
| Revisar el checkpoint local antes de stage/commit/push. | Responsable de publicar, coordinado con el equipo | Lista exacta de archivos y diferencias staged/unstaged que se incluirán. | Revisar cada `AM` comparando index y working tree. No usar `git add .`/`git add -A`, no reset/stash/checkout/merge de trabajo sucio ni push forzado. No hubo commits ahead de upstream según la referencia local, pero eso **no** incorpora los muchos cambios sin commit ni verifica el remoto actual. |
| Resolver dependencias de paquete dentro del checkpoint acordado. | SAMUEL, avisando a MONOGA si afecta build | Commit coherente de fuentes, `bot/package.json` y `bot/package-lock.json`. | La versión staged de campañas importa `nodemailer`, mientras manifiesto y lockfile tienen cambios unstaged; medicinas añade `exceljs`. Stagear fuentes y manifiestos compatibles juntos si entran. No incluir `node_modules`, `.env`, credenciales, `_dbg.ts`, `_explorar.ts` ni datos locales. |
| Congelar contratos de frontend/backend antes de conectar componentes. | MONOGA + SAMUEL | Un documento corto o tipos compartidos con endpoints, nombres JSON, estados, errores y permisos. | Se resuelve el nombre canónico de voz (`/api/publico/agente-voz` ya existe en código aislado; `/api/publico/voz-adopcion` está solicitado pero no existe en el arranque). Elegir un solo endpoint o mantener alias temporal, con una respuesta acordada. |

No hace falta que el checkpoint esté publicado para que ambos sigan programando en copias separadas. Un worktree nuevo parte de un commit y no copia los cambios sin commit; una rama nueva en el mismo checkout puede conservar los cambios locales, pero no los aísla. No compartir una misma carpeta con dos personas editando.

### Contrato mínimo a congelar

- **RAG público:** listado y búsqueda de catálogo por `GET /api/publico/rag/perritos` y `/api/publico/rag/buscar` ya tienen rutas en el módulo, pero el arranque de `bot/src/index.ts` todavía no inyecta `externo`. Acordar el JSON de tarjetas que consume MONOGA; no asumir que el endpoint está disponible en servidor hasta terminar el wiring.
- **Voz web/agente:** definir petición (`texto` o audio entrante, sesión y animal enfocado) y respuesta por turno. El modelo de agente debe tener respuesta empática, scores de idoneidad/riesgo de 0–100 y etapa `explorando`, `enamorado`, `evaluando_hogar`, `aprobado_para_visita` o `redirigir_a_padrino`. Acordar snake_case/camelCase una sola vez.
- **Hogar:** acordar preguntas/campos de vivienda, permiso de arrendador, presupuesto veterinario, compañía/otras mascotas, tiempo y compromiso. Puntaje/riesgo informa pretriaje; no decide aprobación final de adopción.
- **Visita:** separar (1) invitación/propuesta generada por agente, (2) cita con horario/cupo guardada en DB y (3) aviso WhatsApp a administradora. La lógica actual sugiere visita y envía aviso; no persiste una reserva real ni valida cupos.
- **Voz generada:** `guionVoz` es texto, no audio. Contrato de TTS debe declarar cómo vuelve el audio para reproducción en navegador; no marcar respuesta como hablada hasta que el navegador reciba/reproduzca audio. Distinguir audio entrante para transcripción del audio saliente TTS.
- **Adopciones:** acordar mínimo `GET` de solicitudes y actualización humana de estado/nota/llamada, además de `POST` o importación idempotente de una solicitud. Definir campos sensibles, consentimiento, validaciones y roles. `shared/src/adopcion` y SQL tienen piezas, pero no hay rutas/repositorio conectados en el estado auditado.
- **Interno:** conservar contratos actuales de `/api/hoy`, `/api/eventos` y cola offline. Acordar cómo una corrección desde el panel queda persistida y sincronizada sin duplicar el evento.

## Fase 1 — Trabajo paralelo con mocks

| Tarea | Responsable | Archivos/área | Resultado | Aceptación |
|---|---|---|---|---|
| Portal público `/adoptar`: tarjetas, filtro/búsqueda, estado vacío/error, datos visibles con marca demo cuando corresponda. | MONOGA | `panel/src/app/**`, componentes/features públicos, `panel/src/data/**` | Flujo navegable en browser con mock conforme al contrato. | Una persona busca por necesidad/especie y ve resultados sin datos privados; catálogo no verificado se etiqueta como demo y no presenta historias de muestra como confirmadas. Incluir título/meta descripción, JSON-LD `AnimalShelter` y enlace de WhatsApp como criterios del portal. |
| Entrada de voz en navegador y conversación pública UI. | MONOGA | Frontend de adopción y voz web | Controles de grabación/permiso, transcripción, respuesta texto, estado de carga/error y reproductor TTS cuando esté disponible. | Se ve claramente cuándo hay texto, audio entrante, audio generado y fallo; nunca afirma que se reprodujo audio si solo existe `guionVoz`. |
| Panel administrativo de adopciones: tres grupos revisables, detalle, notas, llamada/seguimiento y campos de consentimiento. | MONOGA | `panel/src/features/adoptar/**`, `panel/src/features/adopciones/**`, router/diseño | Pantallas con provider mock; reusar sesión, diseño y componentes existentes del panel. | Coordinación puede recorrer un caso de solicitud; los estados generados por clasificación se presentan como sugerencia editable, no decisión automática. |
| Verificar compatibilidad de UI operativa existente, permisos y cola offline; no reconstruir `/api/hoy` ni eventos que ya existen. | MONOGA | Panel operativo y adaptador de datos | Lista de correcciones concretas con evidencia visual; separar defectos reales de mejoras opcionales. | Reproducir registro, corrección y sincronización con datos ficticios, indicando si hubo persistencia; ocultar botones no reemplaza autorización de servidor. |
| Wiring del contexto externo en el servidor existente: RAG/Gemini/WhatsApp/correo, rutas públicas y ruta de desconocidos; mantener el flujo de usuarios internos. | SAMUEL | `bot/src/index.ts`, `bot/src/app.ts`, `bot/src/rag/**`, `bot/src/adopciones-agente/**`, `bot/src/campanas/**` | Una sola app Hono recibe `externo`; número desconocido entra al agente y personal registrado conserva flujo interno. | Prueba local con fakes prueba los dos recorridos y rutas; no requiere servicios Meta, Gemini o correo reales. |
| Implementar contrato agente y respuestas de turno, con guardas para score, etapa, derivación y bienestar. | SAMUEL | `bot/src/adopciones-agente/**`, `bot/src/rag/tipos.ts`, tests | JSON validado y decisión trazable sobre padrino/visita. | Incluye los campos acordados, evalúa hogar y conserva aprobación final humana; una falla o JSON inválido no confirma visita ni adopción. |
| Armar datos de prueba limpios para integración. | Apoyo A — datos | Hoja de fuentes aprobadas y fixture sintético separado | Lista de nombres/atributos marcados `confirmado`, `demo` o `desconocido`; reglas de hogar/visita aprobadas por coordinación. | No inventa hechos clínicos ni deposita teléfonos, cédulas, tokens o datos personales en repo/chat. El catálogo RAG actual es demo: `historiaConfirmada` derivada de curaduría no prueba veracidad. |
| Crear/seleccionar imágenes de presentación autorizadas y piezas Canva. | Apoyo B — imágenes/Canva | Tarjetas, material de demo/pitch y créditos | Assets etiquetados por origen/permiso, con alternativa de silueta. | Ninguna foto ilustrativa se atribuye a un animal real ni se presenta como verificada. |
| Preparar hoja de QA manual y guion de demo. | Apoyo C — QA/pitch | Matriz de pasos/capturas y guion | Casos a ejecutar en fase 3; pitch distingue implementado/demo/pendiente/no probado. | Sin métricas inventadas ni afirmar despliegue, agenda, TTS o integraciones reales que no se hayan observado. |

## Fase 2 — Integración mínima

1. Integrar backend con la app Hono existente, no levantar otro servidor: una ruta para catálogo/búsqueda, una para agente/voz, y las rutas internas existentes. Un dueño del lado backend integra `bot/src/app.ts` e `index.ts`; el otro revisa contrato y compatibilidad.
2. Acordar y cablear `/api/publico/voz-adopcion` **o** el nombre existente `/api/publico/agente-voz`; no dejar dos implementaciones divergentes. Si se mantiene un alias, ambas rutas llaman al mismo handler y comparten validación/respuesta.
3. Integrar la página `/adoptar` y el módulo de solicitudes del panel de MONOGA contra API, no fixtures. El admin solo ve rutas protegidas por sesión/rol; SAMUEL valida permisos en backend. Un test local reprodujo que rol cuidador leyó clínicas/movimientos y registró un gasto: finanzas y archivos necesitan autorización de servidor por rol/recurso antes de una demo que los exponga.
4. Conectar persistencia mínima para solicitudes y cambios humanos de estado/nota. Añadir persistencia real de cita solo si se define disponibilidad/cupo; si no, el estado visible es “visita propuesta, por confirmar”, con aviso interno identificado como aviso y no como reserva.
5. En `>=75`, usar el umbral acordado para invitar a coordinar visita; no anunciar visita “agendada” hasta guardar hora/cupo de forma durable. Ofrecer alternativa de padrino (`20.000 COP` mensuales o bulto de comida) según texto aprobado. No mandar mensajes comerciales/campaña automática fuera del flujo y consentimiento acordados.
6. SAMUEL integra TTS con el frontend de MONOGA por la interfaz acordada. El criterio demo es texto + audio reproducible en navegador si la integración queda lista; si no, se muestra texto y se declara TTS pendiente. WhatsApp con audio saliente es alcance posterior, a menos que ambos lo terminen y prueben aparte.
7. RAG usa el catálogo de perfil demo mientras apoyo A obtiene datos verificados. Marcar visualmente demo; no presentar historia, compatibilidad o necesidades médicas como hechos confirmados. Fallback a humano ante falta de datos.

## Fase 3 — Verificación local y demo

SAMUEL ejecuta typecheck y tests focalizados de bot/RAG/agente con fakes y almacenamiento en memoria; MONOGA comprueba la UI conectada y panel con datos sintéticos. Evitar `test/postgres.test.ts` destructivo en una DB de trabajo. No llamar WhatsApp, Gemini, correo o DB productiva para esta validación. Los `83 expected-fail` reportados son casos declarados de fallo esperado, no 83 bugs nuevos ni requisitos cumplidos.

### Recorrido manual de aceptación

| Caso | Pasos | Aceptación observable |
|---|---|---|
| Público | Abrir `/adoptar`, buscar perro/gato y abrir una tarjeta. | Página funciona; tarjeta trae campos del contrato; datos no verificados tienen etiqueta demo; vacío/error muestran salida comprensible. |
| Agente | Probar texto, permiso de vivienda, presupuesto, compañía/tiempo, compromiso y perfil de interés; forzar respuesta inválida/falla de IA con fake. | JSON cumple esquema y puntajes/etapas acordados; deriva a persona cuando faltan datos o hay riesgo; no aprueba adopción. |
| Visita/padrino | Usar persona de prueba con puntaje debajo y encima de 75. | Debajo no se confirma cita; encima solo se registra una cita si existe cupo durable. Si no, muestra invitación pendiente; ofrece alternativa de padrino/comida con texto aprobado. |
| Voz | Grabar audio de prueba o escribir texto y luego reproducir salida si TTS está conectado. | Transcripción (audio entrante), respuesta de texto y audio saliente se identifican por separado; un guion no se reporta como audio. |
| WhatsApp | Con fakes, probar número desconocido y usuario interno conocido. | Desconocido llega al agente externo; miembro del equipo sigue en conversación interna; no se necesitan Meta ni credenciales reales. |
| Panel interno | Entrar con rol autorizado y rol cuidador; probar API de finanzas, archivos, adopción, corrección de evento y sincronización offline. | Backend responde 401/403 según permiso; no basta con ocultar pantalla; offline no duplica ni afirma guardar antes de persistir. |
| Degradación | Deshabilitar el mock/LLM local o simular timeout. | UI y bot conservan respuesta segura, no confirman cita ni envío; ofrecen reintento o atención humana. |

### Demo aceptable para cerrar esta noche

- Recorrer portal y panel contra una misma API local/fake integrado o contra implementación conectada con datos sintéticos identificados.
- Hacer visible al menos una solicitud de prueba y explicar si persiste en Postgres, memoria o mock.
- Mostrar conversación de agente con el schema y un paso de visita propuesto, explicando si hay reserva durable o por confirmar.
- Mostrar respuesta TTS únicamente si el browser efectivamente reproduce audio; en caso contrario demo de texto y declarar audio pendiente.
- Tener capturas/video local de respaldo preparados por apoyo C; sin afirmar que despliegue, Meta, correo o Gemini productivo fueron probados.

## Siguiente prioridad, después del núcleo de demo

1. Completar sesiones/solicitudes/citas persistentes, capacidad real de agenda y avisos idempotentes a administradoras; cerrar controles de privacidad, roles y retención.
2. Automatizar alertas de dosis/comida/deuda, acuse y escalamiento; cierre/resumen diario y diario de padrinos con aprobación humana.
3. Salida de audio WhatsApp e imágenes; confirmar límites, consentimiento, compatibilidad de media y fallback.
4. Campañas: `GET /api/publico/campanas/preview/:animalId`, medición real de aperturas/conversión y envío controlado. No enviar campañas en demo.
5. QR/NFC y ficha pública `/p/:codigo` con datos minimizados y códigos persistentes.
6. Medicinas: confirmar inventario real, adapter de Sheets y cableado al arranque; no usar semilla ficticia como inventario del refugio.
7. Preparación de operación: backups/restore, deploy/rollback, monitoreo y runbook. Es preparación para uso real, no bloqueo de demo local.

## Acuerdos de ejecución y seguridad del trabajo

- **MONOGA:** dueño de `panel/**` completo —portal, voz navegador, admin de adopciones, panel operativo—; mantiene mocks para desarrollar mientras cierra el contrato y luego integra API.
- **SAMUEL:** dueño de `bot/**`, `db/**` y backend de `shared/**`; mantiene rutas internas, integra RAG/agente/campañas y persistencia. Coordina contratos compartidos con MONOGA; evitar ambos cambios simultáneos en `app.ts`, `index.ts`, tipos/Repo o migraciones.
- **Apoyo A:** datos animales/cuidado/inventario/proceso de adopción; validar con responsables y entregar fuente con marca de certeza.
- **Apoyo B:** imágenes autorizadas/Canva y créditos; preparar alternativa sin foto.
- **Apoyo C:** QA manual, evidencias y pitch; registrar build, resultado y límites. No accede a servicios/secretos.
- Cada persona usa su `.env` local, DB de desarrollo aislada y datos sintéticos; usar puertos distintos, por ejemplo `8787` y `8788`, si ejecutan instancias en la misma máquina. Una sola instancia usa webhook real del número WhatsApp a la vez; los demás prueban con fakes.
- Revisar y stagear manifiestos/lockfiles por paquete junto con código consumidor. No incluir `node_modules` raíz, `.env`, credenciales, archivos locales ni exploradores. No hacer `pull` sobre working tree sucio; antes de integrar a `master`, checkpoint revisado, autorización, `fetch` actual y comparación de commits locales/remotos.

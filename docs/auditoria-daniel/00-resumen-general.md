# Resumen general de auditoría — Huellitas

**Fecha de revisión:** 28 de octubre de 2026.
**Checkout de referencia:** `C:/Users/USUARIO/Documents/Hackaton/huellitas-monoga-master`, rama local `monoga-master`, commit `0e02721`, con cambios staged, unstaged y archivos nuevos. Se eligió porque contiene los avances de RAG, agente, campañas y medicinas revisados. El estado limpio del commit no describe por sí solo el contenido de trabajo actual.
**Límites:** auditoría de código y documentos en el checkout disponible; no se hicieron fetch, llamadas a servicios en vivo ni inspección de `.env`/secretos. No se afirma que los cambios estén publicados o desplegados.

## Resultado general

La base actual reúne implementación del sistema interno del refugio (panel, bot, Postgres y librería de dominio), más trabajo avanzado en RAG, conversación externa, campañas y datos de adopción. Sin embargo, hay una brecha común de integración: `bot/src/index.ts` arranca el servidor del bot y la API que consume el panel interno, pero no compone ni pasa la configuración `externo` con RAG, LLM externo y correo. `bot/src/app.ts` monta las rutas públicas solo dentro de esa condición. Por tanto, las implementaciones de RAG, agente y campañas no quedan habilitadas con el entrypoint que se inspeccionó.

Además, la calidad del catálogo es un bloqueo funcional independiente: los 70 perfiles son demo (45 perros y 25 gatos), con historias/datos por confirmar. El campo de historia confirmada se puede derivar de que haya perfil curado, por lo que esa marca no prueba la veracidad. Las pruebas demuestran comportamiento diseñado con fakes/fixtures; no verifican esos hechos ni una conexión real a Gemini, Meta, Postgres productivo o correo.

El backend tiene clasificación sugerida de solicitudes en `shared/src/adopcion`, seguimientos y tablas/migraciones relacionados, pero el panel interno aún no ofrece el flujo previsto de solicitudes, pasaporte de entrega y seguimientos, ni existen las rutas `/api/adopciones/*`. La landing pública también está pendiente. El plan anterior decía que el sistema nunca decide adopción y no manda mensajes automáticos; el alcance actual del usuario pide un agente que evalúe y automatice la invitación a visita. Para conciliarlo, la automatización debe limitarse al pretriaje y a proponer/avisar una visita: la aprobación final de adopción sigue siendo decisión humana de la fundación.

## Matriz consolidada de los cuatro módulos

| Módulo | Objetivo del plan | Estado en el checkout | Principales pendientes y límites |
|---|---|---|---|
| **1. Catálogo RAG y búsqueda** | Catálogo de animales con historia y ficha; atributos de edad, tamaño, personalidad/energía, compatibilidad y necesidades médicas; cálculo de costo; búsqueda híbrida contextual; datos del día; endpoint público que recomiende pocos candidatos. | Motor RAG, ranking híbrido/léxico, filtros y endpoint están implementados. El catálogo tiene 70 animales: 45 perros y 25 gatos. La estructura de perfiles existe, pero los datos son de demostración y no están validados por la fundación. Lectura de actividad diaria y embeddings son posibles si se inyectan repo/LLM. | Confirmar/reemplazar contenido y procedencia; representar confirmación explícita; aclarar costo real vs. meta de apadrinamiento; definir límite de recomendación (endpoint tiene default 6); componer RAG y Gemini en el arranque. Detalle: [01-rag.md](C:/Users/USUARIO/Documents/Hackaton/huellitas-monoga-master/docs/auditoria-daniel/01-rag.md). |
| **2. Agente de adopción y WhatsApp/voz** | Atender desconocidos, mantener flujo interno para personal; storytelling empático con hechos RAG; JSON cada turno con respuesta, scores de hogar/riesgo y etapa; evaluar vivienda, permiso, presupuesto, compañía/tiempo y compromiso; ofrecer padrino/comida; con ≥75 facilitar visita y avisar administradora; voz cálida y endpoint público. | Núcleo de agente, prompt español, RAG/LLM por interfaz, scores 0–100, condiciones deterministas, texto de padrino desde $20.000 COP o comida, avisos WhatsApp y entrada de audio están implementados en módulos. La visita actual calcula sábado 10 a. m. y alerta a administradoras, pero no persiste una cita ni verifica cupos. | El entrypoint omite `externo`; faltan campos `respuesta_empatica` y `etapa` requeridos. Sesiones/visita están en memoria. No hay TTS ni salida audio/fotos del agente por WhatsApp. La ruta existente es `/api/publico/agente-voz`, no `/api/publico/voz-adopcion`. Reconciliar pretriaje automático con aprobación final humana. Catálogo factual pendiente según módulo 1. Detalle: [02-agente-y-whatsapp.md](C:/Users/USUARIO/Documents/Hackaton/huellitas-monoga-master/docs/auditoria-daniel/02-agente-y-whatsapp.md). |
| **3. Campañas** | Elegir animales urgentes, generar historias/correos empáticos con hechos, CTA para padrino/comida, preview y envío, endpoint público, métricas. | Selección RAG de urgentes, redacción Gemini con validación/fallback, plantillas HTML/texto y adaptadores Resend/SMTP tienen implementación. Preview es un modo de POST y el envío real depende de configuración. | Falta GET `/api/publico/campanas/preview/:animalId`; no hay métricas de aperturas/conversión. El criterio urgente no muestra ranking específico por días de inventario de comida. Rutas apagadas mientras falte wiring `externo`. El contenido hereda el riesgo de catálogo demo. Detalle: [03-campanas-panel.md](C:/Users/USUARIO/Documents/Hackaton/huellitas-monoga-master/docs/auditoria-daniel/03-campanas-panel.md). |
| **4. Portal público + gestión interna de adopciones** | Landing pública `/adoptar`, tarjetas/búsqueda, llamada/voz, SEO; para el equipo: solicitudes en tres grupos, detalle, pasaporte de entrega y seguimientos. Integrar endpoints de adopciones. | El panel principal existente es interno y protegido por sesión. `features/adopciones` contiene demo de 25 solicitudes y pruebas, y `shared/src/adopcion` aporta clasificación, privacidad y seguimientos. El bot tiene búsqueda/voz pública en código, pero el entrypoint no la monta. | No hay landing `/adoptar`, feature público, consumidor UI de RAG ni componente de llamada; falta alinear endpoint de voz y SEO/JSON-LD. En el panel faltan pantallas de solicitudes/seguimientos/pasaporte y endpoints `/api/adopciones/*`; datos de demo no equivalen a integración de solicitudes reales. Detalle: [03-campanas-panel.md](C:/Users/USUARIO/Documents/Hackaton/huellitas-monoga-master/docs/auditoria-daniel/03-campanas-panel.md). |

## Pendientes en orden de implementación

Este orden sigue dependencias del repositorio y evita inventar fechas o estimaciones.

1. **Resolver fuente de verdad y alcance de los datos.** Confirmar perfiles/historias/fotos/atributos con la fundación; identificar cuáles datos son reales, demo o desconocidos; decidir explícitamente meta de padrinazgo vs. costo real mensual. Corregir la marca `historiaConfirmada` para que exprese una verificación real. No exponer el catálogo actual como factual hasta cerrar este paso.
2. **Congelar contratos de adopción y responsabilidades.** Alinear JSON del agente (`respuesta_empatica`, scores, etapa); definir permiso, presupuesto, compañía, compromiso y reglas de riesgo. En documentos y producto, expresar que el agente automatiza conversación/pretriaje y puede proponer una visita según reglas, mientras que la decisión final de adopción es humana. Actualizar el plan anterior que dice que no se envía ningún mensaje automático, para que no contradiga la solicitud actual.
3. **Definir el modelo persistente y API de adopción.** Implementar almacenamiento de sesión/solicitud/visita que sobreviva reinicios, consulta de cupos y creación de una cita verificable. Crear endpoints `/api/adopciones/*` necesarios para solicitudes y seguimientos, haciendo que los avisos sean resultado de una cita registrada y no sustituto de agenda.
4. **Completar el arranque de producción del frente externo.** Crear `ContextoExterno` con `crearRag`, LLM de Gemini, fuente de actividad desde `Repo`, número público y configuración de campañas; pasarla a `crearApp`. Mantener separado el flujo de miembros del equipo. En este checkout, sin este wiring las rutas públicas no se montan y WhatsApp de desconocidos se mantiene en el fallback genérico.
5. **Cerrar privacidad y robustez antes de uso con personas.** Resolver las brechas `P-01…P-12` y las de notificaciones/seguridad señaladas por las pruebas vacías; revisar minimización de datos antes de Gemini/RAG, aviso de privacidad, baja y borrado, resistencia al texto de modelo y registro de fallos. Diferenciar tests esperados fallidos de requisitos implementados.
6. **Entregar experiencia de voz y WhatsApp según destino elegido.** Implementar TTS español si se requiere audio generado; el `guionVoz` actual es texto. Definir si el audio se reproduce en web o se envía por WhatsApp, ampliar cliente/tipo de salida según corresponda, y alinear `/api/publico/agente-voz` con `/api/publico/voz-adopcion`. Las fotos actuales son datos del perfil web, no envío de imagen desde el agente WA.
7. **Completar campañas y su medición.** Añadir GET preview por animal si el contrato lo exige; elegir una semántica medible de apertura/conversión y persistir eventos; definir si campañas de comida deben priorizar por inventario/días restantes.
8. **Construir flujos del panel de adopciones y portal público.** Primero crear endpoints y contrato de datos; luego solicitudes en tres montones/detalle, pasaporte, seguimientos y permisos por rol; por separado, landing pública `/adoptar`, tarjetas, búsqueda RAG, llamada de voz, CTA coherentes, SEO/JSON-LD. Conectar fuentes reales en lugar de dar por finalizadas las demos.
9. **Integrar y verificar por superficie.** Ejecutar typecheck/tests de los paquetes afectados, pruebas de contrato entre bot/panel/db/shared y un recorrido preparado para cada integración real, sin confundir dobles de prueba con servicios de producción. La verificación de Postgres destructiva debe ejecutarse solo con entorno preparado para esa prueba.

## Resumen de carpetas del proyecto

| Ruta | Contenido y estado observado |
|---|---|
| `bot/src/adopciones-agente/` | Agente conversacional: prompt, esquema JSON, decisiones, sesiones efímeras, respuestas, ofertas, avisos y ruta de voz web. Módulo detallado en el informe 02. |
| `bot/src/wa/` | Webhook Meta, validación de firma, interpretación de mensajes entrantes y cliente de WhatsApp para texto/botones/listas/imagen, carga de imagen y descarga de media. Audio entrante sí; audio generado por el agente no. |
| `bot/src/rag/` | Perfiles, catálogo demo, recuperación léxica/híbrida, embeddings Gemini, respuestas, filtros, actividad del día y rutas públicas condicionadas a configuración. Módulo detallado en el informe 01. |
| `bot/src/campanas/` | Selección RAG, redacción Gemini, fallback, plantillas, envío Resend/SMTP y rutas de generar/preview/enviar. Detalle en informe 03. |
| `bot/src/api/` | Rutas de operación del panel para hoy/equipo/eventos y otras superficies; no hay `/api/adopciones` en el estado revisado. |
| `bot/src/datos/` | Acceso a Postgres, repositorio, archivos y funciones de carga; aquí vive la fuente de datos operativa para el bot. |
| `bot/src/conversacion/` | Flujo WhatsApp del equipo/refugio. `app.ts` conserva este flujo cuando el teléfono ya corresponde a un usuario registrado. |
| `bot/src/ia/` | Adaptadores Gemini/OpenRouter del flujo interno de interpretación de texto/audio/foto. Es diferente del LLM de `bot/src/rag/` que requiere el agente externo. |
| `bot/src/informes/` | Armado/renderizado de informes y gráficos para el panel/equipo. |
| `bot/src/medicinas/` | Modelo, reglas, lectura/actualización por Excel y contactos; tiene semilla de datos ficticios. Aún no hay adaptador Sheets ni `crearMedicinas` conectado desde `index.ts`; existen referencias de tipos/lectura en respuestas RAG, no integración operativa completa. |
| `bot/scripts/` | Semilla/migración local, enlaces Meta, informes y utilidades de medicinas por Excel. |
| `bot/test/` | Tests de aplicación, IA, conversación, Postgres, RAG, agente, campañas, medicinas e informes; múltiples dobles/fakes. |
| `shared/src/domain/` | Reglas de negocio puras y reutilizables para dosis, comida, deuda, ficha, padrinos, hora, cierre y otras reglas. |
| `shared/src/adopcion/` | Tipos y clasificación sugerida de solicitudes, privacidad y seguimientos posadopción días 2/5/15/30/90. Son lógica compartida, no pantallas ni endpoints conectados por sí mismos. |
| `shared/test/` | Pruebas de reglas de dominio y adopciones con fixtures; evidencia de comportamiento local. |
| `db/sql/` | Cinco migraciones que incluyen esquema, espejo, tablas del bot/equipo y buzón; existen tablas de solicitudes/adopciones/check-ins/padrinazgos, pero su presencia no demuestra flujo completo desde API/UI. |
| `db/espejo/` | Espejo unidireccional Postgres → Google Sheets; las ediciones manuales de Sheets no regresan a Postgres. Véase `db/README.md`. |
| `panel/src/app/` | Router, autenticación/selección de sesión, marco y pestañas del panel operativo interno. No hay ruta pública de adopciones. |
| `panel/src/components/` y `panel/src/design/` | Kit de componentes, tokens y estilos visuales compartidos del panel. |
| `panel/src/data/` | Contrato/adaptador de API, proveedor demo/servidor y cola offline; orientado al panel interno. |
| `panel/src/features/` | Vistas internas como hoy, comida, plata, equipo, confirmar y animales. `features/adopciones/` solo tiene demo de solicitudes y tests, no el módulo de gestión planeado. |
| `panel/src/lib/` | Cálculos y utilidades de UI/acciones, formato, foto y mano; parte de lógica de negocio también vive en `shared`. |
| `panel/public/` | Recursos estáticos y assets PWA. No se encontraron recursos de una landing pública de adopciones. |
| `docs/` | Plan integrado, plan de panel, diseño/plan de placa viva, requerimientos, operación y research. `docs/auditoria-daniel/` reúne los informes 01–03 y este resumen. |
| `odd/tasks/` | Bitácoras/listas de trabajo históricas; algunas afirmaciones están vencidas o en conflicto con checkout (por ejemplo, landing del frente externo marcada hecha aunque no aparece en el panel; arquitectura antigua refiere KV). Tratar como antecedentes, no evidencia de código actual. |
| `.atl/`, `.claude/`, `.pi/` | Configuración de herramientas/entorno de trabajo, no funcionalidades de la aplicación Huellitas. |
| `node_modules/` | Dependencias instaladas del checkout, no contenido de producto. |

## Checkouts y estado Git: alcance de la evidencia

Según verificación del agente principal, en el directorio de trabajo también aparecen otros checkouts/carpeta auxiliar:

- `Hackaton-Vibra-Plus-git`: rama `master`, commit `6f45eb5`, con documentación/panel.
- `Hackaton-Vibra-Plus-master`: copia sin `.git`, también con documentación/panel.
- `Hackaton-Vibra-Plus-MONOGA`: rama `master`, limpio en `0e02721`.
- `huellitas-monoga-master` (este informe): rama `monoga-master`, mismo commit base `0e02721`, con cambios locales staged/unstaged y archivos nuevos relacionados con RAG/agente/campañas/medicinas.
- `gentle-ai`: herramientas/carpeta auxiliar ajena a la app Huellitas según contexto verificado por el agente principal.

La auditoría selecciona `huellitas-monoga-master` por ser el checkout con los avances a revisar; no determina cuál rama remota es la fuente oficial ni si los cambios locales están desplegados. No se consultaron remotos ni se hicieron fetch.

## Verificación reportada y pendientes de la auditoría

El agente principal reportó `npm test -- --exclude test/postgres.test.ts` desde `bot/`: **33 archivos pasaron; 586 pruebas pasaron, 83 expected-fail y 11 todo (680 casos); exit 0**. Un `expected-fail` es una brecha declarada con `it.fails`: Vitest considera esperado que falle, pero eso **no** significa que el requisito ya esté satisfecho. `todo` no ejecuta una prueba. También reportó `npm run typecheck` de `bot/` exitoso.

La prueba `bot/test/postgres.test.ts` fue excluida explícitamente porque destruye/siembra datos. No se ejecutó build ni tests del panel; el panel no tenía `node_modules` local. Eso no significa que el build o tests del panel hayan fallado. Ninguna verificación cubre servicios reales; no se afirma despliegue/publicación.

## Informes detallados

- [01 — RAG de adopciones](C:/Users/USUARIO/Documents/Hackaton/huellitas-monoga-master/docs/auditoria-daniel/01-rag.md)
- [02 — Agente y WhatsApp](C:/Users/USUARIO/Documents/Hackaton/huellitas-monoga-master/docs/auditoria-daniel/02-agente-y-whatsapp.md)
- [03 — Campañas y panel](C:/Users/USUARIO/Documents/Hackaton/huellitas-monoga-master/docs/auditoria-daniel/03-campanas-panel.md)

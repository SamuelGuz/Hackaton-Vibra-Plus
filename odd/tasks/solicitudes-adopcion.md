# solicitudes-adopcion

Objetivo: que las solicitudes de adopción y la visita que propone el agente queden en Postgres, y que el panel las lea y las cambie por API.
Rama: `samuel/conectar-externo` (decisión de Samuel: "por ahora todo en esta rama", sin fusionar a `master`). Pruebas: vitest (`bot`).

## Specs

Tomado de [plan para esta noche.md](../../plan%20para%20esta%20noche.md).

- S1. Fase 2.4: "Conectar persistencia mínima para solicitudes y cambios humanos de estado/nota. Añadir persistencia real de cita solo si se define disponibilidad/cupo; si no, el estado visible es “visita propuesta, por confirmar”, con aviso interno identificado como aviso y no como reserva."
- S2. Contrato: "**Adopciones:** acordar mínimo `GET` de solicitudes y actualización humana de estado/nota/llamada, además de `POST` o importación idempotente de una solicitud. Definir campos sensibles, consentimiento, validaciones y roles."
- S3. Ya acordado en el código (`shared/src/api.ts:51-57`, `shared/src/adopcion/tipos.ts:64-68`): `GET /api/adopciones/solicitudes` devuelve `{ solicitudes: SolicitudConSugerencia[] }` "(solo roles adopciones y admin)", y `POST /api/adopciones/solicitudes/:id` con `CambioSolicitud { montonManual?, nota?, llamadaAgendada? }`: "solo viaja lo que cambió".
- S4. "Interno: … Acordar cómo una corrección desde el panel queda persistida y sincronizada sin duplicar el evento." → los cambios humanos son idempotentes (mandar el mismo cambio dos veces deja lo mismo).
- S5. Agente: "Puntaje/riesgo informa pretriaje; no decide aprobación final de adopción." y "conecta la persistencia mínima necesaria para que una solicitud y una invitación a visita no sean solo estado de memoria."
- S6. Auditoría 05, ítem 8: "endpoint para roles autorizados únicamente; los cambios humanos ganan a la sugerencia; los datos sensibles se quedan dentro del rol."

## Diseño

- **Tabla:** se usa la `solicitudes_adopcion` que ya existe (001). La migración `006_solicitudes_adopcion.sql` le agrega:
  - `origen` (`formulario` | `agente`) y `clave_origen` única, para que importar dos veces no duplique.
  - `monton_manual`, `nota` y `llamada_agendada`.
  - `visita_propuesta` (fecha) y `visita_estado` (`propuesta`).
  - `puntaje_idoneidad`, `puntaje_riesgo` y `actualizado_en`.
  - La persona va en `personas`, buscada por teléfono o creada.
- **Formato:** los campos del formulario van completos en `respuestas_json`, con la forma de `Solicitud`.
- **Clasificación:** `bot/src/adopcion/` lleva una copia de `shared/src/adopcion/{tipos,clasificar}.ts`, la misma regla que `panel-tipos.ts`.
  - Las solicitudes del formulario se clasifican con `clasificar()`.
  - Las del agente se clasifican por sus puntajes: verde si idoneidad ≥ 75 y riesgo ≤ 40; amarillo si idoneidad ≥ 50; si no, rojo. La razón dice que es una pre-evaluación del agente.
- **Rutas** (solo `admin` y `adopciones`; 403 para los demás roles):
  - `GET /api/adopciones/solicitudes`
  - `POST /api/adopciones/solicitudes`: importa una `Solicitud` del formulario; idempotente por su `id`.
  - `POST /api/adopciones/solicitudes/:id` con `CambioSolicitud`.
- **Agente:** cuando decide la visita (`agente.ts`, junto a `avisarAdministradoras`), guarda o actualiza la solicitud de esa conversación con `origen: 'agente'`, la visita propuesta, los puntajes, el animal, el nombre y el teléfono (si es WhatsApp). Si la base falla, la conversación sigue y el error queda en el log.
- **Privacidad:** el espejo a Google Sheets **no** copia `solicitudes_adopcion` (lleva cédula y dirección).
- Supuestos (no pedidos literalmente; se pueden cambiar):
  - A1. Una conversación del agente cuenta como solicitud solo cuando llega a proponer visita.
  - A2. La visita queda en estado `propuesta`. El aviso a las administradoras y la respuesta al interesado no se cambian en esta tarea.
  - A3. No se agrega columna de consentimiento nueva: se usa `personas.consentimiento_datos`, que el formulario o el panel marcarán.

## Tasks

| ID | Specs | Qué | Ruta | Estado |
|---|---|---|---|---|
| T1 | S1, S2, S6 | Migración 006 + excluir la tabla del espejo | inline | hecha: aplica sobre base nueva y dos veces seguidas |
| T2 | S2, S3, S4 | Copia de tipos y clasificación; métodos de Repo (pg y fake): guardar o actualizar por `clave_origen`, listar, cambiar | inline | hecha: prueba contra Postgres real (12/12) |
| T3 | S2, S3, S6 | Rutas `/api/adopciones/solicitudes` con guardia de rol; pruebas de 401, 403, lista con sugerencia, importación idempotente y cambio | inline | hecha: RED 11 fallos → GREEN 12/12; suite 633 |
| T4 | S1, S5 | El agente guarda la solicitud con visita propuesta; prueba con fakes | inline | pendiente |
| T5 | — | Aplicar la 006 en el Postgres local y probar en vivo | inline | pendiente |

Sin escritor delegado: es una sola unidad (cada paso depende del anterior). Pronóstico: unas 600 líneas, más de las 400 de referencia; por decisión de Samuel todo va en esta rama, en commits por tarea.

Risk: item 2 (rutas con datos personales y control por rol) e item 1 (cambio de esquema; solo agrega columnas, no toca datos existentes). Lleva verificación independiente al final.

## Log

- L1 (2026-10-28) Samuel, literal: "Sube estos cambiso a la rama sin conectarla aun a master, por ahora todo en esta rama, y sigue con el siguiente paso del plan".
- L2 (2026-10-28) Mapa del explorador: la tabla existe y el bot no la usa; no hay rutas ni Repo; el panel de MONOGA (rama `origin/MONOGA`) solo edita `montonManual`, `nota` y `llamadaAgendada`, y está en modo demo; el bot no importa `shared/`. Verificado a mano: el espejo sí copiaba `solicitudes_adopcion`.

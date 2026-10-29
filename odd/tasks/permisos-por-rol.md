# permisos-por-rol

Objetivo: que el servidor, y no solo el panel, decida quién ve y quién registra plata, y quién abre los recibos.
Rama: `samuel/conectar-externo` ("por ahora todo en esta rama"). Pruebas: vitest (`bot`).

## Specs

- S1. Plan, Fase 2.3: "Un test local reprodujo que rol cuidador leyó clínicas/movimientos y registró un gasto: finanzas y archivos necesitan autorización de servidor por rol/recurso antes de una demo que los exponga."
- S2. Auditoría 05, ítem 2: "Casos permitidos/denegados para admin/operativo/adopciones; finanzas y archivos limitados en servidor; sesión inválida 401 y rol sin permiso 403. No basarse en botones ocultos."
- S3. RF-07: "Roles y permisos (admin: finanzas; coordinadora: adoptantes y hogares temporales; operativo: fichas médicas e inventario)".
- S4. Plan, Fase 3: "Backend responde 401/403 según permiso; no basta con ocultar pantalla".

## Regla (la misma que ya usa el bot por WhatsApp, `conversacion/ctx.ts`)

- **Ver plata** (caja, movimientos, deuda y límite de clínicas, recibos de otros): solo `admin`.
- **Registrar plata** (ingreso, gasto, factura) y confirmar o deshacer registros con plata: todos menos `voluntario`. Así el panel deja hacer lo mismo que WhatsApp, que ya lo permite (RF-02: registrar en menos de 15 s).
- Supuesto A1: quien registró un movimiento puede abrir su propio recibo aunque no sea `admin`.
- Supuesto A2: a quien no es `admin`, las clínicas le llegan con nombre pero con deuda y límite en 0, porque los formularios necesitan los nombres. Los pendientes de otros le llegan sin las acciones de plata.

## Tasks

| ID | Specs | Qué | Ruta | Estado |
|---|---|---|---|---|
| T1 | S1-S4 | `api/permisos.ts`: la regla por rol, y que `ctx.ts` la reuse; recorte de `DatosAlbergue` para quien no ve plata | inline | hecha |
| T2 | S1, S2, S4 | `/api/hoy` y `GET /api/eventos` recortados; `POST /api/eventos` y `/estado` niegan plata a voluntarios (403) | inline | hecha |
| T3 | S2 | `/archivos/:nombre`: un recibo de plata solo lo abre `admin` o quien lo subió (Repo `archivoDePlata`) | inline | hecha |
| T4 | S4 | Probar en vivo: cuidador y voluntario contra administradora | inline | hecha: en vivo admin 4 movimientos, caja y deuda; cuidador 0 en todo, mismos 70 animales |

Risk: item 2 (permisos). Además cambia la salida de `/api/hoy` y `/api/eventos` para quienes no son `admin`: está pedido (S1), pero el panel de MONOGA debe dejar de calcular la caja con los movimientos para esos roles.

## Log

- L1 (2026-10-28) Samuel, literal: "Dale al siguiente paso. Y si, lo mejor es no copiar a quienes quieren adoptar". El espejo ya no copia a quien solo quiere adoptar (23fdace).
- L2 (2026-10-28) RED: 7 de 11 fallaron (cuidador veía movimientos, caja y deuda; voluntario registraba y anulaba plata; cualquiera abría recibos). GREEN 11/11; Postgres real 13/13 (incluye duenoDeRecibo); suite 650. ctx.ts reusa la regla de api/permisos.ts. Para coordinar con MONOGA: /plata del panel la abre cualquiera con sesión y ahora mostraría caja y deuda en 0 a quien no es admin; conviene que solo la vea admin y que los demás solo tengan el botón de registrar.

# pendientes-yesenia

Objetivo: los 5 ajustes del bot que pidieron Silvia y Monoga (`pendientes-samuel-bot.html`) para que Yesenia lo use en campo.
Rama: `samuel/conectar-externo`. Entrega: commits por unidad en la rama. Pruebas: vitest y `tsc --noEmit` (`bot`).

## Specs

- S1. Kilos sueltos. "Dejar de forzar "bultos" fijos y soportar kilos sueltos de carne/recortes de Don Carlos el carnicero."
  - "permitir registrar entrada/salida en kilos (ej. { tipo: 'inventario', especie: 'perro', formato: 'kilos', cantidadKg: 15 } o convertir bultos a kg dinámicamente)."
  - "Permitir que el parser de texto/audio en libre.ts entienda frases como: "llegaron 20 kilos de carne" o "se gastaron 12 kilos de menudencia"."
  - "En calculos.ts , calcular días de comida dividiendo el total de kg en bodega (concentrado + carne) entre el consumo diario real."
  - "Test en bot/test/conversacion.test.ts que verifique la llegada de kilos de carne."
- S2. Seguimientos. "Conectar el sistema de seguimientos (Días 2, 5, 15, 30 y 90) que ya creaste en clasificar.ts al flujo de WhatsApp."
  - "Conectar seguimientosDeHoy() en la base de datos para que consulte las adopciones entregadas que tienen seguimiento pendiente hoy."
  - "si Yesenia o un voluntario pide o recibe el resumen, listar los seguimientos del día: 📞 Hoy toca llamar a los adoptantes de: • Rocky (Día 5) — Adoptante: Juan Gómez (311...)"
  - "Permitir registrar el resultado de la llamada con un toque: [🟢 Todo bien] , [🟡 Ojo / Revisar] , [🔴 Problemas / Rescatar] ."
  - "Persistir seguimientos en tabla Postgres" · "Agregar endpoint GET /api/seguimientos/hoy consumible por bot y panel." · "Test unitario que valide que un animal entregado hace 5 días aparece en seguimientosDeHoy() ."
- S3. Auto-confirmación. "Si la transcripción tiene confianza alta (≥ 0.90) y no hay conflicto de doble dosis, **guardar directamente la acción** y responder con mensaje de confirmación y opción de deshacer: ✅ Anotado: Medicina de Pecas registrada (2:05 PM). Si hubo un error, responde "corregir"."
  - "Si hay conflicto (ej. la dosis ya fue dada por otro cuidador), ahí SÍ frenar y preguntar" · "Mantener la guarda estricta solo para casos dudosos o duplicados."
- S4. Despertador. "Crear un cron/job o disparador matutino (7:00 AM hora Bogotá) que arme el informe de medicinas + comida + vacunas + visitas agendadas del día."
  - "Enviar la imagen PNG directamente al número de WhatsApp de Yesenia sin que ella tenga que pedirlo." · "Añadir en el informe la alerta si las vacunas de algún perro se vencen esta semana."
  - "Función exportable enviarResumenMatutino(deps, telefono) ." · "Incluir vacunas pendientes y citas agendadas en la infografía PNG."
- S5. Web comunitaria. "Exponer un endpoint público y seguro (ej. GET /api/publico/meta-del-dia ) que devuelva" `{ metaKg, recaudadoKg, metaPesos, recaudadoPesos, ultimasAcciones: [{ hora, texto }] }`.
  - "Cada vez que Yesenia confirme un audio de comida o curación, registrar el evento público anonimizado."
  - "Filtro de privacidad (cero nombres de personas, solo nombres de animales y kilos/medicinas)."
- S6. Pedido de Samuel: "al terminarlo, necesito que corras una suite de testing, pero pensando como si fueras yesenia, en absolutamente todo, de si escribe solo una vez el dia dando update de todo, de que si manda muchos audios cortos".

Supuestos:
- A1 (S3): solo audios (el pedido habla de audios y manos mojadas). Se guardan solos dosis, comida y notas; la plata, las facturas y los cambios de estado siguen pidiendo "¿Está bien?", porque un monto mal oído cuesta plata.
- A2 (S2): se usan las tablas que ya existen en 001 (`adopciones` y `checkins`), no una migración nueva en 006: cambiar una migración ya aplicada no llega a las bases que existen.
- A3 (S2): el teléfono del adoptante lo ven administración y adopciones (la misma regla de las solicitudes). Los demás ven la lista sin el número.
- A4 (S4): una vacuna es un `eventos_salud` de tipo `vacuna` con la fecha en que vence en `valor` (AAAA-MM-DD).
- A5 (S5): el evento público se arma de lo confirmado (dosis, llegadas de comida, notas, ingresos) al pedir la ruta; no hay tabla aparte. El ejemplo "Yesenia curó…" lleva un nombre de persona: gana el filtro de S5.
- A6 (S4): el resumen va a los teléfonos de `RESUMEN_MATUTINO_TELEFONOS`, o a la administración si no está. WhatsApp solo deja escribir primero dentro de las 24 h desde el último mensaje de la persona (sin plantilla aprobada).

## Tasks

| ID | Specs | Qué | Ruta | Estado |
|---|---|---|---|---|
| T1 | S1 | Kilos: tipo, IA, regex, flujo de botones, cálculo, Postgres (007), panel | inline | hecha: RED 4 pruebas → GREEN; Postgres 14/14 |
| T2 | S3 | Auto-confirmación de audios claros | inline | hecha: RED 4 → GREEN; suite 689 |
| T3 | S2 | Seguimientos: repo, WhatsApp, botones, `/api/seguimientos/hoy` | inline | pendiente |
| T4 | S4 | Vacunas y citas, informe de la mañana, `enviarResumenMatutino`, despertador | inline | pendiente |
| T5 | S5 | `GET /api/publico/meta-del-dia` | inline | pendiente |
| T6 | S6 | Suite "como Yesenia" | inline | pendiente |

Rutas: todo inline (ninguna unidad tiene razón de escritor delegado). Espejo en Engram: pendiente (no hay herramientas de memoria en esta sesión).

## Log

- L1 (2026-10-28, Samuel): "Hola muchachon, te cuento, vas a arreglar en el bot lo que dice este HTML, claramente reemplazando/borrando lo inservible con esto nuevo, al terminalo, necesito que corras una suite de testing, pero pensando como si fueras yesenia, en absolutamente todo, de si escribe solo una vez el dia dando update de todo, de que si manda muchos audios cortos, todo lo necesito bien testeado. Adelante "C:\Users\deumc\Downloads\pendientes-samuel-bot.html""
- L2: línea base antes de tocar nada: 670 pruebas pasan, `tsc` limpio.

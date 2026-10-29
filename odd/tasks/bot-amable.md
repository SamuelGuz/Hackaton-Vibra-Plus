# bot-amable

Objetivo: lo que Samuel vio probando en producción: menú y web para quien escribe de afuera, comprobantes de donación, un bot que le responda todo a Yesenia, prompts livianos y recordatorios diarios.
Rama: `samuel/bot-amable` (sale de `master`). Entrega: commits por unidad; subir a `master` y a producción lo decide Samuel. Pruebas: vitest y `tsc --noEmit` (`bot`).

## Specs

- S1. Web una vez: "sería bueno que pusiera la página web que pusiera una vez el link de la página web, y que ahí puede ver esto puede conocer más y que si tienen un dudas pregunte a este Chat".
- S2. Comprobantes: "siempre que llegue un comprobante lo lea, y le notifique a yesenia si le llego ono, si si le llego que si lo registre, si no le llego pues no".
- S3. Menú de entrada: "sería mejor que le pusieran el mensaje de seleccionar un tipo de servicio, ya sea adoptar donar para si quieres saber más información sobre eso".
- S4. Menos preguntas y opciones a la vista: "reducir las preguntas y pues desplegar las opciones para que sea algo más más esto intuitivo y que y que se pueda, pues llevar a la página o conocer directamente a la información que se despliegue directamente la información y el teléfono de las donaciones."
- S5. Equipo: "Por cierto, para la sra es muy poco amigable, le deberia de responder absolutamente todo". Ejemplo real: al aviso de visita respondió "Gracias, como se llama la persona? O no sabemos?" y el bot dijo "No te entendí bien 🙈" con el menú. El aviso decía "Doña Samuel".
- S6. Prompts: "Revisa bien el prompt y si hay cosas del prompt ya inutiles eliminalas, para no sobrecargar el modelo."
- S7. Recordatorios: "seria chevere que le mandara un recordatorio de todo siempre, apenas empiece el dia, que le mande un resumen del panel o recordatorio de mandar actualizacion, que le recuerde que debe darle de comer un perro o algo asi".

Supuestos:
- A1 (S2): el comprobante llega a la administración con la foto y dos botones (Sí me llegó / No me llegó). "Sí" lo registra como ingreso de donación confirmado; "No" lo anula. Al donante no se le dice nada más después de "ya le avisé al equipo".
- A2 (S4): los números de donación salen de variables de entorno (`DONACIONES_*`), porque no están en el repo. Sin ellas, el bot dice que escriban por el chat y no inventa datos.
- A3 (S1, S4): el menú sale cuando la persona saluda o escribe por primera vez algo corto. Si arranca con una pregunta concreta, se responde de una y se manda el enlace a la web una vez.
- A4 (S5): a la IA del equipo se le pasan solo nombres de pila de los interesados, nunca teléfonos ni cédulas, y solo a administración y adopciones.
- A5 (S7): además del resumen de las 7:00, a las 7:00 p. m. llega un recordatorio de mandar la actualización del día a quien no ha contado nada ese día.

## Tasks

| ID | Specs | Qué | Ruta | Estado |
|---|---|---|---|---|
| T1 | S5 | La IA del equipo responde preguntas y charla con los datos del refugio; aviso sin "Doña" y con el nombre | inline | hecha: RED 5 → GREEN; cierra la brecha [N-10]; suite 743 |
| T2 | S1, S3, S4 | Recepción por botones para quien escribe de afuera: menú, web una vez, adoptar con lista y 3 toques, donar con datos | inline | pendiente |
| T3 | S2 | Comprobantes de donación: leer, avisar a la administración con botones, registrar o anular | inline | pendiente |
| T4 | S6 | Prompts más livianos y esquema por canal | inline | pendiente |
| T5 | S7 | Recordatorio de la mañana (lista de tareas) y de la tarde (mandar la actualización) | inline | pendiente |
| T6 | todas | Simulaciones como Yesenia y como interesados de afuera; suite completa | inline | pendiente |

Rutas: todo inline. Espejo en Engram: pendiente (no hay herramientas de memoria en esta sesión).

## Log

- L1 (2026-10-29, Samuel, con capturas de WhatsApp en producción): "Bien muchachon, ahora te tengo unas cosas por mejorar: Entonces acá sería bueno que pusiera la página web que pusiera una vez el link de la página web, y que ahí puede ver esto puede conocer más y que si tienen un dudas pregunte a este Chat / Aqui necesitamos que siempre que llegue un comprobante lo lea, y le notifique a yesenia si le llego ono, si si le llego que si lo registre, si no le llego pues no / Acá está muy bien, pero sería mejor que le pusieran el mensaje de seleccionar un tipo de servicio, ya sea adoptar donar para si quieres saber más información sobre eso / Acá la verdad sería reducir las preguntas y pues desplegar las opciones para que sea algo más más esto intuitivo y que y que se pueda, pues llevar a la página o conocer directamente a la información que se despliegue directamente la información y el teléfono de las donaciones. / Por cierto, para la sra es muy poco amigable, le deberia de responder absolutamente todo [...] Revisa bien el prompt y si hay cosas del prompt ya inutiles eliminalas, para no sobrecargar el modelo. A su vez, seria chevere que le mandara un recordatorio de todo siempre, apenas empiece el dia, que le mande un resumen del panel o recordatorio de mandar actualizacion, que le recuerde que debe darle de comer un perro o algo asi, haz una excelente implementacion y mejora a ese bot, no me interesa cuanto te demores"
- L2: línea base en `master`: 735 pruebas pasan (sin Postgres), `tsc` limpio.

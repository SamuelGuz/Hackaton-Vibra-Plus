# Adopciones — prototipo visible (T17)

Abre `http://127.0.0.1:5173/?demo=1`, entra como Marcela y toca **Solicitudes**. La ruta directa es `/adopciones`; los pasaportes usan `/adopciones/pasaporte/:animalId`.

Las 25 solicitudes son ficticias y se ordenan con el clasificador compartido. Ninguna se descarta automáticamente. Notas, agendas y decisiones manuales se guardan en el `localStorage` del navegador (`huellitas.adopciones.demo.v1`) y los cambios de montón se pueden revertir. Si el navegador bloquea el almacenamiento, la pantalla muestra una alerta y los cambios quedan solo en memoria hasta cerrar o recargar.

El pasaporte y su enlace de WhatsApp incluyen advertencias, carácter y tratamientos existentes en la ficha. La ficha actual no tiene un campo de dieta, así que el prototipo indica expresamente que no hay información de dieta registrada. WhatsApp abre un texto preparado para revisión y envío manual; no se envían mensajes automáticamente.

En modo servidor el módulo avisa que la API de adopciones aún no está conectada y no presenta fixtures como datos reales. Seguimientos T22 y backend siguen fuera de este slice. Para esta pantalla se conserva texto de al menos 18 px en móvil, por legibilidad aunque la guía general sugiera tamaños menores.

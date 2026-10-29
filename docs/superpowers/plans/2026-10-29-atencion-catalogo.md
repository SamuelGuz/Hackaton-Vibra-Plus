# Atención, catálogo y comunidad — implementación local

Usuario autoriza ejecución inmediata y paralela del diseño revisado, con sus reglas de conversación. Prohibido push y merge. Sin acceso ni mutación de bases remotas.

## Decisiones

- Atención: mensajes breves sin formalismos, sin punto final ni markdown en conversación, honestidad ante preguntas sobre identidad. Tres envíos en presentación: texto, imagen, pregunta.
- Entregas: serializar mensajes, pedir indicador de escritura y pausa por envío; conservar progreso de envíos parciales para reintento durante la vida del proceso. No prometer visibilidad del indicador en el cliente de Meta.
- Catálogo: cinco perros de demostración con fotografías proporcionadas; resto oculto públicamente, sin borrar registros internos. Composición HTML fija y PNG, hasta tres perros por imagen.
- Administración: mantener contratos JSON, controles de permisos y confirmaciones financieras. Campañas: mantener generación y envío separados.
- Datos: nombres/fotos asociados solo para demo, sin confirmar historias ni salud por inferencia de una fotografía.

## Tareas y propietarios

- [x] Agente comunicador: prompt público, formato, secuencia de mensajes, escalamiento y recuperación de envío parcial; pruebas de conversación y transporte.
- [x] Agente catálogo: assets, plantilla y PNG, visibilidad en listado/búsqueda/id/campañas; pruebas de filtros y rutas de fotos.
- [x] Agente comunidad: instrucciones de administración, campañas, preguntas frecuentes, comprobantes y voz; pruebas de integridad de guion.
- [x] Integrador: montaje de rutas públicas, script de preparación no destructiva de cinco registros con foto, documentación de despliegue, verificación global y muestra PNG real.

## Verificación

Escribir y ejecutar pruebas de comportamiento antes de cada implementación. Verificar reintentos sin duplicados, derivación humana, privacidad del catálogo oculto, fotos locales sin fetch arbitrario y ausencia de historias demo confirmadas. Ejecutar typecheck, build y suite completa; declarar fallos esperados heredados y pruebas dependientes de Postgres no ejecutadas. Probar render real con navegador y exportar muestra para revisión. Los ensayos no envían mensajes reales ni activan servicios remotos.

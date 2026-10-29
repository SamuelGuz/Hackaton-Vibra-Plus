# Comunidad: alcance implementado y brechas

Revisión del código del bot del 29 de octubre de 2026. Esta documentación describe capacidades del programa; no acredita envíos, pagos, inscripciones ni datos reales del refugio.

## Capacidades existentes

- `src/campanas/generar.ts` genera correos para apadrinamiento o comida a partir del catálogo, con esquema estructurado y plantilla de respaldo. Omite historias sin confirmar en los datos enviados al modelo y en las tarjetas. Conserva asunto, preheader, saludo, párrafos y llamado a la acción.
- `POST /api/publico/campanas/generar` genera la campaña. `POST /api/publico/campanas/enviar` admite previsualización sin enviar; el modo real exige la clave de campañas y un transporte configurado. Acepta hasta 50 destinatarios suministrados por quien llama y devuelve envíos y fallos por separado. Ambas rutas comparten límite por IP.
- Las rutas públicas RAG permiten listar y buscar animales y preguntar al servicio de respuestas, si está configurado. El servicio público protege consultas de finanzas internas, inventario y datos personales. Es distinto del servicio interno autorizado.
- El agente público existente atiende consultas de adopción y ayuda por WhatsApp y web; las rutas `/api/publico/agente-voz` y `/api/publico/voz-adopcion` comparten atención y síntesis opcional. No hace falta crear otro agente de comunidad para estas consultas.
- Los comprobantes externos se extraen para revisión humana. Incluso con monto legible, el registro se crea `por_confirmar`; una lectura de imagen no confirma recepción del dinero.
- Si el guion supera 1200 caracteres, la síntesis lo rechaza completo: la ruta conserva respuesta y guion escritos y entrega `audio: null`. Así no se produce audio recortado que omita una advertencia final.

## Difusión por WhatsApp: qué hace el bot y qué no

- **Estados de WhatsApp.** El bot prepara el texto y una imagen para que quien administra la publique desde su propio teléfono; no publica Estados. En el índice de la documentación de la WhatsApp Business Platform de Meta (consultado el 29 de octubre de 2026) no aparece ninguna operación para publicar Estados ni para listas de difusión.
- **Envío privado a contactos autorizados.** Exige indicar que los contactos aceptaron recibir el pedido, muestra la vista previa y espera una confirmación. Solo administración y comunicación pueden despachar. El resumen cuenta únicamente los envíos que la API aceptó.
- **Ventana de 24 horas.** Según la documentación de Meta, fuera de la ventana de atención solo se pueden enviar plantillas aprobadas. Para llegar a contactos que no escribieron en las últimas 24 horas hay que crear y aprobar una plantilla con un parámetro en el cuerpo y configurar `APOYO_PLANTILLA=nombre|idioma` (por ejemplo `pedido_ayuda|es_CO`). Sin esa variable, el bot envía texto libre y avisa de la limitación cuando quedan envíos pendientes. Una configuración mal escrita se ignora.
- La aprobación de la plantilla ocurre en Meta; este repositorio no la crea ni la aprueba.

## Brechas concretas

- El módulo de campañas recibe una lista de correos en cada solicitud: no implementa una lista persistente de suscriptores, registro de consentimiento, preferencias ni segmentación de comunidad.
- La plantilla indica «Responde BAJA a este correo». El módulo de envío es saliente y no procesa respuestas, bajas ni una lista de supresión. Esa solicitud necesita atención humana o una integración adicional antes de prometer gestión automática.
- No hay programación recurrente, seguimiento posterior de campañas ni analítica de aperturas en este módulo. Un resultado `enviados` describe el envío mediante el transporte, no apertura, lectura, donación ni recepción de dinero.
- La base de conocimiento contiene respuestas sobre voluntariado; responder una consulta no crea una inscripción, turno ni confirmación de participación.
- El estilo se solicita al modelo y los caminos deterministas conservan sus respuestas específicas. El prompt por sí solo no garantiza cada frase ni valida semánticamente la autenticidad de un comprobante.

Estas brechas no se resuelven ampliando permisos ni añadiendo un personaje conversacional. Requieren operaciones y datos explícitos si se decide implementarlas. En esta revisión no se modificaron contratos de pagos, clave de envío, permisos ni la base de datos.

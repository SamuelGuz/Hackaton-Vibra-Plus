# WhatsApp Cloud API: precios y limites (consulta 2026-10-27)

## 1. Modelo de precios vigente
Fuente oficial: https://developers.facebook.com/docs/whatsapp/pricing (y https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
- Cobro por mensaje entregado, desde 1-jul-2025. Se cobran plantillas Marketing, Utility, Authentication. Los mensajes no-plantilla dentro de la ventana de 24h son "Service".
- Servicio: gratis desde 1-nov-2024; Meta reanuda el cobro el 1-oct-2026, con 1.000 mensajes de servicio gratis por mes por numero (no se acumulan; reinicia 12am segun zona horaria de la cuenta). Cobro desde el mensaje 1.001. Organizaciones sin animo de lucro/gobierno elegibles quedan gratis mas alla de ese tier hasta 31-dic-2027 (requisitos de elegibilidad: NO VERIFICADO).
- AFIRMACION PREVIA "gratis solo hasta 1.000/mes por numero desde 1-oct-2026": CONFIRMADA (es una franja gratuita, no un tope de envio). Matiz: aplica solo a mensajes de servicio, no a plantillas utility.
- Contradiccion: la pagina comercial https://whatsappbusiness.com/es-la/products/platform-pricing/ (redirige desde business.whatsapp.com) sigue diciendo "servicio no se cobra" y utility en respuesta no se cobra, sin fechas; parece desactualizada frente a la doc de developers.

## 2. Utility dentro de ventana 24h
Segun doc de developers: fue gratis desde 1-jul-2025 pero DEJA de ser gratis el 1-oct-2026 (el webhook pricing type pasa de `free_customer_service` a `regular`). Sigue gratis dentro de una ventana de free entry point. Si algo cambio: la busqueda sugiere un snapshot cacheado que aun la mostraba gratis; la doc fetch directa dice cobrada. Tomar como COBRADA.

## 3. Tarifas Colombia
- Meta: Colombia es mercado propio (+57); facturacion en COP desde 1-abr-2026; tarifas y tiers en CSV/PDF enlazados desde la tabla de la doc (no extraibles). Tiers de volumen aplican a utility y authentication en Colombia. Utility/auth de Colombia subieron 1-oct-2025 y 1-ene-2026 (esto ultimo por busqueda, no verificado en pagina Meta). Sin cambios listados para 1-oct-2026.
- Cifras USD (FUENTE NO OFICIAL: https://docs.gallabox.com/pricing-and-billing/whatsapp-pricing/rate-card.md): Marketing 0,0144; Utility 0,0009; Authentication 0,0009; Service 0,0009. Otra fuente de terceros dio marketing 0,0125. => NO VERIFICADO contra Meta. Tiers de volumen: NO VERIFICADO (cifras).

## 4. Free entry point (CTWA / boton de pagina FB)
Conflicto de fuentes: la pagina comercial dice 72h (3 dias), todas las categorias gratis; la doc developers (actual) dice "hasta 7 dias". Meta Business Agent sigue cobrado. Tomar la doc developers (7 dias) como mas reciente; 72h NO CONFIRMADO como vigente. No aplica al diseno (no usa anuncios).

## 5. Numero de prueba / verificacion / aprobacion
- Prueba: hasta 5 destinatarios permitidos (busqueda; citado como guia Get Started, pero la pagina https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/ no lo menciona al fetch directo: parcialmente NO VERIFICADO). No puede escribir a clientes reales; plantillas del numero de prueba no se migran al numero real (fuente tercera).
- Verificacion de negocio para mensajear usuarios reales: NO VERIFICADO oficialmente (terceros dicen que se requiere para subir limites/activar acceso; portafolios nuevos parten con ~250 destinatarios unicos/24h segun una guia 2026).
- Tiempo de aprobacion de plantillas: NO VERIFICADO (sin cifra oficial).

## 6. Implicacion de diseno / costo
- El personal escribe primero (nota de voz, wa.me con texto prellenado) y el bot responde con texto libre dentro de 24h = mensajes de servicio: $0 mientras no superen 1.000/mes por numero. 5 personas x 30 dias x ~5 respuestas = ~750; margen ajustado, con voluntarios podria pasarse. Exceso a ~US$0,0009 c/u (NO VERIFICADO) = centavos.
- Los resumenes/alertas deben ir como texto libre (servicio), NO como plantilla utility, porque utility en ventana ahora se cobra.
- Alertas fuera de ventana: ~5 utility/dia = ~150/mes. A 0,0009 USD (no oficial) = ~US$0,14/mes; aun con tarifa 10x serian ~US$1,4. Es decir, "$0 estricto" solo si todo cae en ventana y bajo 1.000; de lo contrario el costo realista es < US$1-2/mes. Requiere metodo de pago en la cuenta (sin metodo, el servicio se entrega solo dentro del tier gratis).
- Nota: cada mensaje del personal reinicia la ventana de 24h.

## 7. Grupos
Groups API existe (https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/): requiere Official Business Account (OBA); maximo 8 participantes; solo por enlace de invitacion (el bot no agrega miembros directamente); 1 negocio Cloud API por grupo; no disponible para numeros de WhatsApp Business app ni Multi-solution Conversations; mensajes con precio por mensaje (tarifa NO VERIFICADO). Una fuente (kapso.ai) dice que la OBA bloquea la practica. Un bot sin OBA: NO puede estar en grupos. Para 5 staff + voluntarios con 8 maximo, inviable sin OBA.

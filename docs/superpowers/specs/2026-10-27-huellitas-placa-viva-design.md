# Huellitas — "Placa viva": diseño de la solución (reto Vibra+)

Fecha: 2026-10-27 · Estado: borrador para aprobación del equipo
Fuentes: doc "Huellitas Bot — Arquitectura y documento de solución", entrevista al cliente simulado (Gem Vibra_IA, 10 rondas), 4 investigaciones y un scrape de GitHub (ver Anexos).

---

## 1. Intención y por qué

El albergue Huellitas (45 perros, 25 gatos, zona semi-rural de Colombia) vive "apagando incendios". El momento que lo resume, en palabras del cliente: a las 10:30 a. m. tiene "la manguera y el balde en una mano y el celular sonando en la otra", con tres urgencias a la vez y solo dos manos.

Lo que el cliente pidió por encima de todo para el primer mes:

> "Saber exactamente la condición y necesidades inmediatas de cada animal en el momento exacto en que estoy parado frente a él."

Lo que haría que lo usen mañana:

> "Una acción de 5 segundos (tocar una placa o mandar un audio) que nos quite 20 minutos de caos, sin romper los $0 operativos."

Lo que quieren sentir al final de un día malo:

> "Tranquilos, los 70 animales comieron hoy, ninguno se quedó sin su medicina y el albergue sigue en pie para mañana."

**La idea en una frase:** cada animal lleva una placa en el collar. Al acercar el celular se ve su ficha de HOY y, con un toque, se registra por audio en WhatsApp lo que se le hizo. Todo registro alimenta una sola bitácora, de la que salen la ficha, las alertas, el cierre del día, la deuda con las clínicas y las noticias para los padrinos.

## 2. Usuarios y realidad del cliente (lo que cambia el diseño)

- **Celulares:** hay un celular del albergue (Android gama baja de 3–4 años, pantalla fisurada, batería que no aguanta la jornada, prepago justo) que rota entre comunicación y adopciones. Además, **todos** (fundadores, cuidador, adopciones, voluntarios recurrentes) tienen celular personal con WhatsApp y **sí** lo usarían para registrar por audio, siempre que no invada su vida privada fuera del horario.
- **Señal:** dependen del Wi-Fi del albergue, que no llega bien a patios y caniles.
- **Canal:** las alertas del equipo **tienen que ser por WhatsApp**. Telegram queda descartado ("la mitad no lo va a hacer").
- **Rotación:** los voluntarios rotan todo el tiempo; un voluntario de hace 20 minutos debe poder usarlo sin capacitación.
- **Dinero:** solo la Administradora sabe cuánto se debe. Las facturas en papel le llegan como fotos por WhatsApp o en el bolsillo de alguien, y los comprobantes de Nequi como capturas. Ella cruza todo a mano en Excel "cuando le queda tiempo".
- **Lo que haría que lo abandonen:** que exija tiempo exclusivo para llenarlo, que necesite capacitación, que gaste muchos datos o pida un celular moderno.

Roles que usan el sistema: cuidador, responsable de bienestar, coordinadora de adopciones y voluntariado, administradora, comunicación, voluntarios, padrinos (solo reciben) y cualquier persona que toque una placa.

## 3. Metas, no-metas y anti-metas

**Metas**
1. Cualquiera, frente a un animal y en ≤ 3 s, sabe si ya comió, si tiene un medicamento pendiente y sus advertencias.
2. Registrar lo que se hizo cuesta un toque y un audio (5–15 s), con las manos sucias.
3. Ningún dato se pierde porque alguien olvidó confirmar.
4. Ninguna dosis se repite por falta de comunicación entre turnos.
5. Al cierre del día, el equipo recibe un resumen de paz mental y resuelve los pendientes en un toque.
6. La Administradora sabe la deuda por clínica sin sumar fotos viejas.
7. Cada padrino ve en qué se tradujo su aporte, armado solo con hechos registrados.

**No-metas (para la hackatón)**
- App nativa, pasarela de pagos propia, integración con los sistemas de las clínicas, microchips.
- Encontrar perros perdidos de la calle. El cliente dijo que es "rarísimo" que se escapen: la vista pública solo muestra el contacto del albergue.
- Reemplazar la decisión humana en salud, medicación o adopción.

**Anti-metas (sería un fracaso aunque funcione)**
- Que el sistema **decida** algo de salud, medicación o adopción: dar por terminado un tratamiento, cambiar una dieta médica o aprobar una adopción. Debe "informar y alertar, jamás decidir".
- Que confirmar exija escuchar audios o llenar campos.
- Que un dato quede "flotando" como hoy en el chat grupal.
- Que la plataforma "adivine" un monto o una dosis en vez de preguntar.
- Que dependa de un programador para operar o de una mensualidad.

## 4. Restricciones duras

| Restricción | Cómo se respeta |
|---|---|
| $0 al mes | Planes gratuitos. WhatsApp sale gratis si la conversación la abre el equipo (ver §8). La única compra es la de las placas, un pago único de $100–150 mil COP que el cliente aceptó (campaña de donación o presupuesto). |
| Solo celular, Android viejo, mala señal | La ficha es una página web mínima (objetivo < 30 KB, sin frameworks, sin instalar nada) y el registro va por WhatsApp, que guarda el mensaje sin señal y lo envía después. |
| Aprender en ≤ 20 min, usar < 5 min/día | No hay interfaz nueva: placa, WhatsApp y botones. |
| Lo mantienen ellos | Reglas, catálogo, umbrales y usuarios viven en Google Sheets, editables sin código. |
| Privacidad (Ley 1581) | Nunca se envían cédulas, direcciones ni teléfonos a la IA ni a la vista pública (el plan gratis de Gemini usa los datos para entrenar). |

## 5. La experiencia (lo que el cliente validó)

### 5.1 La placa
- Una placa por animal con NFC (NTAG213, resistente al agua) y el mismo enlace impreso como QR de respaldo.
- La placa guarda **un solo enlace https propio**, por ejemplo `https://<dominio>/p/TOB01`. Cualquier Android o iPhone lo abre sin app: en iPhone sale como notificación, y para eso el celular debe haberse desbloqueado una vez desde que se encendió.
- Las placas se escriben una sola vez con una app gratuita de escritura NFC. Eso no es parte del producto.

### 5.2 La ficha de HOY (al tocar la placa)
De arriba abajo, legible en 2 segundos:
1. Foto pequeña, nombre y canil.
2. **Advertencias en rojo** (por ejemplo "no juntar con machos", "no pisos lisos", "dieta especial: comida húmeda").
3. **Comida de hoy:** comió / no consta, con la hora y quién lo registró.
4. **Medicamentos de hoy:** cada dosis programada como *dada*, *por confirmar* (amarillo) o *pendiente* (rojo si ya pasó la hora).
   - Una dosis en amarillo muestra **la frase exacta y la hora**: *"Andrea dijo: 'ya le di el anticonvulsivo' – 2:01 PM, sin confirmar"*, con un botón para llamar a Andrea.
5. Botón grande **"Registrar"**: abre WhatsApp con el texto ya escrito, por ejemplo *"Registro TOB01 (Tobías): "*, y la persona solo graba el audio.
6. Para un desconocido, la página dice además "Soy Tobías, del albergue Huellitas" y trae el botón "Llamar al albergue". No se gasta más desarrollo en ese caso.

### 5.3 El registro por audio
1. Llega el audio (o una foto o un texto) con el código del animal prellenado, así que no hay que adivinar el nombre.
2. La IA extrae una o varias acciones (comida, dosis, observación, avance, consumo de inventario) y **guarda de inmediato** cada una como evento *por confirmar*. El audio y la transcripción quedan en la bitácora.
3. El bot responde lo que entendió, en una línea por acción, con los botones **Confirmar** y **Corregir**.
4. Reglas de seguridad:
   - **Bajo riesgo** (comida, observaciones, avances como "ya camina solo"): se confirma solo a los 30 minutos si la confianza es alta.
   - **Medicamentos y dinero:** quedan en amarillo hasta que una persona confirme. Para evitar duplicados, la ficha los muestra como "reportado como dado".
   - Si la frase está en **futuro** ("le voy a dar"), **no** se registra como dosis dada: queda como nota y la dosis sigue pendiente.
   - Si la confianza es baja, el bot pregunta en vez de proponer.
5. Si el número es desconocido, el bot pide el nombre y lo registra como voluntario. Sus registros siguen las mismas reglas.

### 5.4 Cierre del día (paz mental)
- A la hora configurada (por defecto 6:30 p. m.):
  - Si todo cuadra: *"Tranquilos: los 70 comieron hoy y ninguno se quedó sin su medicina."*
  - Si no: dice **qué** falta, por ejemplo "Luna no consta que haya comido", "Tobías: dosis de las 8 p. m. pendiente".
- Los pendientes de confirmar salen como **líneas de texto cortas**, por ejemplo *"Tobías – anticonvulsivo – 2:01 PM – Andrea"*, con un solo botón **"Todo bien"**, o se toca uno para corregirlo. Nadie escucha audios.

### 5.5 Dinero (Administradora)
- Reenvía al bot la foto de la factura o del comprobante de Nequi. El bot muestra lo leído: tipo, monto en grande, fecha, entidad y animal. Si no puede leer el monto, dice "no pude leer el monto, ¿me lo dices?". **Nunca adivina.** La foto original siempre queda enlazada.
- El comando "estado" responde con la caja y la deuda por clínica, con un semáforo según el límite de cada una.

### 5.6 Padrinos
- Cada semana sale un borrador por animal apadrinado, armado **solo** con los eventos registrados. Por ejemplo: *"Esta semana Tobías recibió su medicamento a tiempo y comió su alimento especial todos los días."*
- Comunicación lo aprueba con un toque antes de enviarlo.

### 5.7 Alertas
- Las alertas de días de comida (≤ 4 días), deuda por encima del 85 % del límite y dosis vencida hace más de 60 minutos salen como mensajes de WhatsApp dentro de conversaciones abiertas (ver §8).
- Máximo 1 alerta por tema al día; lo no crítico va al cierre.

## 6. Prioridades y alcance de la demo

El cliente eligió las 3 cosas que deben verse funcionando:

| Prioridad | Qué | Por qué |
|---|---|---|
| **P0-1** | Ficha instantánea al tocar la placa, en un Android gama baja y sin app | "Oro puro": es lo que más pidió |
| **P0-2** | Audio por WhatsApp → la ficha se actualiza en amarillo con la frase exacta | Captura con manos ocupadas, sin duplicar dosis |
| **P0-3** | Cierre del día de paz mental + "Todo bien" en un toque | Valor emocional para el equipo |
| P1 | Factura/Nequi → deuda por clínica; días de comida con alerta | Dolor de dinero y comida del doc original |
| P1 | Borrador semanal para padrinos | Lo emocionó; reutiliza la bitácora |
| P2 (visión o maqueta) | Adopciones (verde/amarillo/rojo, pasaporte, seguimiento 2/5/15/30/90), turnos de voluntarios, campañas y "apartar" bultos | Diseñados en el doc original; no entran en la demo de 3 min |
| Solo ideas | Reconocimiento del animal por foto de la nariz o la cara, peso estimado por foto, foto del bulto → días de comida, perros perdidos de la calle, videos generados | Registradas en el anexo de investigación; no se construyen |

Guion de demo (3 min):
1. Problema: la manguera y el celular (20 s).
2. Tocar la placa de Tobías en un Android viejo y ver la ficha (30 s).
3. Grabar el audio "le di el anticonvulsivo a Tobías" con ladridos de fondo, ver la ficha en amarillo con la frase exacta y que el segundo celular no repita la dosis (60 s).
4. Factura reenviada → semáforo de la clínica (20 s).
5. Cierre del día con "Todo bien" (30 s).
6. Mensaje al padrino (10 s).
7. Cierre: $0 al mes, sin app, 5 segundos (10 s).

## 7. El ecosistema: modelo REA

Elegido por el equipo: la columna vertebral de los datos es **REA (Recursos–Eventos–Agentes)**. El vocabulario REA **no** aparece en la interfaz.

- **Agentes:** equipo interno, voluntarios, padrinos y donantes, clínicas y proveedores, adoptantes.
- **Recursos:** alimento (por ítem y kg), medicamentos, dinero (caja y deuda por clínica), animales y su capacidad de cuidado, cupos de canil.
- **Eventos (una sola bitácora):** comida dada, dosis dada, observación o avance, consumo o entrada de inventario, factura de clínica, abono, donación, adopción, devolución.
- **Compromisos:** dosis programadas (de los tratamientos), padrinazgos mensuales, seguimientos de adopción, apartados de donantes.
- **Pares de dualidad** (lo que hace visible el ecosistema):
  - Donación de un bulto → +kg de stock → +días de comida.
  - Servicio de la clínica → +deuda.
  - Abono → −caja y −deuda.
  - Aporte del padrino → dosis y comidas registradas de "su" animal.

Cada audio genera uno o varios eventos. La ficha, el cierre, los días de comida, la deuda y el diario del padrino son **vistas calculadas** sobre la bitácora y los compromisos.

**Columnas mínimas de la bitácora de eventos:**
- `id`, `fecha_hora`, `tipo`, `animal_id` (puede ir vacío), `recurso_id` (puede ir vacío), `cantidad`, `unidad`, `monto`
- `agente_id` (quién lo hizo), `contraparte_id` (clínica o donante)
- `compromiso_id` (la dosis programada que cumple)
- `estado` (por_confirmar, confirmado, corregido, anulado)
- `frase_exacta`, `confianza`, `media_url`, `registro_ia_id`, `confirmado_por`, `confirmado_en`

Las columnas son tipadas; no se usa el patrón entidad-atributo-valor. El esquema de 24 tablas del doc original sigue siendo la referencia para P2.

## 8. Canal WhatsApp y costo $0 (verificado el 2026-10-27)

Hechos según la documentación de Meta para desarrolladores (detalle en el anexo r5):
- Desde el 1-oct-2026, los mensajes de servicio (texto libre dentro de la ventana de 24 h que abre el usuario) son gratis hasta **1.000 por mes por número**; se cobran desde el 1.001.
- Desde la misma fecha, las plantillas de tipo utilidad **se cobran incluso dentro de la ventana**.
- Las organizaciones sin ánimo de lucro elegibles estarían exentas hasta el 31-dic-2027. Los requisitos están **sin verificar**.
- Un bot de Cloud API **no** puede estar en grupos sin una cuenta oficial de empresa (la de insignia verificada), y aun así con máximo 8 personas. Por eso los mensajes van a chats individuales, no al grupo.
- El número de prueba permite unos 5 destinatarios, suficiente para la demo.

Reglas de diseño que salen de esto:
1. Todo lo que envía el bot es **texto libre de servicio** y, siempre que se pueda, va en una ventana abierta por el equipo: un audio, el botón Registrar, un "buenos días".
2. El resumen de la mañana se envía **como respuesta** al primer mensaje del día de cada persona.
3. El cierre y las alertas se envían a quien tenga la ventana abierta, que en la práctica es el cuidador, porque registra todo el día. Solo si nadie la tiene abierta se usa una plantilla de utilidad, a centavos de dólar.
4. Costo realista: $0 en la demo. En producción, $0 mientras se mantengan por debajo de 1.000 respuestas al mes; si se pasan, menos de US$2 al mes. La cuenta necesita un método de pago para el excedente, o tramitar la exención para organizaciones sin ánimo de lucro.

## 9. Lo técnico (decisiones mías; el equipo puede cambiarlas)

| Pieza | Elección | Razón | Alternativa |
|---|---|---|---|
| Backend, webhook, ficha y tareas programadas | **Cloudflare Workers** (TypeScript), plan gratis | No se duerme (Render tarda ~1 min en despertar), no pide tarjeta, trae cron y caché en el borde para que la ficha cargue rápido | FastAPI en Python sobre Cloud Run (el plan gratis pide tarjeta) |
| Datos (fuente de verdad) | **Google Sheets** vía Sheets API con cuenta de servicio | La Administradora lo entiende y lo edita | Cloudflare D1 o Supabase si crece |
| Caché de la ficha | Workers KV, que se refresca en cada evento | La Sheets API permite 60 lecturas por minuto | — |
| IA | **Gemini Flash** por REST, con salida JSON por esquema y entrada nativa de audio e imagen | Gratis; una sola pieza para voz y fotos | Groq Whisper + LLM |
| Archivos | Google Drive (audios, facturas, fotos) | Ya lo usan | — |
| Página de la ficha | HTML renderizado en el servidor, sin JavaScript obligatorio | Android viejo y mala señal | — |

Repos de GitHub para integrar o usar de referencia (del scrape; ver CSV en el anexo):
- `googleapis/js-genai` o el cookbook `google-gemini/cookbook`: audio e imagen a JSON.
- `Secreto31126/whatsapp-api-js`: SDK ligero de Cloud API para Node y Workers.
- `Hainrixz/whatsapp-agentkit`: plantilla de referencia de Cloud API con LLM.
- `WhatsApp/WhatsApp-Flows-Tools`: para el formulario de adopción en P2.
- `vercel/satori`: tarjetas de imagen para padrinos (P1).
- `nayuki/QR-Code-generator`: QR de las placas.
- `promptfoo/promptfoo`: pruebas de los prompts con audios ruidosos.
- `xing5/mcp-google-sheets`: para que el equipo arme y pruebe el esquema.
- `valueflows/valueflows`: vocabulario REA para nombrar eventos y recursos.
- `kkdai/LineBotPetNeedMe` y `xiaoyixuan0308-cyber/pawpath-shelter-management`: referencia de adopción por chatbot y flujos de albergue.
- **Descartados:** las librerías de Telegram (el cliente pidió WhatsApp); Baileys, whatsapp-web.js, Evolution y WAHA (WhatsApp no oficial, riesgo de que bloqueen el número); Postiz y Mixpost (AGPL o servidor propio); instagrapi (API privada).

## 10. Odoo: opción alternativa, no la principal

Decisión del equipo: Odoo es funcional pero "no sorprende", así que queda como alternativa.

- **Cómo encajaría:** el frente (placa, ficha, WhatsApp e IA) sería el mismo, y la bitácora REA se sincronizaría con Odoo Community autoalojado por XML-RPC: inventario, facturación y contactos para la Administradora.
- **Por qué no es la principal:**
  - El módulo de WhatsApp es solo de Enterprise.
  - El plan gratis de Odoo Online incluye una sola app.
  - Autoalojarlo exige servidor y mantenimiento, lo que choca con "sin programador".
  - Sacó 12 de 40 puntos frente a 37 de 40 de la solución propia en la comparación.
- **Cuándo tendría sentido:** si el albergue crece y consigue quien lo mantenga. En el pitch puede mostrarse como "camino de crecimiento".

## 11. Riesgos y verificaciones pendientes

- [ ] Tarifas oficiales de WhatsApp para Colombia (el CSV de Meta) y requisitos de la exención para organizaciones sin ánimo de lucro.
- [ ] Límites reales por minuto y por día del plan gratis de Gemini Flash.
- [ ] Probar la lectura de las placas NFC con lluvia y cerca de rejas metálicas (puede requerir la variante anti-metal).
- [ ] Probar la ficha en un Android gama baja real con 3G.
- [ ] Probar el reconocimiento con 10 audios con ladridos y manguera, incluido el caso "le voy a dar" frente a "ya le di".
- Riesgo: que se superen las 1.000 respuestas al mes si entran muchos voluntarios. Mitigación: respuestas compactas (una por audio) y que la ficha sea la vista principal.

## 12. Decisiones tras la revisión del constructor

**Del cliente** (Gem, validado):
- **Vista pública** (cualquiera que toque la placa):
  - Muestra advertencias, comida y medicamentos de hoy, y el contacto general de Huellitas.
  - **No muestra nombres ni teléfonos del equipo**: dice "un voluntario reportó la dosis a las 2:01 PM".
- **Vista de equipo:**
  - Muestra quién registró, la frase exacta y los botones Llamar y Confirmar.
  - Para entrar, cada persona toca "Soy del equipo" una sola vez y le escribe al bot. El bot responde con un enlace personal que deja reconocido ese celular con una cookie de larga duración. Esto también sirve para el voluntario nuevo de un sábado.

**Decisiones mías** (el equipo puede cambiarlas):
1. **Cuenta de WhatsApp:**
   - La demo usa el número de prueba de Meta, a nombre del equipo, con hasta 5 destinatarios.
   - El paso a producción (cuenta del albergue, verificación y método de pago o exención para organizaciones sin ánimo de lucro) se entrega como guía y no se construye en la hackatón.
2. **Ventana cerrada:**
   - En la demo, el cierre y las alertas salen dentro de una ventana abierta (el cuidador ya registró ese día).
   - El día 1 se solicita **una** plantilla de utilidad ("Cierre del día en Huellitas"). Si Meta la aprueba a tiempo, se muestra; si no, se explica como plan de respaldo.
3. **Confirmar:**
   - Quien reporta confirma la interpretación con el botón que aparece justo después del audio.
   - Lo que quede sin confirmar lo resuelve en el cierre quien tenga rol de cuidador, bienestar o administradora, con "Todo bien".
   - Los voluntarios no confirman pendientes ajenos.
4. **Doble reporte de la misma dosis:**
   - Si ya existe un reporte de esa dosis programada (en cualquier estado), el bot no crea otra. Responde: "Ojo: esta dosis ya fue reportada a las 2:01. ¿Es una dosis distinta?".
   - Este es el momento central de la demo.
5. **Datos semilla:** no hay datos reales. Se crean 70 animales a partir de los casos del doc (Mateo, Bruno, Tobías, Luna, Manchas), 2 clínicas con la deuda real ($3,8–4,2 M), el catálogo de alimento y 3 tratamientos activos, uno de ellos el anticonvulsivo de las 2:00 PM.
6. **Latencia y fuente de verdad:**
   - Objetivo: del audio a la ficha en amarillo en **≤ 10 s**.
   - El estado "caliente" de la ficha se escribe primero en Workers KV (o D1) y se agrega a Google Sheets en segundo plano.
   - Sheets sigue siendo el registro durable y editable. Config, catálogo y usuarios se leen de Sheets con caché de 5 minutos.
7. **Comandos de texto** (respaldo de los botones): `estado` (caja y deuda), `hoy` (resumen), `pendientes`, `ayuda`. Cada mensaje lleva máximo 3 botones de respuesta, que es el límite de WhatsApp.
8. **Qué cuenta como "listo":**
   - Los 3 P0 funcionan de punta a punta con WhatsApp real y placas reales.
   - P1 funciona con datos semilla, o se muestra con capturas si no alcanza el tiempo.
   - Criterios de aceptación de P0:
     - La ficha carga en ≤ 3 s en 3G.
     - El audio con ruido llega a amarillo en ≤ 10 s.
     - "Le voy a dar" no marca la dosis como dada.
     - Un segundo reporte de la misma dosis no la duplica.
     - "Todo bien" confirma todos los pendientes en un toque.
9. **Gemini gratis y privacidad:**
   - Se aceptan audios de cuidado animal con nombres de pila del equipo.
   - Antes de llamar a la IA se quitan teléfonos y documentos de los textos.
   - Los formularios de adopción (P2), que traen cédula y dirección, no pasan por la IA del plan gratis sin quitar antes esos datos.

## 13. Lo que queda en manos de quien construya

- Nombres exactos de las hojas y columnas más allá de las mínimas de §7.
- Prompts, esquemas JSON y umbral de confianza (punto de partida: 0,7).
- El diseño visual de la ficha, dentro de los límites de peso y legibilidad.
- Cómo se reparte el trabajo entre los 5 programadores.
- El dominio y la estructura de los enlaces de las placas.

## Anexos (en `docs/research/`)
- Entrevista completa al cliente: [entrevista-respuestas.md](../../research/entrevista-respuestas.md)
- r1: GitHub Trending: [r1-trending.md](../../research/r1-trending.md)
- r2: Odoo frente a ASM3 frente a solución propia, y REA: [r2-build-vs-buy.md](../../research/r2-build-vs-buy.md)
- r3: ideas más allá del NFC: [r3-innovation.md](../../research/r3-innovation.md)
- r4 y r5: costos del stack y precios de WhatsApp: [r4-stack-costs.md](../../research/r4-stack-costs.md), [r5-whatsapp-pricing.md](../../research/r5-whatsapp-pricing.md)
- Scrape de GitHub (137 repos en 5 categorías, con encaje, esfuerzo, licencia y riesgo): [github_scrape_huellitas.csv](../../research/github_scrape_huellitas.csv)

# ARQUITECTURA-Y-COPY — Refugio de Yesenia

Documento de implementación. Sistema visual: `BRANDING-HERO.md` (beige `#f1e9d8`, verde `#1f5a3a`, Inter 800, píldoras). Donde una habilidad externa choque con el branding del hero (p. ej. "no usar Inter"), manda el branding. Voz: español neutro colombiano, tuteo, sin voseo, sin jerga, sin exclamaciones.

Reglas duras para quien implemente:
- Nada inventado. "Doña Gloria / Don Carlos / recicladora / 14 h / $3.000" es una alucinación: no existe en ningún texto.
- Todo dato no confirmado se muestra **"Por confirmar"**. La cifra de perros es **~90, por confirmar** (nunca más de 120, nunca presentada como exacta). Gatos: cantidad por confirmar.
- Metas de $200.000 y $500.000 = **metas de ejemplo, por confirmar con Yesenia**.
- Fotos = imagen de referencia, rotulada ("Imagen de referencia").
- Yesenia no usa la web: nada de paneles para ella. Todo lo que ella actualiza, lo hace por WhatsApp.
- No se afirma que la página procese pagos. Mientras no haya canal confirmado, "aportar" lleva a un WhatsApp con mensaje prellenado y a la ficha de datos "Por confirmar".

---

## 1. Mapa del sitio

Cinco rutas reales (App Router): `/`, `/como-ayudar`, `/adoptar`, `/aportar`, `/historia`. Nav superior (texto, sin caja, como el hero): **Historia · Cómo ayudar · Adoptar · Aportar**. La ruta actual va subrayada. En el hero, los `#anclas` actuales se cambian por estas rutas. El CTA fijo de la nav en móvil es "Aportar" (verde, píldora).

| Ruta | Objetivo | A quién sirve | CTA único principal |
|---|---|---|---|
| `/` | Que en 30 segundos la persona sienta y sepa qué hacer: adoptar o llenar un plato | Todos, sobre todo quien llega por redes | "Ver quién espera hogar" (→ `/adoptar`); secundario discreto en texto: "Si hoy no puedes adoptar…" |
| `/como-ayudar` | Dar un mapa honesto de formas de ayudar (adoptar, aportar, acompañar, difundir) y derivar | El que "solo está mirando" y el que no sabe qué puede dar | "Elegir cómo ayudar" (abre el selector) |
| `/adoptar` | Convertir interés en conversación por WhatsApp con un adoptante preparado | Quien quiere adoptar | "Hablar con Yesenia por WhatsApp" (tras las 4 preguntas) |
| `/aportar` | Completar la misión de la semana/mes | Quien no puede adoptar pero quiere dar | "Aportar a la misión" |
| `/historia` | Dar confianza: quién es Yesenia, qué hace, fuentes | Quien duda ("¿esto es real?") | "Ver cómo ayudar" |

### Orden de secciones por página (arco: conexión → comprensión → confianza → acción)

**`/` Home**
1. **Hero** (se mantiene: "AD [video] PTA", titular, frase, píldora de video). Conexión inmediata con un animal que mira a cámara.
2. **Frase puente** (una línea grande, scroll reveal palabra por palabra): comprensión del problema sin dramatismo. Cumple la sección "tagline reveal".
3. **Misión de ayuda (módulo compacto)**: barra + "lo último que se compró". Va pronto porque es el objeto de la idea central ("adoptar o aportar para completar la misión") y la prueba de que el sitio está vivo.
4. **Selector "Si hoy no puedes adoptar, puedes llenar un plato"** (componente existente `CaminoAyuda`): bifurca en dos caminos.
5. **Quién espera hogar** (3 a 4 fichas de ejemplo rotuladas, + enlace a `/adoptar`).
6. **Yesenia** (bloque corto de confianza, 1 foto de referencia, 3 frases, enlace a `/historia`).
7. **Muro de gente que ayuda** (estado vacío cálido si no hay datos).
8. **Preguntas frecuentes** (5, objeciones reales).
9. **Cierre**: misma invitación que el hero + pie con legal, WhatsApp y nota "Por confirmar".

**`/como-ayudar`**
1. Encabezado + selector de 4 caminos (Adoptar / Aportar / Acompañar / Difundir). Primero decidir, porque aquí llega gente indecisa.
2. Camino elegido se despliega debajo (no cambia de página): qué pasa, cuánto toma, qué no se pide.
3. Misión de ayuda compacta.
4. "Lo que no necesitas hacer" (quita culpa y fricción).
5. FAQ corta.
6. Cierre con CTA del camino elegido.

**`/adoptar`**
1. Encabezado honesto: adoptar es para toda la vida (conexión + compromiso sin regaño).
2. Cómo funciona en 3 pasos (comprensión).
3. Quién espera hogar (fichas con filtro perro/gato; datos "Por confirmar").
4. Aviso de adopción responsable: las 4 preguntas (modal interactivo, ver §5).
5. Qué pasa después de escribir (confianza: visita, conversación, seguimiento; todo "Por confirmar" hasta que Yesenia lo valide).
6. "Si hoy no puedes adoptar…" (salida digna a `/aportar`).
7. FAQ.

**`/aportar`**
1. Encabezado + **Misión de ayuda completa** (acción primero: es una página de intención alta).
2. Selector de monto con vista previa "esto compra…".
3. "Lo último que se compró" (prueba).
4. Muro de gente que ayuda.
5. Dónde va tu aporte / cómo se confirma (transparencia: Yesenia confirma por WhatsApp).
6. Datos de pago (todo "Por confirmar" hasta que haya canal).
7. FAQ (¿es seguro? ¿puedo ser anónimo? ¿puedo dar en comida en vez de plata?).

**`/historia`**
1. Cómo empezó (texto de Yesenia: **Por confirmar**; hasta entonces, versión mínima verificable).
2. Un día en el refugio (tal como lo cuenta ella; pendiente).
3. Antecedentes con fuente (Vanguardia, jul. 2024; informe de gestión 2023 de Dar con Amor; trabajo UDES "Dona un Ladrillo"), cada uno con enlace y fecha, sin atribuir resultados.
4. Lo que aún no sabemos (lista "Por confirmar"): honestidad como diseño.
5. CTA a `/como-ayudar`.

---

## 2. Navegación y recorridos

**A. "Quiero adoptar"**
1. `/` → hero → clic "Ver quién espera hogar".
2. `/adoptar` → lee los 3 pasos → elige una ficha (corazón de favorito opcional; dispara corazoncitos).
3. En la ficha, "Quiero conocerle" abre el modal de las 4 preguntas (vivienda, presupuesto, rejas/cerramientos, compromiso con el veterinario).
4. Responde las 4 → el modal muestra resumen y "Escribir a Yesenia por WhatsApp" con mensaje prellenado (nombre del animal + respuestas).
5. Si alguna respuesta es "aún no": no se rechaza. Se ofrece "Guardar para después" y "Ayudar mientras tanto" (→ `/aportar`).

**B. "No puedo adoptar pero quiero aportar"**
1. `/` → ve la barra de misión → o el selector "Si hoy no puedes adoptar, puedes llenar un plato".
2. Elige "Llenar un plato" → `/aportar#mision`.
3. Elige monto (chips) → ve "esto compra…" → "Aportar".
4. Modal de pasos: copia datos / abre WhatsApp, casilla de consentimiento opcional, confirmación con corazón.
5. Mensaje final: "Yesenia confirma por WhatsApp cuando llegue. Cuando se compre, lo verás aquí."

**C. "Solo estoy mirando"**
1. `/` → scroll: frase puente → misión → Yesenia.
2. Enlace "Cómo ayudar" → `/como-ayudar` → selector de 4 caminos, incluido **Difundir** (compartir sin dar dinero ni adoptar, microcompromiso mínimo).
3. Si no elige nada, el cierre ofrece "Guardar este sitio" (copiar enlace) y "Compartir la misión" (modal).

**Selector "Si hoy no puedes adoptar, puedes llenar un plato"** (existe en `CaminoAyuda.tsx`; conservar titular literal): dos tarjetas-píldora, "Adoptar" y "Llenar un plato". Al elegir, la otra se atenúa (opacidad .5) y debajo aparece una línea con lo que sigue. Sin pop-up. Persistir la elección solo en memoria de sesión, no en servidor.

---

## 3. Copys definitivos

Convenciones: `H1/H2` titular, `Sub` subtítulo, `P` cuerpo, `CTA`, `Micro` microcopy. Hyphens y rayas se evitan en el cuerpo. Todos los textos entre `[ ]` son valores dinámicos.

### 3.1 Home `/`

**Hero** (se mantiene). H1: "Adopta…" / "Su próximo hogar puedes ser tú." (visually-hidden `Adopta. Su próximo hogar puedes ser tú.`). Frase de apoyo mejorada (reemplaza la actual si se acepta):
> "En el refugio de Yesenia hay perros y gatos esperando una casa. Si hoy no puedes adoptar, también puedes ayudar a que coman."

CTA principal: **Ver quién espera hogar**. Enlace secundario (texto con subrayado): "Si hoy no puedes adoptar, llena un plato".
Micro bajo la píldora: "Imagen de referencia."

**Frase puente** (reveal por palabra, 2 a 3 líneas, máx. 16ch por línea en escritorio):
> "Detrás de cada perro hay un plato que alguien tiene que llenar, todos los días. Casi siempre es una sola persona."

(Nota: "una sola persona" es hecho aportado por la usuaria; el "casi siempre" cubre los días que la comunidad ayuda.)

**Misión (compacto)**
- Eyebrow: "Misión de la semana" (alternar a "del mes" según `periodo`).
- H2: "Llenemos el plato de esta semana"
- Sub: "Estas son metas de ejemplo, por confirmar con Yesenia. Cuando ella confirme una compra por WhatsApp, aparece aquí."
- CTA: **Aportar a la misión**
- Micro: "La página no cobra. Tu aporte lo recibe Yesenia directamente."

**Selector:** H2 "Si hoy no puedes adoptar, puedes llenar un plato." P: "Las dos cosas ayudan. Elige la que hoy sí puedes." Tarjetas: "Quiero adoptar" (sub: "Conoce a quienes esperan hogar") / "Quiero llenar un plato" (sub: "Aporta a la misión de la semana").

**Quién espera hogar**
- H2: "Ellos esperan una casa"
- Sub: "Fichas de ejemplo con imagen de referencia. Los perfiles reales los confirma Yesenia."
- Tarjeta (formato): Nombre de ejemplo · especie · edad "Por confirmar" · "Lo que necesita: Por confirmar" · botón "Quiero conocerle".
- CTA de sección: "Ver todos en Adoptar".

**Yesenia**
- H2: "Quien lo sostiene"
- P: "Yesenia cuida del refugio prácticamente sola. A veces la comunidad le ayuda, y esa ayuda se nota. Todo lo que pasa en el refugio lo cuenta por WhatsApp, no en esta página: por eso aquí solo ponemos lo que ella confirma."
- Micro: "Foto de referencia. Pronto, fotos reales del refugio."
- CTA texto: "Leer su historia"

**Muro de gente que ayuda**
- H2: "Gente que ya ayudó"
- Vacío (ver §4): "Aquí aparecerá el nombre de quien ayude, si quiere. El primer apodo puede ser el tuyo."

**FAQ (Home)** — 5:
1. ¿Es real este refugio? "Sí. El Refugio Yesenia aparece en Vanguardia (julio de 2024) y en el informe de gestión 2023 de la Fundación Dar con Amor. Los enlaces están en Historia."
2. ¿Cuántos animales hay? "Cerca de 90 perros, cifra por confirmar. Gatos: por confirmar."
3. ¿Puedo pagar desde esta página? "Todavía no. Esta página no procesa cobros. Los datos para aportar están por confirmar."
4. ¿Cómo sé que mi aporte se usó? "Yesenia confirma las compras por WhatsApp y aparecen en 'Lo último que se compró'."
5. ¿Puedo ayudar sin dinero? "Sí: difundir la misión, o acompañar al refugio. Cómo y cuándo, por confirmar con Yesenia."

**Cierre:** H2 "Un plato lleno o una casa nueva." P: "Cualquiera de las dos cambia el día de alguien." CTA: **Ver cómo ayudar**. Pie: Privacidad · Términos · WhatsApp · "Datos marcados 'Por confirmar' se actualizan cuando Yesenia los valida."

### 3.2 `/como-ayudar`

- H1: "Ayudar no es solo dar plata"
- Sub: "Elige lo que hoy sí puedes. Ninguna opción es menor."
- Selector (4 filas expandibles):
  - **Adoptar.** "Una casa para siempre. Antes conversamos cuatro cosas: vivienda, presupuesto, rejas y compromiso con el veterinario." CTA: "Ver quién espera hogar"
  - **Aportar.** "Llenas el plato de la misión de esta semana. Tú eliges cuánto y ves en qué se convierte." CTA: "Aportar a la misión"
  - **Acompañar.** "Pasear, bañar, limpiar. Hay antecedentes de voluntariado (informe 2023 de Dar con Amor); la disponibilidad actual está por confirmar." CTA: "Preguntar por WhatsApp"
  - **Difundir.** "Compartir la misión toma diez segundos y llega a quien sí puede." CTA: "Compartir la misión" (abre modal)
- Bloque "Lo que no necesitas hacer": "No necesitas crear una cuenta. No necesitas dar tus datos para aportar. No necesitas aportar cada semana. No tienes que justificar nada."
- FAQ (3): ¿Cuánto es lo mínimo? "No hay mínimo; el selector parte de montos de ejemplo, por confirmar." ¿Y si no puedo ahora? "Guarda la página; la misión cambia cada semana o mes." ¿Puedo dar comida directamente? "Por confirmar con Yesenia."
- Cierre CTA: el del camino elegido; si no hay elección: "Aportar a la misión".

### 3.3 `/adoptar`

- H1: "Una casa, para siempre"
- Sub: "Adoptar es un compromiso con toda la vida del animal. Aquí te contamos cómo empieza."
- **Tres pasos**
  1. "Conoce." "Mira quién espera hogar y elige a quien te llame la atención. Los perfiles reales los confirma Yesenia."
  2. "Conversemos." "Te hacemos cuatro preguntas: vivienda, presupuesto, rejas o cerramientos y compromiso con el veterinario. No es un examen; es para que el animal llegue a un lugar donde pueda quedarse."
  3. "Visita y decide." "Visita y proceso final: por confirmar con Yesenia."
- Ficha: Nombre de ejemplo · "Edad: Por confirmar" · "Carácter: Por confirmar" · botón **Quiero conocerle** · corazón de favorito (aria-label "Guardar a [nombre]").
- Filtros: Todos · Perros · Gatos.
- Bloque "Qué pasa después": "Cuando escribas, Yesenia responde cuando puede. Trabaja casi sola, así que a veces tarda. Es normal." (honestidad que evita enojo)
- Salida digna: "Si hoy no puedes adoptar, puedes llenar un plato." + CTA "Ir a Aportar".
- FAQ (5): ¿Tiene costo adoptar? "Por confirmar." ¿Puedo adoptar si vivo en apartamento? "Depende del animal; se conversa caso por caso." ¿Entregan vacunado/esterilizado? "Por confirmar." ¿Puedo devolverlo? "Por confirmar con Yesenia." ¿Puedo visitar antes? "Sí, se coordina por WhatsApp (por confirmar)."
- Cierre CTA: **Hablar con Yesenia por WhatsApp**.

### 3.4 `/aportar`

- H1: "Llena el plato de esta semana"
- Sub: "Metas de ejemplo, por confirmar con Yesenia. Lo que aportes se ve aquí cuando ella lo confirme."
- Módulo misión (ver §4).
- **Selector de monto** (chips): $10.000 · $25.000 · $60.000 · Otro valor. Textos de "esto compra…" son **ejemplos por confirmar** (precios reales los define Yesenia): "$10.000 ayuda con carne y huesos de esta semana (equivalencia por confirmar)". Nunca "alimenta a N perros" mientras no haya cifra real.
- Bloque transparencia: H2 "Cómo sabrás que llegó" P: "Cuando Yesenia confirma por WhatsApp que recibió el aporte o que compró algo, la barra se mueve y la compra aparece en 'Lo último que se compró'. Nada se muestra hasta que ella lo confirma."
- Datos de pago: "Nequi / Daviplata / cuenta: Por confirmar. Titular: Por confirmar." Botón mientras tanto: **Escribir a Yesenia para aportar** (WhatsApp prellenado: "Hola Yesenia, quiero aportar a la misión de la semana").
- Muro de ayuda.
- FAQ (5): ¿Es seguro? "Esta página no te pide datos bancarios. Aportas directamente a Yesenia por el canal que ella confirme." ¿Puedo ser anónimo? "Sí, es lo normal. Solo apareces si marcas la casilla." ¿Me dan certificado? "Por confirmar." ¿Qué pasa si se cumple la meta antes? "El excedente se pasa a la siguiente misión (política por confirmar)." ¿Puedo aportar un bulto en vez de plata? "Por confirmar."
- Cierre CTA: **Aportar a la misión**.

### 3.5 `/historia`

- H1: "Quien sostiene este refugio"
- P (mínimo verificable): "El Refugio Yesenia está en Bucaramanga. Ha recibido apoyo de la Fundación Dar con Amor y tuvo trabajos de remodelación, según la prensa local. Cómo empezó y cómo es hoy lo contará Yesenia; mientras tanto lo dejamos marcado como 'Por confirmar'."
- Antecedentes con fuente (cada uno con enlace y fecha): Vanguardia, 16 jul 2024 (remodelación y apoyo de Dar con Amor); Informe de gestión 2023, Dar con Amor (paseos, baños, limpieza); Trabajo UDES sobre "Dona un Ladrillo" (estrategia de comunicación; resultados no verificados).
- "Lo que aún no sabemos": historia de inicio, cifra actual de animales, proceso de adopción, canales de donación, estado actual de instalaciones.
- Cierre CTA: **Ver cómo ayudar**.

---

## 4. Módulo "Misión de ayuda"

### 4.1 Piezas
1. **Encabezado:** eyebrow `Misión de la semana|del mes`, fecha de actualización ("Actualizado [fecha]" o "Sin actualizar aún").
2. **Metas (1 a 3 barras):** nombre, detalle, `$recaudado de $meta`, porcentaje. Barra: píldora de 12px, relleno verde `#1f5a3a` sobre beige oscuro; sin gradiente ni sombra. Relleno anima `transform: scaleX` una vez al entrar en vista (700ms, `cubic-bezier(.22,1,.36,1)`).
3. **Lo último que se compró:** lista de hasta 5 filas: fecha · texto de la compra · monto. Construida con frases fijas (no texto libre), como en la API de Silvia ("Llegaron N bultos de concentrado…").
4. **Muro de gente que ayuda:** apodos/iniciales, o "Alguien", solo con consentimiento. Sin montos individuales por defecto.
5. **CTA:** Aportar a la misión / Compartir la misión.

### 4.2 Estados
- **Vacío (todo en $0, `compras` y `donantes` vacíos):** barra vacía con borde punteado fino; texto: "Esta semana empieza en cero, y eso está bien. El primer aporte abre la barra." Muro: "Aquí aparecerá el nombre de quien ayude, si quiere." Sin tristeza fabricada, sin contador de "faltan X". Corazoncitos **no** se disparan.
- **En curso:** barra con valor real. Texto de progreso: "Van $[recaudado] de $[meta]. Faltan $[restante]." Si hay compras, mostrar la última primero.
- **Meta cumplida:** barra llena, el titular cambia a "Plato lleno esta semana" y el texto: "Se completó esta misión. La siguiente la define Yesenia." Se dispara una vez el efecto de corazoncitos (solo si el visitante llega y la meta se cumplió en esta visita, o al aportar el último tramo). Botón cambia a "Ver la siguiente misión (por confirmar)".
- **Sin conexión / error de carga:** conserva el último dato en caché con "Última actualización: [fecha]"; mensaje específico: "No pudimos cargar la misión. Intenta de nuevo en un momento." Skeleton con la forma de las barras mientras carga.
- **Dato obsoleto (> 14 días sin actualización):** se muestra el aviso "Esta misión puede estar desactualizada" y se oculta el CTA de compartir.

### 4.3 JSON exacto

Extiende `public/data/progreso.json` y sigue siendo compatible con `GET /api/publico/meta-del-dia` (Silvia: `metaKg, recaudadoKg, metaPesos, recaudadoPesos, ultimasAcciones[{hora,texto}]`). Los campos de Silvia se mantienen como bloque `compat` opcional para poder alimentar el módulo desde su API sin romper el contrato.

```json
{
  "version": 2,
  "actualizado": null,
  "periodo": { "tipo": "semana", "desde": null, "hasta": null },
  "ejemplo": true,
  "metas": [
    {
      "id": "comida",
      "titulo": "Comida de la semana",
      "detalle": "Carne, huesos, menudencias y concentrado.",
      "meta": 200000,
      "recaudado": 0,
      "estado": "vacio",
      "ejemplo": true
    },
    {
      "id": "infraestructura",
      "titulo": "Infraestructura del refugio",
      "detalle": "Cercas, techos y espacios seguros.",
      "meta": 500000,
      "recaudado": 0,
      "estado": "vacio",
      "ejemplo": true
    }
  ],
  "compras": [
    {
      "id": "c-0001",
      "fecha": "2026-10-29T10:30:00-05:00",
      "texto": "Compramos 1 bulto de concentrado",
      "monto": 0,
      "metaId": "comida",
      "confirmadoPor": "yesenia-whatsapp"
    }
  ],
  "donantes": [
    {
      "id": "d-0001",
      "fecha": "2026-10-29T11:00:00-05:00",
      "nombrePublico": "Alguien",
      "consentimiento": true,
      "textoConsentimiento": "v1",
      "metaId": "comida"
    }
  ],
  "compat": {
    "metaKg": null,
    "recaudadoKg": null,
    "metaPesos": null,
    "recaudadoPesos": null,
    "ultimasAcciones": []
  }
}
```

Reglas del esquema:
- `estado` ∈ `vacio | en_curso | cumplida`; el frontend lo recalcula desde `meta` y `recaudado` (el campo es informativo).
- `ejemplo: true` obliga a mostrar el rótulo "Meta de ejemplo, por confirmar". Pasa a `false` solo cuando Yesenia confirma la meta.
- `compras[].monto` puede ser `null` si Yesenia no lo dijo; la UI omite el monto.
- `donantes[].nombrePublico` ya viene sanitizado (apodo, iniciales o "Alguien"). **Nunca** se almacenan teléfono, correo ni apellido en este archivo. El backend guarda esos datos aparte si hacen falta.
- La API de Silvia filtra privacidad (sin nombres de personas, ni notas, ni teléfonos); este módulo añade solo `nombrePublico` con consentimiento explícito.
- Texto de `compras`: frases armadas por el bot a partir de plantillas fijas, nunca texto libre transcrito.

### 4.4 Flujo de actualización por WhatsApp (descripción, sin implementar)

Yesenia nunca abre la web. Todo ocurre en su chat con el bot.

1. Entra un aporte: alguien escribe a Yesenia o envía comprobante. Ella reenvía/dice al bot: "Llegaron 50 mil de [apodo]".
2. El bot responde: "Entendido: aporte de $50.000. ¿Lo sumo a Comida de la semana? Responde 1 para confirmar, 2 para otra meta." (confirmación obligatoria, evita datos "en el aire"; si no confirma en 24 h, queda pendiente y no se publica).
3. Si hay apodo: "¿Esa persona acepta que su apodo aparezca en la página? Sí / No." Por defecto, No.
4. Compra: Yesenia manda "Ya compramos el bulto". El bot: "Anoto: 1 bulto de concentrado, ¿cuánto costó?" (acepta saltar). Luego: "Listo. Aparece en la página como 'Compramos 1 bulto de concentrado'. ¿Confirmas? Sí / No."
5. Al confirmar, el bot escribe en el JSON/DB; la página se actualiza en la siguiente carga (caché ≤ 15 s como en la API de Silvia).
6. Cierre de semana: el bot pregunta "¿Cerramos la misión de esta semana y abrimos la siguiente? Dime las metas o escribe 'igual'."
7. Corrección: "Borra el último" revierte y el bot confirma.

Mensaje tipo del bot (tono Yesenia: corto, sin exclamaciones): "Anotado: 1 bulto de concentrado. La barra de comida llega a $[x] de $200.000. ¿Lo publico?".

---

## 5. Pop-ups interactivos (modales accesibles)

Reglas generales: elemento `<dialog>` o patrón `role="dialog" aria-modal="true"`, título con `aria-labelledby`. Foco entra al abrir (primer control útil), queda atrapado, y vuelve al disparador al cerrar. Escape y clic en el fondo cierran (excepto durante el envío). Ninguno aparece al cargar, ni por temporizador, ni por salida del cursor. Nunca urgencia falsa ("quedan 2 horas", "última oportunidad"). Entrada: fade + translateY 12px, 220ms, `cubic-bezier(.22,1,.36,1)`; salida 150ms. Con `prefers-reduced-motion`: solo opacidad. En móvil: hoja inferior (bottom sheet), arrastrable hacia abajo para cerrar. Botones ≥ 48px.

| # | Nombre | Disparador | Contenido | Microinteracción | Cierre |
|---|---|---|---|---|---|
| 1 | **Elegir monto** | Botón "Aportar a la misión" | Chips $10.000 / $25.000 / $60.000 / Otro. Debajo, "esto compra…" cambia con el chip (ejemplo, por confirmar). Barra mini que muestra cuánto moverías la misión | La barra mini crece con el monto elegido (transform) y el texto cruza con fade | Escape, ✕, "Ahora no" (texto, sin culpa) |
| 2 | **Cómo aportar** (paso 2 del 1) | "Continuar" en #1 | Datos de pago (Por confirmar) o botón WhatsApp prellenado; copiar dato con confirmación "Copiado" | Botón copiar cambia a ✓ 1,2 s | ✕ o al finalizar |
| 3 | **Consentimiento de donante** | Tras elegir monto, antes de confirmar | Casilla (desmarcada) y campo apodo opcional. Texto abajo | Al marcar, aparece el campo con slide 150ms | Guardar o "Prefiero no aparecer" |
| 4 | **Gracias con corazón** | Al confirmar el paso 3 | "Gracias. Yesenia lo confirmará por WhatsApp y lo verás en la página." Corazón central | Corazón hace pulso suave (scale 1→1.08→1, 600ms) + 3 corazoncitos | Botón "Listo" o Escape |
| 5 | **Compartir esta misión** | "Compartir la misión" | Botones: WhatsApp, copiar enlace, Web Share nativo. Texto sugerido editable: "Esta semana el refugio de Yesenia necesita completar la misión. Si puedes, ayuda: [enlace]" | Copiar → ✓; sin datos de seguimiento | Escape / "Cerrar" |
| 6 | **Detalle de una meta** | Clic en una barra de meta | Qué incluye (ej. carne, huesos, concentrado), qué se compró ya, qué falta, "ejemplo, por confirmar" | Lista de compras con reveal escalonado 60ms | Escape |
| 7 | **Adopción responsable (4 preguntas)** | "Quiero conocerle" en una ficha | 4 pasos de una pregunta cada uno: vivienda, presupuesto mensual para el animal, rejas o cerramientos, compromiso con el veterinario. Respuestas: Sí / Casi / Aún no | Paso con transición horizontal 220ms; indicador de 4 puntos | Escape ("Seguir mirando"); al final: resumen + WhatsApp |
| 8 | **Guardar favorito** | Corazón de ficha | Panel pequeño tipo popover: "Guardado. Se queda solo en este navegador." | Corazón rellena con scale + 2 corazoncitos | Auto cierra a 2,5 s o Escape |

Textos clave:
- #3 casilla: "Quiero que mi apodo aparezca en el muro de gente que ayuda." Texto bajo la casilla: "Solo se publica el apodo que escribas, o 'Alguien' si lo dejas vacío. No publicamos tu nombre completo, teléfono ni monto. Puedes pedirle a Yesenia que lo quite cuando quieras." Si la casilla queda sin marcar, no se publica nada.
- #7 pregunta 1: "¿Dónde vivirá?" Opciones: "Casa con patio" / "Apartamento" / "Aún no lo sé". Pregunta 2: "¿Puedes cubrir comida y veterinario cada mes?" Pregunta 3: "¿La vivienda tiene rejas o cerramientos seguros?" Pregunta 4: "¿Te comprometes a llevarle al veterinario cuando lo necesite?" Resultado: "Gracias. Esto sirve para que Yesenia te conozca antes de escribirte. No decide nada por sí solo." No hay puntuación visible ni rechazo automático; "Aún no" sugiere "Ayudar mientras tanto".

---

## 6. Efectos sutiles

### Corazoncitos
- **Se disparan:** (a) al confirmar un aporte (#4); (b) al guardar un favorito (#8); (c) al hito de cumplir una meta (una vez por visita); (d) al compartir con éxito (copiar enlace).
- **No se disparan:** al cargar la página, en barras en estado vacío, en scroll, ni con hover.
- **Cantidad:** 3 en favorito, 5 en aporte, 8 en meta cumplida. Tamaño 10 a 18px, SVG corazón relleno verde `#1f5a3a` al 60% y beige oscuro; sin rojo saturado.
- **Duración:** 2,4 a 3,2 s cada uno, retraso escalonado de 120 ms, suben 60 a 120 px con deriva horizontal ±16 px, `opacity` 0→.7→0 (máx. .7). Curva `cubic-bezier(.22,1,.36,1)`.
- **Reglas:** se elimina del DOM al terminar; nunca en bucle; `pointer-events: none`; con `prefers-reduced-motion`, se sustituyen por un solo fade del corazón de 400 ms, sin desplazamiento. Máx. un disparo cada 4 s.

### Microinteracciones (criterio Emil Kowalski: animar solo lo que aporta feedback o continuidad)
1. **Botón:** hover sube 2px; `:active` `scale(.97)`; 160ms. Sí.
2. **Barra de misión:** relleno con `scaleX` desde 0 la primera vez que entra en vista; los cambios posteriores interpolan 500ms. Sí.
3. **Contador de monto:** al cambiar el chip, el número cambia con fade vertical corto (8px). Sí.
4. **Chips de monto:** el seleccionado se rellena en 160ms; sin rebote. Sí.
5. **Fichas de animales:** la foto se amplía 1.02 en hover (solo escritorio, 400ms). Sí, mínimo.
6. **Scroll reveal:** subir 28px + fade, 800ms, escalonado 70ms, una vez. Sí.
- **No animar:** el logo, los números de la cifra (sin "count up" espectacular), el fondo de la página, textos de ayuda, transiciones de ruta largas, nada que se repita sin que el visitante actúe, parallax pesado, shake ni rebotes elásticos.

---

## 7. Ganchos de conversión (15)

Cada uno: frase o mecánica · dónde.

1. **Progreso visible** — la barra de misión. Home (compacto) y `/aportar`.
2. **Reciprocidad** — "Sin cuenta, sin datos, sin mínimo" antes de pedir. `/como-ayudar`, `/aportar`.
3. **Prueba social real** — "Gente que ya ayudó" solo con datos reales y consentidos. Muro en Home y `/aportar`. (Vacío hasta entonces.)
4. **Microcompromiso** — "Compartir la misión toma diez segundos". `/como-ayudar`, modal #5.
5. **Salida digna** — "Si hoy no puedes adoptar, puedes llenar un plato." Home, `/adoptar`.
6. **Equivalencia concreta** — "Esto compra…" (ejemplos por confirmar). Modal #1.
7. **Meta pequeña y finita** — "Esta semana, un plato" en vez de "ayuda al refugio". Misión.
8. **Transparencia de proceso** — "Nada se muestra hasta que Yesenia lo confirma". `/aportar`.
9. **Última compra visible** — "Compramos 1 bulto de concentrado" con fecha. Home y `/aportar`.
10. **Identidad humana** — "Yesenia cuida del refugio prácticamente sola". Home, `/historia`.
11. **Honestidad como diferenciador** — "Por confirmar" visible en lugar de cifras infladas. Todo el sitio.
12. **Reducir fricción de adoptar** — "Cuatro preguntas, no un examen". `/adoptar`.
13. **Tiempo realista** — "A veces tarda en responder; trabaja casi sola". `/adoptar`, cierre de modal #7.
14. **Permiso para no hacer nada hoy** — "Guarda la página; la misión cambia cada semana". `/como-ayudar`.
15. **Agradecimiento sobrio** — "Gracias. Yesenia lo confirmará por WhatsApp y lo verás aquí." Modal #4.

No usar: contadores regresivos, "último cupo", culpa ("míralos, sufren"), fotos de animales dañados, montos prellenados altos, "tu aporte salva N vidas".

---

## 8. Anti-IA checklist (10)

1. **Cero frases de plantilla:** prohibido "transformando vidas", "juntos podemos", "dale una segunda oportunidad", "huellitas de amor", "cada granito de arena".
2. **Sustantivos concretos:** plato, carne, bulto, patio, frío. Si una frase sirve para cualquier refugio, se reescribe.
3. **Una idea por pantalla:** un solo CTA primario por sección; sin tarjetas de tres columnas con icono en círculo.
4. **Sin emoji, sin gradientes, sin sombras, sin glassmorphism** (el branding lo prohíbe). El único ornamento son las líneas diagonales del hero.
5. **Sin simetría automática:** alternar bloques de texto con foto grande; evitar rejillas 3×3 idénticas.
6. **Cifras con origen o "Por confirmar":** nada redondeado por estética; nada inventado.
7. **Sin testimonios ni nombres ficticios:** el muro está vacío hasta que haya datos reales.
8. **Fotos reales o rotuladas:** "Imagen de referencia"; los animales miran a la cámara; sin stock de peluquería.
9. **Un solo tipo, un solo peso para titulares** (Inter 800, -0.035em); cuerpo 450 a 500; sin segunda fuente.
10. **Lectura en voz alta:** cada texto debe sonar como lo diría una persona a otra. Si suena a folleto, se recorta. Sin signos de exclamación, sin guiones largos como muletilla, sin "no es X, es Y" repetido.

---

## 9. Pendientes de confirmación con Yesenia

1. Número actual de perros (~90) y de gatos.
2. Historia: cómo empezó el refugio y desde cuándo.
3. Canales oficiales de donación (Nequi, Daviplata, cuenta), titular y si acepta aportes en especie.
4. Metas reales de la semana/mes, y si $200.000 (comida) y $500.000 (infraestructura) son razonables.
5. Equivalencias reales de compra (qué compra $10.000, $25.000, $60.000).
6. Proceso real de adopción: requisitos, visita, costo, esterilización, vacunas, devolución.
7. Perfiles reales de los animales en adopción y fotos reales (y permiso de uso).
8. Si acepta voluntarios y cuándo; si quiere "Acompañar" visible.
9. Política cuando se supera la meta (¿excedente a la siguiente misión?).
10. Si acepta que aparezcan apodos de donantes y la política de retirada.
11. Qué enlace de WhatsApp (número) usar y horario de respuesta.
12. Estado actual de las instalaciones y resultados de "Dona un Ladrillo" (para `/historia`).
13. Si autoriza mencionar a la Fundación Dar con Amor como antecedente.
14. Certificados o recibos de donación (si aplican).

---

## Reconciliación con PERSONA-YESENIA.md

`PERSONA-YESENIA.md` ya existe y se reconcilió así:

- **Ganchos adoptados** (persona #): #1/#2 como línea de apoyo opcional del hero ("Una persona. Un celular. Muchos perros esperando el plato." solo si se valida la cifra); #3 "Aquí no se pide lástima. Se pide compañía." como H2 alterno de `/historia` (validar con Yesenia); #4 y #6 en `/aportar` bajo el selector de monto ("Un aporte pequeño, cada mes, vale más que uno grande una vez." y "No tienes que salvar a todos. Ayudar a uno ya cuenta."); #8 en `/adoptar` (salida digna); #11 como línea final del modal #4 ("Gracias por no mirar a otro lado."); #12 como título de la lista de compras ("Esto es lo que hicimos con lo que llegó").
- **Añadido por la persona:** opción "Aportar cada mes" (chip secundario en el selector de monto, sin descuentos ni presión) porque Yesenia necesita previsibilidad. Texto: "Si puedes, un aporte pequeño cada mes le da certeza de la comida." Canal recurrente: por confirmar.
- **Líneas rojas que ya cumple este documento:** sin urgencia falsa, sin animales heridos como gancho, sin culpa, sin héroe de culto (el bloque "Quien lo sostiene" no usa adjetivos de heroísmo; evitar "admirable"), sin comparar refugios, sin exponer vida privada; fotos rotuladas.
- **Ajuste obligatorio para quien implemente:** el bloque "Yesenia" del Home no incluye foto de su rostro hasta que ella autorice (pregunta 3 de la persona). Usar foto de referencia de un patio o plato vacío.
- **Preguntas de la persona que se suman a §9:** necesidad más urgente hoy (comida, veterinario, manos, hogares de paso); horario y forma preferida de recibir WhatsApp; si autoriza hablar de ella por su nombre.

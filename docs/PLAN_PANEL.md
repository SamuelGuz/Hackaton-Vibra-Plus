# Plan de desarrollo — Panel Huellitas (React · PWA)

> Documento de trabajo del equipo. Base: [Huellitas_Requerimientos_VibraPlus.md](Huellitas_Requerimientos_VibraPlus.md).
> El panel **complementa** al bot de WhatsApp/Telegram: el bot captura (voz, foto), el panel **muestra, confirma y corrige**.

---

## 0. Lo que tiene que lograr el panel (en una frase)

**Que cualquier persona del albergue, con guantes, con mala señal y sin saber de tecnología, sepa en 3 segundos qué hace falta hoy y lo registre en 1 toque.**

Si una pantalla no cumple esa frase, se recorta.

---

## 1. Concepto de diseño: "La libreta que no se moja"

Hoy el albergue vive en una **libreta de pasta dura**, fotos en el celular y notas con cinta. En vez de inventar una estética de "app tecnológica", **digitalizamos su propio mundo físico**. Eso hace que el diseño sea original (nadie más lo tiene, sale de la entrevista) y que se sienta conocido para gente desconectada de la tecnología.

| Objeto real del albergue | Cómo aparece en el panel |
|---|---|
| Libreta de papel | Fondo color papel crema con una textura de grano muy suave (no blanco puro) |
| Foto del animal pegada | Tarjeta tipo **foto instantánea** (borde blanco, ligeramente girada ±1,5°) con el nombre escrito grande |
| Cinta de enmascarar con nombres | Etiquetas de estado como **trozo de cinta** ("CUARENTENA", "ADOPTABLE") |
| Sello de goma | Al tocar "Dosis dada" cae un **sello "DADA ✓ 7:12 · Don Luis"** con animación y vibración |
| Bulto de concentrado | El inventario es un **costal ilustrado que se vacía**; el número de días va escrito encima |
| Recibo en el bolsillo | Los movimientos de caja se ven como **papelitos de recibo** con borde dentado |
| Termómetro de la campaña | La deuda por clínica es una **barra-termómetro con la raya roja del límite** |

### Reglas para que se vea 0 % IA
Lo que hoy delata una interfaz hecha por IA (según las guías revisadas): degradados morados/azules, la fuente Inter por defecto, el look por defecto de shadcn/Tailwind, todas las tarjetas con el mismo radio y la misma sombra, emojis como íconos, el borde grueso de color a un lado de la tarjeta y textos vagos tipo "Gestiona tu albergue de forma inteligente". La causa de fondo es **la ausencia de decisiones**.

Por eso:
- ❌ Prohibido: degradados morados, glassmorphism, Inter/Geist, librería de componentes con su tema por defecto, tarjetas con borde lateral de color, emojis como íconos de interfaz, ilustraciones 3D "de plástico", fotos de banco de imágenes, textos genéricos.
- ✅ Obligatorio:
  - Fotos **reales** de perros y gatos criollos (ver la sección 1.1: por ahora no tenemos las de Huellitas).
  - **Íconos dibujados a mano** por nosotros (trazo irregular de marcador, 2–3 px). Sirve de base Phosphor o Tabler, pero redibujado o con un filtro SVG de "trazo tembloroso" (`feTurbulence` + `feDisplacementMap`).
  - Variación **intencional**: la tarjeta principal del día es enorme; las demás, pequeñas. No todo pesa lo mismo.
  - Textos con la voz del equipo, en colombiano y cálidos: "Quedan 3 días de comida de perro. Toca pedir hoy" en vez de "Inventario bajo".
  - Una sola fuente "con personalidad" y aplicada con disciplina.

### 1.1 Fotos: qué hacemos sin las reales de Huellitas
No tenemos fotos del albergue ni del equipo. No usamos imágenes generadas con IA, porque se notan y contradicen el concepto.

- **Animales (para la demo)**: unas 15 fotos **reales** de perros y gatos **criollos**, de bancos gratuitos con licencia libre (Unsplash, Pexels). Deben ser fotos naturales y caseras, no de estudio. Cada una se guarda con su crédito en `public/demo/animales/creditos.md`. Los otros ~55 animales usan la tarjeta "sin foto".
- **Tarjeta "sin foto"**: una silueta de perro o gato **dibujada a mano** (2 dibujos: perro y gato), con un color de fondo fijo por animal y el nombre grande en letra manuscrita. No es un parche: en la vida real los rescates llegan sin foto. Al tocarla aparece **"📷 Tomarle una foto"**.
- **Equipo (pantalla "¿Quién eres?")**: un círculo de color con la **inicial a marcador** y el nombre debajo ("Don Luis · Cuidador"). El día que haya fotos reales, se cambian.
- **Cambio sin tocar código**: todas las imágenes salen de `demo-data.json` (campo `foto`). Si Huellitas manda fotos, se reemplazan los archivos y listo.
- **En el pitch** se dice claramente: "las fotos de la demo son ilustrativas".

### Paleta (colores con significado, no decorativos)
| Token | Uso | Referencia |
|---|---|---|
| `--papel` | Fondo | crema cálido `#F5EFE3` |
| `--tinta` | Texto principal | azul tinta de esfero `#1F2A44` (no negro puro) |
| `--potrero` | Acción principal / "todo bien" | verde pasto `#2F6B3B` |
| `--arcilla` (en código: `--ojo`) | Atención / "revisar" | naranja ladrillo `#A8432C` (se oscureció desde `#C8553D`, que no pasaba el contraste 4,5:1) |
| `--alerta` | Crítico / límite superado | rojo sello `#B3261E` |
| `--cinta` | Etiquetas de estado | beige cinta `#E8D9A8` |
| `--lapiz` | Texto secundario | grafito cálido `#595449` |

Los nombres finales de los tokens están en [panel/src/design/tokens.css](../panel/src/design/tokens.css) (`--bien`, `--ojo`, `--urgente`…).

Los colores del semáforo (🟢🟡🔴) **siempre van con forma y palabra**: ✓ "Bien", ! "Ojo", ✕ "Urgente". Nunca solo color, por el daltonismo y la luz del sol.

**Modo "sol fuerte"**: botón para subir el contraste (fondo blanco, tinta negra, sin textura), pensado para usar el celular a pleno sol en el patio.

### Tipografía
- **Títulos y números grandes**: *Bricolage Grotesque* (con carácter y buena lectura de números).
- **Texto e interfaz**: *Atkinson Hyperlegible Next*, diseñada por el Braille Institute para personas con baja visión. Distingue bien 1/l/I y 0/O, algo clave para montos y dosis.
- **Toques manuscritos** (solo nombres en las fotos y notas en la cinta): *Kalam* o *Caveat*. Máximo un uso por pantalla.
- Tamaños mínimos: texto 18 px, botones 20 px, números clave 48–72 px.

---

## 2. Principios de usabilidad (para gente desconectada de la tecnología)

1. **Una cosa por pantalla.** Cada pantalla responde una sola pregunta ("¿Qué hago hoy?", "¿Cuánta plata hay?"). Es el punto de partida de GOV.UK: empezar con una cosa por página.
2. **Botones gigantes**: mínimo 64 × 64 px (los estudios con adultos mayores muestran que 48 px es el piso y 60 px o más funciona mucho mejor; aquí además hay guantes). Botón principal a lo ancho y en la **mitad inferior** (zona del pulgar).
3. **Ícono + palabra, siempre.** Las investigaciones con usuarios de baja alfabetización digital muestran que los íconos solos se malinterpretan. Nada de botones solo con ícono.
4. **Sin menú hamburguesa, sin gestos escondidos** (nada de deslizar para borrar ni mantener presionado). Todo está a la vista.
5. **Máximo 3–4 pestañas abajo**, distintas según el rol. El cuidador ve solo 2.
6. **Deshacer en vez de "¿Está seguro?"**: el registro es instantáneo y aparece un aviso grande de 6 s con "↩ Deshacer". Ahorra un toque y quita el miedo a equivocarse. *Excepción:* montos de dinero y dosis nuevas, donde se confirma (regla del cliente: "la IA sugiere, el humano confirma").
7. **Respuesta inmediata en 3 canales**: animación (sello o costal), vibración (`navigator.vibrate`) y texto ("Listo, quedó guardado").
8. **Teclado numérico propio y gigante** para montos, con atajos de "+10 mil", "+50 mil", "+100 mil" y separador de miles en vivo ($150.000 se ve así mientras se escribe, para evitar el error 150 mil vs. 1,5 millones).
9. **Nunca un formulario largo**: preguntas en pasos de 1 sola decisión (¿Entró o salió plata? → ¿Cuánto? → ¿Foto? → Listo).
10. **Estado de conexión honesto y tranquilo**: "📶 Sin señal — tus registros se guardan y se envían solos". Jamás un error rojo por falta de internet.
11. **Entrar sin contraseña**: pantalla "¿Quién eres?" con las **fotos de las caras** del equipo + PIN de 4 dígitos opcional para el admin.
12. **Lenguaje**: frases de máximo 8–10 palabras, verbos de acción ("Abrí un bulto", "Ya le di la pastilla"), las mismas palabras que el cuidador usa en sus audios.

---

## 3. Alcance: qué entra en la hackatón

Somos **2 personas programando durante 48 horas**. El cliente valora "una solución pequeña, enfocada y realista". Por eso recortamos fuerte: **es mejor tener 4 pantallas perfectas que 10 a medias.**

| Prioridad | Pantalla / función | Requerimiento | Quién |
|---|---|---|---|
| **P0 — demo sí o sí** | Hoy del cuidador: comida (−1 bulto) + dosis del día (sello) | RF-01, RF-03 | A |
| **P0** | Caja vs. deuda por clínica + registrar movimiento en 4 pasos con foto | RF-02 | B |
| **P0** | Animales por estado + ficha / pasaporte del animal | RF-04, RF-09 | A |
| **P0** | Bandeja "Por confirmar" (lo que el bot entendió → ✅ Confirmar / ✏️ Corregir) | Idea A | B |
| **P0** | Offline: guardar en el celular y sincronizar con Sheets | RNF-02 | B |
| P1 | Alerta diaria de las 6 a. m. por Telegram (Apps Script), que responde "¿cómo nos llegan las alertas?" | Idea B/C | B |
| P1 | Celebración de adopción + contador de vidas (barata y emotiva para el pitch) | Q | A |
| P2 | Solicitudes de adopción 🟢🟡🔴 | RF-05 / G | — se muestra en el pitch como "siguiente paso" |
| ✂️ Fuera | Turnos, diario de transformación, Comunicación, roles de Adopciones | — | Se mencionan en el mapa de la solución, no se programan |

**Roles que se programan: solo 3** (Cuidador, Bienestar, Admin). Bienestar reutiliza las pantallas del cuidador más la ficha, así que casi no cuesta.

**Sobre el bot:** con 2 personas, el bot real con IA (audio → texto) es arriesgado. Plan:
1. El panel tiene la bandeja "Por confirmar" lista y alimentada desde la hoja `PorConfirmar`.
2. Para la demo, esa hoja trae 3–4 ejemplos precargados ("Le di la amoxicilina a Mateo y abrí un bulto").
3. Si a B le sobra tiempo (después de la hora 32), conecta un bot de Telegram con la API gratuita de Gemini que escribe en esa hoja. Si no, se muestra como flujo en el pitch.

---

## 4. Mapa de pantallas por rol

```
¿Quién eres? (fotos de caras)
│
├── CUIDADOR (2 pestañas: Hoy · Animales)
│   ├── Hoy
│   │   ├── Tarjeta gigante "Comida": costal perro + costal gato
│   │   │     "Quedan 4 días" · [ − Abrí un bulto ]  [ + Llegaron bultos ]
│   │   └── "Medicinas de hoy": fotos instantáneas en orden de hora
│   │         Mateo · Amoxicilina 3 ml · 8:00 → [ Ya se la di ] → SELLO
│   └── Animales (solo lectura + avisos de cuidado tipo "No pisos lisos")
│
├── BIENESTAR (3: Hoy · Animales · Por confirmar)
│   ├── Hoy (dosis, vacunas y desparasitaciones próximas)
│   ├── Animales: cintas por estado con conteo
│   │     Cuarentena 3 · Tratamiento 7 · Adoptable 18 · Hogar temporal 4
│   │   └── Ficha / Pasaporte: foto, estado, tratamientos, ⚠ advertencias en rojo
│   └── Por confirmar (lo que mandó el bot)
│
├── ADMIN (4: Plata · Comida · Por confirmar · Más)
│   ├── Plata: número gigante "En caja $1.240.000"
│   │     Termómetro por clínica: Clínica 24 h $2.6 M ████████▌| límite $3 M  ⚠
│   │     [ + Entró plata ]  [ − Salió plata ]
│   │   └── Registrar: ¿Entró/salió? → teclado gigante → ¿Para qué? (5 íconos) → 📷 foto → Listo
│   ├── Comida (igual que el cuidador + historial semanal)
│   └── Por confirmar (capturas de Nequi y facturas leídas por la IA)
│
├── ADOPCIONES (3: Solicitudes · Seguimientos · Animales)
│   └── Solicitudes en 3 montones: 🟢 Para llamar · 🟡 Revisar · 🔴 Descartadas (se pueden rescatar)
│
└── COMUNICACIÓN (2: Lo que falta · Animales para adoptar)
    └── "Lo que falta hoy": 3 bultos de gato · deuda de $X → [ Copiar texto para Instagram ]
```

La pantalla **Hoy** es una sola columna con orden fijo: **lo urgente arriba y grande, lo demás abajo y pequeño, y al final "Lo que se logró hoy"** (para cuidar el ánimo del equipo, según la entrevista).

---

## 5. Arquitectura técnica ($0)

```
[ PWA React ] ──(online)──► [ Google Apps Script Web App ] ──► [ Google Sheets ]
     │                              ▲                                  ▲
 IndexedDB (Dexie)                  │                                  │
 + cola de envíos              [ Bot Telegram/WhatsApp ] ─────────────┘
 (funciona offline)            [ Triggers 6 a. m. → alertas ]
```

| Pieza | Elección | Por qué |
|---|---|---|
| Framework | **React 18 + Vite + TypeScript** | Rápido de levantar, buen build PWA |
| PWA / offline | **vite-plugin-pwa** (Workbox) | Instalable en el celular, cachea la app completa |
| Datos locales | **Dexie (IndexedDB)** + cola `outbox` | Cada registro se guarda primero en el celular |
| Sincronización | `fetch` POST a Apps Script cuando vuelve la señal (`online` event + reintento) | $0. Truco: enviar con `Content-Type: text/plain` para evitar el preflight CORS de Apps Script |
| Estado servidor | **TanStack Query** (con persistencia) | Cache y reintentos sin código extra |
| Rutas | **React Router** | Simple |
| Estilos | **CSS Modules + variables CSS** (tokens propios) | Sin el look por defecto de Tailwind o shadcn; control total |
| Animación | **Motion** (Framer Motion) | Sello, costal que se vacía, celebración |
| Imágenes | Compresión en el celular antes de subir (canvas → WebP ~100 KB) | Pocos datos (RNF-02) |
| Hosting | **GitHub Pages / Cloudflare Pages / Netlify** (plan gratis) | $0, HTTPS (necesario para PWA) |
| Modo demo | Flag `?demo=1` con datos simulados en JSON | Que la demo no dependa del wifi del evento |

### Modelo de datos (una pestaña de Sheets por entidad)
- `Animales`: id, nombre, especie, foto_url, estado, fecha_ingreso, advertencias, padrino
- `Tratamientos`: id, animal_id, medicamento, dosis, frecuencia_h, inicio, fin
- `Dosis`: id, tratamiento_id, fecha_hora, quien, origen (panel | bot)
- `Inventario`: fecha_hora, tipo (perro | gato), cambio (−1 / +N), quien, origen
- `Movimientos`: fecha_hora, tipo (ingreso | gasto), monto, categoria, clinica_id, foto_url, quien, confirmado
- `Clinicas`: id, nombre, deuda_actual, limite
- `PorConfirmar`: id, origen (audio | foto), texto_entendido, propuesta_json, estado
- `Personas`: id, nombre, foto, rol, pin_hash
- `Solicitudes`: id, datos_form, clasificacion, motivo, estado

**Cálculo de días de comida** (en el cliente y en Apps Script):
`días = (bultos_en_stock × kg_por_bulto) / consumo_diario_kg` → perro 22–25 kg por bulto entre 16–18 kg/día; gato 8–10 kg por bulto entre 1,5–1,8 kg/día. Alerta si ≤ 4 días.

### Estructura de carpetas
```
panel/
  src/
    app/            rutas, layout por rol, proveedor de sesión
    design/         tokens.css, textura de papel, fuentes, íconos SVG a mano
    components/     Boton, FotoInstantanea, Cinta, Sello, Costal, Termometro,
                    TecladoMonto, AvisoDeshacer, EstadoConexion, PasoAPaso
    features/
      comida/       pantalla + lógica de días restantes
      dosis/        lista del día + sello
      plata/        caja, termómetro, registrar movimiento
      animales/     cintas por estado, ficha/pasaporte
      confirmar/    bandeja de lo que entendió el bot
      adopciones/   (P1)
    data/           dexie.ts, outbox.ts, api.ts (Apps Script), demo-data.json
    lib/            formato de pesos COP, fechas, vibración
  apps-script/      Code.gs (doGet/doPost, triggers de alertas)
```

---

## 6. Sistema de componentes (construir primero, antes de pantallas)

| Componente | Detalle clave |
|---|---|
| `Boton` | 3 tamaños (máximo 72 px de alto); siempre ícono + texto; estado presionado que "se hunde" 2 px (sensación táctil) |
| `FotoInstantanea` | Foto del animal, borde blanco, rotación ±1,5° fija por id (no aleatoria en cada render), nombre en manuscrita |
| `Cinta` | Etiqueta de estado con bordes irregulares (SVG `clip-path`) |
| `Sello` | Animación: escala 1,6 → 1 con rebote, rotación −8°, vibración de 40 ms y textura de tinta |
| `Costal` | SVG de un costal cuyo relleno baja según los días; color según el semáforo |
| `Termometro` | Barra horizontal con raya de límite; texto "Te faltan $400.000 para el límite" |
| `TecladoMonto` | Teclas de 72 px, formato COP en vivo, atajos de montos frecuentes |
| `AvisoDeshacer` | Aviso abajo, grande, 6 s, con "↩ Deshacer" |
| `EstadoConexion` | Píldora arriba: "Todo enviado ✓" / "3 registros esperando señal" |
| `PasoAPaso` | Flujo de una pregunta por pantalla, con barra de progreso tipo puntos y "← Atrás" visible |

Cada componente se prueba en un celular real de gama baja (o con Chrome DevTools: CPU ×4 más lento y red "Slow 3G").

---

## 7. Cronograma de 48 horas (2 personas)

- **A — Diseño y pantallas**: tokens, íconos, componentes, animaciones, pantallas Cuidador y Animales.
- **B — Datos y flujos**: Dexie/offline, Apps Script + Sheets, pantallas Plata y Por confirmar, alerta de Telegram.

| Horas | Persona A | Persona B | Entregable al final del bloque |
|---|---|---|---|
| **0–3** | Juntos: crear proyecto, PWA, `tokens.css`, fuentes, `demo-data.json`, buscar y descargar fotos (sección 1.1) | ← | La app abre en el celular con la textura de papel |
| **3–10** | Componentes: Boton, FotoInstantanea, Cinta, Sello, Costal + íconos a mano | Dexie + outbox, `api.ts`, Apps Script `doGet`/`doPost`, crear la hoja de Sheets | Página `/kit` y registro que llega a Sheets |
| **10–11** | Juntos: **revisión anti-IA** (sección 9) del `/kit` | ← | Estilo aprobado y congelado |
| **11–19** | Pantalla **Hoy del cuidador** (comida + dosis + deshacer) | Componentes Termometro y TecladoMonto + pantalla **Plata** (caja, termómetros, registrar en 4 pasos, foto comprimida) | 2 flujos P0 funcionando con datos demo |
| **19–26** | 😴 Dormir (turnos escalonados: A de 19 a 25, B de 20 a 26) | ← | — |
| **26–33** | **Animales**: cintas por estado + ficha / pasaporte + cambiar estado + "¿Quién eres?" | **Por confirmar** + conectar todas las pantallas a Sheets + EstadoConexion | **Todo el P0 completo** ✅ |
| **33–38** | P1: celebración de adopción + contador de vidas; modo "sol fuerte" | P1: alerta 6 a. m. por Telegram; si sobra, el bot con IA | P1 hecho o descartado (sin culpa) |
| **38–42** | Juntos: pruebas de la sección 8 (abuela, guantes, sol, modo avión) y arreglos | ← | Lista de bugs en cero o aceptados |
| **42** | 🧊 **Congelar el código.** Desde aquí no se agregan funciones, solo se arreglan errores | ← | — |
| **42–46** | Guion de demo, instalar en 2 celulares, grabar un video de respaldo de la demo | Mapa de la solución (quién usa qué, cómo se mantiene a $0) y apoyo al pitch | Demo ensayada 3 veces |
| **46–48** | Colchón para imprevistos y descanso antes de presentar | ← | — |

**Reglas para no quemarse:**
- Si un bloque se atrasa más de 2 h, se corta su P1 y no se roba sueño.
- `master` siempre debe funcionar: cada uno trabaja en su rama y se une al terminar cada bloque.
- Desplegar a Cloudflare Pages o Netlify **desde la hora 3** y en cada unión, no al final.

---

### Detalle de tareas por fase (lista de chequeo)

### Fase 0 — Base (≈2 h)
- [ ] `npm create vite@latest panel -- --template react-ts`, ESLint y Prettier
- [ ] vite-plugin-pwa (manifest, íconos, `display: standalone`, color de tema `--papel`)
- [ ] `tokens.css` (colores, espaciados, radios, tipografía), fuentes locales (no depender de Google Fonts sin señal)
- [ ] Textura de papel (SVG de ruido en línea, menos de 2 KB)
- [ ] `demo-data.json` con los 70 animales simulados (nombres y casos reales: Mateo, Bruno) y las 2 clínicas

### Fase 1 — Componentes (≈3–4 h)
- [ ] Los 10 componentes de la sección 6, en una página `/kit` para revisarlos juntos
- [ ] Juego de íconos a mano (comida, medicina, plata, animal, cámara, deshacer, señal)
- [ ] **Revisión anti-IA** (checklist de la sección 9) antes de seguir

### Fase 2 — Cuidador "Hoy" (≈3 h) · P0
- [ ] Entrar con foto de cara → rol
- [ ] Tarjeta de comida con costales y −1 / +N, más el aviso de deshacer
- [ ] Lista de dosis del día con sello; registra la hora y quién
- [ ] Prueba: **registrar un bulto en menos de 5 s con guantes**

### Fase 3 — Admin "Plata" (≈3 h) · P0
- [ ] Número de caja + termómetros por clínica con límite
- [ ] Flujo de 4 pasos: entró/salió → monto → categoría (5 íconos) → foto opcional
- [ ] Compresión de la foto en el celular
- [ ] Prueba: **registrar un gasto en menos de 15 s**

### Fase 4 — Animales y pasaporte (≈2–3 h) · P0
- [ ] Cintas por estado con conteo; filtrar tocando la cinta
- [ ] Ficha / pasaporte: advertencias en rojo arriba (caso Bruno), tratamientos y botón "Cambiar estado" (lista de 6 opciones grandes)

### Fase 5 — Offline + Sheets (≈3 h) · P0
- [ ] Dexie + outbox; `EstadoConexion`
- [ ] Apps Script: `doPost` (registrar) y `doGet` (leer todo en un JSON liviano)
- [ ] Sincronizar al volver la señal; resolver conflictos con "gana el último + se guarda el historial"
- [ ] Prueba: modo avión → registrar 5 cosas → activar la señal → ver la hoja actualizada

### Fase 6 — Bandeja "Por confirmar" (≈2 h) · P0
- [ ] Tarjeta: "Entendí: *Mateo · Amoxicilina 3 ml*" con el audio o la foto original → [✅ Confirmar] [✏️ Corregir]
- [ ] Montos y dosis resaltados en grande para revisarlos (los errores 30 ml vs. 3 ml son el miedo número 1 del cliente)

### Fase 7 — P1 si hay tiempo (horas 33–38)
- [ ] (A) Celebración de adopción: confeti de huellitas una sola vez, con contador de vidas real
- [ ] (B) Apps Script con trigger a las 6 a. m. → mensaje a un grupo de Telegram: "Quedan 3 días de comida de perro · Mateo: antibiótico 8:00"
- [ ] (B, opcional) Bot de Telegram + Gemini que escribe en `PorConfirmar`

### Fase 8 — Pulido y demo (≈2 h)
- [ ] Modo "sol fuerte", revisión de contraste (WCAG AA mínimo, AAA en los números clave)
- [ ] Lighthouse PWA/Accesibilidad en verde
- [ ] Guion de la demo con `?demo=1`, instalada en un celular real

> La Fase 7 original (adopciones 🟢🟡🔴 y "Lo que hace falta hoy") queda fuera para 2 personas; ver la sección 3.

---

## 8. Cómo probamos que es intuitivo (no suponerlo)

1. **Prueba de la abuela**: dar el celular a alguien mayor o poco digital, sin explicar nada. Tareas: "Abriste un bulto de perro, anótalo" y "Ya le diste la pastilla a Mateo". Medir el tiempo y dónde duda. Meta: hacerlo sin ayuda.
2. **Prueba con guantes** (de cocina o de jardinería) y con el celular mojado.
3. **Prueba de 3 segundos**: mostrar "Hoy" 3 s, esconderla y preguntar "¿Qué hace falta?". Debe recordar lo urgente.
4. **Prueba al sol**: usarla afuera a mediodía.
5. **Prueba de red mala**: DevTools en "Slow 3G" y luego en modo avión.

---

## 9. Checklist anti-IA (revisar en cada pantalla)

- [ ] ¿Hay algún degradado morado/azul, glassmorphism o brillo "neón"? → quitar
- [ ] ¿Se usa Inter, Geist o la fuente del sistema como protagonista? → cambiar
- [ ] ¿Todas las tarjetas tienen el mismo tamaño, radio y sombra? → crear jerarquía
- [ ] ¿Algún emoji hace de ícono de interfaz? → reemplazar por el ícono dibujado (los 🟢🟡🔴 solo como apoyo del texto)
- [ ] ¿Hay tarjetas con un borde de color solo a un lado? → quitar
- [ ] ¿Las fotos son reales de Huellitas? → si no, conseguirlas
- [ ] ¿El texto suena a la fundadora hablando por WhatsApp? Si suena a folleto corporativo → reescribir
- [ ] ¿Las animaciones tienen un significado (sello = hecho, costal = comida)? Si es un "fade" decorativo → quitar
- [ ] ¿Hay algún detalle "imperfecto" hecho a mano (trazo, cinta, rotación)? → al menos uno por pantalla, sin exagerar

---

## 10. Referencias usadas

- Señales de diseño hecho con IA y cómo corregirlas: [925studios — AI Slop Web Design](https://www.925studios.co/blog/ai-slop-web-design-guide), [saasui.design](https://www.saasui.design/blog/saas-ui-looks-ai-generated), [noqta.tn](https://noqta.tn/blog/ai-design-slop-overused-ui-patterns-fix-2026), [Kosta Canatselis — Spot the slop](https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c)
- Tendencia táctil y hecha a mano como contrapeso a la IA: [Creative Bloq — Texture, warmth and tactile rebellion](https://creativebloq.com/design/graphic-design/texture-warmth-and-tactile-rebellion-the-big-graphic-design-trends-for-2026), [daisyUI — Hand-drawn UI](https://trends.daisyui.com/trend/hand-drawn-ui/), [Hand-Drawn Illustration in the AI Era](https://getillustrations.com/blog/hand-drawn-illustration-ai-era-2026/)
- Usuarios con baja alfabetización digital: [Making Sense — app inclusiva para agricultores](https://makingsense.com/blog/post/inclusive-design-app-case-study-for-farmers-in-emerging-markets), [Dimagi — Designing for Low-Literate Users](https://dimagi.atlassian.net/wiki/x/-jPKfw), [Microsoft Research — UI for low-literate and novice users](https://www.microsoft.com/en-us/research/?p=167992)
- Tamaño de los botones para adultos mayores: [UMBC — older adults and mobile interfaces](https://mdsoar.org/handle/11603/19868), [Maynooth — Target spacing study](https://mural.maynoothuniversity.ie/6045/1/PS-Target-Spacing.pdf), [Glance — designing apps for elderly people](https://thisisglance.com/learning-centre/how-do-i-design-apps-for-elderly-people)
- Una cosa por pantalla y lenguaje claro: [GOV.UK Government Design Principles](https://gov.uk/guidance/government-design-principles), [Gov.Wales — writing user interfaces](https://www.gov.wales/writing-user-interfaces)

# Backend `bot/` + panel de adopción (Monoga)

Parte de Monoga, decidida por él el 2026-10-27: **Backend + adopción** (ver L2). Rama `MONOGA`. Se construye el servidor que consume `origin/samuel/conectar` y el panel de adopción de PLAN_INTEGRADO §5.
Fuentes: `docs/PLAN_INTEGRADO.md` (manda), `docs/placa-viva/plan.md`, `docs/placa-viva/diseno.md`, `docs/PLAN_PANEL.md`, `docs/Huellitas_Requerimientos_VibraPlus.md`. En lo técnico manda el código (`panel/src/data/api.ts`, `panel/src/data/tipos.ts`).

Lectura obligatoria para cada worker: este documento completo hasta `## Log`, y la sección de la fuente que cita su S#. **La fuente citada es el texto exacto que hay que cumplir**; las comillas de abajo son copias literales.

## Specs

### Reglas del pedido (L1)

- **S1** Lenguaje y calidad: "Todo en TypeScript estricto: nada de .js nuevos, nada de `any` sin justificar, tipos compartidos entre panel y backend."
- **S2** Tests primero: "Primero los tests: RED, después GREEN. Cada tarea cierra con `npm test` y `npm run build` en verde dentro de panel/ (y el equivalente en cualquier paquete nuevo)."

### Arquitectura vigente

- **S3** docs/README.md: "**En lo técnico manda el código.** El servidor se está construyendo en `bot/` (Node con Hono) y `db/` (Postgres en un VPS, con copia a Google Sheets). Los planes todavía hablan de Cloudflare Worker con KV." y plan.md: "Lo funcional (placa, ficha, audios, cierre del día) sigue valiendo; en lo técnico manda el código."
- **S4** Contrato `/api/*` (PLAN_INTEGRADO §3.1, copia literal de la tabla y los detalles):
  - "Todas exigen la cookie de sesión de equipo (`verificarSesion`, Task 16a) y responden JSON. Sin cookie: `401`."
  - "`GET /api/hoy` | `{ animales, tratamientos, dosisProgramadas, eventosHoy, entidades, catalogo, config, yo }`, todo en un JSON de menos de 60 KB comprimido"
  - "`GET /api/eventos?desde&hasta&tipo` | Eventos de un rango (plata y comida de la semana)"
  - "`POST /api/eventos` | Recibe `Evento[]` creados en el panel y responde con los ids guardados"
  - "`POST /api/eventos/estado` | `{ ids, estado }`: confirmar, corregir o anular. Reutiliza `cambiarEstado`"
  - "`GET /api/adopciones/solicitudes` | Solicitudes con su clasificación sugerida"
  - "`POST /api/adopciones/solicitudes/:id` | Cambia de montón (🟢/🟡/🔴), agrega una nota o agenda la llamada"
  - "`GET /api/adopciones/seguimientos` | Seguimientos pendientes (días 2/5/15/30/90)"
  - "Las rutas son finas: llaman al mismo `Repo` y a los mismos módulos de `domain/` que la ficha. No se duplica lógica."
  - "**Sin señal:** el panel guarda los eventos en IndexedDB con `id` generado en el celular (uuid) y los reenvía al volver la señal. El Worker ignora un `id` repetido (es idempotente, igual que con los webhooks de Meta)."
- **S5** Contrato del código (manda sobre S4 en la forma, ver D3): `panel/src/data/api.ts` hace `Authorization: Bearer <token>` desde `?t=<token>`; `GET /api/hoy` → `DatosServidor = DatosAlbergue & { yo: string }`; `POST /api/eventos` con `{ eventos: (Propuesta & { id: string })[] }` y lee `{ errores?: { error: string }[] }`; `POST /api/eventos/estado` con `{ ids, estado: 'confirmado' | 'corregido' | 'anulado' }`; un 401 con `{ error: 'Falta iniciar sesión' }` hace que el panel pida enlace nuevo (`panel/src/data/servidor.test.tsx`). `.env.example`: `VITE_API_URL=http://localhost:8787`.
- **S6** Regla de confirmación (PLAN_INTEGRADO §3.3, literal):
  - "Lo que **una persona toca en el panel** (−1 bulto, "Ya se la di", un gasto que digitó ella misma) nace **`confirmado`** con su `agenteId`. Fue una decisión humana directa y además tiene "Deshacer" (que en el servidor es `anulado`)."
  - "Lo que viene de **audio, foto o IA** nace **`por_confirmar`**, como dice placa viva. En el panel aparece en la bandeja con ✅ Confirmar / ✏️ Corregir."
  - "**Dosis duplicadas:** si una dosis programada ya tiene un evento (en cualquier estado), el botón del panel no dice "Ya se la di": dice *"Reportada a las 2:01 PM por Andrea"*, con un botón para confirmarla. Así el panel respeta la misma regla que el bot (Task 14)."
- **S7** Umbrales (PLAN_INTEGRADO §2, literal): "**Verde < 60 % · amarillo hasta 85 % · rojo > 85 %**" · "**Alerta a ≤ 4 días** (el panel muestra "ojo" a ≤ 6 y "urgente" a ≤ 4)" · "**Catálogo**: perro 25 kg/bulto y 0,375 kg/animal/día; gato 10 kg/bulto y 0,065 kg/animal/día" · "**La semilla de placa viva** (Task 17): Tobías `TOB01`, Mateo, Bruno, Luna, Manchas…" · "**Sin atribución a herramientas de IA**".
- **S8** Restricciones globales de placa viva: `docs/placa-viva/plan.md` § "Global Constraints", completa y literal, incluidos los "Textos fijos (copiar exactos)":
  - `Tranquilos: los {n} comieron hoy y ninguno se quedó sin su medicina.`
  - `Un voluntario reportó la dosis a las {hora}`
  - `{nombre} dijo: "{frase}" – {hora}, sin confirmar`
  - `Ojo: esta dosis ya fue reportada a las {hora}. ¿Es una dosis distinta?`
  - `No pude leer el monto, ¿me lo dices?`
  - `Registro {CODIGO} ({Nombre}): `
  - `Soy {Nombre}, del albergue Huellitas`
  - y: "La vista pública nunca muestra nombres ni teléfonos del equipo." · "A Gemini nunca se envían teléfonos, cédulas, direcciones ni emails (`quitarDatosSensibles` antes de cada llamada con texto)." · "Zona horaria America/Bogota (UTC−05:00, sin horario de verano). Horas al usuario en formato `2:01 PM`." · "Dinero en COP, entero."
- **S9** Review Focus 1–5 de `docs/placa-viva/plan.md` § "Review Focus", literal (audio sin código, doble reporte, frase en futuro, webhook repetido, Sheets 429).
- **S10** Permisos: requerimientos §2: el cuidador "NO debe ver" "Finanzas, adoptantes"; bienestar "Finanzas, adoptantes"; coordinación de adopciones "Finanzas". PLAN_INTEGRADO §5: "Solo el rol `adopciones` y `admin` ve esta sección." diseno §12.3: "Los voluntarios no confirman pendientes ajenos."

### Backend por tarea de placa viva (texto exacto en `docs/placa-viva/plan.md`, sección de la Task)

Cada S# exige **todos** los tests y comportamientos listados en su Task, con los mismos valores y textos, adaptados solo como dicen D1–D12.

- **S11** Task 1 (contratos, `hora.ts`, repo en memoria, `semilla-mini`). Tests literales: "`horaCorta('14:01') === '2:01 PM'`, `horaCorta('00:05') === '12:05 AM'`, y `ahoraBogota(new Date('2026-10-28T03:30:00Z')).fecha === '2026-10-27'`."
- **S12** Task 2 (dosis del día y `asignarCompromiso`).
- **S13** Task 3 (reglas por confirmar, futuro, duplicados, `autoconfirmables`).
- **S14** Task 4 (ficha de HOY pública y de equipo). Literal: "`texto === 'Andrea dijo: "ya le di el anticonvulsivo" – 2:01 PM, sin confirmar'`" y "`texto === 'Un voluntario reportó la dosis a las 2:01 PM'`".
- **S15** Task 5 (cierre del día). Literal: "`Tranquilos: los 4 comieron hoy y ninguno se quedó sin su medicina.`", "`'Luna no consta que haya comido'`", "`'Tobías: dosis de las 2:00 PM pendiente'`", "`linea === 'Tobías – anticonvulsivo – 2:01 PM – Andrea'`".
- **S16** Task 6 (días de comida y deuda). Literal: "3 bultos de 25 kg y 45 perros a 0,375 kg/día → `4.4`." y "deuda 2.500.000, `pct 83`, `amarillo`".
- **S17** Task 7 (hechos del padrino). Literal: "`'Recibió sus 14 dosis a tiempo'`".
- **S18** Task 8 (webhook firmado, parseo, idempotencia).
- **S19** Task 9 (cliente WhatsApp, ventana 24 h, contexto 10 min). Literal: "`enviarBotones` con 4 botones lanza `Error('max 3 botones')`."
- **S20** Task 10a (token de servicio Google, `SheetsClient`, mappers).
- **S21** Task 10b (repo durable con reintentos a Sheets), en la forma de D5.
- **S22** Task 11a (Gemini JSON y `quitarDatosSensibles`). Literal: "`quitarDatosSensibles('llámame al 3001234567, CC 1098765432, ana@x.co')` no contiene ninguno de los tres datos y los reemplaza con `[tel]`, `[doc]` y `[email]`." y "`'IA: respuesta no es JSON'`".
- **S23** Task 11b (extractor, comprobante, redactor de diario).
- **S24** Task 13 (registro por audio). Literales: "`Listo, te escucho: cuéntame qué le hiciste a {Nombre}.`", "`¿De qué animal hablas?`", "`Anotado. Cuando se la des, mándame otro audio.`"
- **S25** Task 14 (confirmar, corregir, duplicados, "Todo bien"). Literales: "`Solo cuidador, bienestar o administración pueden cerrar el día.`", "`Dime cómo es correcto (audio o texto).`", "`Ojo: esta dosis ya fue reportada a las 2:01 PM. ¿Es una dosis distinta?`", "`segunda dosis reportada`".
- **S26** Task 15 (página de la ficha < 30 KB, sin `<script>`).
- **S27** Task 16a (sesión firmada, token de un solo uso).
- **S28** Task 16b (alta de voluntarios). Literales: "`¡Hola! ¿Cómo te llamas?`", "`Gracias, {Nombre}. Abre este enlace una vez para quedar conectado: {baseUrl}/e/{token}`", cookie "`hk` (HttpOnly, Secure, SameSite=Lax, 180 días)".
- **S29** Task 17 (hojas y semilla de 70 animales).
- **S30** Task 19 (comandos). Literales: "`🟡 Clínica X: $2.500.000 de $3.000.000 (83 %)`", "`Esa información la ve administración.`"
- **S31** Task 20 (dinero por foto). Literales: "`No pude leer el monto, ¿me lo dices?`", "`⚠️ Monto inusual, revisa.`"
- **S32** Task 21 (diario de padrinos).
- **S33** Task 22 (crons: cierre, alertas, autoconfirmación, resumen), en la forma de D6.
- **S34** Task 23 (router: `/wa`, `/p/:codigo`, `/e/:token`, `/salud`), en la forma de D1.
- **S35** Task 24, solo la parte "**Escenario completo** sobre el worker con `MemoryRepo`, WhatsApp falso y una IA falsa determinista" (pasos 1–5).
- **S36** Task 25, la parte de código y guía: "`npm run qr` genera `placas.svg`: una cuadrícula A4 con QR + nombre + código por animal, con el enlace `{baseUrl}/p/{codigo}`. Test: hay 70 QR y cada uno decodifica a su URL (decodificador en el test)." más la variante de tarjeta de canil 10×15 cm y `docs/operacion/escribir-placas.md`.
- **S37** Task 18 (banco de evals `evals/` para promptfoo con los 20 casos de texto).

### Panel de adopción (PLAN_INTEGRADO §5, literal)

- **S38** "**Regla de oro de placa viva:** el sistema **jamás decide** una adopción. La clasificación es una **sugerencia**, nada se descarta para siempre y no se envía ningún mensaje automático al adoptante."
- **S39** Reglas de clasificación, literal: "🔴 si dice que es un **regalo o para un tercero**; si lo quiere como **perro de guardia, amarrado o en azotea**; si **no acepta esterilizar o vacunar**; o si **no acepta el seguimiento**." · "🟡 si hay **señales de devolución**: prisa por la entrega inmediata, respuestas evasivas sobre el plan de emergencia, o no pregunta por el carácter ni la rutina." · "🟢 si nada de lo anterior aplica y dice que **toda la familia está de acuerdo**." · "(funciones puras, sin IA; Daniel las prueba con casos)"
- **S40** Pantallas P0, literal: "**Solicitudes en 3 montones**: 🟢 Para llamar · 🟡 Revisar · 🔴 Descartadas (se pueden rescatar) | Orden por calidad, no por llegada (hoy se pierden buenos candidatos entre 20–30 formularios diarios). Cada tarjeta dice **por qué** quedó ahí, en una frase: "Dice que es un regalo para su mamá"" · "**Detalle de la solicitud** | Respuestas clave arriba (familia de acuerdo, vivienda y mallas, plan de emergencia, mascotas anteriores). Botones grandes: "📞 Llamar", "Mover a 🟢/🟡/🔴"" · "**Pasaporte de entrega** | Generado desde la ficha del animal, con **advertencias en rojo arriba** (Bruno: "NO pisos lisos"), rutina, comida y carácter. Botón "Enviar por WhatsApp" con el texto armado (enlace `wa.me`, sin API). Así no se repite el papel con tachones"
- **S41** P1, literal: "**Seguimientos**: lista de "Hoy toca llamar a…" (días 2/5/15/30/90) | Cada uno con 🟢🟡🔴 tras la llamada. 🟡/🔴 → **llamada humana obligatoria** (regla del cliente)"
- **S42** Datos y privacidad, literal: "Mientras no exista `/api/adopciones/*`, Daniel trabaja con un `demo-solicitudes.ts` de unas 25 solicitudes realistas: unas 8 🟢, 9 🟡 y 8 🔴." · "**Privacidad:** las solicitudes traen cédula y dirección. **No pasan por Gemini** (el plan gratis usa los datos para entrenar)." · Reglas para no pisarse: "Daniel solo crea archivos dentro de `features/adopciones/`. Lo único que toca fuera es **una línea de ruta** en `app/App.tsx`." y el comentario de `panel/src/app/pestanas.ts`: "El panel de adopción (Daniel) agrega aquí su pestaña de solicitudes". Pestañas de PLAN_PANEL §4: "ADOPCIONES (3: Solicitudes · Seguimientos · Animales)".
- **S43** Diseño del panel: PLAN_PANEL §1 (reglas "0 % IA"), §2 (principios de usabilidad: "Botones gigantes: mínimo 64 × 64 px", "Ícono + palabra, siempre.", "Sin menú hamburguesa, sin gestos escondidos") y §9 (checklist anti-IA), con los componentes existentes de `panel/src/components/` (no se crean copias).

## Tasks

Formato: `ID | S# | ruta | estado | commit`. Ruta = quién la hace. Ola = puede correr en paralelo con las de su ola.

### Ola 0 — base (en serie)
- T0 | L1 Paso 0 | inline | hecha (skills en `~/.agents/skills`, fuera del repo) | —
- T1 | S5 | inline | hecha: merge de `origin/samuel/conectar` | 80207ad
- T2 | S1 S2 S3 S5 S11 + D1–D4 D7 D13 | worker + arreglos inline tras verify | hecha (shared 12, bot 27, panel 68 tests; 6 builds OK): `shared/` (tipos compartidos movidos desde `panel/src/data/tipos.ts` + `api.ts` + `registro.ts` + `domain/hora.ts`), scaffold `bot/` (deps, `Env`, `Repo`, `Kv`, `Deps`, `MemoryRepo`, `MemoryKv`, `semilla-mini`), `db/` mínimo, y `panel/src/data/tipos.ts` reexportando `shared` | 66bb095, 8b8dadb

### Ola 1 — piezas puras (paralelo, consumen T2)
- T3 | S12 S13 S14 S15 | worker | hecha: `shared/src/domain/{dosis,reglas,ficha,cierre}` | c1770c6
- T4 | S16 S17 | worker | hecha: `shared/src/domain/{comida,deuda,padrino}` | e10d30d
- T5 | S18 S19 S9(4) | worker | hecha: `bot/src/wa/**` | 5f4069e
- T6 | S20 S29 S7 | worker | hecha: `bot/src/store/{google-auth,sheets,mappers,hojas,semilla}`, `bot/scripts/{seed,crear-hojas}` (incluye T10: los mappers usan los headers `HOJAS` de la Task 17) | 5f12445
- T7 | S22 S8 | worker | hecha: `bot/src/ia/{gemini,schemas,redact}` | bcf442b
- T8 | S26 S27 | worker | hecha: `bot/src/web/{html,ficha-page,session}` | fa3d97e
- T9 | S21 S4 + D5 | worker | hecha: `bot/src/store/{sql,pg-repo,pg-kv}`, `db/schema.sql`, `db/README.md` (Postgres probado con PGlite) | 1aa5e81
- T10 | S29 S7 | — | unida a T6 (dependencia de `HOJAS`) | —
- T11 | S38 S39 S42 | worker | hecha: `shared/src/adopcion/**` (clasificación pura, tipos `Solicitud`/`Seguimiento`) + `panel/src/features/adopciones/demo-solicitudes.ts` | 4c44450

### Ola 2 — flujos (paralelo, consumen Ola 1)
- T12 | S23 S8 | worker | pendiente: `bot/src/ia/{extractor,comprobante,redactor}` | —
- T13 | S24 S25 S9(1,2,3) | worker | pendiente: `bot/src/flujos/{registro,confirmar}` | —
- T14 | S28 S30 | worker | pendiente: `bot/src/flujos/{equipo,comandos}`, `bot/src/web/equipo-link` | —
- T15 | S31 | worker | pendiente: `bot/src/flujos/dinero` | —
- T16 | S4 S5 S6 S10 + D3 D8 D9 | worker | pendiente: `bot/src/api/panel.ts` + `shared/src/domain/proyeccion.ts` (bitácora → `DatosAlbergue`) | —
- T17 | S40 S42 S43 S38 | worker | pendiente: pantallas de adopción (3 montones, detalle, pasaporte) en `panel/src/features/adopciones/**`, una línea en `App.tsx` y la pestaña en `pestanas.ts` | —
- T18 | S4 S10 S38 S42 | worker | pendiente: `bot/src/api/adopciones.ts` + almacenamiento de solicitudes | —
- T19 | S32 S33 S21 S9(5) + D6 | worker | pendiente: `bot/src/cron/**` | —

### Ola 3 — integración (paralelo salvo donde se indica)
- T20 | S34 S35 S9 + D1 | worker | pendiente: `bot/src/app.ts`, `bot/src/server.ts`, `bot/test/e2e/f1.test.ts` | —
- T21 | S36 | worker | pendiente: `bot/scripts/qr-placas.ts`, `docs/operacion/escribir-placas.md` | —
- T22 | S41 S4 S10 | worker | pendiente: seguimientos y panel de adopción conectado a `/api/adopciones/*` (modo demo y servidor) | —
- T23 | S37 | worker | pendiente: `evals/` (banco de casos; correrlo pide `GEMINI_API_KEY`) | —
- T24 | S3 S5 | worker (después de T20) | pendiente: `bot/README.md`, `docs/operacion/runbook.md`, actualizar `docs/README.md` y `panel/README.md` con cómo correr todo | —

### Cierre
- T25 | todos | gentle-ai-verify | pendiente: revisión final contra los Specs (Task 29 de placa viva) | —

### Bloqueadas por personas, credenciales o hardware (no ejecutables por el agente)
- B1 | plan Task 0 | humano | bloqueada: cuentas de Meta, Google Cloud, Gemini, VPS/Postgres; placas NTAG213, celulares, audios
- B2 | plan Task 24 "Desplegar" y "Verificación real (H18)" | humano | bloqueada: necesita B1
- B3 | plan Task 25 escribir/probar las 6 placas físicas | humano | bloqueada: hardware
- B4 | plan Task 26 (celular viejo, 10 audios reales, latencias) | humano | bloqueada: hardware y B1
- B5 | plan Task 27 (endurecimiento con lo que salga de la 26) | humano + agente | bloqueada: B4
- B6 | plan Task 28 (demo, video, diapositivas, ensayo) | humano | bloqueada: material del equipo
- B7 | diseno §11 (tarifas de WhatsApp, límites de Gemini, NFC con lluvia, Android 3G, 10 audios) | humano | bloqueada: verificación física o con cuentas
- B8 | PLAN_PANEL §9 checklist anti-IA del panel principal | Samuel | no es de Monoga; las pantallas de adopción la cumplen por S43

## Log

- **L1** Pedido original de Monoga (2026-10-27), literal:

  > ## Autorización (ya la tienes, no la vuelvas a pedir)
  > - Trabaja SOLO en la rama MONOGA. Nunca hagas checkout, merge, rebase ni push a master.
  > - Estás autorizado para: crear y editar archivos, instalar dependencias, correr tests y builds, hacer commits en MONOGA y `git push origin MONOGA` al cerrar cada bloque verificado.
  > - Pregúntame SOLO si: (a) una decisión de producto no está en los docs y cambia el resultado, (b) algo es destructivo o irreversible, o (c) necesitas credenciales o dinero. En cualquier otro caso decide tú, deja la decisión anotada en el Log del documento ODD y sigue.
  >
  > ## Paso 0 — Herramientas (antes de tocar código)
  > 1. Instala la skill find-skills: https://github.com/vercel-labs/skills/tree/main/skills/find-skills (por ejemplo con `npx skills add vercel-labs/skills --skill find-skills`, o en la carpeta de skills que Pi lea). Comprueba que Pi la ve.
  > 2. Instala la colección de skills "superpowers" (github.com/obra/superpowers) de forma que Pi la cargue, y comprueba que aparece. Úsala para montar el trabajo: planes, TDD, subagentes y verificación antes de dar algo por terminado. Si superpowers choca con ODD, manda ODD: superpowers ayuda, no reemplaza el flujo.
  > 3. Usa find-skills para buscar cualquier skill que haga falta según el stack (React 19, Vite, Vitest, PWA, Dexie, Cloudflare Workers si aplica). Instala solo las que vayas a usar.
  >
  > ## Paso 1 — Entender el proyecto y los pendientes
  > - Lee README.md, docs/README.md, docs/PLAN_INTEGRADO.md, docs/PLAN_PANEL.md, docs/placa-viva/plan.md, docs/placa-viva/diseno.md y docs/Huellitas_Requerimientos_VibraPlus.md.
  > - Busca cualquier handoff o lista de pendientes que me toque a mí (Monoga) en MONOGA: archivos, commits recientes (`git log`) y el merge de origin/samuel/kit. Si no hay un handoff explícito, los pendientes son las casillas `- [ ]` de esos planes.
  > - Revisa el estado real del código en panel/ contra los planes: marca lo que ya está hecho aunque la casilla siga sin marcar, y lo que está marcado pero no funciona.
  > - Crea el documento ODD de la feature (odd/tasks/<nombre>.md) con Specs que citen los planes textualmente y Tasks agrupadas por fase y por dependencias. Dime en una línea cuántas tareas tiene.
  >
  > ## Paso 2 — Ejecutar en paralelo
  > - Agrupa en olas las tareas que no dependan entre sí y lanza un subagente worker por tarea independiente, en paralelo. Pásales el documento por referencia (archivo, tarea, S#), nunca resumido.
  > - Todo en TypeScript estricto: nada de .js nuevos, nada de `any` sin justificar, tipos compartidos entre panel y backend.
  > - Primero los tests: RED, después GREEN. Cada tarea cierra con `npm test` y `npm run build` en verde dentro de panel/ (y el equivalente en cualquier paquete nuevo).
  > - Al terminar cada ola: un subagente verify revisa contra los Specs, corriges lo que encuentre, haces commits en bloques de ~400 líneas con mensajes Conventional Commits y push a MONOGA.
  > - Si una tarea se bloquea, anótala en el Log con la causa y sigue con la siguiente ola. No te detengas por una sola tarea.
  >
  > ## Paso 3 — Cierre
  > Termina cuando no queden pendientes ejecutables. Entrégame:
  > 1. Tabla: tarea | estado (hecha / bloqueada / pendiente de decisión) | commit.
  > 2. Las decisiones que tomaste solo.
  > 3. Las preguntas que de verdad necesitan mi respuesta.
  > 4. Cómo correr y probar lo que se construyó.
  >
  > Arranca ya con el Paso 0.

- **L2** Pregunta: "¿Cuál es la parte de Monoga?" Respuesta de Monoga, literal: "Backend + adopción".
- **L3** Evidencia del Paso 1 (2026-10-27):
  - "Monoga" no aparece en ningún archivo, commit ni rama. No hay handoff. PLAN_INTEGRADO §4: backend "Pendiente de decidir".
  - `bot/` y `db/` no existen en ninguna rama remota (`origin/master`, `MONOGA`, `samuel/kit`, `samuel/conectar`).
  - El panel principal P0 está hecho: kit, Hoy, Plata, Comida, Animales y ficha, Por confirmar. `samuel/conectar` (d5f1dc7) agrega la conexión con `/api/*`, la cola offline (Dexie) y el modo demo. Línea base en MONOGA antes del merge: `npm test` 58/58 y `npm run build` OK.
  - PLAN_PANEL §7 dice "Falta conectar a `/api/hoy`, la cola sin señal": eso ya está hecho en `samuel/conectar` (casilla vencida). Siguen faltando la celebración de adopción (P1, de Samuel) y las pruebas de §8 (humanas).
  - Casillas: plan.md 90 (todas backend, arquitectura Cloudflare vieja), PLAN_PANEL §9 son 9 (checklist anti-IA de Samuel), diseno §11 son 5 (pruebas físicas o con cuentas).
  - Skills: `find-skills`, las 15 de `obra/superpowers`, `vercel-react-best-practices`, `antfu/vitest` y `antfu/vite` en `~/.agents/skills`. El cargador de Pi (`loadSkillsFromDir`) las lee sin diagnósticos. Descartadas: Dexie (82 instalaciones), PWA (fuentes de baja calidad), Cloudflare Workers (el backend ya no es un Worker). Engram no está disponible en esta sesión: no hay espejo de este documento en memoria.
- **L4** Decisiones del agente (pedido L1: "decide tú, deja la decisión anotada"):
  - **D1** Servidor Node 22 + Hono (`@hono/node-server`), TypeScript estricto, ejecutado con `tsx` (sin `.js` propios). `npm run build` en `bot/` y `shared/` = `tsc --noEmit`. Lo que en placa viva era `ctx.waitUntil` es una promesa sin `await` que registra errores, y el 200 al webhook sale antes.
  - **D2** Tipos compartidos en un paquete nuevo `shared/` (fuentes `.ts`, sin build). Panel y bot lo importan con el alias `@huellitas/shared/*` → `../shared/src/*` (tsconfig `paths`, alias de Vite/Vitest, `server.fs.allow` en Vite). `panel/src/data/tipos.ts` pasa a reexportarlo, como pide PLAN_INTEGRADO §3.2.
  - **D3** El modelo es el del panel (`DatosAlbergue`, `Propuesta`), porque el código de Samuel ya lo consume (S5 manda sobre S4 en la forma). Se le agregan campos opcionales del backend (`Animal.codigo`, `alias`, `canil`; `Persona.telefono`, `activo`). El servidor guarda una **bitácora de registros** (`Registro`: `id`, `fechaHora`, `agenteId`, `origen`, `estado` REA, `propuesta: Propuesta`, `fraseExacta?`, `confianza?`, `registroIaId?`, `mediaUrl?`, `compromisoId?`, `confirmadoPor?`, `confirmadoEn?`) y `/api/hoy` es una vista calculada (`proyectarHoy`) de esa bitácora. Un `PorConfirmar` del panel es el grupo de registros `por_confirmar` con el mismo `registroIaId`, y su `id` es ese `registroIaId`.
  - **D4** Las tareas de placa viva se adaptan al modelo de D3 sin cambiar sus valores de prueba ni sus textos fijos. Ejemplo: `Tratamiento.horas: ['02:00','14:00']` reemplaza a `frecuenciaHoras`+`horaInicio`, y el `compromisoId` sigue siendo `${tratamientoId}@${YYYY-MM-DD}T${HH:mm}`.
  - **D5** Persistencia detrás de `Repo` y `Kv` (interfaces en `bot/src/store/`). Implementaciones: `MemoryRepo`/`MemoryKv` para pruebas y demo, y `PgRepo`/`PgKv` sobre una interfaz mínima `Sql` con adaptadores `pg` (producción, `DATABASE_URL`) y PGlite (pruebas). La copia a Sheets es una cola `sheets_pendientes` en Postgres que vacía el cron de reintentos (S21 y Review Focus 5). Sin `DATABASE_URL` el servidor arranca con `MemoryRepo` y la semilla.
  - **D6** Los crons de Workers pasan a un programador en el proceso Node (`setInterval` por minuto que despacha las mismas 5 expresiones de la Task 22, hora Bogotá). La función `programado(cron, deps)` se prueba sin reloj real.
  - **D7** Sesión: el enlace personal del panel es `PANEL_URL/?t=<sesión firmada HMAC con vencimiento a 180 días>`. `/api/*` acepta `Authorization: Bearer` o la cookie `hk`. CORS solo para `PANEL_ORIGIN`. El token de `/e/:token` (Task 16b) sigue siendo de un solo uso.
  - **D8** Permisos de `/api/hoy` (S10): `admin` recibe todo. Los demás roles reciben `movimientos: []`, `clinicas: []`, caja en 0 y una bandeja `porConfirmar` sin propuestas de dinero. `POST /api/eventos` con `movimiento` o `deuda` de alguien que no es admin → error en `errores`. Un `voluntario` no puede cambiar el estado de registros ajenos.
  - **D9** `POST /api/eventos`: idempotente por `id`; responde `{ guardados: string[], errores: { id, error }[] }`. Una `dosis` cuyo compromiso ya tiene un registro no anulado se rechaza con el texto fijo `Ojo: esta dosis ya fue reportada a las {hora}. ¿Es una dosis distinta?`. `POST /api/eventos/estado` acepta ids de registro o de grupo (`registroIaId`) y responde `{ cambiados: number }`.
  - **D10** No se cambia la lógica de `panel/src/lib/calculos.ts` (es de Samuel y está en uso). Lo único que se toca del panel principal es `tipos.ts` (reexporta), la configuración del alias y, para adopción, una línea en `App.tsx` y la entrada `adopciones` de `pestanas.ts`.
  - **D11** Se usa el modelo de Samuel para la semilla del servidor: los ids de personas (`p-luis`, `p-andres`, `p-carolina`, `p-marcela`…) y de clínicas de `panel/src/data/demo.ts`, más los animales de la semilla de placa viva (Tobías `TOB01`, Mateo `MAT01`, Bruno `BRU01`, Luna `LUN01`, Manchas). Así el panel conectado y la demo cuentan la misma historia (PLAN_INTEGRADO §2).
  - **D13** (tras el verify de la Ola 0) La bitácora guarda `PropuestaServidor` = `Propuesta` del panel + `comida`, `observacion` y `avance` (`{ tipo; animalId; texto }`), porque el bot los produce y el modelo del panel no los tiene. Agregarlos a `Propuesta` rompería `describir.ts` y `acciones.ts` de Samuel (switch exhaustivo). En `/api/hoy` se proyectan como `nota`. También: `Tratamiento.activo?` (false = 0 dosis, Task 2), `HechoDiario` pasa a `shared/src/vistas.ts`, `server.fs.allow` del panel queda en `['.', '../shared']` (con `--host` servía todo el repo a la red local) y `panel/src/data/contrato.test.ts` fija la igualdad de tipos panel ↔ shared. Las ids de `semilla-mini` (`p-andrea`, `p-carlos`, `p-admin`, `TOB`…) son solo de pruebas; la semilla completa (T10) usa las de D11. `db/` lo crea T9.
  - **D12** WhatsApp, Gemini y Sheets se construyen detrás de interfaces y se prueban con `fetch` falso. Sin credenciales el servidor arranca igual: el webhook responde 503 si falta `WA_APP_SECRET`, y la IA falsa solo existe en pruebas.
- **L5** Ola 1 (2026-10-28): T3, T4, T5, T6 (+T10), T7, T8, T9 y T11 hechas por workers. T6 y T7 se colgaron en el primer intento sin dejar archivos y se relanzaron. Verify de la ola: 1 bloqueo (PgRepo perdía `Solicitud.destinatario` y `Seguimiento.llamadaHumana`) y 5 avisos (horas que no vienen en hora de Bogotá, `Infinity` en `diasDeComida`, montos no enteros, cast en `webhook.ts`, prueba inestable en `servidor.test.tsx`). Todo corregido con test primero. Resultado: shared 184, bot 281, panel 76 (dos corridas), 6 builds OK. Commits c1770c6…822943e.
  - **D14** `diasDeComida` devuelve `null` (no `Infinity`) cuando no hay consumo. Los repos guardan `fechaHora` normalizada a Bogotá `-05:00`. El `monto` de la IA es entero; un monto ≤ 0 o con decimales va a `sinResolver` ('Monto inválido'). La deuda base de la semilla (4.150.000) vive en las clínicas, con los mismos valores de `panel/src/data/demo.ts`. En `servidor.test.tsx` (de Samuel) solo se agregó `{ timeout: 3000 }` a una consulta inestable con carga.

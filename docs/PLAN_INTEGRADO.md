# Huellitas — Plan integrado (placa viva + paneles)

> Este documento une los dos planes y manda sobre ellos cuando se contradicen.
> - **Placa viva** (servidor, WhatsApp, IA, ficha de la placa): [diseño](placa-viva/diseno.md) · [plan de implementación](placa-viva/plan.md)
> - **Panel** (app React con el diseño "La libreta que no se moja"): [PLAN_PANEL.md](PLAN_PANEL.md)
> - Requerimientos del cliente: [Huellitas_Requerimientos_VibraPlus.md](Huellitas_Requerimientos_VibraPlus.md)
>
> ⚠️ **El servidor cambió de forma.** Lo que se está construyendo en `bot/` y `db/` es Node (Hono) con Postgres en un VPS, con copia a Google Sheets (ver `db/README.md`), no un Cloudflare Worker con KV como dicen las secciones 1 y 2. El contrato `/api/*` de la sección 3 sigue igual.

---

## 1. La solución en una imagen

```
                 ┌──────────────── Un solo Cloudflare Worker (gratis) ────────────────┐
 Placa NFC/QR ──▶│ GET /p/:codigo   Ficha pública de HOY (HTML liviano, sin JS)        │
 WhatsApp ──────▶│ POST /wa         Audio/foto → Gemini → eventos "por confirmar"      │
 Cron ──────────▶│ scheduled        Alertas, cierre del día, padrinos, reintentos     │
                 │                                                                    │
 Panel React ───▶│ /app/*           La PWA (archivos estáticos del mismo Worker)      │
   (PWA)         │ /api/*           JSON para el panel  ◀── NUEVO, lo agrega este plan │
                 └───────────────┬────────────────────────────────────────────────────┘
                                 ▼
                    Workers KV (rápido) ──▶ Google Sheets (lo edita el albergue)
```

| Pieza | Para qué | Quién la usa | Dueño |
|---|---|---|---|
| **Placa + ficha pública** | Saber en 3 s qué necesita *ese* animal | Quien esté frente al canil | Backend (§4) |
| **Bot de WhatsApp** | Registrar con un audio, con las manos ocupadas | Todo el equipo y los voluntarios | Backend (§4) |
| **Panel principal** | Ver *todo el albergue*: comida, plata, dosis del día, animales y lo que falta confirmar | Cuidador, bienestar, administradora | **Samuel** |
| **Panel de adopción** | Clasificar solicitudes, entregar con pasaporte y hacer el seguimiento | Coordinadora de adopciones | **Daniel** |

**Por qué hacen falta las dos cosas:** la placa y el bot responden "¿qué hago con *este* animal ahora?". Los paneles responden "¿cómo está *el albergue*?" y "¿a quién le damos este animal?". Esas preguntas no caben en un chat ni en una ficha de 30 KB.

---

## 2. Decisiones que cambian al unir los planes

| Tema | Antes (PLAN_PANEL) | Ahora | Por qué |
|---|---|---|---|
| Servidor | Google Apps Script | **El Worker de placa viva + rutas `/api/*`** | Un solo servidor, una sola fuente de datos |
| Alertas | Telegram | **WhatsApp** | El cliente descartó Telegram ("la mitad no lo va a hacer") |
| Dónde vive el panel | Netlify o Cloudflare Pages | **Archivos estáticos del mismo Worker** en `/app/` | Mismo dominio: la cookie de sesión de equipo sirve, y no hay CORS |
| Inicio de sesión | "¿Quién eres?" con la cara | **El enlace personal del bot** (Task 16 de placa viva) crea la cookie. "¿Quién eres?" queda solo para el modo demo | Una sola forma de entrar para todos |
| Modelo de datos | `panel/src/data/tipos.ts` propio | **`src/domain/types.ts` de placa viva** (bitácora de eventos REA) | Contrato único. El panel adapta sus tipos (§3) |
| Semáforo de deuda | Ojo 80 % · urgente 95 % | **Verde < 60 % · amarillo hasta 85 % · rojo > 85 %** | Constante global de placa viva |
| Alerta de comida | Ojo < 5 días · urgente < 3 | **Alerta a ≤ 4 días** (el panel muestra "ojo" a ≤ 6 y "urgente" a ≤ 4) | Así la alerta de WhatsApp y el rojo del panel salen el mismo día |
| Consumo de comida | 17 kg/día total, bultos de 25/8 kg | **Catálogo**: perro 25 kg/bulto y 0,375 kg/animal/día; gato 10 kg/bulto y 0,065 kg/animal/día | Lo define la semilla de placa viva |
| Datos demo | `panel/src/data/demo.ts` | **La semilla de placa viva** (Task 17): Tobías `TOB01`, Mateo, Bruno, Luna, Manchas… | Que la demo del bot y la del panel cuenten la misma historia |
| Registro desde el panel | Guardado al tocar + "Deshacer" | Igual, pero se envía como **evento** a `/api/eventos` | Ver la regla de confirmación (§3.3) |
| Commits | Con atribución a la IA | **Sin atribución a herramientas de IA** | Regla global de placa viva |

---

## 3. El contrato entre el panel y el servidor

### 3.1 Rutas nuevas del Worker (se suman a la Task 23 de placa viva)

Todas exigen la cookie de sesión de equipo (`verificarSesion`, Task 16a) y responden JSON. Sin cookie: `401`.

| Ruta | Qué devuelve o hace | Lo usa |
|---|---|---|
| `GET /api/hoy` | `{ animales, tratamientos, dosisProgramadas, eventosHoy, entidades, catalogo, config, yo }`, todo en un JSON de menos de 60 KB comprimido | Panel principal (todas las pantallas) |
| `GET /api/eventos?desde&hasta&tipo` | Eventos de un rango (plata y comida de la semana) | Panel principal: Plata y Comida |
| `POST /api/eventos` | Recibe `Evento[]` creados en el panel y responde con los ids guardados | Panel: −1 bulto, dosis dada, movimiento de plata |
| `POST /api/eventos/estado` | `{ ids, estado }`: confirmar, corregir o anular. Reutiliza `cambiarEstado` | Panel: bandeja "Por confirmar" y "Deshacer" |
| `GET /api/adopciones/solicitudes` | Solicitudes con su clasificación sugerida | Panel de adopción |
| `POST /api/adopciones/solicitudes/:id` | Cambia de montón (🟢/🟡/🔴), agrega una nota o agenda la llamada | Panel de adopción |
| `GET /api/adopciones/seguimientos` | Seguimientos pendientes (días 2/5/15/30/90) | Panel de adopción |

**Detalles de implementación:**
- Las rutas son finas: llaman al mismo `Repo` y a los mismos módulos de `domain/` que la ficha. No se duplica lógica.
- **Sin señal:** el panel guarda los eventos en IndexedDB con `id` generado en el celular (uuid) y los reenvía al volver la señal. El Worker ignora un `id` repetido (es idempotente, igual que con los webhooks de Meta).

### 3.2 Cómo cambia el código del panel
- `panel/src/data/tipos.ts` pasa a **reexportar** los tipos de placa viva, más tipos de vista propios del panel (por ejemplo `DosisDelDia`).
  - Mientras el backend no exista, se mantiene una copia y se sincroniza a mano.
- `DatosProvider` tiene dos fuentes: **demo** (semilla en memoria) y **servidor** (`/api/hoy` + cola offline). Las pantallas no notan la diferencia.
- `lib/calculos.ts` **deja de calcular por su cuenta** los días de comida y la deuda: importa `domain/comida.ts` y `domain/deuda.ts` de placa viva. Si el monorepo no está listo, se copian esos archivos tal cual.

### 3.3 Regla de confirmación (une los dos planes)
- Lo que **una persona toca en el panel** (−1 bulto, "Ya se la di", un gasto que digitó ella misma) nace **`confirmado`** con su `agenteId`. Fue una decisión humana directa y además tiene "Deshacer" (que en el servidor es `anulado`).
- Lo que viene de **audio, foto o IA** nace **`por_confirmar`**, como dice placa viva. En el panel aparece en la bandeja con ✅ Confirmar / ✏️ Corregir.
- **Dosis duplicadas:** si una dosis programada ya tiene un evento (en cualquier estado), el botón del panel no dice "Ya se la di": dice *"Reportada a las 2:01 PM por Andrea"*, con un botón para confirmarla. Así el panel respeta la misma regla que el bot (Task 14).

> ⚠️ Esta regla hay que acordarla con quien construya el backend: placa viva dice "todo evento nace por_confirmar" pensando en la IA, no en un toque humano.

---

## 4. Quién hace qué

| Persona | Parte | Carpeta | Entregables P0 |
|---|---|---|---|
| **Samuel** | **Panel principal** + sistema visual compartido + base de la app (rutas, sesión, datos, offline) | `panel/src/{design,components,app,data,lib}`, `panel/src/features/{hoy,comida,dosis,plata,animales,confirmar}` | Hoy del cuidador · Plata · Animales y ficha de equipo · Por confirmar · modo sin señal |
| **Daniel** | **Panel de adopción** | `panel/src/features/adopciones/**` + su hoja `Solicitudes` + el Google Form | Ver §5 |
| **Backend placa viva** | Worker, WhatsApp, Gemini, Sheets/KV, crons, ficha `/p/:codigo` y las rutas `/api/*` de §3.1 | `huellitas/` (o `server/`) | Ver la ruta crítica del plan de placa viva |

> ❓ **Pendiente de decidir:** el plan de placa viva está pensado para 5 desarrolladores (con agentes). Con 2 personas en los paneles, **hay que definir quién lleva el backend** o qué parte se recorta. Opciones en §7.

**Reglas para no pisarse:**
- Daniel solo crea archivos dentro de `features/adopciones/`. Lo único que toca fuera es **una línea de ruta** en `app/App.tsx`.
- Si a Daniel le falta un componente compartido (Boton, Cinta, FotoInstantanea…), lo pide; Samuel lo agrega al kit. No se crean copias.
- Las ramas son `samuel/*` y `daniel/*`. Se une a `master` al terminar cada bloque, con `master` siempre funcionando.

---

## 5. Panel de adopción (Daniel)

Sale de los requerimientos RF-05, RF-08 y RF-09, de las ideas G e I y del caso Bruno.

**Regla de oro de placa viva:** el sistema **jamás decide** una adopción. La clasificación es una **sugerencia**, nada se descarta para siempre y no se envía ningún mensaje automático al adoptante.

| Prioridad | Pantalla | Detalle |
|---|---|---|
| **P0** | **Solicitudes en 3 montones**: 🟢 Para llamar · 🟡 Revisar · 🔴 Descartadas (se pueden rescatar) | Orden por calidad, no por llegada (hoy se pierden buenos candidatos entre 20–30 formularios diarios). Cada tarjeta dice **por qué** quedó ahí, en una frase: "Dice que es un regalo para su mamá" |
| **P0** | **Detalle de la solicitud** | Respuestas clave arriba (familia de acuerdo, vivienda y mallas, plan de emergencia, mascotas anteriores). Botones grandes: "📞 Llamar", "Mover a 🟢/🟡/🔴" |
| **P0** | **Pasaporte de entrega** | Generado desde la ficha del animal, con **advertencias en rojo arriba** (Bruno: "NO pisos lisos"), rutina, comida y carácter. Botón "Enviar por WhatsApp" con el texto armado (enlace `wa.me`, sin API). Así no se repite el papel con tachones |
| P1 | **Seguimientos**: lista de "Hoy toca llamar a…" (días 2/5/15/30/90) | Cada uno con 🟢🟡🔴 tras la llamada. 🟡/🔴 → **llamada humana obligatoria** (regla del cliente) |
| P1 | **Celebración** al marcar "Adoptado" | Contador de vidas **real** (de la bitácora, no inventado) |
| P2 | Test de compatibilidad, hogares temporales | Solo en el pitch |

**Reglas de clasificación** (funciones puras, sin IA; Daniel las prueba con casos):
- 🔴 si dice que es un **regalo o para un tercero**; si lo quiere como **perro de guardia, amarrado o en azotea**; si **no acepta esterilizar o vacunar**; o si **no acepta el seguimiento**.
- 🟡 si hay **señales de devolución**: prisa por la entrega inmediata, respuestas evasivas sobre el plan de emergencia, o no pregunta por el carácter ni la rutina.
- 🟢 si nada de lo anterior aplica y dice que **toda la familia está de acuerdo**.

**Privacidad:** las solicitudes traen cédula y dirección. **No pasan por Gemini** (el plan gratis usa los datos para entrenar). Las reglas de arriba corren sin IA. Si después se usa IA para leer respuestas libres, se le quitan antes esos datos con `quitarDatosSensibles`. Solo el rol `adopciones` y `admin` ve esta sección.

**Datos:** Google Form (el que ya usan, ajustado) → pestaña `Solicitudes`. Mientras no exista `/api/adopciones/*`, Daniel trabaja con un `demo-solicitudes.ts` de unas 25 solicitudes realistas: unas 8 🟢, 9 🟡 y 8 🔴.

---

## 6. Cronograma unido (48 h)

| Horas | Samuel — panel principal | Daniel — panel de adopción | Backend placa viva |
|---|---|---|---|
| 0–3 | ✅ Hecho: base de la app, tokens, datos demo, "¿Quién eres?" | Leer este plan, crear la rama, Form y hoja `Solicitudes`, `demo-solicitudes.ts` | Task 0 (cuentas) + Task 1 (contratos) |
| 3–10 | Kit de componentes (Boton, FotoInstantanea, Cinta, Sello, Costal) | Reglas de clasificación + pruebas (no necesitan el kit) | Oleada 1 |
| 10–11 | **Juntos:** revisión anti-IA del `/kit` y del contrato `/api/*` | ← | ← |
| 11–19 | Hoy del cuidador + Plata (con datos demo) | Solicitudes en 3 montones + detalle | Oleada 2 + rutas `/api/*` |
| 19–26 | 😴 Turnos de sueño | 😴 | 😴 |
| 26–33 | Animales + Por confirmar + **conectar a `/api/hoy`** | Pasaporte de entrega + conectar a `/api/adopciones/*` | Oleada 3: integración |
| 33–38 | P1: celebración, modo sol fuerte | P1: seguimientos | Endurecimiento |
| 38–42 | **Juntos:** pruebas (abuela, guantes, sol, modo avión) | ← | ← |
| 42 | 🧊 Congelar el código | ← | ← |
| 42–48 | Demo, video de respaldo, pitch | ← | ← |

**Guion de demo unido (≈ 4 min):**
1. Problema (20 s).
2. Tocar la placa de Tobías: ficha en 3 s (30 s).
3. Audio por WhatsApp → amarillo en la ficha → **aparece en la bandeja "Por confirmar" del panel** → ✅ (60 s).
4. El audio decía "abrí un bulto": **el costal del panel baja a "urgente"** en vivo (20 s).
5. Panel de Plata: semáforo de la clínica (20 s).
6. **Panel de adopción:** 25 solicitudes ordenadas en 3 montones, y el pasaporte de Bruno con "NO pisos lisos" (40 s).
7. Cierre del día "Todo bien" (20 s).
8. Cierre: $0 al mes (10 s).

---

## 7. Riesgos de unir los planes

| Riesgo | Qué hacer |
|---|---|
| **Nadie tiene a cargo el backend** | Decidirlo ya. Opción A: los dos usan agentes para el backend en paralelo (así lo plantea placa viva). Opción B: se recorta el backend a ficha + webhook + `/api/hoy`, y el panel arranca en modo demo. Opción C: los paneles se quedan en modo demo y el backend se muestra en el pitch |
| El contrato `/api/*` cambia a mitad de camino | Se congela en la hora 11. Si cambia, quien lo cambia actualiza este documento |
| El panel pesa más que la ficha (React vs. < 30 KB) | Son cosas distintas: la ficha de la placa sigue siendo HTML liviano. El panel se descarga **una vez** y luego funciona sin red |
| Los tipos se duplican | Copia manual hasta el monorepo; revisar en la hora 26 |
| La regla de confirmación (§3.3) choca con "todo nace por_confirmar" | Acordarla en la hora 10 |

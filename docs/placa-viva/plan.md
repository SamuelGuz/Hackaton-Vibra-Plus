# Huellitas "Placa viva" — Plan de implementación (30 h, ~25 agentes)

> 🔗 Diseño: [diseno.md](diseno.md) · Cómo encaja con los paneles: [PLAN_INTEGRADO.md](../PLAN_INTEGRADO.md)
>
> ⚠️ **La parte técnica cambió.** El servidor que se está construyendo en `bot/` y `db/` es Node (Hono) con Postgres en un VPS, y copia cada cambio a Google Sheets (ver `db/README.md`). Aquí todavía dice Cloudflare Worker + KV. Lo funcional (placa, ficha, audios, cierre del día) sigue valiendo; en lo técnico manda el código.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** construir y demostrar en vivo la placa NFC/QR que abre la ficha de HOY de cada animal, el registro por audio en WhatsApp que deja la ficha "por confirmar" con la frase exacta y el cierre del día de paz mental. Además, como P1, la deuda por clínica a partir de fotos de facturas y el diario del padrino.

**Architecture:**
- Un único Cloudflare Worker (TypeScript) atiende el webhook de WhatsApp Cloud API, sirve la ficha HTML (`/p/:codigo`) y corre los crons.
- El dominio es puro: módulos sin E/S que calculan la ficha, las dosis, el cierre, la deuda y los días de comida a partir de una bitácora de eventos REA.
- La persistencia va detrás de una interfaz `Repo`: KV como estado caliente (escritura inmediata) y Google Sheets como registro durable y editable (escritura en segundo plano).
- Gemini Flash convierte audio e imagen en JSON tipado.

**Tech Stack:** TypeScript 5, Cloudflare Workers + Wrangler, Workers KV, Vitest, Google Sheets API v4 (cuenta de servicio, JWT RS256 con WebCrypto), Gemini API (REST, `responseSchema`), WhatsApp Cloud API (Graph), promptfoo para evals, `qrcode-svg` o `nayuki/QR-Code-generator` para los QR.

**Spec:** [diseno.md](diseno.md)

## Global Constraints

- Costo mensual $0: solo planes gratuitos de Cloudflare, Gemini, Google Sheets/Drive y WhatsApp Cloud API (número de prueba en la demo).
- WhatsApp: todo mensaje del bot es texto libre de servicio, respondiendo dentro de la ventana de 24 h. Las plantillas solo se usan como respaldo, y como máximo 1 ("Cierre del día en Huellitas").
- Máximo 3 botones de respuesta por mensaje de WhatsApp.
- La ficha `/p/:codigo` pesa < 30 KB, se renderiza en el servidor, no requiere JavaScript y carga en ≤ 3 s en 3G.
- Del audio a la ficha en amarillo: ≤ 10 s.
- Zona horaria America/Bogota (UTC−05:00, sin horario de verano). Horas al usuario en formato `2:01 PM`.
- Dinero en COP, entero.
- El sistema nunca decide salud, medicación ni adopción: todo evento nace `por_confirmar`.
- La vista pública nunca muestra nombres ni teléfonos del equipo.
- A Gemini nunca se envían teléfonos, cédulas, direcciones ni emails (`quitarDatosSensibles` antes de cada llamada con texto).
- Umbral de confianza para preguntar en vez de proponer: 0,7. Para autoconfirmar lo de bajo riesgo: ≥ 0,85, tras 30 min.
- Semáforo de deuda: verde < 60 % del límite, amarillo hasta 85 %, rojo > 85 %. Alerta de comida a ≤ 4 días.
- Textos fijos (copiar exactos):
  - `Tranquilos: los {n} comieron hoy y ninguno se quedó sin su medicina.`
  - `Un voluntario reportó la dosis a las {hora}`
  - `{nombre} dijo: "{frase}" – {hora}, sin confirmar`
  - `Ojo: esta dosis ya fue reportada a las {hora}. ¿Es una dosis distinta?`
  - `No pude leer el monto, ¿me lo dices?`
  - `Registro {CODIGO} ({Nombre}): `
  - `Soy {Nombre}, del albergue Huellitas`
- Commits sin atribuciones a herramientas de IA.

## Review Focus

1. **Audio sin código previo:** la persona abre el chat directo, sin tocar "Registrar". El bot pregunta "¿De qué animal hablas?" con hasta 3 botones de coincidencias aproximadas, y nunca asigna un animal con confianza < 0,7. Test en Task 13.
2. **Dos celulares reportan la misma dosis con segundos de diferencia:** se crea un solo evento de dosis y el segundo recibe `Ojo: esta dosis ya fue reportada…`. Test en Task 14.
3. **Frase en futuro o ambigua** ("le voy a dar", "ahorita se la doy"): no cuenta como dosis dada y queda como `nota`. Tests en Task 3 y Task 11.
4. **Meta reenvía el mismo webhook** (mismo `message.id`): se procesa una sola vez. Test en Task 8.
5. **Sheets falla o responde 429:** el evento queda en KV, la respuesta al usuario sale igual y la escritura se reintenta en el siguiente cron. Test en Task 10.

---

## Arquitectura

```
 Placa NFC/QR ──https──▶ Worker GET /p/:codigo ──▶ dominio/ficha ──▶ HTML (pública | equipo por cookie)
                                   │                     ▲
 WhatsApp (persona) ──webhook──▶ Worker POST /wa ──▶ flujos/* ──▶ ia/* (Gemini)
                                   │ 200 inmediato       │
                                   ▼                     ▼
                           ctx.waitUntil(proceso)   Repo (KV caliente ──▶ Sheets durable)
 Cron (Workers) ──▶ cron/* (autoconfirmar, alertas, cierre, padrinos, reintentos Sheets)
```

### Estructura de archivos

```
huellitas/
  package.json  tsconfig.json  wrangler.toml  vitest.config.ts  .dev.vars.example
  src/
    index.ts              # fetch + scheduled: router
    env.ts                # interface Env
    domain/  types.ts dosis.ts reglas.ts ficha.ts cierre.ts comida.ts deuda.ts padrino.ts hora.ts
    store/   repo.ts memory-repo.ts google-auth.ts sheets.ts mappers.ts sheets-kv-repo.ts
    wa/      webhook.ts client.ts ventana.ts contexto.ts
    ia/      gemini.ts schemas.ts extractor.ts comprobante.ts redactor.ts redact.ts
    flujos/  registro.ts confirmar.ts comandos.ts equipo.ts dinero.ts deps.ts
    web/     ficha-page.ts html.ts session.ts equipo-link.ts
    cron/    index.ts autoconfirmar.ts alertas.ts cierre.ts padrinos.ts reintentos.ts
  scripts/ crear-hojas.ts seed.ts qr-placas.ts
  test/    (espejo de src/) fixtures/
  evals/   promptfooconfig.yaml casos/*.yaml audios/
  docs/operacion/ escribir-placas.md runbook.md
```

## Oleadas, carriles y agentes

Regla: lo que no comparte archivos ni depende de una interfaz pendiente corre en paralelo. Dentro de un carril, las tareas van en serie. Cada carril es un subagente implementador; cada tarea cerrada pasa por un subagente revisor antes de la siguiente.

| Oleada | Horas | Carril/agente (tareas en serie) | Persona dueña |
|---|---|---|---|
| **0 · Base** (serie) | 0–2 | A00: Task 0 (humanos, cuentas) ∥ A01: Task 1 (scaffold + contratos) | Todos / Dev1 |
| **1 · Piezas puras** (paralelo, 13 carriles) | 2–10 | A02: T2→T4 · A03: T3 · A04: T5 · A05: T6 · A06: T7 · A07: T8 · A08: T9 · A09: T10a · A10: T11a · A11: T15 · A12: T16a · A13: T17 · A14: T18 | Dev1 dominio · Dev2 IA · Dev3 datos · Dev4 web/WA · Dev5 QA y evals |
| **2 · Flujos** (paralelo, 9 carriles) | 10–18 | A09: T10b · A10: T11b→T21 · A15: T13 · A16: T14 · A12: T16b · A17: T19 · A18: T20 · A19: T22 | Dev1/Dev2/Dev4 |
| **3 · Integración** (serie con 3 ramas) | 18–24 | A20: T23 → A21: T24 ∥ A13: T25 ∥ A22: T26 | Dev4 / Dev3 / Dev5 |
| **4 · Cierre** | 24–30 | A23: T27 ∥ A24: T28 → A25: T29 (revisión final) | Dev5 + todos |

**Ruta crítica:** T1 → T2 → T4 → T8 → T13 → T14 → T23 → T24 → T28.

**Controles de avance:**
- **H10:** la ficha se renderiza desde `MemoryRepo` con datos semilla.
- **H14:** audio falso → evento en amarillo en la ficha, con fakes.
- **H18:** flujo F1 real de punta a punta. Si falla, se recorta P1 (deuda y padrinos pasan a capturas) y todo el equipo se pone en F1.
- **H24:** congelar funcionalidades.
- **H28:** ensayo completo.

---

## Oleada 0

### Task 0: Cuentas y material (humanos, sin código)

- [ ] Meta: app de WhatsApp Cloud API con número de prueba. Agregar 5 destinatarios: los celulares de la demo. Anotar `WA_TOKEN`, `WA_PHONE_ID` y `WA_APP_SECRET`, y elegir un `WA_VERIFY_TOKEN`.
- [ ] Solicitar la plantilla de utilidad "cierre_dia_huellitas" (texto: `Cierre del día en Huellitas: {{1}}`).
- [ ] Google Cloud: cuenta de servicio con Sheets API. Crear el libro `Huellitas_DB`, compartirlo con la cuenta y anotar `SHEETS_ID` y la llave JSON.
- [ ] Gemini: `GEMINI_API_KEY` y modelo Flash vigente en `GEMINI_MODEL`.
- [ ] Cloudflare: cuenta, `wrangler login`, namespace KV `HK` y subdominio `*.workers.dev`.
- [ ] Material:
  - 6 placas NTAG213 resistentes al agua para la demo (las 70 son post-hackatón).
  - 1 Android gama baja.
  - 2 celulares para la demo de duplicados.
  - 10 audios con ladridos y manguera (5 en pasado, 3 en futuro, 2 ambiguos).
- [ ] Verificación: `docs/operacion/runbook.md` lista cada secreto como "listo".

### Task 1: Scaffold, contratos y repo en memoria

**Files:**
- Create: `package.json`, `tsconfig.json`, `wrangler.toml` (KV `HK`, crons de la Task 22), `vitest.config.ts`, `.dev.vars.example`, `.gitignore`
- Create: `src/env.ts`, `src/domain/types.ts`, `src/domain/hora.ts`, `src/store/repo.ts`, `src/store/memory-repo.ts`, `test/fixtures/semilla-mini.ts`
- Test: `test/store/memory-repo.test.ts`, `test/domain/hora.test.ts`

**Interfaces — Produces (contrato de todo el proyecto):**
```ts
// src/domain/types.ts
export type Rol = 'admin'|'cuidador'|'bienestar'|'adopciones'|'comunicacion'|'voluntario';
export type TipoEvento = 'comida'|'dosis'|'observacion'|'avance'|'inventario'|'factura'|'abono'|'donacion'|'nota';
export type EstadoEvento = 'por_confirmar'|'confirmado'|'corregido'|'anulado';
export interface Animal { id: string; codigo: string; nombre: string; alias: string[]; especie: 'perro'|'gato'; canil: string; advertencias: string[]; fotoUrl?: string; estado: string }
export interface Agente { id: string; telefono: string; nombre: string; rol: Rol; activo: boolean }
export interface Tratamiento { id: string; animalId: string; medicamento: string; dosis: number; unidad: string; frecuenciaHoras: number; horaInicio: string /*HH:mm*/; fechaInicio: string; fechaFin?: string; activo: boolean; critico: boolean }
export interface DosisProgramada { compromisoId: string /* `${tratamientoId}@${YYYY-MM-DD}T${HH:mm}` */; tratamientoId: string; animalId: string; medicamento: string; hora: string /*HH:mm*/ }
export interface Evento { id: string; fechaHora: string /*ISO -05:00*/; tipo: TipoEvento; animalId?: string; recursoId?: string; cantidad?: number; unidad?: string; monto?: number; agenteId: string; contraparteId?: string; compromisoId?: string; estado: EstadoEvento; fraseExacta?: string; confianza?: number; mediaUrl?: string; registroIaId?: string; confirmadoPor?: string; confirmadoEn?: string }
export interface Accion { tipo: TipoEvento; animalCodigo?: string; medicamento?: string; cantidad?: number; unidad?: string; monto?: number; nota?: string; tiempo: 'pasado'|'presente'|'futuro'; fraseExacta: string; confianza: number }
export interface Entidad { id: string; nombre: string; tipo: 'clinica'|'banco'|'proveedor'; limiteCredito?: number; telefono?: string }
export interface ItemCatalogo { id: string; nombre: string; tipo: string; kgPorUnidad: number; especieObjetivo?: 'perro'|'gato'; consumoDiarioKgPorAnimal?: number }
export interface Padrinazgo { id: string; personaTelefono: string; personaNombre: string; animalId: string; activo: boolean }
export interface Config { umbralPreguntar: number /*0.7*/; umbralAutoconfirmar: number /*0.85*/; minutosAutoconfirmar: number /*30*/; diasAlertaComida: number /*4*/; horaCierre: string /*'18:30'*/; telefonoAlbergue: string; baseUrl: string }
// src/store/repo.ts
export interface Repo {
  animalPorCodigo(codigo: string): Promise<Animal|null>; animales(): Promise<Animal[]>;
  tratamientosActivos(animalId?: string): Promise<Tratamiento[]>;
  eventosDelDia(fecha: string /*YYYY-MM-DD*/, animalId?: string): Promise<Evento[]>;
  eventosEntre(desde: string, hasta: string, animalId?: string): Promise<Evento[]>;
  agregarEventos(evs: Evento[]): Promise<void>;
  cambiarEstado(ids: string[], estado: EstadoEvento, por: string, en: string): Promise<void>;
  agentePorTelefono(tel: string): Promise<Agente|null>; agentePorId(id: string): Promise<Agente|null>; crearAgente(a: Agente): Promise<void>;
  entidades(): Promise<Entidad[]>; catalogo(): Promise<ItemCatalogo[]>; config(): Promise<Config>;
  padrinazgosActivos(): Promise<Padrinazgo[]>;
}
// src/domain/hora.ts
export function ahoraBogota(d?: Date): { fecha: string; hora: string; iso: string };
export function horaCorta(isoOrHHmm: string): string; // '14:01' -> '2:01 PM'
```

- [ ] **Step 1:** `git init` y crear el scaffold con `npm init -y`. Instalar `wrangler`, `typescript`, `vitest` y `@cloudflare/workers-types` como devDependencies. Agregar los scripts `test`, `dev` y `deploy`.
- [ ] **Step 2: tests**
  - `hora.test.ts`: `horaCorta('14:01') === '2:01 PM'`, `horaCorta('00:05') === '12:05 AM'`, y `ahoraBogota(new Date('2026-10-28T03:30:00Z')).fecha === '2026-10-27'`.
  - `memory-repo.test.ts`: `agregarEventos` y luego `eventosDelDia('2026-10-27','TOB')` devuelve solo los de ese día y animal; `cambiarEstado` actualiza `estado`, `confirmadoPor` y `confirmadoEn`.
- [ ] **Step 3:** correr `npx vitest run`. Esperado: FAIL.
- [ ] **Step 4:** implementar `types.ts`, `hora.ts` y `MemoryRepo implements Repo` (arreglos en memoria, construido con `semillaMini()`). `semilla-mini.ts` exporta:
  - Animales: Tobías `TOB01` (advertencias `['No juntar con machos','Dieta especial: comida húmeda']`), Mateo `MAT01`, Bruno `BRU01` (`['No pisos lisos']`), Luna `LUN01` (gato).
  - Tratamiento: anticonvulsivo de Tobías cada 12 h desde `14:00`, `critico: true`.
  - Agentes: Andrea (voluntario), Carlos (cuidador), Admin.
  - Las 2 clínicas con límite de 3.000.000.
  - Config por defecto.
- [ ] **Step 5:** `npx vitest run`. Esperado: PASS.
- [ ] **Step 6:** commit `chore: scaffold, contratos de dominio y repo en memoria`.

---

## Oleada 1 — piezas puras (todas consumen solo la Task 1)

### Task 2: Dosis programadas del día — `src/domain/dosis.ts`

**Produces:**
- `dosisDelDia(trats: Tratamiento[], fecha: string): DosisProgramada[]`
- `asignarCompromiso(animalId: string, medicamento: string, horaHHmm: string, dosis: DosisProgramada[]): DosisProgramada|undefined`

- [ ] **Tests** (`test/domain/dosis.test.ts`):
  - Cada 12 h desde 14:00 → `['02:00','14:00']`.
  - Cada 8 h desde 06:00 → 3 dosis.
  - Un tratamiento con `fechaFin` anterior a `fecha`, o con `activo:false`, → 0 dosis.
  - `asignarCompromiso('TOB','anticonvulsivo','14:20', ...)` devuelve la de 14:00.
  - Con `'Anticonvulsivo '` (mayúsculas o espacios) también la asigna.
  - Con una diferencia > 180 min devuelve `undefined`.
- [ ] **Implementar:** comparar el medicamento normalizado (minúsculas, sin tildes, sin espacios) y elegir la dosis más cercana dentro de ±180 min. El `compromisoId` sigue el formato del contrato.
- [ ] Correr los tests (PASS) y hacer commit `feat(dominio): dosis programadas del día`.

### Task 3: Reglas de confirmación y duplicados — `src/domain/reglas.ts`

**Produces:**
- `accionesAEventos(acciones: Accion[], ctx: { agenteId: string; animalId?: string; dosisHoy: DosisProgramada[]; eventosHoy: Evento[]; ahoraIso: string; registroIaId: string; mediaUrl?: string }): { eventos: Evento[]; duplicados: Array<{ accion: Accion; existente: Evento }> }`
- `autoconfirmables(eventos: Evento[], ahoraIso: string, cfg: Config): string[]`

- [ ] **Tests** (`test/domain/reglas.test.ts`):
  - Toda acción produce un evento con `estado === 'por_confirmar'` y la `fraseExacta` copiada.
  - Una acción `dosis` con `tiempo:'futuro'` produce un evento `tipo:'nota'` sin `compromisoId`.
  - Una `dosis` en pasado a las 14:01 recibe `compromisoId` de la dosis de las 14:00.
  - Si ya hay un evento (en cualquier estado salvo `anulado`) con ese `compromisoId`, el resultado va a `duplicados` y no a `eventos`.
  - `autoconfirmables`:
    - Devuelve `comida`, `observacion`, `avance` e `inventario` con `confianza >= 0.85` y 30 min o más de antigüedad.
    - Nunca devuelve `dosis`, `factura`, `abono` ni `donacion`.
    - No devuelve un evento de 29 min.
- [ ] **Implementar** con `asignarCompromiso` de la Task 2. Commit `feat(dominio): reglas por confirmar, futuro y duplicados`.

### Task 4: Ficha de HOY — `src/domain/ficha.ts`

**Consumes:** Task 2. **Produces:**
```ts
export type Vista = 'publica'|'equipo';
export type EstadoDosisFicha = 'dada'|'por_confirmar'|'pendiente'|'atrasada';
export interface FichaVM { codigo: string; nombre: string; canil: string; fotoUrl?: string; encabezadoPublico: string; advertencias: string[];
  comida: { estado: 'comio'|'por_confirmar'|'no_consta'; hora?: string; texto?: string };
  dosis: Array<{ medicamento: string; hora: string; estado: EstadoDosisFicha; texto?: string; llamarA?: string }>;
  registrarUrl: string; contactoUrl: string; vista: Vista }
export function buildFicha(a: Animal, trats: Tratamiento[], eventosHoy: Evento[], agentes: Agente[], vista: Vista, ahoraIso: string, cfg: Config, waNumeroBot: string): FichaVM
```
- [ ] **Tests** (`test/domain/ficha.test.ts`, con datos semilla):
  - Sin eventos y a las 15:30: la dosis de las 14:00 sale `atrasada` (más de 60 min) y la de las 02:00 del día siguiente no aparece.
  - Con una dosis `por_confirmar` de Andrea a las 14:01:
    - En vista `equipo`, `texto === 'Andrea dijo: "ya le di el anticonvulsivo" – 2:01 PM, sin confirmar'` y `llamarA` es `https://wa.me/<tel de Andrea>`.
    - En vista `publica`, `texto === 'Un voluntario reportó la dosis a las 2:01 PM'` y `llamarA` es undefined.
  - Ningún campo de la ficha pública contiene el teléfono ni el nombre "Andrea" (`JSON.stringify`).
  - Una dosis `confirmado` sale `dada`.
  - `registrarUrl === 'https://wa.me/<bot>?text=' + encodeURIComponent('Registro TOB01 (Tobías): ')`.
  - `encabezadoPublico === 'Soy Tobías, del albergue Huellitas'`.
  - Las advertencias se copian en orden.
- [ ] **Implementar.** "Atrasada" quiere decir que pasaron más de 60 min desde la hora programada sin evento. Commit `feat(dominio): ficha de hoy pública y de equipo`.

### Task 5: Cierre del día — `src/domain/cierre.ts`

**Produces:**
- `buildCierre(animales: Animal[], trats: Tratamiento[], eventosHoy: Evento[], agentes: Agente[], fecha: string): { todoBien: boolean; faltantes: string[]; pendientes: Array<{ eventoId: string; linea: string }> }`
- `textoCierre(c, nAnimales: number): string`

- [ ] **Tests:**
  - Todos los animales con un evento `comida` (confirmado o por confirmar) y todas las dosis con evento → `todoBien:true`, y `textoCierre` empieza con `Tranquilos: los 4 comieron hoy y ninguno se quedó sin su medicina.`
  - Si Luna no tiene comida, `faltantes` contiene `'Luna no consta que haya comido'`.
  - Una dosis sin evento genera `'Tobías: dosis de las 2:00 PM pendiente'`.
  - Un pendiente `por_confirmar` de Andrea genera `linea === 'Tobías – anticonvulsivo – 2:01 PM – Andrea'`.
  - Los animales con estado `adoptado` o `fallecido` no cuentan.
- [ ] **Implementar** y hacer commit `feat(dominio): cierre del día`.

### Task 6: Comida y deuda — `src/domain/comida.ts`, `src/domain/deuda.ts`

**Produces:**
- `diasDeComida(eventos: Evento[], item: ItemCatalogo, animales: Animal[]): number` (1 decimal)
- `deudaPorClinica(eventos: Evento[], entidades: Entidad[]): Array<{ entidadId: string; nombre: string; deuda: number; limite: number; pct: number; semaforo: 'verde'|'amarillo'|'rojo' }>`

- [ ] **Tests:**
  - 3 bultos de 25 kg y 45 perros a 0,375 kg/día → `4.4`.
  - Los eventos `inventario` restan.
  - Los animales `adoptado`, `fallecido` y `hogar_temporal` no cuentan.
  - Una clínica con facturas por 2.800.000 y un abono de 300.000, con límite de 3.000.000 → deuda 2.500.000, `pct 83`, `amarillo`.
  - Con 2.600.000 → `rojo`; con 1.700.000 → `verde`.
  - Los eventos `anulado` se ignoran.
- [ ] **Implementar** solo con eventos `confirmado`. Commit `feat(dominio): días de comida y deuda por clínica`.

### Task 7: Hechos del padrino — `src/domain/padrino.ts`

**Produces:** `hechosSemana(animal: Animal, eventos: Evento[]): Array<{ eventoId: string; texto: string }>`

- [ ] **Tests:**
  - Solo entran eventos `confirmado` de tipo `dosis`, `comida`, `avance` y `observacion` del animal.
  - 14 de 14 dosis en la semana producen el hecho `'Recibió sus 14 dosis a tiempo'`.
  - Un avance produce un hecho con su `fraseExacta`.
  - Ningún hecho incluye nombres de agentes.
- [ ] **Implementar** y hacer commit `feat(dominio): hechos semanales para padrinos`.

### Task 8: Webhook de WhatsApp — `src/wa/webhook.ts`

**Produces:**
- `verificarFirma(cuerpo: string, header: string|null, appSecret: string): Promise<boolean>`
- `parsearEntrantes(json: unknown): InboundMessage[]`
- `yaProcesado(kv: KVNamespace, messageId: string): Promise<boolean>` (marca y responde si ya existía; TTL 2 días)
- `export interface InboundMessage { id: string; from: string; nombrePerfil?: string; tipo: 'texto'|'audio'|'imagen'|'boton'; texto?: string; mediaId?: string; mime?: string; botonId?: string; timestamp: number }`

- [ ] **Tests** (con fixtures de payload real de la documentación de Meta en `test/fixtures/wa/`):
  - Una firma `sha256=` correcta con HMAC-SHA256 → true; una alterada o `null` → false.
  - Se parsean texto, audio (`mediaId` y `mime: 'audio/ogg; codecs=opus'`), imagen y `interactive.button_reply` → `tipo:'boton'` con `botonId`.
  - Los payloads de `statuses` devuelven `[]`.
  - Review Focus 4: `yaProcesado(kv,'wamid.X')` da `false` la primera vez y `true` la segunda.
- [ ] **Implementar** con `crypto.subtle` y comparación en tiempo constante. Commit `feat(wa): webhook firmado, parseo e idempotencia`.

### Task 9: Cliente de WhatsApp, ventana y contexto — `src/wa/client.ts`, `src/wa/ventana.ts`, `src/wa/contexto.ts`

**Produces:**
- `class WaClient { constructor(token: string, phoneId: string, fetchFn?: typeof fetch); enviarTexto(to: string, cuerpo: string): Promise<void>; enviarBotones(to: string, cuerpo: string, botones: Array<{ id: string; titulo: string }>): Promise<void>; descargarMedia(mediaId: string): Promise<{ bytes: ArrayBuffer; mime: string }>; enviarPlantilla(to: string, nombre: string, params: string[]): Promise<void> }`
- `marcarVentana(kv, tel, ts)` / `ventanaAbierta(kv, tel, ahoraMs): Promise<boolean>` (24 h)
- `guardarContexto(kv, tel, codigo)` / `leerContexto(kv, tel): Promise<string|null>` (TTL 10 min)

- [ ] **Tests** (con `fetch` falso):
  - `enviarBotones` con 4 botones lanza `Error('max 3 botones')`.
  - Los títulos se truncan a 20 caracteres.
  - El cuerpo HTTP sigue el formato `interactive.type:'button'` de Cloud API.
  - `descargarMedia` hace 2 llamadas (URL y luego bytes con Bearer).
  - La ventana está abierta a 23 h 59 min y cerrada a 24 h 01 min.
  - El contexto vence a los 10 min.
- [ ] **Implementar** y hacer commit `feat(wa): cliente, ventana 24h y contexto de animal`.

### Task 10a: Acceso a Google — `src/store/google-auth.ts`, `src/store/sheets.ts`, `src/store/mappers.ts`

**Produces:**
- `obtenerToken(env: Env, kv: KVNamespace): Promise<string>` (JWT RS256 con WebCrypto, caché de 50 min en KV)
- `class SheetsClient { leer(tab: string): Promise<string[][]>; agregar(tab: string, filas: string[][]): Promise<void>; actualizarFila(tab: string, fila: number, valores: string[]): Promise<void> }`
- `mappers.ts`: `filaAAnimal`, `filaATratamiento`, `filaAAgente`, `eventoAFila`, `filaAEvento`, `filaAEntidad`, `filaAItem`, `filasAConfig`
- Columnas: los headers de la Task 17 (`HOJAS`).

- [ ] **Tests:**
  - El JWT generado tiene el header `{"alg":"RS256","typ":"JWT"}` y el claim `scope` incluye `spreadsheets`. Se verifica con la llave pública del fixture.
  - Cada mapper hace ida y vuelta (`filaAEvento(eventoAFila(e))` deepEqual `e`).
  - Las listas (`alias`, `advertencias`) se separan con `|`.
  - `agregar` hace POST a `values/{tab}!A1:append?valueInputOption=RAW`.
- [ ] **Implementar** y hacer commit `feat(store): token de servicio, cliente Sheets y mappers`.

### Task 11a: Gemini base — `src/ia/gemini.ts`, `src/ia/schemas.ts`, `src/ia/redact.ts`

**Produces:**
- `generarJSON<T>(env: Env, partes: Array<{ texto: string }|{ datos: ArrayBuffer; mime: string }>, esquema: object, sistema: string, fetchFn?: typeof fetch): Promise<T>`
- `ESQUEMA_ACCIONES`, `ESQUEMA_COMPROBANTE`, `ESQUEMA_DIARIO`
- `quitarDatosSensibles(texto: string): string`

- [ ] **Tests:**
  - El cuerpo enviado lleva `generationConfig.responseMimeType === 'application/json'` y `responseSchema`.
  - El audio va como `inline_data` en base64.
  - Una respuesta con JSON inválido produce un error `'IA: respuesta no es JSON'`.
  - `quitarDatosSensibles('llámame al 3001234567, CC 1098765432, ana@x.co')` no contiene ninguno de los tres datos y los reemplaza con `[tel]`, `[doc]` y `[email]`.
  - `ESQUEMA_ACCIONES` exige `tipo`, `tiempo`, `fraseExacta` y `confianza` en cada acción.
- [ ] **Implementar** y hacer commit `feat(ia): cliente Gemini JSON y redacción de datos sensibles`.

### Task 15: Página de la ficha — `src/web/html.ts`, `src/web/ficha-page.ts`

**Consumes:** `FichaVM` (Task 4). **Produces:** `renderFicha(vm: FichaVM): string` y `esc(s: string): string`

- [ ] **Tests:**
  - El HTML contiene `<meta name="viewport"`.
  - Las advertencias aparecen antes que la comida y los medicamentos (comparando índices en el string).
  - El botón Registrar es un `<a href>` con el `registrarUrl`.
  - Hay 0 etiquetas `<script>`.
  - `Buffer.byteLength(html) < 30_000` con 6 dosis y 5 advertencias.
  - Los textos con `<b>` salen escapados.
  - La vista pública muestra `encabezadoPublico` y el enlace "Llamar al albergue". La de equipo muestra el enlace "Llamar" por dosis cuando existe `llamarA`.
  - Los estados usan clases `dada`, `por_confirmar`, `pendiente` y `atrasada`, con CSS inline mínimo: rojo, amarillo, verde y alto contraste.
- [ ] **Implementar** y hacer commit `feat(web): página de ficha liviana`.

### Task 16a: Sesión de equipo — `src/web/session.ts`

**Produces:**
- `firmarSesion(agenteId: string, secreto: string): Promise<string>`
- `verificarSesion(cookie: string|null, secreto: string): Promise<string|null>`
- `crearTokenEnlace(kv, agenteId): Promise<string>` (TTL 7 días, un solo uso)
- `canjearToken(kv, token): Promise<string|null>`

- [ ] **Tests:**
  - Ida y vuelta de la firma (HMAC).
  - Una cookie alterada da `null`.
  - Un token se canjea una vez y la segunda vez da `null`.
- [ ] **Implementar** y hacer commit `feat(web): sesión de equipo por enlace`.

### Task 17: Hojas y semilla — `scripts/crear-hojas.ts`, `scripts/seed.ts`

**Produces:**
- `HOJAS: Record<string, string[]>` con headers para `Usuarios`, `Config`, `Animales`, `Tratamientos`, `Eventos`, `Catalogo`, `Entidades`, `Padrinazgos`, `RegistrosIA`. Las columnas de `Eventos` son exactamente los campos de `Evento`.
- `generarSemilla(n = 70)`:
  - 45 perros y 25 gatos, con códigos `AAA00`.
  - Incluye Mateo, Bruno, Tobías, Luna y Manchas con sus advertencias.
  - 3 tratamientos activos, uno `critico` a las 14:00.
  - 2 clínicas con deuda de 3.800.000–4.200.000 en total.
  - Catálogo de alimento: perro 25 kg con consumo 0,375; gato 10 kg con consumo 0,065.

- [ ] **Tests:**
  - 70 animales con códigos únicos.
  - Los 5 nombres de los casos están presentes.
  - La suma de las facturas menos los abonos queda entre 3.800.000 y 4.200.000.
  - Cada fila tiene la misma longitud que su header.
- [ ] **Implementar.** `npm run hojas` crea las pestañas y `npm run seed` carga la semilla, ambos con `SheetsClient`. Commit `feat(datos): esquema de hojas y semilla realista`.

### Task 18: Banco de evals — `evals/`

**Produces:** `evals/promptfooconfig.yaml` contra el prompt de `extractor.ts`. Tiene 20 casos de texto:
- 8 en pasado.
- 5 en futuro, que esperan `tipo:'nota'`.
- 3 múltiples ("le di la amoxicilina a Mateo, ya camina solo y abrí un bulto").
- 2 ambiguos, con confianza < 0,7.
- 2 con nombres parecidos ("Max" frente a "Manchas").

Además, 10 audios de la Task 0 en `evals/audios/`.

- [ ] **Verificación:** `npx promptfoo eval` corre. El umbral de aprobación para H18 es ≥ 18/20 casos de texto y 0 dosis dadas en los casos en futuro.
- [ ] Commit `test(evals): banco de casos del extractor`.

---

## Oleada 2 — flujos (consumen la Oleada 1)

### Task 10b: Repo durable — `src/store/sheets-kv-repo.ts`, `src/cron/reintentos.ts`

**Consumes:** las Tasks 1 y 10a. **Produces:** `class SheetsKvRepo implements Repo` y `reintentarPendientesSheets(env): Promise<number>`

- [ ] **Tests** (con KV en memoria y `SheetsClient` falso):
  - `agregarEventos` escribe primero en KV, en `ev:{fecha}` y en el índice por animal, y luego llama `agregar('Eventos', …)`.
  - Review Focus 5: si `agregar` lanza 429, los eventos siguen visibles en `eventosDelDia` y quedan en la cola `sheets:pendientes`. `reintentarPendientesSheets` los envía y vacía la cola.
  - `config()`, `animales()` y `tratamientosActivos()` se leen de Sheets con caché de 5 min en KV, y la segunda llamada no toca Sheets.
  - `cambiarEstado` actualiza KV y encola la actualización de fila.
- [ ] **Implementar** y hacer commit `feat(store): repo KV caliente con Sheets durable y reintentos`.

### Task 11b: Extractor, comprobante y redactor — `src/ia/extractor.ts`, `src/ia/comprobante.ts`, `src/ia/redactor.ts`

**Produces:**
- `extraerAcciones(env, entrada: { audio?: { bytes: ArrayBuffer; mime: string }; texto?: string }, ctx: { animal?: Animal; candidatos: Animal[]; tratamientos: Tratamiento[]; catalogo: ItemCatalogo[] }): Promise<Accion[]>`
- `leerComprobante(env, img: { bytes: ArrayBuffer; mime: string }, entidades: Entidad[]): Promise<{ tipo: 'factura'|'transferencia'|'otro'; monto: number|null; fecha?: string; entidadId?: string; concepto?: string; animalCodigo?: string; legible: boolean }>`
- `redactarDiario(env, animal: Animal, hechos: Array<{ eventoId: string; texto: string }>): Promise<{ texto: string; hechosUsados: string[] }>`

- [ ] **Tests** (con `generarJSON` simulado):
  - El prompt de sistema incluye la lista de candidatos con solo `codigo`, `nombre` y `alias` (sin teléfonos).
  - Cuando hay `ctx.animal`, se instruye usar ese código.
  - Una acción con `animalCodigo` fuera de los candidatos se descarta.
  - `leerComprobante` con `monto:null` devuelve `legible:false`.
  - `redactarDiario` rechaza (lanza error) si `hechosUsados` incluye un id que no viene en `hechos`.
- [ ] **Verificación:** `npx promptfoo eval` cumple el umbral de la Task 18.
- [ ] Commit `feat(ia): extractor de acciones, lector de comprobantes y redactor de diario`.

### Task 13: Flujo de registro — `src/flujos/deps.ts`, `src/flujos/registro.ts`

**Consumes:** Tasks 3, 8, 9, 10b y 11b.

**Produces:**
- `interface Deps { env: Env; repo: Repo; wa: WaClient; kv: KVNamespace; ahora: () => Date; ia: { extraerAcciones: typeof extraerAcciones; leerComprobante: typeof leerComprobante } }`
- `manejarMensaje(d: Deps, m: InboundMessage): Promise<void>` (despachador)
- `manejarRegistro(d: Deps, m: InboundMessage, agente: Agente): Promise<void>`

**Comportamiento:**
- Un texto que coincide con `/^Registro\s+([A-Z]{3}\d{2})/i` guarda el contexto y responde `Listo, te escucho: cuéntame qué le hiciste a {Nombre}.`
- Un audio o texto libre usa el contexto vigente.
- El bot responde con una línea por evento y los botones `Confirmar` (`conf:{ids}`) y `Corregir` (`corr:{registroIaId}`).
- Un número desconocido pasa a la Task 16b.
- Una imagen enviada por un `admin` pasa a la Task 20.

- [ ] **Tests** (con `MemoryRepo`, `WaClient` falso e IA falsa):
  - "Registro TOB01 (Tobías): " seguido de un audio crea un evento `dosis` `por_confirmar` para TOB con `compromisoId` de las 14:00, y la respuesta tiene 2 botones.
  - Review Focus 1: un audio sin contexto, donde la IA no trae animal o trae confianza < 0,7, no crea eventos. Responde `¿De qué animal hablas?` con hasta 3 botones `animal:{codigo}` de coincidencias de nombre y alias.
  - Un audio en futuro crea `tipo:'nota'` y la respuesta dice `Anotado. Cuando se la des, mándame otro audio.`
  - Cada mensaje entrante llama a `marcarVentana`.
  - Medido con `ahora` falso, el tiempo del webhook a la respuesta no incluye esperas a Sheets: el `SheetsClient` falso tarda 5 s y la respuesta sale antes.
- [ ] **Implementar** y hacer commit `feat(flujos): registro por audio con contexto de placa`.

### Task 14: Confirmar, corregir, duplicados y "Todo bien" — `src/flujos/confirmar.ts`

**Consumes:** las Tasks 3, 5 y 13.

**Produces:** `manejarBoton(d: Deps, m: InboundMessage, agente: Agente): Promise<void>` para los ids:
- `conf:{ids}`
- `corr:{registroIaId}`
- `todobien:{fecha}`
- `animal:{codigo}`
- `dup_si:{registroIaId}` / `dup_no:{registroIaId}`

- [ ] **Tests:**
  - `conf:` pasa los eventos a `confirmado`, con `confirmadoPor` igual a quien tocó.
  - Un voluntario que toca `todobien:` recibe `Solo cuidador, bienestar o administración pueden cerrar el día.` y no cambia nada.
  - Un cuidador que toca `todobien:` confirma todos los `por_confirmar` del día con un solo cambio.
  - `corr:` anula los eventos del registro y responde `Dime cómo es correcto (audio o texto).`, que deja el contexto activo.
  - Review Focus 2: dos registros de la misma dosis desde 2 agentes, procesados en secuencia, dejan 1 solo evento `dosis` y el segundo agente recibe exactamente `Ojo: esta dosis ya fue reportada a las 2:01 PM. ¿Es una dosis distinta?` con `dup_si` y `dup_no`.
  - `dup_si` crea un evento `dosis` sin `compromisoId` y con la nota `segunda dosis reportada`.
- [ ] **Implementar.** La deduplicación usa un candado en KV por `compromisoId` (`lock:{compromisoId}`, TTL 60 s) para el caso concurrente. Commit `feat(flujos): confirmar, corregir, duplicados y cierre en un toque`.

### Task 16b: Alta de equipo — `src/flujos/equipo.ts`, `src/web/equipo-link.ts`

**Comportamiento:**
- El texto `Soy del equipo` (que prellena el botón de la ficha pública) o el primer mensaje de un número desconocido hace que el bot pregunte `¡Hola! ¿Cómo te llamas?`.
- El siguiente texto crea un `Agente` con `rol:'voluntario'` y responde `Gracias, {Nombre}. Abre este enlace una vez para quedar conectado: {baseUrl}/e/{token}`.
- `GET /e/:token` pone la cookie `hk` (HttpOnly, Secure, SameSite=Lax, 180 días) y redirige a `/`.

- [ ] **Tests:**
  - El alta guarda el teléfono E.164 y el nombre.
  - El token se usa una sola vez.
  - `GET /e/{token}` responde 302 con `Set-Cookie: hk=`.
  - Con esa cookie, `/p/TOB01` usa la vista `equipo`; sin cookie, `publica`.
- [ ] **Implementar** y hacer commit `feat(equipo): alta de voluntarios y enlace de conexión`.

### Task 19: Comandos — `src/flujos/comandos.ts`

**Produces:** `manejarComando(d, m, agente): Promise<boolean>` para `estado`, `hoy`, `pendientes` y `ayuda` (sin distinguir mayúsculas ni tildes).

- [ ] **Tests:**
  - `estado` de un admin lista cada clínica con el formato `🟡 Clínica X: $2.500.000 de $3.000.000 (83 %)`.
  - `estado` de un voluntario responde `Esa información la ve administración.`
  - `pendientes` usa `buildCierre().pendientes` con un botón `todobien:`.
  - `ayuda` cabe en ≤ 6 líneas.
  - Un texto que no es comando devuelve `false`.
- [ ] **Implementar** y hacer commit `feat(flujos): comandos de texto`.

### Task 20: Dinero por foto — `src/flujos/dinero.ts`

**Consumes:** las Tasks 6, 11b y 13.

- [ ] **Tests:**
  - Una imagen legible crea un evento `factura` o `donacion` `por_confirmar` con `monto`, `contraparteId` y `mediaUrl`, y responde con el monto en formato `$2.800.000` y los botones Confirmar y Corregir.
  - `legible:false` responde exactamente `No pude leer el monto, ¿me lo dices?` y guarda el contexto `monto_pendiente`. Un texto siguiente como "dos millones ochocientos" o "2800000" completa el monto.
  - Un monto mayor a 3 veces el promedio de su tipo agrega `⚠️ Monto inusual, revisa.`
  - Al confirmar una factura, la respuesta incluye el semáforo actualizado de esa clínica.
- [ ] **Implementar** (subir a Drive es opcional; `mediaUrl` puede ser el `mediaId` de WhatsApp en la demo). Commit `feat(flujos): factura y Nequi por foto`.

### Task 21: Diario de padrinos — `src/cron/padrinos.ts`

**Consumes:** las Tasks 7 y 11b.

- [ ] **Tests:**
  - Por cada `Padrinazgo` activo se genera un borrador que el bot envía a comunicación (si tiene la ventana abierta) con los botones `Aprobar` (`pad_ok:{id}`) y `Editar`.
  - Al aprobar, se envía al padrino.
  - Un animal sin hechos en la semana no genera borrador.
- [ ] **Implementar** y hacer commit `feat(cron): diario semanal de padrinos`.

### Task 22: Crons — `src/cron/index.ts`, `src/cron/autoconfirmar.ts`, `src/cron/alertas.ts`, `src/cron/cierre.ts`

**Produces:** `programado(evento: ScheduledController, env: Env, ctx: ExecutionContext)` que despacha por `evento.cron`. Son 5 crons como máximo (límite del plan gratis):

| Cron | Tareas |
|---|---|
| `*/10 * * * *` | autoconfirmar, alertas de dosis atrasada y reintentos de Sheets |
| `30 23 * * *` | cierre (18:30 Bogotá) |
| `0 11 * * *` | resumen de la mañana (6:00 Bogotá), solo a quien tenga la ventana abierta |
| `0 13 * * 1` | padrinos |
| `0 */6 * * *` | días de comida y deuda |

- [ ] **Tests:**
  - El cierre se envía con `enviarTexto` a cada cuidador, bienestar o admin con la ventana abierta, junto con el botón `todobien:` si hay pendientes.
  - Si nadie tiene la ventana abierta, se usa `enviarPlantilla('cierre_dia_huellitas', …)` una sola vez al cuidador principal.
  - Las alertas no se repiten más de 1 vez por tema al día (clave KV `alerta:{tipo}:{ref}:{fecha}`).
  - Una dosis `critico` atrasada más de 60 min alerta al cuidador.
  - Autoconfirmar usa `autoconfirmables`.
- [ ] **Implementar** y hacer commit `feat(cron): cierre, alertas, autoconfirmación y resumen`.

---

## Oleada 3 — integración y realidad

### Task 23: Router del Worker — `src/index.ts`, `src/env.ts`

**Rutas:**
- `GET /wa`: verificación con `hub.challenge`.
- `POST /wa`: verificar la firma (401 si falla), responder 200 de inmediato y procesar en `ctx.waitUntil(manejarMensaje…)`.
- `GET /p/:codigo`: 404 amable si no existe.
- `GET /e/:token`.
- `GET /salud`.
- `scheduled` → `programado`.

- [ ] **Tests** (`test/index.test.ts`, invocando `worker.fetch` con un `ExecutionContext` falso):
  - Un POST sin firma responde 401.
  - Un POST válido responde 200 en < 50 ms aunque el procesamiento tarde 5 s.
  - `/p/TOB01` responde 200 `text/html` y `/p/ZZZ99` responde 404.
  - El GET de verificación devuelve el challenge.
- [ ] **Implementar** y hacer commit `feat: router del worker`.

### Task 24: Pruebas de punta a punta con fakes — `test/e2e/f1.test.ts`

- [ ] **Escenario completo** sobre el worker con `MemoryRepo`, WhatsApp falso y una IA falsa determinista:
  1. Tocar la placa: `/p/TOB01` muestra la dosis `atrasada`.
  2. Andrea manda "Registro TOB01" y luego el audio: la ficha de equipo muestra `Andrea dijo: …`.
  3. Carlos repite la dosis: recibe `Ojo: …` y la ficha sigue con 1 dosis.
  4. Cron de cierre: Carlos recibe un pendiente y toca `todobien`.
  5. Al final, la ficha muestra la dosis `dada`.
- [ ] **Desplegar:** `npx wrangler deploy` con los secretos de `wrangler secret put`. Configurar el webhook en Meta apuntando a `https://<worker>/wa` y verificarlo.
- [ ] **Verificación real (H18):** desde un celular de prueba, la secuencia 1–5 funciona con WhatsApp y Gemini reales. Anotar las latencias en `docs/operacion/runbook.md`.
- [ ] Commit `test(e2e): flujo F1 completo`.

### Task 25: Placas reales — `scripts/qr-placas.ts`, `docs/operacion/escribir-placas.md`

- [ ] `npm run qr` genera `placas.svg`: una cuadrícula A4 con QR + nombre + código por animal, con el enlace `{baseUrl}/p/{codigo}`. Test: hay 70 QR y cada uno decodifica a su URL (decodificador en el test).
- [ ] Guía paso a paso para escribir un registro NDEF URI con una app gratuita de escritura NFC en Android y bloquear la placa. Probar en Android y en iPhone; para iPhone, el registro debe ser https.
- [ ] Escribir las 6 placas de la demo y probarlas mojadas y sobre una reja.
- [ ] El QR también va impreso en la tarjeta del canil (`placas.svg` incluye una variante de tarjeta de canil 10×15 cm), porque los iPhone X y anteriores no leen NFC en segundo plano. Se imprime además una tarjeta de respaldo en papel plastificado por canil con advertencias y horario de dosis, para cuando no haya celular (lección de `docs/research/casos/02` y `07`).
- [ ] Commit `feat(placas): QR imprimibles y guía NFC`.

### Task 26: Prueba en celular viejo y latencia

- [ ] Abrir `/p/TOB01` en el Android gama baja con 3G limitado (DevTools "Slow 3G" en un PC como respaldo). Esperado: ≤ 3 s.
- [ ] 10 audios reales, midiendo desde que se suelta el botón de grabar hasta que se ve el amarillo al refrescar la ficha. Esperado: ≤ 10 s en 9 de 10.
- [ ] Correr `npx promptfoo eval` con la transcripción de los 10 audios. Esperado: 0 dosis dadas en futuro.
- [ ] Registrar los resultados en `docs/operacion/runbook.md` y abrir un issue por cada fallo, que va a la Task 27.

---

## Oleada 4 — cierre

### Task 27: Endurecimiento

- [ ] Corregir lo que dejó la Task 26, cada arreglo con su test.
- [ ] Revisar el Review Focus 1–5 en el entorno real.
- [ ] `npx vitest run` en verde. Commit por arreglo.

### Task 28: Demo y pitch

- [ ] Datos de demo fijos (`npm run seed -- --demo`): la dosis de Tobías a las 14:00 queda atrasada a la hora del pitch (configurable con `DEMO_HORA`).
- [ ] Guion de 3 min de la sección 6 del spec. Ensayar 2 veces con cronómetro.
- [ ] Video de respaldo grabado.
- [ ] Diapositivas:
  - Problema (manguera y celular).
  - Demo.
  - REA: "una donación se vuelve kilos y dosis".
  - Casos reales (de `docs/research/casos/`).
  - $0 y la letra pequeña de WhatsApp.
  - Odoo como camino de crecimiento.
- [ ] Una frase del cliente para cerrar.
- [ ] Argumentos de pitch sacados de `docs/research/casos/00-sintesis.md`:
  - $0 por transacción, frente al software de albergues que cobra por adopción.
  - Cero instalación, frente a herramientas que los voluntarios abandonan.
  - La causa número 1 de errores de medicación es la dosis dada y no registrada, y el amarillo la ataca.
- [ ] No usar cifras marcadas "NO VERIFICADO".

### Task 29: Revisión final

- [ ] Un subagente revisor, en el modelo más capaz, revisa toda la rama contra el spec y este plan.
- [ ] Se corrige lo crítico.
- [ ] Tag `demo-v1`.

---

## Mapa spec → tareas

| Spec | Tareas |
|---|---|
| §5.1 Placa | 25 |
| §5.2 Ficha | 4, 15, 16a, 16b |
| §5.3 Audio | 3, 9, 11b, 13, 14 |
| §5.4 Cierre | 5, 14, 22 |
| §5.5 Dinero | 6, 19, 20 |
| §5.6 Padrinos | 7, 21 |
| §5.7 Alertas | 6, 22 |
| §7 REA | 1, 10a, 10b |
| §8 WhatsApp $0 | 9, 22 |
| §12 Decisiones | 14, 16b, 17, 10b, 19, 11a |
| §6 Demo | 24, 26, 28 |

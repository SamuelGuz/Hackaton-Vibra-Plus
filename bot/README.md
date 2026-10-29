# Bot de WhatsApp de Huellitas

El equipo registra por WhatsApp lo que hace con los animales: con botones o con un audio. Todo queda en el Postgres de [`db/`](../db) y se ve en el panel. El espejo de `db/` lo copia a la hoja de Google.

```
Celular ──▶ WhatsApp Cloud API ──▶ POST /wa ──▶ bot/ ──▶ Postgres ──▶ espejo ──▶ Google Sheets
                                                  │  ▲
                                   Gemini Flash ◀─┘  └── Panel (GET /api/hoy, POST /api/eventos…)
```

## Cómo habla el bot

Está pensado para gente que no se lleva con la tecnología:

- **Casi todo es tocar botones.** Cada mensaje trae botones (máximo 3) o una lista (máximo 10 opciones).
- **El audio sirve siempre.** En cualquier momento se puede mandar un audio contando todo de una vez.
- **Se confirma con un toque.** Lo que se registra queda *por confirmar* hasta tocar **Sí, está bien**, **Corregir** o **Borrar**. Montos y dosis van en negrita.
- **Para volver al inicio**, escribir *menú*, *hola* o *0*. Si nadie responde en 30 minutos, el bot olvida el paso sin decir nada.
- **No hay errores técnicos.** Si Gemini falla, el bot dice "No te entendí bien" y muestra el menú.

| Opción del menú | Pasos |
|---|---|
| Le di una medicina | Lista de dosis pendientes de hoy, luego confirmar. Si ya la reportó otra persona, avisa y no la duplica |
| Abrí un bulto | Perro o gato, confirmar y "Quedan 4 días de comida" |
| Llegó comida | Perro o gato, cuántos bultos y confirmar |
| Entró plata / Salió plata | Cuánto ("50 mil" o un audio), para qué, foto opcional y confirmar |
| Factura de clínica | Foto; Gemini lee el monto y la clínica, y pregunta lo que falte |
| Contar algo de un animal | Elegir el animal o escribir su nombre (acepta apodos y errores), luego texto o audio |
| Ver lo de hoy | Medicinas que faltan, días de comida y pendientes. A la administradora también le muestra caja y deuda |
| Abrir el panel | Enlace personal `PANEL_URL/?t=<token>` (dura 90 días) |

Todas las frases están en [`src/textos.ts`](src/textos.ts), para ajustar el tono sin tocar la lógica.

## Arrancar en el PC

1. Postgres de `db/` corriendo, con la migración del bot aplicada:
   ```bash
   cd ../db && docker compose exec -T db psql -U huellitas -d huellitas < sql/003_bot.sql
   ```
2. Configuración y semilla:
   ```bash
   cd bot
   cp .env.example .env     # y llenar (ver "Cuenta de Meta" y "Gemini")
   npm install
   npm run semilla          # equipo de EQUIPO, 70 animales, tratamientos, clínicas y 2 pendientes
   ```
3. Servidor y túnel HTTPS (Meta solo manda el webhook a una dirección pública con HTTPS):
   ```bash
   npm run dev
   cloudflared tunnel --url http://localhost:8787     # en otra terminal; copia la URL https://….trycloudflare.com
   ```

## Cuenta de Meta (una sola vez)

1. En [developers.facebook.com](https://developers.facebook.com/apps), crear una app de tipo **Negocios** y agregarle el producto **WhatsApp**.
2. En **WhatsApp → Configuración de la API**:
   - Copiar el **Identificador del número de teléfono** en `WA_PHONE_ID`.
   - Copiar el **token de acceso temporal** en `WA_TOKEN`. Dura 24 horas; para la demo larga, crear un usuario del sistema con un token permanente.
   - En **Para**, agregar los números del equipo (máximo 5 con el número de prueba). Cada persona confirma con el código que le llega.
3. En **Configuración de la app → Básica**, copiar la **clave secreta de la app** en `WA_APP_SECRET`.
4. En **WhatsApp → Configuración → Webhook**:
   - URL de devolución de llamada: `https://<tu-túnel-o-dominio>/wa`.
   - Token de verificación: el mismo valor de `WA_VERIFY_TOKEN`.
   - Suscribirse al campo **messages**.
5. Cada persona del equipo le escribe primero al número de prueba. Así se abre la ventana de 24 horas y las respuestas salen gratis.

## Gemini (y OpenRouter de respaldo)

Crear la llave en [aistudio.google.com](https://aistudio.google.com/apikey) y ponerla en `GEMINI_API_KEY`. El modelo se cambia con `GEMINI_MODEL`.

De respaldo, con una llave de [openrouter.ai](https://openrouter.ai/keys) en `OPENROUTER_API_KEY`: si Gemini falla, el mismo mensaje se manda a OpenRouter (`OPENROUTER_MODEL`, por defecto `google/gemini-2.5-flash`; debe aceptar audio e imágenes). Si a Gemini se le acaba la cuota, se salta 10 minutos y todo va directo a OpenRouter. Basta con una de las dos llaves ([`src/ia/respaldo.ts`](src/ia/respaldo.ts)).

Privacidad: el plan gratis de Gemini usa los datos para entrenar. Por eso, a los textos se les quitan antes teléfonos y cédulas ([`src/ia/redactar.ts`](src/ia/redactar.ts)), y la IA solo recibe nombres de animales, dosis y clínicas.

## En el VPS

```bash
npm ci && npm run build
npm start                     # o con pm2: pm2 start "npm start" --name huellitas-bot
```

- Delante va Caddy, que pone el HTTPS solo. Ejemplo de `Caddyfile`: `bot.tudominio.com { reverse_proxy localhost:8787 }`.
- Los audios y las fotos se guardan en `./archivos` (se cambia con `ARCHIVOS_DIR`). Hay que incluir esa carpeta en las copias de seguridad.
- El servicio trabaja en hora de Colombia (`America/Bogota`), sin importar la zona del VPS.

## Frente externo (adoptantes y padrinos)

Se prende solo cuando hay `GEMINI_API_KEY` ([`src/externo.ts`](src/externo.ts)). Al arrancar, el bot dice en la terminal si quedó prendido.

- **WhatsApp:** un número que no es del equipo lo atiende el agente de adopciones, no el aviso de "todavía no te tengo en la lista". El equipo sigue con su menú de siempre.
- **Rutas públicas**, sin sesión, con límite de peticiones por IP y CORS abierto para la página de adopción:

| Ruta | Qué hace |
|---|---|
| `GET /api/publico/rag/perritos?especie=perro\|gato&limite=N` | Tarjetas de los animales |
| `GET /api/publico/rag/buscar?q=...` | Búsqueda por lo que la persona necesita |
| `GET /api/publico/rag/preguntar?q=...` | Preguntas sobre el refugio |
| `POST /api/publico/agente-voz` | Turno con el agente: `{ texto }` o `{ audioBase64, mime }`, más `sesionId` y `perroId` opcionales. `/api/publico/voz-adopcion` es la misma ruta con otro nombre |
| `POST /api/publico/campanas/generar` | Arma una campaña de correo y su vista previa |
| `POST /api/publico/campanas/enviar` | La envía. Pide la cabecera `X-Campana-Clave` igual a `CAMPANAS_CLAVE` y Resend o SMTP configurado. Sin eso no sale ningún correo |

- `WA_NUMERO_BOT` es el número de los botones "Escríbenos por WhatsApp".
- Las sesiones del agente viven en memoria: si el bot se reinicia, la conversación con un interesado empieza de nuevo.

## API para el panel

Todas las rutas piden `Authorization: Bearer <token>`. El token sale del enlace que manda el bot (`?t=<token>`). Sin token, la respuesta es `401`. El CORS solo deja pasar a `PANEL_URL`.

| Ruta | Qué hace |
|---|---|
| `GET /api/hoy` | Devuelve `DatosAlbergue`, la misma forma de [`panel/src/data/tipos.ts`](../panel/src/data/tipos.ts), más `yo` (id de quien pregunta). Los animales traen además `alias` |
| `GET /api/eventos?desde=AAAA-MM-DD&hasta=AAAA-MM-DD&tipo=dosis\|inventario\|movimiento\|nota` | `{ dosisDadas, inventario, movimientos, notas }` del rango (por defecto, hoy) |
| `POST /api/eventos` | Recibe una lista de `Propuesta` con un `id` uuid generado en el celular. Guarda como **confirmado** y es idempotente por ese uuid. Responde `{ guardados: [{ id, registroId }], errores }` |
| `POST /api/eventos/estado` | Recibe `{ ids, estado }`, con `estado` en `confirmado`, `corregido` o `anulado`. Los `ids` son los de `porConfirmar` o los uuid del panel (para "Deshacer"). Responde `{ cambiados }` |
| `GET /archivos/<nombre>` | Audio o foto de un registro (`media_url`). Acepta `?t=<token>`, para usarlo en `<img>` y `<audio>` |

Reglas que conviene saber:

- `inventario`, `movimientos` y `dosisDadas` solo traen lo **confirmado**. Lo que falta confirmar viene en `porConfirmar`, como en los datos demo.
- La deuda de cada clínica se calcula como facturas menos abonos confirmados. La caja y la bodega parten de las claves `caja_inicial_*` y `conteo_*` de la tabla `config`.
- `corregido` anula lo que se había guardado. La versión buena llega como un registro nuevo.

## Pruebas

```bash
npm test                      # conversación, API y funciones puras, con WhatsApp y Gemini falsos
TEST_DATABASE_URL=postgres://huellitas:<clave>@localhost:5434/huellitas_test npm test   # también contra Postgres real
```

`TEST_DATABASE_URL` **borra todo** y vuelve a sembrar. Nunca debe apuntar a la base de verdad. Para crear la base de pruebas:

```bash
docker compose exec db psql -U huellitas -c "CREATE DATABASE huellitas_test"
for f in sql/*.sql; do docker compose exec -T db psql -U huellitas -d huellitas_test < $f; done
```

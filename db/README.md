# db/ — Postgres del servidor

El servidor (`bot/`) guarda todo en Postgres y copia la bitácora a Google Sheets para que el equipo la pueda mirar. Postgres es la fuente de verdad; Sheets es una copia.

## Qué guarda

`schema.sql` crea todo con `CREATE ... IF NOT EXISTS`, así que se puede aplicar en cada arranque. Las columnas agregadas después de crear una tabla (`solicitudes.destinatario`, `seguimientos.llamada_humana`) llevan además un `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, para que una base ya creada se actualice sola.

| Tabla | Contenido |
|---|---|
| `personas`, `animales`, `tratamientos`, `clinicas`, `catalogo`, `padrinazgos` | Los datos de base del albergue, con columnas tipadas |
| `config` | Tres objetos pequeños y fijos: `servidor` (umbrales, hora de cierre…), `comida` y `base` (último conteo y cuadre) |
| `registros` | La bitácora: un hecho por fila (dosis, comida, plata, notas…). `/api/hoy` es una vista calculada de esta tabla |
| `solicitudes`, `seguimientos` | Panel de adopción |
| `kv` | Lo efímero con vencimiento: idempotencia de webhooks, candados, ventana de 24 h, tokens de un solo uso |
| `sheets_pendientes` | La cola de copia a Sheets (ver abajo) |

`registros` usa columnas tipadas (`id`, `fecha_hora`, `dia`, `agente_id`, `origen`, `estado`, `tipo`, `animal_id`, `frase_exacta`, `confianza`, `registro_ia_id`, `media_url`, `compromiso_id`, `confirmado_por`, `confirmado_en`) más la propuesta completa en `propuesta jsonb`. No hay entidad-atributo-valor (`docs/placa-viva/diseno.md` §7). `dia` es el día de Bogotá de `fecha_hora`. No hay llaves foráneas: el panel puede mandar eventos de un animal que aún no está cargado y la bitácora no debe rechazarlos.

## La copia a Sheets (outbox)

Cada vez que se agrega un registro nuevo, o se cambia su estado, la misma sentencia SQL deja una fila en `sheets_pendientes`. Un `id` repetido no encola nada. Así:

- El registro queda guardado y visible aunque Sheets esté caído o responda 429 (Review Focus 5).
- Nadie escribe en Sheets dentro de la petición del usuario.

| Columna | Qué es |
|---|---|
| `id` | Orden de llegada |
| `tab` | Hoja de destino (`Eventos`) |
| `operacion` | `agregar` (la `fila` es el `Registro` completo) o `actualizar` (la `fila` es `{ id, estado, confirmadoPor, confirmadoEn }`) |
| `fila` | La carga, en JSON |
| `intentos` | Cuántas veces falló el envío |
| `creado_en` | Cuándo se encoló |

El cron de reintentos (T19) usa `pendientesSheets(sql, limite)` de `bot/src/store/pg-repo.ts`: escribe en Sheets y llama `marcarEnviados(sql, ids)` (borra las filas enviadas) o `marcarFallo(sql, ids)` (suma un intento y las deja para el próximo ciclo). Los registros de la semilla no se encolan.

## Cómo correrlo en local

- **Sin `DATABASE_URL`:** el servidor usa `MemoryRepo` y `MemoryKv` con la semilla. No hace falta instalar nada. Lo guardado se pierde al apagar.
- **Con `DATABASE_URL`:** el servidor usa `PgRepo` y `PgKv` sobre `pg`. Al arrancar aplica `migrar(sql)` (lee `db/schema.sql`) y `sembrar(sql, semilla)`, que carga la semilla solo si todas las tablas de datos están vacías. Si el proceso cae a la mitad de la primera carga, hay que vaciar las tablas y arrancar de nuevo.
- **PGlite** (`@electric-sql/pglite`, Postgres en memoria) es lo que usan las pruebas de `bot/test/store/`: `sqlDesdePglite(new PGlite())`. No se necesita servidor.

Para probar con un Postgres de verdad:

```sh
docker run --rm -p 5432:5432 -e POSTGRES_PASSWORD=huellitas -e POSTGRES_DB=huellitas postgres:17
DATABASE_URL=postgres://postgres:huellitas@localhost:5432/huellitas npm run dev   # desde bot/
```

## Variables de entorno

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Cadena de conexión de Postgres. Si falta, memoria |
| `SESSION_SECRET` | Obligatoria para el servidor (no es de la base) |

Las demás (`SHEETS_ID`, `GOOGLE_SA_JSON`…) están en `bot/src/env.ts` y son de la copia a Sheets.

# Base de datos de Huellitas

Postgres 16 con las 24 tablas de la hoja [Huellitas_DB_Estructura](https://docs.google.com/spreadsheets/d/1t-aBpF-fBO2VOGQ3pM-jHct4l56aosgotiVajp09nNw) y un **espejo** que copia cada cambio a esa hoja de Google en unos 2 segundos.

```
Postgres ──(aviso por tabla)──▶ espejo/espejo.js ──(Sheets API)──▶ Google Sheets (solo lectura)
```

- Postgres es la fuente de verdad. **Lo que se edite a mano en la hoja se pierde** en la siguiente copia.
- Cada tabla tiene un trigger que avisa por el canal `espejo` cuando cambia. El espejo reescribe esa pestaña completa.
- Google deja 60 escrituras por minuto, así que el espejo escribe como máximo una vez cada 2 s y agrupa lo que llegue en ese tiempo.

## Arrancar en el PC

```bash
cd db
cp .env.example .env          # y cambiar la clave
docker compose up -d          # crea la base y corre sql/*.sql la primera vez
npm install
npm run espejo                # necesita el paso de Google de abajo
```

Conexión: `postgres://huellitas:<clave>@localhost:5434/huellitas` (el puerto es 5434 porque el 5432 y el 5433 ya están ocupados en el PC de desarrollo).

Los archivos de `sql/` solo se ejecutan cuando el volumen está vacío. Para empezar de cero: `docker compose down -v && docker compose up -d`.

Si la base ya existe, cada archivo nuevo se aplica a mano, por ejemplo el del bot:

```bash
docker compose exec -T db psql -U huellitas -d huellitas < sql/003_bot.sql
```

`003_bot.sql` crea `conversaciones`, `mensajes_wa` y `sesiones_panel`, que son internas del bot: el espejo no las copia a la hoja.
`004_equipo.sql` crea `solicitudes_equipo` y `005_buzon.sql` convierte `mensajes_wa` en el buzón duradero: cada mensaje de WhatsApp se guarda al llegar y solo se cierra cuando el bot lo atendió.

## Permiso para escribir en la hoja (una sola vez)

1. Crear una cuenta de servicio y su llave en un proyecto de Google Cloud:
   ```bash
   gcloud services enable sheets.googleapis.com
   gcloud iam service-accounts create huellitas-espejo
   gcloud iam service-accounts keys create credenciales-google.json \
     --iam-account=huellitas-espejo@<PROYECTO>.iam.gserviceaccount.com
   ```
2. Compartir la hoja con `huellitas-espejo@<PROYECTO>.iam.gserviceaccount.com` como **Editor**.
3. Poner el id de la hoja en `SHEET_ID` dentro de `.env`.

`credenciales-google.json` y `.env` no se suben a git.

## Pasar al VPS

En el VPS se hace lo mismo: copiar `db/`, crear `.env` y `credenciales-google.json`, `docker compose up -d` y dejar `npm run espejo` corriendo con un supervisor (pm2 o systemd). Si el espejo pierde la conexión, reintenta cada 5 s y al volver copia todo de nuevo.

Para mover los datos del PC al VPS:

```bash
docker compose exec -T db pg_dump -U huellitas huellitas > huellitas.sql
# en el VPS, con la base recién creada:
docker compose exec -T db psql -U huellitas -d huellitas -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker compose exec -T db psql -U huellitas -d huellitas < huellitas.sql
```

## Diferencias con la hoja

- `solicitudes_adopcion.scepta_esterilizacion` se llama `acepta_esterilizacion` (era un error de tipeo).
- Los ids son números consecutivos (1, 2, 3…) para que se lean fácil en la hoja.
- `alias` y `advertencias` de `animales` son listas; en la hoja salen separadas por `; `.

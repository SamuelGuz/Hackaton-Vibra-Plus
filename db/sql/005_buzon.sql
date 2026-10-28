-- Buzón duradero: mensajes_wa ya no solo recuerda el id, también guarda el mensaje hasta que se atiende.
-- Si el bot se cae a mitad de camino, al volver retoma lo pendiente; si falla, reintenta con espera.
-- Es de uso interno: espejo.js ya salta mensajes_wa.
--
-- En una base que ya existe se aplica a mano:
--   docker compose exec -T db psql -U huellitas -d huellitas < sql/005_buzon.sql

BEGIN;

ALTER TABLE mensajes_wa
  ADD COLUMN IF NOT EXISTS telefono   text,
  ADD COLUMN IF NOT EXISTS nombre     text,
  -- La entrada ya leída del webhook (texto, audio, foto o botón), lista para atender
  ADD COLUMN IF NOT EXISTS entrada    jsonb,
  -- Los que ya estaban se dan por atendidos
  ADD COLUMN IF NOT EXISTS estado     text NOT NULL DEFAULT 'atendido' CHECK (estado IN ('pendiente', 'atendido', 'fallido')),
  ADD COLUMN IF NOT EXISTS intentos   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proximo_en timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS error      text;

CREATE INDEX IF NOT EXISTS mensajes_wa_pendientes ON mensajes_wa (proximo_en) WHERE estado = 'pendiente';

COMMIT;

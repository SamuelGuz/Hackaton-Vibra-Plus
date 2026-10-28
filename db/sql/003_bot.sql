-- Tablas y columnas que necesita el bot de WhatsApp (bot/).
-- conversaciones, mensajes_wa y sesiones_panel son de uso interno: no llevan el aviso del espejo
-- y espejo.js las salta, para que los tokens de sesión nunca lleguen a la hoja de Google.
--
-- En una base que ya existe se aplica a mano:
--   docker compose exec -T db psql -U huellitas -d huellitas < sql/003_bot.sql

BEGIN;

-- Un movimiento de bodega que llega por audio queda por confirmar, igual que las dosis y la plata.
-- Lo que ya existía o se toca en el panel queda confirmado.
ALTER TABLE inventario_movimientos
  ADD COLUMN estado text NOT NULL DEFAULT 'confirmado'
  CHECK (estado IN ('por_confirmar','confirmado','corregido','anulado'));

-- uuid que genera el panel: si reenvía el mismo registro al volver la señal, no se duplica
ALTER TABLE registros_ia ADD COLUMN cliente_id uuid UNIQUE;

-- Un cambio de estado hecho desde el panel se puede deshacer: se sabe de qué registro salió
ALTER TABLE historial_estados ADD COLUMN registro_id bigint REFERENCES registros_ia(id);

-- En qué paso de la conversación va cada persona del equipo
CREATE TABLE conversaciones (
  usuario_id     bigint PRIMARY KEY REFERENCES usuarios(id),
  paso           text NOT NULL DEFAULT 'menu',
  datos          jsonb NOT NULL DEFAULT '{}',
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- Meta reenvía el mismo mensaje si no le respondemos rápido: se guarda el id para atenderlo una vez
CREATE TABLE mensajes_wa (
  wa_message_id text PRIMARY KEY,
  recibido_en   timestamptz NOT NULL DEFAULT now()
);

-- Enlace personal que manda el bot para entrar al panel
CREATE TABLE sesiones_panel (
  token      text PRIMARY KEY,
  usuario_id bigint NOT NULL REFERENCES usuarios(id),
  creado_en  timestamptz NOT NULL DEFAULT now(),
  expira_en  timestamptz NOT NULL
);

CREATE INDEX ON registros_ia (estado, creado_en);
CREATE INDEX ON eventos_salud (registro_id);
CREATE INDEX ON inventario_movimientos (registro_id);
CREATE INDEX ON movimientos_financieros (registro_id);
CREATE INDEX ON historial_estados (registro_id);

COMMIT;

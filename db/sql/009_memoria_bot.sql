-- Memoria privada del bot: sesiones sanitizadas, bajas y acciones idempotentes.
-- No se expone por ninguna ruta pública. Las claves de contacto deben ser hashes.
CREATE TABLE IF NOT EXISTS bot_memoria (
  clave text PRIMARY KEY,
  valor jsonb NOT NULL,
  vence_en timestamptz,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bot_memoria_vencimiento ON bot_memoria (vence_en) WHERE vence_en IS NOT NULL;

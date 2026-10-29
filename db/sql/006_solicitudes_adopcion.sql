-- Solicitudes de adopción guardadas por el bot: las del formulario y las que arma el agente cuando propone una visita.
-- Solo agrega columnas a solicitudes_adopcion (001); no cambia ni borra datos que ya existan.
-- Es de uso interno: lleva cédula, dirección y teléfono, así que espejo.js NO la copia a la hoja.
--
-- En una base que ya existe se aplica a mano:
--   docker compose exec -T db psql -U huellitas -d huellitas < sql/006_solicitudes_adopcion.sql

BEGIN;

ALTER TABLE solicitudes_adopcion
  -- De dónde llegó: el formulario de Google o una conversación con el agente
  ADD COLUMN IF NOT EXISTS origen            text NOT NULL DEFAULT 'formulario' CHECK (origen IN ('formulario', 'agente')),
  -- El id del formulario o la conversación del agente ('wa:<teléfono>', 'web:<sesión>'): importar dos veces no duplica
  ADD COLUMN IF NOT EXISTS clave_origen      text,
  -- Lo que decide la coordinación; gana sobre el montón sugerido (color)
  ADD COLUMN IF NOT EXISTS monton_manual     text CHECK (monton_manual IN ('verde', 'amarillo', 'rojo')),
  ADD COLUMN IF NOT EXISTS nota              text NOT NULL DEFAULT '',
  -- Fecha y hora ISO de la llamada (la API rechaza otro formato)
  ADD COLUMN IF NOT EXISTS llamada_agendada  text,
  -- La visita que propuso el agente. No es una reserva: queda por confirmar con la coordinación
  ADD COLUMN IF NOT EXISTS visita_propuesta  timestamptz,
  ADD COLUMN IF NOT EXISTS visita_estado     text CHECK (visita_estado IN ('propuesta')),
  -- Pre-evaluación del agente (0-100). Informa; no decide la adopción
  ADD COLUMN IF NOT EXISTS puntaje_idoneidad integer CHECK (puntaje_idoneidad BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS puntaje_riesgo    integer CHECK (puntaje_riesgo BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS actualizado_en    timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS solicitudes_adopcion_clave_origen ON solicitudes_adopcion (clave_origen);

COMMIT;

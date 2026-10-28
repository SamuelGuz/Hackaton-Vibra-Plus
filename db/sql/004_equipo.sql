-- Quién le escribió al bot sin estar en el equipo. La administradora lo ve en el panel (Equipo)
-- y lo agrega con un toque, sin escribir el número a mano.
-- Es de uso interno: no lleva el aviso del espejo y espejo.js la salta.
--
-- En una base que ya existe se aplica a mano:
--   docker compose exec -T db psql -U huellitas -d huellitas < sql/004_equipo.sql

BEGIN;

CREATE TABLE solicitudes_equipo (
  -- Solo dígitos, como llega de WhatsApp (573001234567)
  telefono          text PRIMARY KEY,
  -- Nombre del perfil de WhatsApp: lo puso la persona, puede venir vacío
  nombre_perfil     text,
  mensajes          integer NOT NULL DEFAULT 1,
  primer_mensaje_en timestamptz NOT NULL DEFAULT now(),
  ultimo_mensaje_en timestamptz NOT NULL DEFAULT now()
);

COMMIT;

-- Permite dejar trazabilidad de retractaciones, cancelaciones y solicitudes de cambio de fecha.
-- Aplicación manual en cada base, igual que las otras migraciones del repositorio.
BEGIN;

ALTER TABLE solicitudes_adopcion
  DROP CONSTRAINT IF EXISTS solicitudes_adopcion_visita_estado_check;

ALTER TABLE solicitudes_adopcion
  ADD CONSTRAINT solicitudes_adopcion_visita_estado_check
  CHECK (visita_estado IN ('propuesta', 'retractada', 'cancelada', 'cambio_solicitado'));

COMMIT;

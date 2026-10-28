-- Cada vez que cambia una tabla, avisa por el canal 'espejo' con el nombre de la tabla.
-- El servicio espejo/ escucha ese canal y reescribe la pestaña de Google Sheets.
-- El aviso es por sentencia (no por fila): un INSERT de 500 filas manda un solo aviso.

BEGIN;

CREATE FUNCTION avisar_espejo() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('espejo', TG_TABLE_NAME);
  RETURN NULL;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format(
      'CREATE TRIGGER avisar_espejo AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON %I
         FOR EACH STATEMENT EXECUTE FUNCTION avisar_espejo()', t);
  END LOOP;
END;
$$;

COMMIT;

-- Esquema de Postgres del servidor (bot/). Idempotente: se puede correr en cada arranque.
-- Lo aplica migrar() de bot/src/store/pg-repo.ts, que quita los comentarios y parte el archivo en sentencias.
-- Por eso no puede haber punto y coma dentro de un texto entre comillas, ni bloques con dólares dobles.
-- Columnas tipadas, sin entidad-atributo-valor (docs/placa-viva/diseno.md §7).
-- Sin llaves foráneas: el panel puede mandar un animal_id que todavía no está cargado, y la bitácora no debe rechazarlo.
-- "orden" conserva el orden en que se cargó cada fila (los repos devuelven en ese orden, como MemoryRepo).

CREATE TABLE IF NOT EXISTS personas (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  cargo text NOT NULL,
  rol text NOT NULL,
  color text NOT NULL,
  foto text,
  telefono text,
  activo boolean,
  orden serial
);
CREATE INDEX IF NOT EXISTS personas_telefono ON personas (telefono);

CREATE TABLE IF NOT EXISTS animales (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  especie text NOT NULL CHECK (especie IN ('perro', 'gato')),
  estado text NOT NULL,
  foto text,
  fecha_ingreso text NOT NULL,
  advertencias jsonb NOT NULL DEFAULT '[]',
  caracter text NOT NULL DEFAULT '',
  padrino text,
  codigo text,
  alias jsonb,
  canil text,
  orden serial
);
CREATE INDEX IF NOT EXISTS animales_codigo ON animales (upper(codigo));

CREATE TABLE IF NOT EXISTS tratamientos (
  id text PRIMARY KEY,
  animal_id text NOT NULL,
  medicamento text NOT NULL,
  dosis text NOT NULL,
  horas jsonb NOT NULL,
  inicio text NOT NULL,
  fin text NOT NULL,
  critico boolean,
  activo boolean,
  orden serial
);
CREATE INDEX IF NOT EXISTS tratamientos_animal ON tratamientos (animal_id);

CREATE TABLE IF NOT EXISTS clinicas (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  deuda bigint NOT NULL,
  limite bigint NOT NULL,
  orden serial
);

-- Solo para ConfigServidor ('servidor'), ConfigComida ('comida') y BaseAlbergue ('base'): objetos pequeños y fijos, no datos del negocio.
CREATE TABLE IF NOT EXISTS config (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS catalogo (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  tipo text NOT NULL,
  kg_por_unidad double precision NOT NULL,
  especie_objetivo text CHECK (especie_objetivo IN ('perro', 'gato')),
  consumo_diario_kg_por_animal double precision,
  orden serial
);

CREATE TABLE IF NOT EXISTS padrinazgos (
  id text PRIMARY KEY,
  persona_telefono text NOT NULL,
  persona_nombre text NOT NULL,
  animal_id text NOT NULL,
  activo boolean NOT NULL,
  orden serial
);

-- La bitácora (modelo REA): una fila por hecho. /api/hoy es una vista calculada de esta tabla.
CREATE TABLE IF NOT EXISTS registros (
  id text PRIMARY KEY,
  fecha_hora timestamptz NOT NULL,
  -- Día de Bogotá de fecha_hora (el panel y el cierre piden por día)
  dia date NOT NULL,
  agente_id text NOT NULL,
  origen text NOT NULL CHECK (origen IN ('panel', 'audio', 'foto', 'texto')),
  estado text NOT NULL CHECK (estado IN ('por_confirmar', 'confirmado', 'corregido', 'anulado')),
  -- Tipo de la propuesta ('dosis', 'inventario', 'movimiento'…) y animal al que se refiere (vacío si no es de un animal)
  tipo text NOT NULL,
  animal_id text,
  -- La propuesta completa (PropuestaServidor)
  propuesta jsonb NOT NULL,
  frase_exacta text,
  confianza double precision,
  registro_ia_id text,
  media_url text,
  compromiso_id text,
  confirmado_por text,
  confirmado_en timestamptz,
  -- Orden de llegada
  llegada bigserial
);
CREATE INDEX IF NOT EXISTS registros_dia ON registros (dia);
CREATE INDEX IF NOT EXISTS registros_animal_id ON registros (animal_id);
CREATE INDEX IF NOT EXISTS registros_registro_ia_id ON registros (registro_ia_id);
CREATE INDEX IF NOT EXISTS registros_compromiso_id ON registros (compromiso_id);
CREATE INDEX IF NOT EXISTS registros_estado ON registros (estado);

CREATE TABLE IF NOT EXISTS solicitudes (
  id text PRIMARY KEY,
  -- ISO de cuándo llegó, tal como se guardó
  fecha text NOT NULL,
  nombre text NOT NULL,
  telefono text NOT NULL,
  cedula text NOT NULL,
  direccion text NOT NULL,
  animal_id text,
  familia_de_acuerdo boolean NOT NULL,
  para_quien text NOT NULL CHECK (para_quien IN ('yo', 'familia', 'regalo')),
  -- Para quién dijo que es, con sus palabras ('su mamá'). Opcional.
  destinatario text,
  vivienda text NOT NULL CHECK (vivienda IN ('casa', 'apartamento', 'finca', 'otra')),
  vivienda_con_mallas boolean NOT NULL,
  donde_vivira text NOT NULL CHECK (donde_vivira IN ('dentro_casa', 'patio', 'guardia', 'amarrado', 'azotea')),
  acepta_esterilizar boolean NOT NULL,
  acepta_vacunar boolean NOT NULL,
  acepta_seguimiento boolean NOT NULL,
  quiere_entrega_inmediata boolean NOT NULL,
  pregunto_por_caracter boolean NOT NULL,
  plan_emergencia text NOT NULL,
  mascotas_anteriores text NOT NULL,
  motivo text NOT NULL,
  monton_manual text CHECK (monton_manual IN ('verde', 'amarillo', 'rojo')),
  nota text NOT NULL,
  llamada_agendada text,
  orden serial
);

CREATE TABLE IF NOT EXISTS seguimientos (
  id text PRIMARY KEY,
  solicitud_id text,
  adoptante_nombre text NOT NULL,
  adoptante_telefono text NOT NULL,
  animal_id text NOT NULL,
  -- YYYY-MM-DD
  fecha_entrega text NOT NULL,
  dia smallint NOT NULL CHECK (dia IN (2, 5, 15, 30, 90)),
  -- YYYY-MM-DD en que toca llamar
  fecha text NOT NULL,
  resultado text CHECK (resultado IN ('verde', 'amarillo', 'rojo')),
  -- Amarillo y rojo exigen llamada humana. Nulo en filas guardadas antes de esta columna.
  llamada_humana boolean,
  nota text NOT NULL,
  orden serial
);
CREATE INDEX IF NOT EXISTS seguimientos_fecha ON seguimientos (fecha);

-- Bases creadas antes de estas columnas: CREATE TABLE IF NOT EXISTS no las toca, estas líneas sí.
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS destinatario text;
ALTER TABLE seguimientos ADD COLUMN IF NOT EXISTS llamada_humana boolean;

-- Lo efímero: idempotencia de webhooks, candados, ventana de 24 h, contexto de animal, tokens de un solo uso
CREATE TABLE IF NOT EXISTS kv (
  key text PRIMARY KEY,
  value text NOT NULL,
  -- Sin vencimiento si es nulo
  expira_en timestamptz
);
CREATE INDEX IF NOT EXISTS kv_expira_en ON kv (expira_en);

-- Mensajes de WhatsApp que llegan de golpe al volver la señal. El webhook solo inserta y responde.
-- El trabajador los cierra cuando el registro ya está en la bitácora. Un id (wamid) repetido no crea otra fila.
CREATE TABLE IF NOT EXISTS wa_entrantes (
  id text PRIMARY KEY,
  telefono text NOT NULL,
  timestamp_wa bigint NOT NULL,
  payload jsonb NOT NULL,
  estado text NOT NULL CHECK (estado IN ('recibido', 'en_proceso', 'guardado', 'sin_ia')),
  intentos integer NOT NULL DEFAULT 0,
  proximo_en timestamptz NOT NULL DEFAULT now(),
  bloqueo_hasta timestamptz,
  error text,
  recibido_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wa_entrantes_telefono ON wa_entrantes (telefono, timestamp_wa);

-- Respuestas que todavía no se pudieron enviar. Un 429 las deja aquí. El mensaje entrante ya está guardado.
CREATE TABLE IF NOT EXISTS wa_salientes (
  id text PRIMARY KEY,
  telefono text NOT NULL,
  cuerpo text NOT NULL,
  botones jsonb,
  estado text NOT NULL CHECK (estado IN ('pendiente', 'enviado')),
  intentos integer NOT NULL DEFAULT 0,
  proximo_en timestamptz NOT NULL DEFAULT now(),
  entrante_id text
);
CREATE INDEX IF NOT EXISTS wa_salientes_pendientes ON wa_salientes (estado, proximo_en);

-- Cola de copia a Google Sheets (outbox). Cada cambio de la bitácora deja una fila aquí en la misma sentencia
-- que lo guarda. El cron de reintentos (bot/src/cron) la lee, escribe en Sheets y borra lo enviado.
CREATE TABLE IF NOT EXISTS sheets_pendientes (
  id serial PRIMARY KEY,
  -- Hoja de destino ('Eventos')
  tab text NOT NULL,
  -- 'agregar' (fila nueva) o 'actualizar' (cambio de estado de una fila que ya está)
  operacion text NOT NULL CHECK (operacion IN ('agregar', 'actualizar')),
  fila jsonb NOT NULL,
  intentos integer NOT NULL DEFAULT 0,
  creado_en timestamptz NOT NULL DEFAULT now()
);

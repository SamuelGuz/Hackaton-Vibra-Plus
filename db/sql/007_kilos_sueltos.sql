-- Kilos sueltos de comida: la carne, los recortes y la menudencia que regala el carnicero llegan por kilos, no en bultos.
-- Solo agrega dos ítems al catálogo (uno por especie). No cambia ni borra datos que ya existan.
-- Los movimientos de bodega de estos ítems llevan la cantidad en kilos (kg_por_unidad = 1).
--
-- En una base que ya existe se aplica a mano:
--   docker compose exec -T db psql -U huellitas -d huellitas < sql/007_kilos_sueltos.sql

BEGIN;

INSERT INTO catalogo_items (nombre, tipo, unidad, kg_por_unidad, especie_objetivo)
VALUES ('Carne y recortes para perro', 'comida', 'kg', 1, 'perro'),
       ('Carne y recortes para gato', 'comida', 'kg', 1, 'gato')
ON CONFLICT (nombre) DO NOTHING;

COMMIT;

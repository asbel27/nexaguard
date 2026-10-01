-- =====================================================================
--  NexaGuard · Configuración de Supabase
--  Ejecuta este SQL en el SQL Editor de tu proyecto de Supabase:
--    https://supabase.com/dashboard → tu proyecto → SQL Editor → New query
-- =====================================================================

-- Tabla clave-valor para almacenar las colecciones de NexaGuard
CREATE TABLE IF NOT EXISTS kv_store (
  key         text        PRIMARY KEY,
  value       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Solo el service_role puede leer/escribir (tu servidor).
-- Las claves anon/pública no tendrán acceso.
ALTER TABLE kv_store ENABLE ROW LEVEL SECURITY;

-- Insertar las colecciones vacías (si ya existen, no las toca)
INSERT INTO kv_store (key, value) VALUES
  ('users',        '[]'::jsonb),
  ('orders',       '[]'::jsonb),
  ('sites',        '[]'::jsonb),
  ('scans',        '[]'::jsonb),
  ('tickets',      '[]'::jsonb),
  ('payments',     '[]'::jsonb),
  ('activity',     '[]'::jsonb),
  ('sessions',     '[]'::jsonb),
  ('settings',     '{}'::jsonb),
  ('paypalOrders', '{}'::jsonb),
  ('meta',         '{"v": 1}'::jsonb)
ON CONFLICT (key) DO NOTHING;


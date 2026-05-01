-- Apply once: psql "$DATABASE_URL" -f schema.sql
-- Single-table storage for pipeline ingestion.

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  name TEXT,
  description TEXT,
  price DOUBLE PRECISION,
  currency TEXT,
  images JSONB,
  availability TEXT
);

CREATE INDEX IF NOT EXISTS idx_product_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_product_category ON products(category);

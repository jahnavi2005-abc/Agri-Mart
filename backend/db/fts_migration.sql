ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(crop_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(district, '')), 'D')
) STORED;

CREATE INDEX IF NOT EXISTS products_search_idx ON products USING GIN (search_vector);

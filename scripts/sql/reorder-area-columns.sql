-- Reorder columns in areas table to place cityGreek next to city and countryGreek next to country
-- SQLite doesn't support ALTER TABLE to reorder columns, so we need to recreate the table

BEGIN TRANSACTION;

-- Create new table with correct column order
CREATE TABLE areas_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  nameGreek TEXT,
  city TEXT,
  cityGreek TEXT,
  country TEXT,
  countryGreek TEXT,
  safety REAL,
  vibe TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table to new table (handle case where columns might not exist)
INSERT INTO areas_new (id, key, name, nameGreek, city, cityGreek, country, countryGreek, safety, vibe, createdAt, updatedAt)
SELECT 
  id, 
  key, 
  name, 
  nameGreek, 
  city, 
  COALESCE(cityGreek, NULL) as cityGreek,
  country, 
  COALESCE(countryGreek, NULL) as countryGreek,
  safety, 
  vibe, 
  createdAt, 
  updatedAt
FROM areas;

-- Drop old table
DROP TABLE areas;

-- Rename new table to original name
ALTER TABLE areas_new RENAME TO areas;

-- Recreate indexes (drop first if they exist)
DROP INDEX IF EXISTS areas_name_idx;
DROP INDEX IF EXISTS areas_city_idx;
DROP INDEX IF EXISTS areas_country_idx;
CREATE INDEX areas_name_idx ON areas(name);
CREATE INDEX areas_city_idx ON areas(city);
CREATE INDEX areas_country_idx ON areas(country);

COMMIT;


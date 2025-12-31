-- INSERT statement with auto-generated CUID key
-- This will automatically generate a unique key in the format: cl + 24 lowercase hex characters
-- Just replace the values and run in DBeaver

INSERT INTO areas (
  key,
  name, 
  nameGreek, 
  city, 
  cityGreek, 
  country, 
  countryGreek, 
  safety, 
  vibe, 
  createdAt, 
  updatedAt
) VALUES (
  'cl' || lower(substr(hex(randomblob(12)), 1, 24)),  -- Auto-generates CUID-like key
  'Area Name',                    -- Replace with your area name
  'Όνομα Περιοχής',              -- Replace with Greek name (or NULL)
  'City Name',                    -- Replace with city (or NULL)
  'Όνομα Πόλης',                 -- Replace with city in Greek (or NULL)
  'Greece',                       -- Replace with country (or NULL)
  'Ελλάδα',                       -- Replace with country in Greek (or NULL)
  8.5,                            -- Replace with safety rating (or NULL)
  'Family-friendly',              -- Replace with vibe (or NULL)
  datetime('now'),
  datetime('now')
);

-- Example with minimal fields:
INSERT INTO areas (
  key,
  name,
  createdAt,
  updatedAt
) VALUES (
  'cl' || lower(substr(hex(randomblob(12)), 1, 24)),
  'Kolonaki',
  datetime('now'),
  datetime('now')
);

-- To insert multiple rows at once, use UNION ALL:
INSERT INTO areas (key, name, city, country, createdAt, updatedAt)
SELECT 
  'cl' || lower(substr(hex(randomblob(12)), 1, 24)),
  'Area 1',
  'Athens',
  'Greece',
  datetime('now'),
  datetime('now')
UNION ALL
SELECT 
  'cl' || lower(substr(hex(randomblob(12)), 1, 24)),
  'Area 2',
  'Athens',
  'Greece',
  datetime('now'),
  datetime('now');






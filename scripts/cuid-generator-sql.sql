-- SQL function to generate CUID-like keys in SQLite/DBeaver
-- This creates a reusable SQL expression you can use in INSERT statements

-- Method 1: Use as a subquery/expression in INSERT
-- Format: 'cl' + 24 random lowercase alphanumeric characters
-- Usage in INSERT:
INSERT INTO areas (
  key,
  name,
  createdAt,
  updatedAt
) VALUES (
  'cl' || substr(hex(randomblob(12)), 1, 24),  -- Generates CUID-like key
  'Area Name',
  datetime('now'),
  datetime('now')
);

-- Method 2: More accurate CUID format (lowercase hex)
-- This uses a combination of random bytes converted to lowercase hex
INSERT INTO areas (
  key,
  name,
  createdAt,
  updatedAt
) VALUES (
  'cl' || lower(substr(hex(randomblob(12)), 1, 24)),
  'Area Name',
  datetime('now'),
  datetime('now')
);

-- Method 3: Even better - uses only lowercase letters and numbers (like real CUIDs)
-- This is more complex but generates keys that look like real CUIDs
-- Note: This uses a workaround since SQLite doesn't have a direct way to do this
-- The simplest approach is to use Method 2 or generate keys externally

-- Example: Insert multiple areas with auto-generated keys
INSERT INTO areas (key, name, nameGreek, city, cityGreek, country, countryGreek, createdAt, updatedAt)
SELECT 
  'cl' || lower(substr(hex(randomblob(12)), 1, 24)) as key,
  'Area ' || row_number() OVER () as name,
  NULL as nameGreek,
  'Athens' as city,
  'Αθήνα' as cityGreek,
  'Greece' as country,
  'Ελλάδα' as countryGreek,
  datetime('now') as createdAt,
  datetime('now') as updatedAt
FROM (
  SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
);






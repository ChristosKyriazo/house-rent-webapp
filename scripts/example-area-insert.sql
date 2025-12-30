-- Example INSERT query for the areas table
-- The 'key' field uses CUID format. You can either:
-- 1. Omit it and let Prisma generate it automatically (recommended)
-- 2. Provide your own unique string

-- Option 1: Let Prisma generate the key automatically (omit key column)
INSERT INTO areas (
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
  'Nea Smirni',
  'Νέα Σμύρνη',
  'Athens',
  'Αθήνα',
  'Greece',
  'Ελλάδα',
  8.5,
  'Family-friendly',
  datetime('now'),
  datetime('now')
);

-- Option 2: Provide your own key (must be unique)
-- You can generate a CUID-like string or use any unique identifier
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
  'clx123abc456def789ghi012',  -- Your custom unique key
  'Kolonaki',
  'Κολωνάκι',
  'Athens',
  'Αθήνα',
  'Greece',
  'Ελλάδα',
  9.0,
  'Upscale, vibrant',
  datetime('now'),
  datetime('now')
);

-- Example with NULL values for optional fields
INSERT INTO areas (
  name,
  nameGreek,
  city,
  cityGreek,
  country,
  countryGreek,
  safety,
  vibe
) VALUES (
  'Plaka',
  'Πλάκα',
  'Athens',
  'Αθήνα',
  'Greece',
  'Ελλάδα',
  7.5,
  'Touristic, historic'
);





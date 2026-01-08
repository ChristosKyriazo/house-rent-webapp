-- Template for inserting a new area manually in DBeaver
-- Replace the values below with your actual data

-- Option 1: With all fields (including key)
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
  'clxxxxxxxxxxxxxxxxxxxxxxxx',  -- Generate using: node scripts/generate-cuid.js
  'Area Name',                    -- English name (required)
  'Όνομα Περιοχής',              -- Greek name (optional, can be NULL)
  'City Name',                    -- City (optional, can be NULL)
  'Όνομα Πόλης',                 -- City in Greek (optional, can be NULL)
  'Greece',                       -- Country (optional, can be NULL)
  'Ελλάδα',                       -- Country in Greek (optional, can be NULL)
  8.5,                            -- Safety rating 0-10 (optional, can be NULL)
  'Family-friendly',              -- Vibe description (optional, can be NULL)
  datetime('now'),                -- Created timestamp
  datetime('now')                 -- Updated timestamp
);

-- Option 2: Minimal (only required fields)
INSERT INTO areas (
  key,
  name,
  createdAt,
  updatedAt
) VALUES (
  'clxxxxxxxxxxxxxxxxxxxxxxxx',  -- Generate using: node scripts/generate-cuid.js
  'Area Name',
  datetime('now'),
  datetime('now')
);

-- Option 3: Without key (if your database allows auto-generation)
-- Note: SQLite doesn't auto-generate CUIDs, so you must provide the key
-- But if you're using Prisma migrations, you can omit it and Prisma will generate it










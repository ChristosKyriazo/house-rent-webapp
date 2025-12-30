-- Fixed INSERT statement for SQLite
-- Use || for concatenation (not concat())
-- Make sure all values are separated by commas

INSERT INTO areas (
  id, 
  "key", 
  name, 
  nameGreek, 
  city, 
  country, 
  safety, 
  vibe, 
  createdAt, 
  updatedAt, 
  cityGreek, 
  countryGreek
)
VALUES (
  (SELECT COALESCE(MAX(id), 0) + 1 FROM areas),  -- Auto-increment ID
  'cl' || lower(substr(hex(randomblob(12)), 1, 24)),  -- Auto-generated key (use || not concat)
  'Neos Kosmos',
  'Νέος Κόσμος',  -- Fixed: added comma
  'Athens',
  'Greece',
  NULL,
  NULL,
  datetime('now'),
  datetime('now'),
  'Αθήνα',
  'Ελλάδα'
);

-- Alternative: Let SQLite auto-generate the ID (recommended)
INSERT INTO areas (
  "key", 
  name, 
  nameGreek, 
  city, 
  country, 
  safety, 
  vibe, 
  createdAt, 
  updatedAt, 
  cityGreek, 
  countryGreek
)
VALUES (
  'cl' || lower(substr(hex(randomblob(12)), 1, 24)),  -- Auto-generated key
  'Neos Kosmos',
  'Νέος Κόσμος',
  'Athens',
  'Greece',
  NULL,
  NULL,
  datetime('now'),
  datetime('now'),
  'Αθήνα',
  'Ελλάδα'
);



-- Seed universities directly in SQL
-- Run this after applying the migration

INSERT INTO universities (key, name, city, createdAt, updatedAt) VALUES
('cl' || lower(substr(hex(randomblob(12)), 1, 24)), 'National and Kapodistrian University of Athens', 'Athens', datetime('now'), datetime('now')),
('cl' || lower(substr(hex(randomblob(12)), 1, 24)), 'National Technical University of Athens', 'Athens', datetime('now'), datetime('now')),
('cl' || lower(substr(hex(randomblob(12)), 1, 24)), 'Athens University of Economics and Business', 'Athens', datetime('now'), datetime('now')),
('cl' || lower(substr(hex(randomblob(12)), 1, 24)), 'Agricultural University of Athens', 'Athens', datetime('now'), datetime('now')),
('cl' || lower(substr(hex(randomblob(12)), 1, 24)), 'Panteion University', 'Athens', datetime('now'), datetime('now')),
('cl' || lower(substr(hex(randomblob(12)), 1, 24)), 'Harokopio University', 'Athens', datetime('now'), datetime('now')),
('cl' || lower(substr(hex(randomblob(12)), 1, 24)), 'University of Piraeus', 'Athens', datetime('now'), datetime('now')),
('cl' || lower(substr(hex(randomblob(12)), 1, 24)), 'University of West Attica', 'Athens', datetime('now'), datetime('now')),
('cl' || lower(substr(hex(randomblob(12)), 1, 24)), 'Athens School of Fine Arts', 'Athens', datetime('now'), datetime('now'));



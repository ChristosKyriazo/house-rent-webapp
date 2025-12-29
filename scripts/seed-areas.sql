-- Clear all existing areas
DELETE FROM areas;

-- Reset the auto-increment counter (SQLite specific)
DELETE FROM sqlite_sequence WHERE name = 'areas';

-- Insert Athens Municipalities
INSERT INTO areas (id, "key", name, nameGreek, city, cityGreek, country, countryGreek, safety, vibe, createdAt, updatedAt) VALUES
(1, 'ckb4x9p2m0000abcde1fghij', 'Agia Paraskevi', 'Αγία Παρασκευή', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(2, 'ckb4x9p2m0000klmnopq2rstu', 'Agia Varvara', 'Αγία Βαρβάρα', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(3, 'ckb4x9p2m0000vwxyz3abcd4', 'Agioi Anargyroi-Kamatero', 'Άγιοι Ανάργυροι-Καματερό', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(4, 'ckb4x9p2m0000efghij5klmn', 'Agios Dimitrios', 'Άγιος Δημήτριος', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(5, 'ckb4x9p2m0000opqrst6uvwx', 'Aigaleo', 'Αιγάλεω', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(6, 'ckb4x9p2m0000yzabcd7efgh', 'Alimos', 'Άλιμος', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(7, 'ckb4x9p2m0000ijklmn8opqr', 'Amarousio', 'Αμαρούσιο', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(8, 'ckb4x9p2m0000stuvwx9yzab', 'Athens', 'Αθήνα', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(9, 'ckb4x9p2m0000cdefgh0ijkl', 'Chaidari', 'Χαϊδάρι', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(10, 'ckb4x9p2m0000mnopqr1stuv', 'Chalandri', 'Χαλάνδρι', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(11, 'ckb4x9p2m0000wxyzab2cdef', 'Dafni-Ymittos', 'Δάφνη-Υμηττός', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(12, 'ckb4x9p2m0000ghijkl3mnop', 'Elliniko-Argyroupoli', 'Ελληνικό-Αργυρούπολη', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(13, 'ckb4x9p2m0000qrstuv4wxyz', 'Filadelfeia-Chalkidona', 'Φιλαδέλφεια-Χαλκηδόνα', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(14, 'ckb4x9p2m0000abcdey5fghi', 'Filothei-Psychiko', 'Φιλοθέη-Ψυχικό', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(15, 'ckb4x9p2m0000jklmno6pqrs', 'Galatsi', 'Γαλάτσι', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(16, 'ckb4x9p2m0000tuvwxy7zabc', 'Glyfada', 'Γλυφάδα', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(17, 'ckb4x9p2m0000defghi8jklm', 'Ilion', 'Ίλιον', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(18, 'ckb4x9p2m0000nopqrs9tuvw', 'Ilioupoli', 'Ηλιούπολη', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(19, 'ckb4x9p2m0000xyzabc0defg', 'Irakleio', 'Ηράκλειο', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(20, 'ckb4x9p2m0000hijklm1nopq', 'Kaisariani', 'Καισαριανή', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(21, 'ckb4x9p2m0000rstuvw2xyza', 'Kallithea', 'Καλλιθέα', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(22, 'ckb4x9p2m0000bcdefg3hijk', 'Keratsini-Drapetsona', 'Κερατσίνι-Δραπετσώνα', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(23, 'ckb4x9p2m0000lmnopq4rstu', 'Kifisia', 'Κηφισιά', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(24, 'ckb4x9p2m0000vwxyzab5cde', 'Korydallos', 'Κορυδαλλός', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(25, 'ckb4x9p2m0000fghijl6mnop', 'Lykovrysi-Pefki', 'Λυκόβρυση-Πεύκη', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(26, 'ckb4x9p2m0000qrstuv7wxyz', 'Metamorfosi', 'Μεταμόρφωση', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(27, 'ckb4x9p2m0000abcdey8fghi', 'Moschato-Tavros', 'Μοσχάτο-Ταύρος', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(28, 'ckb4x9p2m0000jklmno9pqrs', 'Nea Ionia', 'Νέα Ιωνία', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(29, 'ckb4x9p2m0000tuvwxz0abcd', 'Nea Smyrni', 'Νέα Σμύρνη', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(30, 'ckb4x9p2m0000efghij1klmn', 'Nikaia-Agios Ioannis Rentis', 'Νίκαια-Άγιος Ιωάννης Ρέντης', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(31, 'ckb4x9p2m0000opqrst2uvwx', 'Palaio Faliro', 'Παλαιό Φάληρο', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(32, 'ckb4x9p2m0000yzabcde3fgh', 'Papagou-Cholargos', 'Παπάγου-Χολαργός', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(33, 'ckb4x9p2m0000ijklmno4pqrs', 'Piraeus', 'Πειραιάς', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(34, 'ckb4x9p2m0000tuvwxy5zabc', 'Peristeri', 'Περιστέρι', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(35, 'ckb4x9p2m0000defghij6klm', 'Petroupoli', 'Πετρούπολη', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(36, 'ckb4x9p2m0000nopqrst7uvwx', 'Vrilissia', 'Βριλήσσια', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(37, 'ckb4x9p2m0000yzabcdef8ghi', 'Vyronas', 'Βύρωνας', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(38, 'ckb4x9p2m0000jklmnop9qrs', 'Zografou', 'Ζωγράφου', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),

-- Thessaloniki Municipalities
(39, 'ckb4x9p2m0000tuvwxyz0abcd', 'Ampelokipoi-Menemeni', 'Αμπελόκιποι-Μενεμένη', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(40, 'ckb4x9p2m0000efghijkl1mn', 'Chalkidona', 'Χαλκηδόνα', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(41, 'ckb4x9p2m0000opqrstuv2wx', 'Delta', 'Δέλτα', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(42, 'ckb4x9p2m0000yzabcdef3gh', 'Kalamaria', 'Καλαμαριά', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(43, 'ckb4x9p2m0000ijklmnop4qrs', 'Kordelio-Evosmos', 'Κορδελιό-Εύοσμος', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(44, 'ckb4x9p2m0000tuvwxyz5abc', 'Lagkadas', 'Λαγκαδάς', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(45, 'ckb4x9p2m0000defghij6klm', 'Neapoli-Sykies', 'Νεάπολη-Συκιές', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(46, 'ckb4x9p2m0000nopqrst7uvw', 'Oraiokastro', 'Ωραιόκαστρο', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(47, 'ckb4x9p2m0000xyzabcde8fg', 'Pavlos Melas', 'Παύλος Μελάς', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(48, 'ckb4x9p2m0000hijklmnop9qr', 'Pylaia-Chortiatis', 'Πυλαία-Χορτιάτης', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(49, 'ckb4x9p2m0000stuvwxyz0ab', 'Thermaikos', 'Θερμαϊκός', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(50, 'ckb4x9p2m0000cdefghij1kl', 'Thermi', 'Θέρμη', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(51, 'ckb4x9p2m0000mnopqrst2uv', 'Thessaloniki', 'Θεσσαλονίκη', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(52, 'ckb4x9p2m0000wxyzabcd3ef', 'Volvi', 'Βόλβη', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),

-- Volos Municipalities
(53, 'ckb7p8q9r0000xyzab1cdefg', 'Volos', 'Βόλος', 'Volos', 'Βόλος', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(54, 'ckb7p8q9r0000hijklm2nopqr', 'Nea Ionia', 'Νέα Ιωνία', 'Volos', 'Βόλος', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(55, 'ckb7p8q9r0000stuvwx3yzabc', 'Iolkos', 'Ιωλκός', 'Volos', 'Βόλος', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(56, 'ckb7p8q9r0000defghi4jklmn', 'Artemida', 'Αρτεμίδα', 'Volos', 'Βόλος', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(57, 'ckb7p8q9r0000opqrst5uvwxyz', 'Aisonia', 'Αισωνία', 'Volos', 'Βόλος', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(58, 'ckb7p8q9r0000abcdey6fghij', 'Makrinitsa', 'Μακρινίτσα', 'Volos', 'Βόλος', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(59, 'ckb7p8q9r0000klmnop7qrstu', 'Agria', 'Άγρια', 'Volos', 'Βόλος', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),

-- Ioannina Municipalities
(60, 'ckb7p8q9r0000vwxyzab8cdef', 'Ioannina', 'Ιωάννινα', 'Ioannina', 'Ιωάννινα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(61, 'ckb7p8q9r0000ghijkl9mnopq', 'Dodoni', 'Δωδώνη', 'Ioannina', 'Ιωάννινα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(62, 'ckb7p8q9r0000rstuvw0xyzab', 'Konitsa', 'Κόνιτσα', 'Ioannina', 'Ιωάννινα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(63, 'ckb7p8q9r0000cdefgh1ijklm', 'Metsovo', 'Μέτσοβο', 'Ioannina', 'Ιωάννινα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(64, 'ckb7p8q9r0000nopqrs2tuvwx', 'Zagori', 'Ζαγόρι', 'Ioannina', 'Ιωάννινα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(65, 'ckb7p8q9r0000yzabcdef3ghi', 'Zitsa', 'Ζίτσα', 'Ioannina', 'Ιωάννινα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),

-- Serres Municipalities
(66, 'ckb7p8q9r0000jklmnop4qrst', 'Serres', 'Σέρρες', 'Serres', 'Σέρρες', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(67, 'ckb7p8q9r0000uvwxyz5abcde', 'Ano Vrontou', 'Άνω Βροντού', 'Serres', 'Σέρρες', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(68, 'ckb7p8q9r0000fghijkl6mnop', 'Kapetan Mitrousi', 'Καπετάν Μητρούσι', 'Serres', 'Σέρρες', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(69, 'ckb7p8q9r0000qrstuvw7xyza', 'Lefkonas', 'Λευκώνας', 'Serres', 'Σέρρες', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),

-- Komotini Municipalities
(70, 'ckb7p8q9r0000bcdefgh8ijkl', 'Komotini', 'Κομοτηνή', 'Komotini', 'Κομοτηνή', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(71, 'ckb7p8q9r0000mnopqrs9tuvw', 'Iasmos', 'Ίασμος', 'Komotini', 'Κομοτηνή', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),

-- Chania Municipalities
(72, 'ckb7p8q9r0000xyzabcde0fgh', 'Chania', 'Χανιά', 'Chania', 'Χανιά', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(73, 'ckb7p8q9r0000ijklmnop1qrst', 'Apokoronas', 'Αποκόρωνας', 'Chania', 'Χανιά', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(74, 'ckb7p8q9r0000uvwxyzab2cde', 'Kissamos', 'Κίσσαμος', 'Chania', 'Χανιά', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(75, 'ckb7p8q9r0000fghijklm3nop', 'Platanias', 'Πλατανιάς', 'Chania', 'Χανιά', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(76, 'ckb7p8q9r0000qrstuvwx4yza', 'Sfakia', 'Σφακιά', 'Chania', 'Χανιά', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),

-- Iraklio (Heraklion) Municipalities
(77, 'ckb7p8q9r0000bcdefghi5jkl', 'Heraklion', 'Ηράκλειο', 'Iraklio', 'Ηράκλειο', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(78, 'ckb7p8q9r0000mnopqrst6uvwx', 'Hersonissos', 'Χερσόνησος', 'Iraklio', 'Ηράκλειο', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(79, 'ckb7p8q9r0000yzabcdef7ghij', 'Minoa Pediada', 'Μινώα Πεδιάδα', 'Iraklio', 'Ηράκλειο', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),

-- Patra Municipalities
(80, 'ckb7p8q9r0000klmnopqr8stuv', 'Patras', 'Πάτρα', 'Patra', 'Πάτρα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(81, 'ckb7p8q9r0000wxyzabcd9efgh', 'Messatida', 'Μεσσάτιδα', 'Patra', 'Πάτρα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(82, 'ckb7p8q9r0000ijklmno0pqrst', 'Paralia', 'Παραλία', 'Patra', 'Πάτρα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(83, 'ckb7p8q9r0000uvwxyzab1cdef', 'Rio', 'Ρίο', 'Patra', 'Πάτρα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00');


-- Clear all existing areas
DELETE FROM areas;

-- Reset the auto-increment counter (SQLite specific)
DELETE FROM sqlite_sequence WHERE name = 'areas';

-- Insert all areas with unique keys
INSERT INTO areas (id, "key", name, nameGreek, city, cityGreek, country, countryGreek, safety, vibe, createdAt, updatedAt) VALUES
-- Athens Municipalities
(1, 'clwbs4694w1ouc65fh3kbtlygd', 'Agia Paraskevi', 'Αγία Παρασκευή', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(2, 'cl5o1uy7fuve1jr2x9b4nnyboc', 'Agia Varvara', 'Αγία Βαρβάρα', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(3, 'clijs10wkiu5b8nethgza4yk7q', 'Agioi Anargyroi-Kamatero', 'Άγιοι Ανάργυροι-Καματερό', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(4, 'cl43g77tkkbusul6ndu55v94ba', 'Agios Dimitrios', 'Άγιος Δημήτριος', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(5, 'cl39m9gfq5asehck9tbvvt0g1c', 'Aigaleo', 'Αιγάλεω', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(6, 'cl9ppb6z4rfwsk4oz8wbe74gz5', 'Alimos', 'Άλιμος', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(7, 'clo194cs8juoabko2u3yr1k4ua', 'Amarousio', 'Αμαρούσιο', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(8, 'cl6kregpu14l2fi3oipfprv89w', 'Athens', 'Αθήνα', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(9, 'clkxlzexaxk7bw0wyo0y4qn8ly', 'Chaidari', 'Χαϊδάρι', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(10, 'cla30n4k7h3o97qwuefobafy9k', 'Chalandri', 'Χαλάνδρι', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(11, 'clargk1xfntkfo6641pg1wc0ky', 'Dafni-Ymittos', 'Δάφνη-Υμηττός', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(12, 'clugl2rapa7n7s4cxf9cd3taiz', 'Elliniko-Argyroupoli', 'Ελληνικό-Αργυρούπολη', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(13, 'cl18avogucks07paot6x3izrld', 'Filadelfeia-Chalkidona', 'Φιλαδέλφεια-Χαλκηδόνα', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(14, 'clqb3huskww9axnrjhh8ou98rx', 'Filothei-Psychiko', 'Φιλοθέη-Ψυχικό', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(15, 'cl75xbuedeuml8g12yfjisub6j', 'Galatsi', 'Γαλάτσι', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(16, 'clvskkyy4gi5t64iqs8erpz1jp', 'Glyfada', 'Γλυφάδα', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(17, 'cldttzfbyf6hw9j7y3x83g7ei4', 'Ilion', 'Ίλιον', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(18, 'clbg63jemwqxuncwtcr63ppc80', 'Ilioupoli', 'Ηλιούπολη', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(19, 'clfzzp5iri3xl7t6gkrrhamc0r', 'Irakleio', 'Ηράκλειο', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(20, 'cly44stgc75mgzxq96g6plgp6q', 'Kaisariani', 'Καισαριανή', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(21, 'cl16svts2s67fdbkplgdzb98q7', 'Kallithea', 'Καλλιθέα', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(22, 'clinlw3hduoh3zcdi8tmoy5cx0', 'Keratsini-Drapetsona', 'Κερατσίνι-Δραπετσώνα', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(23, 'cl3jbttzdowxm75ftgv3j0n6ai', 'Kifisia', 'Κηφισιά', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(24, 'clvbsjzcrq3wd9xgtlkqejus5y', 'Korydallos', 'Κορυδαλλός', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(25, 'clz4bsmjfryp1iiggq9h0qcpcy', 'Lykovrysi-Pefki', 'Λυκόβρυση-Πεύκη', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(26, 'cl1jyt0r9hl6iv0hvr10irjsil', 'Metamorfosi', 'Μεταμόρφωση', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(27, 'clq6cq5vccis0imvb3sbpr497g', 'Moschato-Tavros', 'Μοσχάτο-Ταύρος', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(28, 'cl2asjapwq5lp090vdf8fmfqst', 'Nea Ionia', 'Νέα Ιωνία', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(29, 'cld6em5zwz3v1etve9op7zh7fz', 'Nea Smyrni', 'Νέα Σμύρνη', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(30, 'cln8lx9x3vr76yxty84kxfqhsw', 'Nikaia-Agios Ioannis Rentis', 'Νίκαια-Άγιος Ιωάννης Ρέντης', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(31, 'cl7al5za7bpxjg6o1zeg0uw75l', 'Palaio Faliro', 'Παλαιό Φάληρο', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(32, 'clkm0qcgwzdhygtlxbqeotw14h', 'Papagou-Cholargos', 'Παπάγου-Χολαργός', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(33, 'cl8n9h73larx3naz3bmq1izmus', 'Piraeus', 'Πειραιάς', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(34, 'clefi28th3tyisumotmsfaqoh7', 'Peristeri', 'Περιστέρι', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(35, 'cl5xgnrhyhetqgj2otdpc7vcoj', 'Petroupoli', 'Πετρούπολη', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(36, 'cl1pn9t2r5hll59ngiscz9d3sk', 'Vrilissia', 'Βριλήσσια', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(37, 'cl057fqiumf4sjuovybclwunap', 'Vyronas', 'Βύρωνας', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(38, 'cla9t4f5i09n3778yjykgfpeea', 'Zografou', 'Ζωγράφου', 'Athens', 'Αθήνα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),

-- Thessaloniki Municipalities
(39, 'cl3tsa9dcx9dba7thecpdoc994', 'Ampelokipoi-Menemeni', 'Αμπελόκιποι-Μενεμένη', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(40, 'clausbtpoby6rrg4uy57h9vkfe', 'Chalkidona', 'Χαλκηδόνα', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(41, 'clqtbotarii7l6q16gzjcupg0p', 'Delta', 'Δέλτα', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(42, 'clfvisvqfdzk9wnt7retkaatz5', 'Kalamaria', 'Καλαμαριά', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(43, 'clvffq4vw6n27wqe7hujt9vcgp', 'Kordelio-Evosmos', 'Κορδελιό-Εύοσμος', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(44, 'clxm04uajyly68fizk20e6frxw', 'Lagkadas', 'Λαγκαδάς', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(45, 'clryqmpnlc9jdxs8gl7plmh8tj', 'Neapoli-Sykies', 'Νεάπολη-Συκιές', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(46, 'claoq3qo4o5pfsbnhwrjlubb5n', 'Oraiokastro', 'Ωραιόκαστρο', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(47, 'clkjw5063smjz4d1gaxghcyoxk', 'Pavlos Melas', 'Παύλος Μελάς', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(48, 'cln00rwrfw8dto863ytlrp69mn', 'Pylaia-Chortiatis', 'Πυλαία-Χορτιάτης', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(49, 'cl4qb0mii94nopcm5otj7cnzmx', 'Thermaikos', 'Θερμαϊκός', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(50, 'cl4tdpuyxjlwiknjgftms3rg0g', 'Thermi', 'Θέρμη', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(51, 'clijo5tt8opsocw2qjpza0quu2', 'Thessaloniki', 'Θεσσαλονίκη', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),
(52, 'cl2ae4iyc92s9g7m7k3fam3d5o', 'Volvi', 'Βόλβη', 'Thessaloniki', 'Θεσσαλονίκη', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:23:00', '2025-12-29 21:23:00'),

-- Volos Municipalities
(53, 'clacbyjqs3om2dgwex2fk2djwp', 'Volos', 'Βόλος', 'Volos', 'Βόλος', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(54, 'clolu7jh9s4pvb4bjbyixcmoyq', 'Nea Ionia', 'Νέα Ιωνία', 'Volos', 'Βόλος', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(55, 'cl0ya2pyzk80sez2s4hlif0m28', 'Iolkos', 'Ιωλκός', 'Volos', 'Βόλος', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(56, 'clk79mkxtizdzeb1dpf0g0jp2b', 'Artemida', 'Αρτεμίδα', 'Volos', 'Βόλος', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(57, 'clu8exhnb7druh0ne3b09g729j', 'Aisonia', 'Αισωνία', 'Volos', 'Βόλος', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(58, 'clssq7o4wm2ugg9c3ap8x389z1', 'Makrinitsa', 'Μακρινίτσα', 'Volos', 'Βόλος', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(59, 'clw0ix1j7qgwnmat66nv9iw6zl', 'Agria', 'Άγρια', 'Volos', 'Βόλος', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),

-- Ioannina Municipalities
(60, 'cl8bvhsfzjjrg6k3uesa3rh2bt', 'Ioannina', 'Ιωάννινα', 'Ioannina', 'Ιωάννινα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(61, 'clneh7pi6qa4cwr7cettsfb29d', 'Dodoni', 'Δωδώνη', 'Ioannina', 'Ιωάννινα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(62, 'cll7ojf3o2c1pspo0l42xjlb20', 'Konitsa', 'Κόνιτσα', 'Ioannina', 'Ιωάννινα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(63, 'cly8wbt5qijy4zk6wwp44htove', 'Metsovo', 'Μέτσοβο', 'Ioannina', 'Ιωάννινα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(64, 'clfuq8tg9p7ulx763e0bgsz94z', 'Zagori', 'Ζαγόρι', 'Ioannina', 'Ιωάννινα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(65, 'clpjho2qjyea3mqegprhsebm83', 'Zitsa', 'Ζίτσα', 'Ioannina', 'Ιωάννινα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),

-- Serres Municipalities
(66, 'cl1uxevt0p9o5xdwst6ltlq5zs', 'Serres', 'Σέρρες', 'Serres', 'Σέρρες', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(67, 'cl80rm4y1s720u2hhekrxi9asf', 'Ano Vrontou', 'Άνω Βροντού', 'Serres', 'Σέρρες', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(68, 'cl4hdhl7klmp1on1o0i15xtmbe', 'Kapetan Mitrousi', 'Καπετάν Μητρούσι', 'Serres', 'Σέρρες', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(69, 'cldjc0d2me1dhytlebvoascij9', 'Lefkonas', 'Λευκώνας', 'Serres', 'Σέρρες', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),

-- Komotini Municipalities
(70, 'cljj5d1ef4o56e5wobo3dcu4u6', 'Komotini', 'Κομοτηνή', 'Komotini', 'Κομοτηνή', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(71, 'clj5b036chp0a859632pzujkk1', 'Iasmos', 'Ίασμος', 'Komotini', 'Κομοτηνή', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),

-- Chania Municipalities
(72, 'clybw7t5yy0p6p1uibhbctup5w', 'Chania', 'Χανιά', 'Chania', 'Χανιά', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(73, 'cl173wpks70aivswh1hkmro8pj', 'Apokoronas', 'Αποκόρωνας', 'Chania', 'Χανιά', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(74, 'cl7r0s8f3whm9llc362mdr9y5j', 'Kissamos', 'Κίσσαμος', 'Chania', 'Χανιά', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(75, 'clqnfaqrv67co0162oxztu7xlc', 'Platanias', 'Πλατανιάς', 'Chania', 'Χανιά', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(76, 'clbrsrxvnc9c9nih4omi9jaj5r', 'Sfakia', 'Σφακιά', 'Chania', 'Χανιά', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),

-- Iraklio (Heraklion) Municipalities
(77, 'cl16owuirchn8pkzveufs9uwhd', 'Heraklion', 'Ηράκλειο', 'Iraklio', 'Ηράκλειο', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(78, 'cl2zjel746h1i1kyg6xwqtiubq', 'Hersonissos', 'Χερσόνησος', 'Iraklio', 'Ηράκλειο', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(79, 'cllhy27p7ftyp5krd747pr797d', 'Minoa Pediada', 'Μινώα Πεδιάδα', 'Iraklio', 'Ηράκλειο', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),

-- Patra Municipalities
(80, 'claupjronvrzaqu6i0mhvakeop', 'Patras', 'Πάτρα', 'Patra', 'Πάτρα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(81, 'claew5rwpiw2gchu54athvk62w', 'Messatida', 'Μεσσάτιδα', 'Patra', 'Πάτρα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(82, 'clapp5ol180doxhfdmj5o0tdc0', 'Paralia', 'Παραλία', 'Patra', 'Πάτρα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00'),
(83, 'clbvzsbs8clo26ni9fig6w33tz', 'Rio', 'Ρίο', 'Patra', 'Πάτρα', 'Greece', 'Ελλάδα', NULL, NULL, '2025-12-29 21:25:00', '2025-12-29 21:25:00');






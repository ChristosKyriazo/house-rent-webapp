/**
 * Seed test — creates 100 realistic listings across multiple Greek cities
 * using the owner account (upgraded to Pro for the duration of the test).
 *
 * Run manually whenever you need realistic data on staging:
 *   npx playwright test tests/e2e/flows/seed-100-listings.spec.ts
 */
import { test, expect } from '@playwright/test'
import path from 'path'

test.use({ storageState: path.join(__dirname, '../.auth/owner.json') })
test.setTimeout(600_000) // 10 min — 100 API calls throttled to 17/min to stay under Maps rate limit

const LISTINGS = [
  // ── Athens ──────────────────────────────────────────────────────────────
  { city: 'Athens', area: 'Kolonaki',      street: 'Patriarchou Ioakeim 22',   listingType: 'rent', price: 1400, size: 78,  bed: 2, bath: 1, floor: 3, heat: 'Autonomous', agent: 'Natural gas', park: false, built: 2005, reno: null,  energy: 'B', desc: 'Elegant 2-bedroom in the heart of Kolonaki, steps from designer boutiques and galleries. High ceilings, herringbone parquet, and a south-facing balcony overlooking a leafy street.' },
  { city: 'Athens', area: 'Exarchia',      street: 'Themistokleous 44',         listingType: 'rent', price: 580,  size: 50,  bed: 1, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Power',       park: false, built: 1965, reno: 2020, energy: 'D', desc: 'Bright 1-bedroom in bohemian Exarchia, surrounded by cafés, bookshops and street art. Freshly painted with new appliances. Walking distance to the National Archaeological Museum.' },
  { city: 'Athens', area: 'Pangrati',      street: 'Frinichou 9',               listingType: 'rent', price: 750,  size: 65,  bed: 2, bath: 1, floor: 2, heat: 'Central',    agent: 'Natural gas', park: false, built: 1980, reno: 2018, energy: 'C', desc: 'Charming 2-bedroom in sought-after Pangrati, close to the Panathenaic Stadium and First Cemetery park. Renovated kitchen, wood-framed windows, and a quiet inner courtyard.' },
  { city: 'Athens', area: 'Petralona',     street: 'Troon 15',                  listingType: 'rent', price: 680,  size: 62,  bed: 1, bath: 1, floor: 0, heat: 'Autonomous', agent: 'Power',       park: false, built: 1970, reno: 2017, energy: 'D', desc: 'Ground-floor garden apartment in up-and-coming Petralona, five minutes on foot from the Thisio metro. Private 20 sqm garden — rare in central Athens.' },
  { city: 'Athens', area: 'Monastiraki',   street: 'Ermou 120',                 listingType: 'rent', price: 1200, size: 70,  bed: 2, bath: 1, floor: 4, heat: 'Autonomous', agent: 'Natural gas', park: false, built: 2001, reno: null,  energy: 'C', desc: 'Top-floor apartment with unobstructed Acropolis view from the living room balcony. Modern open-plan kitchen, two good-sized bedrooms. Ideal for short or long-term professionals.' },
  { city: 'Athens', area: 'Ampelokipoi',   street: 'Michalakopoulou 55',        listingType: 'rent', price: 860,  size: 80,  bed: 2, bath: 1, floor: 2, heat: 'Central',    agent: 'Oil',         park: true,  built: 1992, reno: 2019, energy: 'C', desc: 'Spacious 2-bedroom with parking in central Ampelokipoi. Close to Megaro Mousikis metro and the US Embassy. Includes a large storage room and a sunny balcony facing east.' },
  { city: 'Athens', area: 'Koukaki',       street: 'Veikou 34',                 listingType: 'rent', price: 950,  size: 74,  bed: 2, bath: 1, floor: 3, heat: 'Autonomous', agent: 'Natural gas', park: false, built: 1998, reno: 2021, energy: 'B', desc: 'Renovated 2-bedroom in trendy Koukaki, a short walk from the Acropolis Museum and Filopappou Hill. Polished concrete floors, designer kitchen, and a wraparound balcony.' },
  { city: 'Athens', area: 'Dafni',         street: 'Lakonias 28',               listingType: 'rent', price: 520,  size: 55,  bed: 1, bath: 1, floor: 1, heat: 'Central',    agent: 'Oil',         park: false, built: 1978, reno: 2015, energy: 'D', desc: 'Affordable 1-bedroom in Dafni, on the metro line, 20 minutes from the city centre. Quiet residential street, well-maintained communal areas. Ideal for a single professional or couple.' },
  { city: 'Athens', area: 'Galatsi',       street: 'Fokidos 12',                listingType: 'rent', price: 490,  size: 48,  bed: 1, bath: 1, floor: 2, heat: 'Autonomous', agent: 'Power',       park: false, built: 1974, reno: 2016, energy: 'E', desc: 'Compact but well-maintained 1-bedroom on a quiet street in Galatsi. Fully equipped kitchen, double-glazed windows, and a small balcony with mountain views.' },
  { city: 'Athens', area: 'Ilisia',        street: 'Eleftheriou Venizelou 18',  listingType: 'rent', price: 820,  size: 68,  bed: 2, bath: 1, floor: 3, heat: 'Central',    agent: 'Natural gas', park: false, built: 1987, reno: 2020, energy: 'C', desc: 'Well-located 2-bedroom near the University of Athens campus. Renovated with modern fittings, hardwood floors, and fitted wardrobes. Quiet building with a shared rooftop terrace.' },
  // ── Thessaloniki ─────────────────────────────────────────────────────────
  { city: 'Thessaloniki', area: 'Ladadika',       street: 'Katouni 8',          listingType: 'rent', price: 720,  size: 65,  bed: 2, bath: 1, floor: 2, heat: 'Central',    agent: 'Natural gas', park: false, built: 1995, reno: 2018, energy: 'C', desc: 'Lively 2-bedroom in the historic Ladadika district, surrounded by tavernas, wine bars and the old port. Exposed brick walls and industrial-chic finishes.' },
  { city: 'Thessaloniki', area: 'Ano Poli',        street: 'Eptapyrgiou 14',     listingType: 'rent', price: 650,  size: 60,  bed: 2, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Power',       park: false, built: 1920, reno: 2019, energy: 'E', desc: 'Restored neoclassical apartment in the UNESCO-listed Upper Town. Panoramic views over the White Tower and the Thermaic Gulf from every window.' },
  { city: 'Thessaloniki', area: 'Kalamaria',       street: 'Karatasou 29',       listingType: 'rent', price: 850,  size: 85,  bed: 3, bath: 1, floor: 3, heat: 'Central',    agent: 'Natural gas', park: true,  built: 2000, reno: null,  energy: 'B', desc: 'Generous 3-bedroom family apartment in well-to-do Kalamaria. Covered parking included. 10-minute walk to the seafront promenade and excellent primary schools.' },
  { city: 'Thessaloniki', area: 'Toumba',          street: 'Konstantinoupoleos 7',listingType: 'rent', price: 580,  size: 58,  bed: 1, bath: 1, floor: 4, heat: 'Autonomous', agent: 'Power',       park: false, built: 1985, reno: 2017, energy: 'D', desc: 'Top-floor 1-bedroom with city views near Toumba football stadium. Recently redecorated, new boiler and air conditioning. Bus connection direct to the city centre.' },
  { city: 'Thessaloniki', area: 'Panorama',        street: 'Komninon 55',        listingType: 'rent', price: 1300, size: 110, bed: 3, bath: 2, floor: 2, heat: 'Autonomous', agent: 'Natural gas', park: true,  built: 2008, reno: null,  energy: 'A', desc: 'Luxurious 3-bedroom in the elevated suburb of Panorama with sweeping sea-and-city views. A+ rated energy, underfloor heating, two covered parking spaces, and a private garden.' },
  { city: 'Thessaloniki', area: 'Stavroupoli',     street: 'Lagkada 88',         listingType: 'rent', price: 460,  size: 52,  bed: 1, bath: 1, floor: 1, heat: 'Central',    agent: 'Oil',         park: false, built: 1975, reno: 2014, energy: 'E', desc: 'Affordable 1-bedroom in Stavroupoli, ideal for students attending Aristotle University. Updated electrical system, quiet building. Good bus connections to the city centre.' },
  { city: 'Thessaloniki', area: 'Neapoli',         street: 'Olympiados 22',      listingType: 'rent', price: 530,  size: 55,  bed: 1, bath: 1, floor: 0, heat: 'Autonomous', agent: 'Power',       park: false, built: 1968, reno: 2021, energy: 'D', desc: 'Renovated ground-floor apartment in central Neapoli with a private yard. Open-plan living room and dining area, new kitchen, and bathroom — fully move-in ready.' },
  { city: 'Thessaloniki', area: 'Pylaia',          street: 'Agias Triados 18',   listingType: 'rent', price: 900,  size: 90,  bed: 2, bath: 2, floor: 2, heat: 'Autonomous', agent: 'Natural gas', park: true,  built: 2010, reno: null,  energy: 'B', desc: 'Modern 2-bedroom plus study in the quiet eastern suburb of Pylaia. Two full bathrooms, master suite, and a large balcony with mountain views. Close to international schools.' },
  { city: 'Thessaloniki', area: 'Triandria',       street: 'Martiou 6',          listingType: 'rent', price: 620,  size: 68,  bed: 2, bath: 1, floor: 3, heat: 'Central',    agent: 'Natural gas', park: false, built: 1990, reno: 2016, energy: 'C', desc: 'Lovely 2-bedroom on a tree-lined street in Triandria. Renovated bathroom, fitted wardrobes and new double-glazed windows throughout. Close to the main shopping streets.' },
  { city: 'Thessaloniki', area: 'Evosmos',         street: 'Dimokratias 45',     listingType: 'rent', price: 480,  size: 60,  bed: 2, bath: 1, floor: 2, heat: 'Central',    agent: 'Oil',         park: false, built: 1983, reno: 2013, energy: 'D', desc: 'Practical 2-bedroom in Evosmos at an unbeatable price. Close to the ring road and IKEA. Ideal for a young couple or family looking for a budget-friendly base near Thessaloniki.' },
  // ── Patras ───────────────────────────────────────────────────────────────
  { city: 'Patras', area: 'Psila Alonia',    street: 'Agiou Andreou 76',         listingType: 'rent', price: 550,  size: 65,  bed: 2, bath: 1, floor: 2, heat: 'Autonomous', agent: 'Natural gas', park: false, built: 1988, reno: 2019, energy: 'C', desc: 'Centrally located 2-bedroom near the main commercial street and the landmark Church of St Andrew. Renovated bathroom, new air conditioning, and a spacious balcony.' },
  { city: 'Patras', area: 'Agios Nikolaos',  street: 'Maizonos 33',              listingType: 'rent', price: 480,  size: 55,  bed: 1, bath: 1, floor: 3, heat: 'Autonomous', agent: 'Power',       park: false, built: 1975, reno: 2017, energy: 'D', desc: 'Top-floor studio/1-bedroom with sea views in the old port district. Walking distance to Patras port and bus terminal. Ideal for a student at the University of Patras.' },
  { city: 'Patras', area: 'Agios Dionysios', street: 'Kanakari 18',              listingType: 'rent', price: 620,  size: 72,  bed: 2, bath: 1, floor: 1, heat: 'Central',    agent: 'Oil',         park: false, built: 1982, reno: 2020, energy: 'C', desc: 'Spacious 2-bedroom in the quiet residential area of Agios Dionysios. Renovated kitchen and bathroom, beautiful wooden floors retained from the original construction.' },
  { city: 'Patras', area: 'Rio',             street: 'Leoforos Patron-Athinon 8',listingType: 'rent', price: 700,  size: 80,  bed: 3, bath: 1, floor: 0, heat: 'Autonomous', agent: 'Natural gas', park: true,  built: 1999, reno: null,  energy: 'B', desc: 'Ground-floor villa-style apartment in Rio with a private garden and covered parking. Close to Rio-Antirio bridge and the coastal highway. Ideal for a family.' },
  { city: 'Patras', area: 'Eglyada',         street: 'Korinthou 55',             listingType: 'rent', price: 430,  size: 48,  bed: 1, bath: 1, floor: 2, heat: 'Autonomous', agent: 'Power',       park: false, built: 1972, reno: 2018, energy: 'E', desc: 'Budget 1-bedroom near the University of Patras hospital complex. Updated plumbing, quiet street, excellent value for a student or junior professional.' },
  // ── Heraklion ────────────────────────────────────────────────────────────
  { city: 'Heraklion', area: 'Nea Alikarnassos', street: 'Ikarou 14',           listingType: 'rent', price: 580,  size: 65,  bed: 2, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Power',       park: true,  built: 2000, reno: null,  energy: 'C', desc: 'Bright 2-bedroom apartment in Nea Alikarnassos, 5 minutes from Heraklion airport and 10 from the city centre. Covered parking, tiled throughout, air conditioning in all rooms.' },
  { city: 'Heraklion', area: 'Agios Ioannis',    street: 'Krisidon 28',          listingType: 'rent', price: 650,  size: 70,  bed: 2, bath: 1, floor: 2, heat: 'Autonomous', agent: 'Natural gas', park: false, built: 1995, reno: 2018, energy: 'C', desc: 'Renovated 2-bedroom in the residential district of Agios Ioannis. Walking distance to the archaeological museum and the Venetian harbour. Large balcony with partial sea view.' },
  { city: 'Heraklion', area: 'Ammoudara',         street: 'Epimenidou 3',        listingType: 'rent', price: 720,  size: 75,  bed: 2, bath: 1, floor: 3, heat: 'Autonomous', agent: 'Power',       park: false, built: 2005, reno: null,  energy: 'B', desc: 'Modern beachfront area apartment 200m from Ammoudara beach. Large terrace, sea breeze, open-plan living room. Ideal as a primary residence or seasonal rental.' },
  { city: 'Heraklion', area: 'Poros',             street: 'Neon Episkopon 21',   listingType: 'rent', price: 490,  size: 55,  bed: 1, bath: 1, floor: 0, heat: 'Autonomous', agent: 'Power',       park: false, built: 1985, reno: 2016, energy: 'D', desc: 'Ground-floor apartment in the established Poros neighbourhood, a few streets from the Heraklion municipal market. Well-maintained, quiet interior courtyard view.' },
  { city: 'Heraklion', area: 'Gazi',              street: 'Plateia Eleftherias 5',listingType: 'rent', price: 800,  size: 80,  bed: 2, bath: 1, floor: 4, heat: 'Autonomous', agent: 'Power',       park: false, built: 2002, reno: null,  energy: 'B', desc: 'Penthouse-level 2-bedroom with unobstructed views of the Aegean and the Venetian walls. Minimal modern interior, rooftop access, and a private parking space.' },
  // ── Rhodes ───────────────────────────────────────────────────────────────
  { city: 'Rhodes', area: 'Old Town',      street: 'Ippotou 4',                  listingType: 'rent', price: 1100, size: 75,  bed: 2, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Power',       park: false, built: 1900, reno: 2015, energy: 'E', desc: 'Medieval stone house within the UNESCO-listed Old Town of Rhodes. Original arched ceilings, renovated bathroom and kitchen. An extraordinary live-work space surrounded by history.' },
  { city: 'Rhodes', area: 'Ixia',          street: 'Georgiou Papandreou 33',      listingType: 'rent', price: 850,  size: 80,  bed: 2, bath: 1, floor: 2, heat: 'Autonomous', agent: 'Power',       park: true,  built: 2007, reno: null,  energy: 'B', desc: 'Modern 2-bedroom in the hotel strip of Ixia, 5 minutes drive from Rhodes Town centre. Pool access in a complex setting, covered parking, and sea views from the balcony.' },
  { city: 'Rhodes', area: 'Trianta',       street: 'Dorieon 11',                  listingType: 'rent', price: 680,  size: 68,  bed: 2, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Power',       park: false, built: 1998, reno: 2020, energy: 'C', desc: '2-bedroom apartment in the residential village of Trianta (Ialysos), 8 km from Rhodes Town. Quiet neighbourhood, close to local schools and the Filerimos mountain.' },
  { city: 'Rhodes', area: 'Faliraki',      street: 'Antiochias 7',               listingType: 'rent', price: 750,  size: 70,  bed: 2, bath: 1, floor: 0, heat: 'Autonomous', agent: 'Power',       park: true,  built: 2004, reno: null,  energy: 'B', desc: 'Ground-floor maisonette with private garden in the resort town of Faliraki. 5 minutes walk to the beach. Ideal for families or couples seeking a year-round coastal base.' },
  { city: 'Rhodes', area: 'Kremasti',      street: 'Iroon Polytechniou 22',      listingType: 'rent', price: 580,  size: 60,  bed: 2, bath: 1, floor: 2, heat: 'Autonomous', agent: 'Power',       park: false, built: 1995, reno: 2018, energy: 'C', desc: 'Well-priced 2-bedroom in Kremasti village, 6 km from Rhodes Town and the airport. Quiet, authentic local neighbourhood with a weekly street market.' },
  // ── Larissa ──────────────────────────────────────────────────────────────
  { city: 'Larissa', area: 'Agios Achillios', street: 'Papanastasiou 12',        listingType: 'rent', price: 420,  size: 58,  bed: 2, bath: 1, floor: 2, heat: 'Central',    agent: 'Natural gas', park: false, built: 1985, reno: 2016, energy: 'D', desc: 'Affordable 2-bedroom in the city centre of Larissa. Minutes from the main pedestrian square, shops and the train station. Good value for a family or young professionals.' },
  { city: 'Larissa', area: 'Nea Smyrni',      street: 'Irinis 40',               listingType: 'rent', price: 380,  size: 52,  bed: 1, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Power',       park: false, built: 1978, reno: 2019, energy: 'E', desc: 'Budget 1-bedroom in Larissa\'s Nea Smyrni district. Recently repainted with new flooring. Close to local market and public transport links.' },
  { city: 'Larissa', area: 'Terpsithea',      street: 'Agiou Konstantinou 5',    listingType: 'rent', price: 550,  size: 72,  bed: 2, bath: 1, floor: 3, heat: 'Central',    agent: 'Natural gas', park: true,  built: 2002, reno: null,  energy: 'B', desc: 'Modern 2-bedroom with parking in the upscale Terpsithea neighbourhood of Larissa. Bright open-plan living area, south-facing balcony overlooking a park.' },
  // ── Volos ────────────────────────────────────────────────────────────────
  { city: 'Volos', area: 'Palaia',         street: 'Argo Navis 8',               listingType: 'rent', price: 450,  size: 55,  bed: 1, bath: 1, floor: 2, heat: 'Autonomous', agent: 'Natural gas', park: false, built: 1990, reno: 2017, energy: 'D', desc: 'Charming 1-bedroom near the Volos waterfront and the city\'s famous ouzo bars. Renovated bathroom, new windows. Easy walk to the ferry terminal for Sporades islands.' },
  { city: 'Volos', area: 'Nea Ionia',      street: 'Anapafseos 22',              listingType: 'rent', price: 380,  size: 50,  bed: 1, bath: 1, floor: 1, heat: 'Central',    agent: 'Oil',         park: false, built: 1975, reno: 2015, energy: 'E', desc: 'Budget 1-bedroom in Volos\'s second largest district. Well-connected by bus to the University of Thessaly campus. Quiet block, reliable heating system.' },
  { city: 'Volos', area: 'Ano Volos',      street: 'Alonaki 3',                  listingType: 'rent', price: 520,  size: 65,  bed: 2, bath: 1, floor: 0, heat: 'Autonomous', agent: 'Power',       park: false, built: 1960, reno: 2022, energy: 'D', desc: 'Fully renovated stone cottage in picturesque Ano Volos on the Pelion hillside. Private terrace with Pagasetic Gulf views. Authentic character combined with modern comforts.' },
  // ── Ioannina ──────────────────────────────────────────────────────────────
  { city: 'Ioannina', area: 'Kastro',        street: 'Stavrou 6',                listingType: 'rent', price: 480,  size: 60,  bed: 2, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Power',       park: false, built: 1890, reno: 2018, energy: 'E', desc: 'Renovated apartment within the Byzantine Kastro walls of Ioannina, overlooking Lake Pamvotis. Stone walls, wooden beams, and a terrace with island views. Utterly unique.' },
  { city: 'Ioannina', area: 'Zosimaia',      street: 'Averof 14',                listingType: 'rent', price: 400,  size: 55,  bed: 1, bath: 1, floor: 2, heat: 'Central',    agent: 'Natural gas', park: false, built: 1980, reno: 2016, energy: 'D', desc: '1-bedroom near the University of Ioannina campus and the city park. Quiet building, central heating, 10-minute walk to the lake promenade.' },
  { city: 'Ioannina', area: 'Anapafseos',    street: 'Mitropolitou Germaniou 3', listingType: 'rent', price: 350,  size: 45,  bed: 1, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Power',       park: false, built: 1972, reno: 2019, energy: 'E', desc: 'Compact but fully updated studio/1-bedroom close to the Ioannina central market. New kitchen, bathroom, and air conditioning. Perfect for a university student.' },
  // ── Kavala ────────────────────────────────────────────────────────────────
  { city: 'Kavala', area: 'Panagia',        street: 'Poulidou 7',                listingType: 'rent', price: 420,  size: 58,  bed: 2, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Power',       park: false, built: 1930, reno: 2020, energy: 'E', desc: 'Renovated old town apartment in the Panagia quarter, within the Byzantine aqueduct walls of Kavala. Sea views from the balcony, walking distance to the port and the castle.' },
  { city: 'Kavala', area: 'Agios Loukas',   street: 'Komninou 18',               listingType: 'rent', price: 480,  size: 65,  bed: 2, bath: 1, floor: 2, heat: 'Central',    agent: 'Natural gas', park: false, built: 1988, reno: 2017, energy: 'C', desc: 'Modern-feeling 2-bedroom in Agios Loukas with partial sea views. Updated kitchen and bathroom, air conditioning. Close to the municipal beach and the archaeological museum.' },
  // ── Alexandroupoli ────────────────────────────────────────────────────────
  { city: 'Alexandroupoli', area: 'Agios Athanasios', street: 'Dimokratias 55',  listingType: 'rent', price: 380,  size: 55,  bed: 1, bath: 1, floor: 2, heat: 'Central',    agent: 'Natural gas', park: false, built: 1985, reno: 2018, energy: 'D', desc: '1-bedroom in the northern port city of Alexandroupoli, close to the Democritus University of Thrace. Central heating, renovated bathroom, quiet street.' },
  { city: 'Alexandroupoli', area: 'Kentro',           street: 'Megalou Alexandrou 8',listingType: 'rent', price: 450, size: 62, bed: 2, bath: 1, floor: 3, heat: 'Autonomous', agent: 'Power',  park: false, built: 1992, reno: 2016, energy: 'D', desc: 'Central 2-bedroom opposite the lighthouse promenade of Alexandroupoli. Bright south-facing rooms, new air conditioning, and sea views from the master bedroom.' },
  // ── Chania ────────────────────────────────────────────────────────────────
  { city: 'Chania', area: 'Old Harbour',    street: 'Zambeliou 14',               listingType: 'rent', price: 950,  size: 70,  bed: 2, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Power',       park: false, built: 1850, reno: 2018, energy: 'E', desc: 'Venetian-era townhouse apartment in the heart of Chania\'s Old Harbour. Stone walls, vaulted ceilings, and a private terrace with lighthouse and harbour views.' },
  { city: 'Chania', area: 'Nea Chora',      street: 'Perivolia 22',               listingType: 'rent', price: 750,  size: 80,  bed: 2, bath: 1, floor: 0, heat: 'Autonomous', agent: 'Power',       park: true,  built: 2006, reno: null,  energy: 'B', desc: 'Ground-floor apartment with private garden in Nea Chora, 3 minutes walk from the city beach. Modern fittings, covered parking, close to supermarkets and the harbour.' },
  { city: 'Chania', area: 'Koum Kapi',      street: 'Sifaka 5',                   listingType: 'rent', price: 680,  size: 65,  bed: 2, bath: 1, floor: 2, heat: 'Autonomous', agent: 'Power',       park: false, built: 1998, reno: 2021, energy: 'C', desc: 'Renovated 2-bedroom apartment in Koum Kapi, walking distance from the old town walls and the municipal beach. Sea views from the main balcony.' },
  // ── Corfu ─────────────────────────────────────────────────────────────────
  { city: 'Corfu', area: 'Corfu Town',     street: 'Kapodistria 3',              listingType: 'rent', price: 880,  size: 75,  bed: 2, bath: 1, floor: 2, heat: 'Autonomous', agent: 'Power',       park: false, built: 1860, reno: 2017, energy: 'E', desc: 'Historic Venetian-style apartment in the UNESCO Old Town of Corfu. High ceilings, original terrazzo floors, and a balcony overlooking the ancient spianada esplanade.' },
  { city: 'Corfu', area: 'Kontokali',      street: 'Alkiviadou 11',              listingType: 'rent', price: 780,  size: 80,  bed: 2, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Power',       park: true,  built: 2003, reno: null,  energy: 'B', desc: 'Modern 2-bedroom in the marina village of Kontokali, 5 km from Corfu Town. Sea views, private parking, and pool access in a secured complex.' },
  { city: 'Corfu', area: 'Acharavi',       street: 'Agiou Spiridona 4',          listingType: 'rent', price: 620,  size: 65,  bed: 2, bath: 1, floor: 0, heat: 'Autonomous', agent: 'Power',       park: false, built: 1997, reno: 2019, energy: 'C', desc: 'Ground-floor apartment 200m from Acharavi beach in northern Corfu. Private courtyard, well-maintained complex, quiet in low season. Ideal for year-round island living.' },
  // ── Mykonos ───────────────────────────────────────────────────────────────
  { city: 'Mykonos', area: 'Chora',         street: 'Matogianni 8',              listingType: 'rent', price: 2200, size: 65,  bed: 2, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Power',       park: false, built: 1960, reno: 2020, energy: 'E', desc: 'Classic whitewashed Cycladic house in Mykonos Town (Chora). Cobblestone lane, blue-domed church next door. Furnished in island-chic style — a rare long-term rental in the heart of the island.' },
  { city: 'Mykonos', area: 'Ano Mera',      street: 'Plateia Manto 3',           listingType: 'rent', price: 1100, size: 75,  bed: 2, bath: 1, floor: 0, heat: 'Autonomous', agent: 'Power',       park: true,  built: 1990, reno: 2018, energy: 'D', desc: 'Quiet village house in Ano Mera, the only other settlement on Mykonos. Large private garden, parking, 10 minutes drive from the party scene of Chora. Ideal for families.' },
  // ── Santorini ─────────────────────────────────────────────────────────────
  { city: 'Santorini', area: 'Fira',         street: 'Agiou Mina 12',            listingType: 'rent', price: 1800, size: 60,  bed: 1, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Power',       park: false, built: 1950, reno: 2019, energy: 'E', desc: 'Cave-house apartment carved into the caldera cliff in Fira. Arched doorways, heated floors, private terrace with the iconic caldera and sunset views. A once-in-a-lifetime address.' },
  { city: 'Santorini', area: 'Kamari',       street: 'Leoforos Kamariou 4',      listingType: 'rent', price: 950,  size: 70,  bed: 2, bath: 1, floor: 0, heat: 'Autonomous', agent: 'Power',       park: true,  built: 2001, reno: null,  energy: 'C', desc: 'Ground-floor apartment 100m from the black sand beach of Kamari. Easy year-round access, covered parking, and a short drive to Fira town and the airport.' },
  // ── Limassol (Cyprus) ─────────────────────────────────────────────────────
  { city: 'Limassol', area: 'Germasogeia',   street: 'Gladstonos 14',            listingType: 'rent', price: 1600, size: 100, bed: 3, bath: 2, floor: 5, heat: 'Central',    agent: 'Power',       park: true,  built: 2015, reno: null,  energy: 'A', desc: 'High-floor 3-bedroom with panoramic sea and marina views in the prestigious Germasogeia area of Limassol. Two covered parking spaces, gym and pool access in a five-star complex.' },
  { city: 'Limassol', area: 'Agios Nikolaos',street: 'Archiepiskopou Makariou 88',listingType: 'rent', price: 1200, size: 85,  bed: 2, bath: 2, floor: 3, heat: 'Central',    agent: 'Power',       park: true,  built: 2010, reno: null,  energy: 'B', desc: 'Smart 2-bedroom plus study in central Limassol. Double bathrooms, modern kitchen, sea-glimpse balcony, and a covered parking space. Walking distance to the old port and castle.' },
  { city: 'Limassol', area: 'Polemidia',     street: 'Nikos Nikolaidis 5',       listingType: 'rent', price: 900,  size: 95,  bed: 3, bath: 2, floor: 1, heat: 'Central',    agent: 'Power',       park: true,  built: 2005, reno: 2020, energy: 'B', desc: 'Spacious 3-bedroom family home in the residential Polemidia suburb. Two bathrooms, large storage, enclosed garden, covered parking. Close to international schools.' },
  { city: 'Limassol', area: 'Zakaki',        street: 'Spyrou Kyprianou 22',      listingType: 'rent', price: 800,  size: 80,  bed: 2, bath: 1, floor: 2, heat: 'Central',    agent: 'Power',       park: false, built: 2003, reno: 2018, energy: 'C', desc: '2-bedroom apartment in central Zakaki, between Limassol marina and the old town. Renovated 2018, air conditioning, close to the Limassol zoo and municipal gardens.' },
  { city: 'Limassol', area: 'Mouttagiaka',   street: 'Agiou Andreou 33',         listingType: 'rent', price: 1400, size: 110, bed: 3, bath: 2, floor: 4, heat: 'Central',    agent: 'Power',       park: true,  built: 2018, reno: null,  energy: 'A', desc: 'Luxury 3-bedroom in the sought-after Mouttagiaka coastal strip. A-rated energy, underfloor heating, two parking spaces, and a large terrace with sea views.' },
  // ── Nicosia (Cyprus) ──────────────────────────────────────────────────────
  { city: 'Nicosia', area: 'Strovolos',      street: 'Evagora Pallikaridi 8',    listingType: 'rent', price: 900,  size: 85,  bed: 2, bath: 1, floor: 2, heat: 'Central',    agent: 'Power',       park: true,  built: 2008, reno: null,  energy: 'B', desc: '2-bedroom in the central Nicosia suburb of Strovolos. Close to the presidency, ministries, and international company offices. Covered parking, bright living area.' },
  { city: 'Nicosia', area: 'Engomi',         street: 'Makedonitissas 44',        listingType: 'rent', price: 1100, size: 95,  bed: 3, bath: 2, floor: 3, heat: 'Central',    agent: 'Power',       park: true,  built: 2012, reno: null,  energy: 'A', desc: 'Modern 3-bedroom near the University of Cyprus campus in Engomi. Double bathrooms, fitted wardrobes, covered parking and a communal pool. Ideal for a family or sharers.' },
  { city: 'Nicosia', area: 'Old City',       street: 'Onasagorou 12',            listingType: 'rent', price: 750,  size: 65,  bed: 2, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Power',       park: false, built: 1920, reno: 2021, energy: 'D', desc: 'Fully renovated heritage apartment inside the Venetian walls of Nicosia old city. Exposed stone, polished concrete floors, and a roof terrace. Steps from Ledra Street.' },
  { city: 'Nicosia', area: 'Lakatamia',      street: 'Agias Paraskevis 18',      listingType: 'rent', price: 850,  size: 90,  bed: 3, bath: 2, floor: 0, heat: 'Central',    agent: 'Power',       park: true,  built: 2000, reno: 2019, energy: 'B', desc: '3-bedroom ground-floor apartment with private garden in Lakatamia. Two full bathrooms, covered parking. Quiet suburb with good primary schools and easy access to the highway.' },
  // ── Sale listings — Athens ─────────────────────────────────────────────────
  { city: 'Athens', area: 'Kolonaki',       street: 'Irodotou 11',               listingType: 'sale', price: 420000, size: 95,  bed: 2, bath: 2, floor: 5, heat: 'Autonomous', agent: 'Natural gas', park: true,  built: 2008, reno: null,  energy: 'B', desc: 'Penthouse apartment for sale in prime Kolonaki. Two bedrooms, two bathrooms, master suite, parking, and a rooftop terrace with Acropolis views. Trophy property in the most prestigious Athens postcode.' },
  { city: 'Athens', area: 'Glyfada',        street: 'Lazaraki 8',                listingType: 'sale', price: 280000, size: 82,  bed: 2, bath: 1, floor: 3, heat: 'Autonomous', agent: 'Natural gas', park: true,  built: 2003, reno: null,  energy: 'B', desc: 'Well-maintained 2-bedroom for sale in coastal Glyfada. 10-minute walk to the beach, covered parking. Strong rental potential and a pleasant community of young families.' },
  { city: 'Athens', area: 'Kifisia',        street: 'Tatoi 55',                  listingType: 'sale', price: 360000, size: 125, bed: 3, bath: 2, floor: 2, heat: 'Central',    agent: 'Natural gas', park: true,  built: 1998, reno: 2022, energy: 'B', desc: 'Generously proportioned 3-bedroom for sale in Kifisia. Fully renovated in 2022, double bathrooms, underground parking and a private storage unit. Close to Kifisia metro.' },
  { city: 'Athens', area: 'Psychiko',       street: 'Strofyliou 4',              listingType: 'sale', price: 580000, size: 160, bed: 4, bath: 3, floor: 1, heat: 'Autonomous', agent: 'Natural gas', park: true,  built: 2006, reno: null,  energy: 'A', desc: 'Executive family apartment for sale in exclusive Psychiko. Four bedrooms, three bathrooms, home office, garden, two parking spaces. Surrounded by consulates and diplomatic residences.' },
  // ── Sale listings — Thessaloniki ──────────────────────────────────────────
  { city: 'Thessaloniki', area: 'Toumba',    street: 'Stilianos Kyriakidis 3',   listingType: 'sale', price: 160000, size: 75,  bed: 2, bath: 1, floor: 3, heat: 'Central',    agent: 'Natural gas', park: false, built: 1995, reno: 2019, energy: 'C', desc: '2-bedroom for sale in the popular Toumba district of Thessaloniki. Well-maintained building, renovated interior, close to transport links. Solid investment or primary home.' },
  { city: 'Thessaloniki', area: 'Panorama',  street: 'Ioannou Theodorakopoulou 2',listingType: 'sale', price: 320000, size: 120, bed: 3, bath: 2, floor: 3, heat: 'Autonomous', agent: 'Natural gas', park: true,  built: 2005, reno: null,  energy: 'A', desc: 'Premium 3-bedroom with panoramic views of Thessaloniki bay in the affluent Panorama suburb. Two bathrooms, parking, rooftop terrace. Move-in condition.' },
  // ── Sale listings — Cyprus ────────────────────────────────────────────────
  { city: 'Limassol', area: 'Germasogeia',   street: 'Archiepiskopou Makariou 200',listingType: 'sale', price: 450000, size: 130, bed: 3, bath: 2, floor: 8, heat: 'Central', agent: 'Power',  park: true, built: 2019, reno: null, energy: 'A', desc: 'Brand-new 3-bedroom for sale on the 8th floor of a luxury tower in the Limassol seafront. Sea and marina views from every room, premium finishes, two parking spaces.' },
  { city: 'Nicosia', area: 'Strovolos',      street: 'Argivon 15',               listingType: 'sale', price: 280000, size: 105, bed: 3, bath: 2, floor: 2, heat: 'Central',    agent: 'Power',       park: true,  built: 2010, reno: null,  energy: 'B', desc: '3-bedroom apartment for sale in central Strovolos, Nicosia. Two bathrooms, covered parking, in a well-managed gated complex. Walking distance to major government offices.' },
  // ── More Athens variety ────────────────────────────────────────────────────
  { city: 'Athens', area: 'Maroussi',       street: 'Iras 6',                    listingType: 'rent', price: 980,  size: 90,  bed: 2, bath: 2, floor: 4, heat: 'Autonomous', agent: 'Natural gas', park: true,  built: 2011, reno: null,  energy: 'B', desc: '2-bedroom plus home office in Maroussi, Athens\'s northern business hub. Minutes from the Olympic complex, ISAP electric railway, and major corporate parks. Two bathrooms, covered parking.' },
  { city: 'Athens', area: 'Ilioupoli',      street: 'Vouliagmenis 180',          listingType: 'rent', price: 680,  size: 70,  bed: 2, bath: 1, floor: 2, heat: 'Central',    agent: 'Oil',         park: false, built: 1987, reno: 2018, energy: 'C', desc: '2-bedroom on the main Vouliagmeni avenue in Ilioupoli. Renovated bathroom and kitchen, air conditioning. Direct tram connection to the coast and metro link to the city centre.' },
  { city: 'Athens', area: 'Holargos',       street: 'Mesogeion 350',             listingType: 'rent', price: 750,  size: 72,  bed: 2, bath: 1, floor: 3, heat: 'Autonomous', agent: 'Natural gas', park: false, built: 1999, reno: 2020, energy: 'C', desc: '2-bedroom on the Mesogeion avenue in Holargos, close to the business parks of Gerakas and the Doukissis Plakentias metro. Quiet side of the building, renovated in 2020.' },
  { city: 'Athens', area: 'Agia Paraskevi', street: 'Marathonos 9',              listingType: 'rent', price: 820,  size: 78,  bed: 2, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Natural gas', park: true,  built: 2004, reno: null,  energy: 'B', desc: '2-bedroom with parking in Agia Paraskevi, a green suburb known for its parks and low-rise buildings. Close to the Halandri and Doukissis Plakentias metro stations.' },
  { city: 'Athens', area: 'Vari',           street: 'Leoforos Vouliagmenis 99',  listingType: 'rent', price: 1050, size: 95,  bed: 3, bath: 2, floor: 0, heat: 'Autonomous', agent: 'Natural gas', park: true,  built: 2007, reno: null,  energy: 'A', desc: 'Ground-floor villa apartment in Vari with a private fenced garden and parking. 15 minutes from Vouliagmeni beach. Two full bathrooms, energy-efficient, ideal for a family.' },
  { city: 'Athens', area: 'Paleo Faliro',   street: 'Poseidonos 55',             listingType: 'rent', price: 920,  size: 82,  bed: 2, bath: 1, floor: 4, heat: 'Autonomous', agent: 'Power',       park: false, built: 1993, reno: 2021, energy: 'C', desc: 'Top-floor 2-bedroom with panoramic sea views along the Saronic Gulf in Paleo Faliro. Fully renovated in 2021, open-plan kitchen, wraparound balcony, tram stop 3 minutes away.' },
  { city: 'Athens', area: 'Argyroupoli',    street: 'Eleftheriou Venizelou 44',  listingType: 'rent', price: 640,  size: 65,  bed: 2, bath: 1, floor: 2, heat: 'Central',    agent: 'Oil',         park: false, built: 1981, reno: 2016, energy: 'D', desc: '2-bedroom in central Argyroupoli with good public transport access. Renovated kitchen, new boiler, south-facing balcony. Close to local schools and the municipal park.' },
  { city: 'Athens', area: 'Peristeri',      street: 'Thivon 222',                listingType: 'rent', price: 520,  size: 60,  bed: 2, bath: 1, floor: 3, heat: 'Central',    agent: 'Natural gas', park: false, built: 1978, reno: 2019, energy: 'D', desc: 'Affordable 2-bedroom in western Athens, Peristeri. Renovated bathroom, double-glazed windows, close to the Peristeri metro station and the large Plateia Peristeriou square.' },
  { city: 'Athens', area: 'Kessariani',     street: 'Alimou 33',                 listingType: 'rent', price: 590,  size: 58,  bed: 1, bath: 1, floor: 2, heat: 'Autonomous', agent: 'Power',       park: false, built: 1973, reno: 2020, energy: 'D', desc: '1-bedroom in Kessariani at the foot of Hymettus. Updated throughout in 2020 — new kitchen, bathroom, floors and paint. Quiet leafy street, 10 minutes by bus to Pangrati.' },
  // ── Nafplio ───────────────────────────────────────────────────────────────
  { city: 'Nafplio', area: 'Old Town',      street: 'Staikopoulou 8',            listingType: 'rent', price: 650,  size: 55,  bed: 1, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Power',       park: false, built: 1850, reno: 2018, energy: 'E', desc: 'Neoclassical Old Town apartment in Greece\'s first capital, Nafplio. Arched windows, stone walls and a private balcony overlooking the cobblestone lane. Bourtzi fortress views.' },
  { city: 'Nafplio', area: 'Pronia',        street: 'Asklipiou 22',              listingType: 'rent', price: 480,  size: 65,  bed: 2, bath: 1, floor: 2, heat: 'Central',    agent: 'Natural gas', park: false, built: 1988, reno: 2017, energy: 'D', desc: '2-bedroom in the modern Pronia quarter of Nafplio, 10-minute walk to the old town and seafront. Quiet street, renovated bathroom and kitchen, mountain and partial sea view.' },
  // ── Kalamata ──────────────────────────────────────────────────────────────
  { city: 'Kalamata', area: 'Evangelistria', street: 'Aristomenous 45',          listingType: 'rent', price: 420,  size: 62,  bed: 2, bath: 1, floor: 2, heat: 'Autonomous', agent: 'Power',       park: false, built: 1985, reno: 2019, energy: 'D', desc: '2-bedroom on Kalamata\'s famous pedestrian boulevard, lined with cafés and shops. Renovated interior, air conditioning. Walking distance to the beach and the historic castle.' },
  // ── Zakynthos ─────────────────────────────────────────────────────────────
  { city: 'Zakynthos', area: 'Zakynthos Town', street: 'Lombardou 14',           listingType: 'rent', price: 700,  size: 70,  bed: 2, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Power',       park: false, built: 1970, reno: 2021, energy: 'D', desc: 'Restored Venetian-style apartment in the rebuilt town of Zakynthos. Steps from the harbour, the church of Agios Dionysios and the main shopping street. Perfect year-round island home.' },
  // ── Lefkada ───────────────────────────────────────────────────────────────
  { city: 'Lefkada', area: 'Lefkada Town',   street: 'Dorpfeld 9',               listingType: 'rent', price: 580,  size: 60,  bed: 2, bath: 1, floor: 0, heat: 'Autonomous', agent: 'Power',       park: false, built: 1995, reno: 2020, energy: 'D', desc: 'Ground-floor apartment in Lefkada Town, the charming timber-framed island capital. Private garden, short walk to the venetian canal, marina, and the Friday market.' },
  // ── Kefalonia ─────────────────────────────────────────────────────────────
  { city: 'Kefalonia', area: 'Argostoli',    street: 'Lithostroto 22',           listingType: 'rent', price: 640,  size: 68,  bed: 2, bath: 1, floor: 2, heat: 'Autonomous', agent: 'Power',       park: false, built: 1968, reno: 2019, energy: 'E', desc: '2-bedroom in the rebuilt capital of Kefalonia, on the famous pedestrian Lithostroto street. Sea view from the balcony, walking distance to the port, ferries and main market.' },
  // ── Katerini ──────────────────────────────────────────────────────────────
  { city: 'Katerini', area: 'Kentro',        street: 'Plateia Eleftherias 5',    listingType: 'rent', price: 380,  size: 60,  bed: 2, bath: 1, floor: 1, heat: 'Central',    agent: 'Natural gas', park: false, built: 1990, reno: 2015, energy: 'D', desc: '2-bedroom on Katerini\'s central square at the foot of Mount Olympus. Good public transport to Thessaloniki and the Pieria coast. Affordable entry-level family home.' },
  // ── Trikala ───────────────────────────────────────────────────────────────
  { city: 'Trikala', area: 'Agios Konstantinos', street: 'Irodou Attikou 18',    listingType: 'rent', price: 360,  size: 55,  bed: 1, bath: 1, floor: 2, heat: 'Central',    agent: 'Natural gas', park: false, built: 1982, reno: 2017, energy: 'E', desc: '1-bedroom near the Trikala city park and the Litheos river walk. Affordable and practical, close to the University of Thessaly Polytechnic Faculty.' },
  // ── Serres ───────────────────────────────────────────────────────────────
  { city: 'Serres', area: 'Kentro',           street: 'Merarchia 22',             listingType: 'rent', price: 340,  size: 58,  bed: 2, bath: 1, floor: 1, heat: 'Central',    agent: 'Natural gas', park: false, built: 1985, reno: 2016, energy: 'D', desc: '2-bedroom in central Serres at an exceptional price. Close to the Byzantine castle and the Serres lake nature reserve. Good bus links to Thessaloniki.' },
  // ── Veria ─────────────────────────────────────────────────────────────────
  { city: 'Veria', area: 'Old Town',          street: 'Venizelou 12',             listingType: 'rent', price: 370,  size: 60,  bed: 2, bath: 1, floor: 0, heat: 'Autonomous', agent: 'Power',       park: false, built: 1880, reno: 2022, energy: 'E', desc: 'Character home in the historic Jewish quarter of Veria (Barbouta). Fully renovated in 2022 with underfloor heating, new kitchen, original stone walls. Minutes from the Tripotamos stream.' },
  // ── Xanthi ────────────────────────────────────────────────────────────────
  { city: 'Xanthi', area: 'Old Town',         street: 'Antika 5',                listingType: 'rent', price: 350,  size: 55,  bed: 1, bath: 1, floor: 1, heat: 'Autonomous', agent: 'Power',       park: false, built: 1890, reno: 2020, energy: 'E', desc: 'Restored Ottoman-era house in Xanthi\'s celebrated old town, a candidate for UNESCO heritage status. Painted timber facade, panoramic views over the colourful quarter.' },
  // ── Preveza ───────────────────────────────────────────────────────────────
  { city: 'Preveza', area: 'Kentro',           street: 'Spyrou Livada 8',         listingType: 'rent', price: 400,  size: 60,  bed: 2, bath: 1, floor: 2, heat: 'Autonomous', agent: 'Power',       park: false, built: 1992, reno: 2018, energy: 'D', desc: '2-bedroom in central Preveza, the charming Epirus port town. Steps from the pedestrian waterfront, fish tavernas, and the ancient Roman ruins of Nicopolis nearby.' },
  // ── Paphos (Cyprus) ───────────────────────────────────────────────────────
  { city: 'Paphos', area: 'Kato Paphos',       street: 'Poseidonos 44',           listingType: 'rent', price: 1050, size: 85,  bed: 2, bath: 1, floor: 3, heat: 'Central',    agent: 'Power',       park: true,  built: 2012, reno: null,  energy: 'B', desc: 'Modern 2-bedroom 300m from Paphos harbour and the UNESCO mosaics. Covered parking, sea-view balcony, pool access. Ideal for expats or holiday-to-permanent movers.' },
  { city: 'Paphos', area: 'Chloraka',          street: 'Stavrou 18',              listingType: 'rent', price: 850,  size: 90,  bed: 3, bath: 2, floor: 1, heat: 'Central',    agent: 'Power',       park: true,  built: 2008, reno: 2021, energy: 'B', desc: '3-bedroom family apartment in the residential suburb of Chloraka, 5 km from Paphos harbour. Private garden, two bathrooms, parking. Close to international schools and the Coral Bay road.' },
  // ── Larnaca (Cyprus) ──────────────────────────────────────────────────────
  { city: 'Larnaca', area: 'Finikoudes',       street: 'Athinon 12',              listingType: 'rent', price: 950,  size: 78,  bed: 2, bath: 1, floor: 4, heat: 'Central',    agent: 'Power',       park: false, built: 2006, reno: null,  energy: 'B', desc: 'Top-floor 2-bedroom overlooking the famous Finikoudes palm promenade and the Larnaca salt lake. Sea views from the master bedroom, 5-minute walk to the beach and the Zenobia dive site.' },
]

test('seed — create 100 listings across multiple Greek cities', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // ── Verify we are logged in ───────────────────────────────────────────────
  const profile = await page.evaluate(async () => {
    const r = await fetch('/api/profile')
    const d = await r.json()
    return { tier: d.user?.subscriptionTier, role: d.user?.role }
  })
  console.log(`  Logged in as ${profile.role}, tier: ${profile.tier}`)

  // ── Upgrade to Pro if needed (Pro = unlimited listings) ───────────────────
  if (profile.tier !== 'pro') {
    const up = await page.evaluate(async () => {
      const r = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'pro' }),
      })
      const d = await r.json()
      return { ok: r.ok, body: d }
    })

    if (up.body?.checkoutUrl) {
      // Stripe checkout needed — complete it programmatically
      await page.goto(up.body.checkoutUrl)
      await page.waitForLoadState('domcontentloaded')

      const emailField = page.locator('input[type="email"], #email').first()
      await emailField.waitFor({ timeout: 15000 })
      await emailField.fill('owner@test.com')
      await emailField.press('Tab')
      await page.waitForTimeout(500)
      await page.keyboard.type('4242424242424242')
      await page.keyboard.press('Tab')
      await page.waitForTimeout(300)
      await page.keyboard.type('1228')
      await page.keyboard.press('Tab')
      await page.waitForTimeout(300)
      await page.keyboard.type('123')
      await page.keyboard.press('Tab')
      await page.waitForTimeout(300)
      await page.keyboard.type('Test Owner')
      await page.getByRole('button', { name: /pay and subscribe/i }).click()
      await page.waitForURL(/\/upgrade\?success=true/, { timeout: 30000 })

      // Poll until tier flips
      for (let i = 0; i < 15; i++) {
        await page.waitForTimeout(2000)
        const t = await page.evaluate(async () => {
          const r = await fetch('/api/profile')
          const d = await r.json()
          return d.user?.subscriptionTier
        })
        if (t === 'pro') { console.log('  ✓ Upgraded to Pro'); break }
      }
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    } else if (up.ok) {
      console.log('  ✓ Downgraded/switched tier applied directly')
    }
  }

  // ── Create all 100 listings ───────────────────────────────────────────────
  let created = 0
  let failed = 0

  const payload = (l: typeof LISTINGS[number], title: string) => ({
    title,
    description: l.desc,
    street: l.street,
    city: l.city,
    country: ['Limassol', 'Nicosia', 'Paphos', 'Larnaca'].includes(l.city) ? 'Cyprus' : 'Greece',
    area: l.area,
    listingType: l.listingType,
    pricePerMonth: l.price,
    sizeSqMeters: l.size,
    bedrooms: l.bed,
    bathrooms: l.bath,
    floor: l.floor,
    heatingCategory: l.heat,
    heatingAgent: l.agent,
    parking: l.park,
    yearBuilt: l.built,
    yearRenovated: l.reno,
    energyClass: l.energy,
    availableFrom: '2026-07-01',
  })

  const postListing = async (body: ReturnType<typeof payload>) =>
    page.evaluate(async (data) => {
      const r = await fetch('/api/homes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const b = await r.json().catch(() => ({}))
      return { ok: r.ok, status: r.status, key: b.home?.key, error: b.error }
    }, body)

  for (let i = 0; i < LISTINGS.length; i++) {
    const l = LISTINGS[i]
    const title = `${l.area} — ${l.bed === 0 ? 'Studio' : l.bed + 'BR'} ${l.size}m² (${l.listingType === 'rent' ? '€' + l.price + '/mo' : '€' + l.price.toLocaleString()})`
    const body = payload(l, title)

    // Proactive reload every 5 listings to keep the Clerk JWT fresh
    if (i % 5 === 0) {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      // Extra wait for Clerk's async token refresh to settle before the first fetch
      await page.waitForTimeout(1500)
    }

    let res = await postListing(body)

    // If the session token expired mid-batch, reload and retry once
    if (res.status === 401) {
      console.log(`  [${i + 1}/${LISTINGS.length}] 401 — refreshing session and retrying…`)
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
      res = await postListing(body)
    }

    if (res.ok) {
      created++
      console.log(`  [${i + 1}/${LISTINGS.length}] ✓ ${title} → ${res.key}`)
    } else {
      failed++
      console.log(`  [${i + 1}/${LISTINGS.length}] ✗ ${title} → ${res.status} ${res.error}`)
    }

    // Stay under the Maps API rate limit (20 calls/min per user).
    // 3.5s between requests ≈ 17 req/min — well within the limit.
    if (i < LISTINGS.length - 1) await page.waitForTimeout(3500)
  }

  console.log(`\n  ══ Done: ${created} created, ${failed} failed ══`)
  expect(created, `Expected all ${LISTINGS.length} listings to be created`).toBe(LISTINGS.length)
})

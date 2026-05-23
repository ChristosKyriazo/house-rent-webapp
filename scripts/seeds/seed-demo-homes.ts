import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const owners = [
  { email: 'nikos.papadopoulos@demo.gr', name: 'Nikos Papadopoulos', role: 'owner' },
  { email: 'maria.konstantinou@demo.gr', name: 'Maria Konstantinou', role: 'owner' },
  { email: 'giorgos.alexandrou@demo.gr', name: 'Giorgos Alexandrou', role: 'owner' },
  { email: 'eleni.dimitriou@demo.gr', name: 'Eleni Dimitriou', role: 'owner' },
  { email: 'kostas.stavros@demo.gr', name: 'Kostas Stavros', role: 'owner' },
]

const renters = [
  { email: 'anna.georgiou@demo.gr', name: 'Anna Georgiou', role: 'user' },
  { email: 'petros.nikolaou@demo.gr', name: 'Petros Nikolaou', role: 'user' },
  { email: 'sofia.andreou@demo.gr', name: 'Sofia Andreou', role: 'user' },
]

const homes = [
  // ── Athens – Central / Kolonaki ────────────────────────────────────────────
  {
    title: 'Bright 2-bedroom apartment in Kolonaki',
    description: 'Renovated apartment in the heart of Kolonaki with stunning Lycabettus views. Modern kitchen, hardwood floors, double-glazed windows. Walking distance to metro, upscale shops, and top restaurants. Perfect for professionals.',
    city: 'Athens', country: 'Greece', area: 'Kolonaki',
    street: 'Skoufa 14', listingType: 'rent', pricePerMonth: 1400,
    bedrooms: 2, bathrooms: 1, floor: 3, sizeSqMeters: 78,
    yearBuilt: 1985, yearRenovated: 2019,
    heatingCategory: 'autonomous', heatingAgent: 'natural gas',
    parking: false, energyClass: 'B',
    closestMetro: 0.3, closestBus: 0.1, closestSchool: 0.5,
    closestHospital: 1.2, closestPark: 0.4, closestUniversity: 0.8,
    availableFrom: new Date('2026-06-01'),
  },
  {
    title: 'Luxury penthouse for sale in Kolonaki',
    description: 'Stunning penthouse on the top floor with panoramic views of Athens and the Acropolis. Three bedrooms, two bathrooms, private terrace, parking included. High-end finishes throughout. Ideal for upscale living.',
    city: 'Athens', country: 'Greece', area: 'Kolonaki',
    street: 'Anagnostopoulou 8', listingType: 'sale', pricePerMonth: 850000,
    bedrooms: 3, bathrooms: 2, floor: 7, sizeSqMeters: 165,
    yearBuilt: 2010, yearRenovated: 2022,
    heatingCategory: 'central', heatingAgent: 'natural gas',
    parking: true, energyClass: 'A',
    closestMetro: 0.4, closestBus: 0.2, closestSchool: 0.6,
    closestHospital: 1.0, closestPark: 0.5, closestUniversity: 0.7,
    availableFrom: new Date('2026-07-01'),
  },

  // ── Athens – Nea Smirni ────────────────────────────────────────────────────
  {
    title: 'Family apartment near the park in Nea Smirni',
    description: 'Spacious 3-bedroom apartment just 200m from Nea Smirni central park. Ideal for families with children. Quiet street, large balcony, storage room. Autonomous heating with natural gas. Primary and secondary schools within walking distance.',
    city: 'Athens', country: 'Greece', area: 'Nea Smirni',
    street: 'Omirou 22', listingType: 'rent', pricePerMonth: 950,
    bedrooms: 3, bathrooms: 1, floor: 2, sizeSqMeters: 90,
    yearBuilt: 1978, yearRenovated: 2015,
    heatingCategory: 'autonomous', heatingAgent: 'natural gas',
    parking: true, energyClass: 'C',
    closestMetro: 1.5, closestBus: 0.2, closestSchool: 0.3,
    closestHospital: 2.0, closestPark: 0.2, closestUniversity: 3.0,
    availableFrom: new Date('2026-06-15'),
  },
  {
    title: 'Cozy studio in Nea Smirni – great transport links',
    description: 'Well-maintained studio apartment perfect for a single professional or student. Close to the tram stop and multiple bus lines. Renovated bathroom, air conditioning included. Affordable and centrally located in the area.',
    city: 'Athens', country: 'Greece', area: 'Nea Smirni',
    street: 'Eleftheriou Venizelou 5', listingType: 'rent', pricePerMonth: 520,
    bedrooms: 1, bathrooms: 1, floor: 1, sizeSqMeters: 35,
    yearBuilt: 1990, yearRenovated: 2018,
    heatingCategory: 'autonomous', heatingAgent: 'electricity',
    parking: false, energyClass: 'D',
    closestMetro: 2.0, closestBus: 0.1, closestSchool: 0.6,
    closestHospital: 1.8, closestPark: 0.5, closestUniversity: 2.5,
    availableFrom: new Date('2026-06-01'),
  },

  // ── Athens – Glyfada ───────────────────────────────────────────────────────
  {
    title: 'Modern beachside apartment in Glyfada',
    description: 'Beautiful apartment 300m from Glyfada beach. Two bedrooms, open-plan living area, fully equipped kitchen. Perfect for those who love the sea and outdoor lifestyle. Parking included. Tram stop 5 minutes walk.',
    city: 'Athens', country: 'Greece', area: 'Glyfada',
    street: 'Lazaraki 17', listingType: 'rent', pricePerMonth: 1100,
    bedrooms: 2, bathrooms: 1, floor: 2, sizeSqMeters: 72,
    yearBuilt: 2005, yearRenovated: 2021,
    heatingCategory: 'autonomous', heatingAgent: 'natural gas',
    parking: true, energyClass: 'B',
    closestMetro: 3.0, closestBus: 0.2, closestSchool: 0.7,
    closestHospital: 2.5, closestPark: 0.3, closestUniversity: 4.0,
    availableFrom: new Date('2026-07-01'),
  },
  {
    title: 'Seafront villa for sale in Glyfada',
    description: 'Exceptional detached villa directly on the Glyfada seafront. Four bedrooms, private garden with pool, garage for two cars. Luxurious interiors with marble floors and custom-built kitchen. Rare opportunity on the Athens Riviera.',
    city: 'Athens', country: 'Greece', area: 'Glyfada',
    street: 'Poseidonos 88', listingType: 'sale', pricePerMonth: 2200000,
    bedrooms: 4, bathrooms: 3, floor: 0, sizeSqMeters: 280,
    yearBuilt: 2015, yearRenovated: null,
    heatingCategory: 'central', heatingAgent: 'natural gas',
    parking: true, energyClass: 'A',
    closestMetro: 4.0, closestBus: 0.3, closestSchool: 0.8,
    closestHospital: 3.0, closestPark: 0.1, closestUniversity: 5.0,
    availableFrom: new Date('2026-08-01'),
  },

  // ── Athens – Pagkrati ──────────────────────────────────────────────────────
  {
    title: 'Charming apartment in Pagkrati near Evangelismos',
    description: 'Lovely 2-bedroom apartment in the vibrant Pagkrati neighbourhood. Close to Evangelismos hospital and metro station. High ceilings, wooden floors, and a sunny balcony. Great cafes and restaurants nearby. Ideal for medical staff or professionals.',
    city: 'Athens', country: 'Greece', area: 'Pagkrati',
    street: 'Efrosynis 11', listingType: 'rent', pricePerMonth: 850,
    bedrooms: 2, bathrooms: 1, floor: 2, sizeSqMeters: 65,
    yearBuilt: 1970, yearRenovated: 2016,
    heatingCategory: 'central', heatingAgent: 'oil',
    parking: false, energyClass: 'D',
    closestMetro: 0.5, closestBus: 0.1, closestSchool: 0.4,
    closestHospital: 0.4, closestPark: 0.6, closestUniversity: 1.0,
    availableFrom: new Date('2026-06-01'),
  },

  // ── Athens – Kifisia ───────────────────────────────────────────────────────
  {
    title: 'Elegant house with garden in Kifisia',
    description: 'Beautiful detached house in upscale Kifisia with a private garden and 4 parking spaces. Four bedrooms, fireplace, fully fitted kitchen. Walking distance to Kifisia metro, shopping, and excellent schools. Perfect for affluent families.',
    city: 'Athens', country: 'Greece', area: 'Kifisia',
    street: 'Tatoi 55', listingType: 'rent', pricePerMonth: 3200,
    bedrooms: 4, bathrooms: 3, floor: 0, sizeSqMeters: 220,
    yearBuilt: 2000, yearRenovated: 2020,
    heatingCategory: 'autonomous', heatingAgent: 'natural gas',
    parking: true, energyClass: 'A',
    closestMetro: 0.6, closestBus: 0.3, closestSchool: 0.4,
    closestHospital: 2.0, closestPark: 0.5, closestUniversity: 3.0,
    availableFrom: new Date('2026-07-01'),
  },
  {
    title: 'Modern apartment for sale in Kifisia',
    description: 'Brand new 3-bedroom apartment in a boutique building in Kifisia. Top-of-the-line finishes, underfloor heating, smart home system. Two underground parking spaces. Near international schools and the ISAP metro line.',
    city: 'Athens', country: 'Greece', area: 'Kifisia',
    street: 'Kefalariou 3', listingType: 'sale', pricePerMonth: 480000,
    bedrooms: 3, bathrooms: 2, floor: 4, sizeSqMeters: 120,
    yearBuilt: 2024, yearRenovated: null,
    heatingCategory: 'autonomous', heatingAgent: 'natural gas',
    parking: true, energyClass: 'A+',
    closestMetro: 0.8, closestBus: 0.2, closestSchool: 0.5,
    closestHospital: 2.5, closestPark: 0.4, closestUniversity: 2.0,
    availableFrom: new Date('2026-09-01'),
  },

  // ── Athens – Exarchia / Neapoli ────────────────────────────────────────────
  {
    title: 'Student-friendly apartment in Exarchia',
    description: 'Affordable and well-located apartment in Exarchia near Polytechnic University. Two bedrooms, updated kitchen, fast internet included. Surrounded by bookshops, cafes, and student life. Metro and bus stops nearby.',
    city: 'Athens', country: 'Greece', area: 'Exarchia',
    street: 'Stournari 28', listingType: 'rent', pricePerMonth: 620,
    bedrooms: 2, bathrooms: 1, floor: 3, sizeSqMeters: 55,
    yearBuilt: 1968, yearRenovated: 2012,
    heatingCategory: 'autonomous', heatingAgent: 'oil',
    parking: false, energyClass: 'E',
    closestMetro: 0.4, closestBus: 0.1, closestSchool: 0.3,
    closestHospital: 0.8, closestPark: 0.7, closestUniversity: 0.3,
    availableFrom: new Date('2026-06-01'),
  },

  // ── Athens – Marousi ──────────────────────────────────────────────────────
  {
    title: 'Spacious apartment near Metro in Marousi',
    description: '3-bedroom apartment in a quiet part of Marousi, walking distance to Neratziotissa metro. Large living room, two balconies, storage. Autonomous heating. Good access to northern suburbs and Athens city centre.',
    city: 'Athens', country: 'Greece', area: 'Marousi',
    street: 'Amarousiou-Chalandriou 40', listingType: 'rent', pricePerMonth: 1050,
    bedrooms: 3, bathrooms: 2, floor: 1, sizeSqMeters: 105,
    yearBuilt: 1995, yearRenovated: 2017,
    heatingCategory: 'autonomous', heatingAgent: 'natural gas',
    parking: true, energyClass: 'C',
    closestMetro: 0.5, closestBus: 0.2, closestSchool: 0.5,
    closestHospital: 1.5, closestPark: 0.6, closestUniversity: 1.2,
    availableFrom: new Date('2026-06-01'),
  },

  // ── Thessaloniki – Kalamaria ───────────────────────────────────────────────
  {
    title: 'Sea-view apartment in Kalamaria, Thessaloniki',
    description: 'Stunning apartment on the 5th floor with panoramic sea views of the Thermaikos Gulf. Two bedrooms, fully renovated open-plan kitchen, large terrace. Near Kalamaria seafront promenade. Perfect for beach lovers.',
    city: 'Thessaloniki', country: 'Greece', area: 'Kalamaria',
    street: 'Nik. Plastira 22', listingType: 'rent', pricePerMonth: 750,
    bedrooms: 2, bathrooms: 1, floor: 5, sizeSqMeters: 68,
    yearBuilt: 1988, yearRenovated: 2020,
    heatingCategory: 'central', heatingAgent: 'natural gas',
    parking: false, energyClass: 'C',
    closestMetro: 1.5, closestBus: 0.3, closestSchool: 0.5,
    closestHospital: 1.8, closestPark: 0.3, closestUniversity: 2.0,
    availableFrom: new Date('2026-06-01'),
  },
  {
    title: 'Modern 3-bedroom apartment for sale in Kalamaria',
    description: 'Stylish apartment in a sought-after residential complex in Kalamaria. Three bedrooms, two bathrooms, underground parking, communal gardens. Close to the seafront, international schools, and Thessaloniki airport.',
    city: 'Thessaloniki', country: 'Greece', area: 'Kalamaria',
    street: 'Megalou Alexandrou 7', listingType: 'sale', pricePerMonth: 210000,
    bedrooms: 3, bathrooms: 2, floor: 2, sizeSqMeters: 108,
    yearBuilt: 2012, yearRenovated: null,
    heatingCategory: 'autonomous', heatingAgent: 'natural gas',
    parking: true, energyClass: 'B',
    closestMetro: 2.0, closestBus: 0.2, closestSchool: 0.4,
    closestHospital: 1.5, closestPark: 0.4, closestUniversity: 2.5,
    availableFrom: new Date('2026-07-01'),
  },

  // ── Thessaloniki – Toumba ──────────────────────────────────────────────────
  {
    title: 'Budget apartment in Toumba near PAOK stadium',
    description: 'Affordable 2-bedroom apartment in the lively Toumba neighbourhood. Renovated kitchen and bathroom, laminate floors. Close to public transport and all amenities. Great for young couples or working professionals.',
    city: 'Thessaloniki', country: 'Greece', area: 'Toumba',
    street: 'Kleanthous 18', listingType: 'rent', pricePerMonth: 480,
    bedrooms: 2, bathrooms: 1, floor: 1, sizeSqMeters: 58,
    yearBuilt: 1975, yearRenovated: 2014,
    heatingCategory: 'central', heatingAgent: 'oil',
    parking: false, energyClass: 'D',
    closestMetro: 1.2, closestBus: 0.2, closestSchool: 0.4,
    closestHospital: 1.0, closestPark: 0.5, closestUniversity: 1.5,
    availableFrom: new Date('2026-06-01'),
  },

  // ── Thessaloniki – City Centre ─────────────────────────────────────────────
  {
    title: 'Central loft apartment in Thessaloniki',
    description: 'Unique loft-style apartment in the heart of Thessaloniki, steps from Aristotelous Square. Open-plan living space, exposed brick walls, mezzanine bedroom. Walking distance to the sea, the White Tower, museums, and nightlife.',
    city: 'Thessaloniki', country: 'Greece', area: 'Thessaloniki Centre',
    street: 'Tsimiski 65', listingType: 'rent', pricePerMonth: 900,
    bedrooms: 1, bathrooms: 1, floor: 4, sizeSqMeters: 60,
    yearBuilt: 1960, yearRenovated: 2022,
    heatingCategory: 'autonomous', heatingAgent: 'electricity',
    parking: false, energyClass: 'C',
    closestMetro: 0.5, closestBus: 0.1, closestSchool: 0.8,
    closestHospital: 0.6, closestPark: 0.2, closestUniversity: 0.5,
    availableFrom: new Date('2026-05-01'),
  },

  // ── Volos ──────────────────────────────────────────────────────────────────
  {
    title: 'Quiet apartment near the port of Volos',
    description: 'Two-bedroom apartment in a peaceful area of Volos with partial sea views. Well-maintained building, autonomous heating, large storage room. Close to the port, fish market, and the famous Volos waterfront (paralia).',
    city: 'Volos', country: 'Greece', area: 'Volos Centre',
    street: 'Argonauton 12', listingType: 'rent', pricePerMonth: 420,
    bedrooms: 2, bathrooms: 1, floor: 2, sizeSqMeters: 62,
    yearBuilt: 1982, yearRenovated: 2013,
    heatingCategory: 'autonomous', heatingAgent: 'natural gas',
    parking: false, energyClass: 'D',
    closestMetro: null, closestBus: 0.3, closestSchool: 0.5,
    closestHospital: 1.0, closestPark: 0.4, closestUniversity: 0.8,
    availableFrom: new Date('2026-06-01'),
  },

  // ── Heraklion / Iraklio ────────────────────────────────────────────────────
  {
    title: 'Apartment for sale in Heraklion city centre',
    description: 'Well-positioned apartment in central Heraklion. Three bedrooms, renovated throughout, roof terrace with city views. Very close to all services, the market, and the Venetian port. Excellent investment or primary residence.',
    city: 'Heraklion', country: 'Greece', area: 'Heraklion Centre',
    street: '1821 Square 4', listingType: 'sale', pricePerMonth: 135000,
    bedrooms: 3, bathrooms: 1, floor: 3, sizeSqMeters: 88,
    yearBuilt: 1978, yearRenovated: 2019,
    heatingCategory: 'autonomous', heatingAgent: 'electricity',
    parking: false, energyClass: 'C',
    closestMetro: null, closestBus: 0.2, closestSchool: 0.4,
    closestHospital: 0.8, closestPark: 0.5, closestUniversity: 0.6,
    availableFrom: new Date('2026-08-01'),
  },

  // ── Patras ─────────────────────────────────────────────────────────────────
  {
    title: 'Student apartment near Patras University',
    description: 'Ideal apartment for university students, located 5 minutes walk from the University of Patras campus. Two bedrooms, fully furnished, fast internet, autonomous heating. Bus stop right outside.',
    city: 'Patras', country: 'Greece', area: 'Rio',
    street: 'Akti Dimeon 30', listingType: 'rent', pricePerMonth: 380,
    bedrooms: 2, bathrooms: 1, floor: 1, sizeSqMeters: 52,
    yearBuilt: 1992, yearRenovated: 2016,
    heatingCategory: 'autonomous', heatingAgent: 'natural gas',
    parking: false, energyClass: 'D',
    closestMetro: null, closestBus: 0.1, closestSchool: 0.6,
    closestHospital: 2.0, closestPark: 0.7, closestUniversity: 0.3,
    availableFrom: new Date('2026-09-01'),
  },

  // ── Athens – Piraeus ───────────────────────────────────────────────────────
  {
    title: 'Renovated apartment in Piraeus near the port',
    description: 'Completely renovated 2-bedroom apartment in Piraeus, 10 minutes from the port. Modern finishes, energy-efficient windows, balcony with port views. Easy metro access to central Athens. Suitable for workers in the shipping industry.',
    city: 'Athens', country: 'Greece', area: 'Piraeus',
    street: 'Grigoriou Lampraki 14', listingType: 'rent', pricePerMonth: 700,
    bedrooms: 2, bathrooms: 1, floor: 2, sizeSqMeters: 64,
    yearBuilt: 1980, yearRenovated: 2023,
    heatingCategory: 'autonomous', heatingAgent: 'natural gas',
    parking: false, energyClass: 'B',
    closestMetro: 0.8, closestBus: 0.1, closestSchool: 0.5,
    closestHospital: 1.2, closestPark: 0.6, closestUniversity: 2.0,
    availableFrom: new Date('2026-06-01'),
  },

  // ── Athens – Psychiko ──────────────────────────────────────────────────────
  {
    title: 'Upscale apartment in Psychiko with private parking',
    description: 'Elegant apartment in the prestigious Psychiko neighbourhood. Three bedrooms, fireplace, private garden area, and two parking spaces. Walking distance to private schools and high-end amenities. Quiet tree-lined street.',
    city: 'Athens', country: 'Greece', area: 'Psychiko',
    street: 'Vasileos Konstantinou 8', listingType: 'rent', pricePerMonth: 2400,
    bedrooms: 3, bathrooms: 2, floor: 1, sizeSqMeters: 150,
    yearBuilt: 1990, yearRenovated: 2018,
    heatingCategory: 'autonomous', heatingAgent: 'natural gas',
    parking: true, energyClass: 'B',
    closestMetro: 1.2, closestBus: 0.3, closestSchool: 0.3,
    closestHospital: 1.5, closestPark: 0.4, closestUniversity: 2.0,
    availableFrom: new Date('2026-07-01'),
  },

  // ── Athens – Kallithea ─────────────────────────────────────────────────────
  {
    title: 'Affordable 1-bedroom in Kallithea',
    description: 'Compact and functional 1-bedroom apartment in Kallithea, close to Fix metro station. Updated interiors, air conditioning, small balcony. Perfect for a single person or couple looking for affordable central living.',
    city: 'Athens', country: 'Greece', area: 'Kallithea',
    street: 'Davaki 9', listingType: 'rent', pricePerMonth: 580,
    bedrooms: 1, bathrooms: 1, floor: 3, sizeSqMeters: 42,
    yearBuilt: 1975, yearRenovated: 2015,
    heatingCategory: 'autonomous', heatingAgent: 'electricity',
    parking: false, energyClass: 'D',
    closestMetro: 0.3, closestBus: 0.1, closestSchool: 0.4,
    closestHospital: 0.9, closestPark: 0.5, closestUniversity: 1.5,
    availableFrom: new Date('2026-06-01'),
  },

  // ── Athens – Chalandri ─────────────────────────────────────────────────────
  {
    title: 'Large family home for sale in Chalandri',
    description: 'Spacious 4-bedroom maisonette in the northern suburbs of Chalandri. Two levels, private garden, double garage, fireplace. Excellent schools, parks, and shopping nearby. Quiet residential street, perfect for families.',
    city: 'Athens', country: 'Greece', area: 'Chalandri',
    street: 'Pentelis 22', listingType: 'sale', pricePerMonth: 320000,
    bedrooms: 4, bathrooms: 3, floor: 0, sizeSqMeters: 185,
    yearBuilt: 1998, yearRenovated: 2021,
    heatingCategory: 'autonomous', heatingAgent: 'natural gas',
    parking: true, energyClass: 'B',
    closestMetro: 1.0, closestBus: 0.3, closestSchool: 0.3,
    closestHospital: 2.0, closestPark: 0.5, closestUniversity: 1.5,
    availableFrom: new Date('2026-08-01'),
  },

  // ── Athens – Galatsi ───────────────────────────────────────────────────────
  {
    title: 'Budget 2-bed flat in Galatsi with parking',
    description: 'Good-value apartment in Galatsi with a private parking space — a rare find at this price. Two bedrooms, tiled floors, sunny balcony, storage. Close to Ano Patisia metro. Suitable for a small family or two working professionals.',
    city: 'Athens', country: 'Greece', area: 'Galatsi',
    street: 'Ithakis 5', listingType: 'rent', pricePerMonth: 650,
    bedrooms: 2, bathrooms: 1, floor: 1, sizeSqMeters: 70,
    yearBuilt: 1983, yearRenovated: 2010,
    heatingCategory: 'central', heatingAgent: 'oil',
    parking: true, energyClass: 'E',
    closestMetro: 0.9, closestBus: 0.2, closestSchool: 0.4,
    closestHospital: 1.4, closestPark: 0.5, closestUniversity: 2.0,
    availableFrom: new Date('2026-06-01'),
  },
]

async function main() {
  console.log('Seeding demo users and homes...')

  const allUsers = [...owners, ...renters]
  const createdOwners: { id: number }[] = []

  for (const u of allUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { email: u.email, name: u.name, role: u.role },
      select: { id: true },
    })
    if (u.role === 'owner') createdOwners.push(user)
  }

  console.log(`  ✓ ${allUsers.length} users upserted (${createdOwners.length} owners, ${renters.length} renters)`)

  let count = 0
  for (let i = 0; i < homes.length; i++) {
    const owner = createdOwners[i % createdOwners.length]
    const h = homes[i]
    await prisma.home.create({
      data: { ...h, ownerId: owner.id },
    })
    count++
  }

  console.log(`  ✓ ${count} homes created`)
  console.log('Done.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

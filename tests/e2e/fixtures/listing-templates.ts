/**
 * Realistic listing templates for E2E tests.
 * Pick one via pickListingTemplate() whenever a test needs to create a property.
 * Each template represents a genuinely different property — varying area, size,
 * price, floor, heating, energy class, and character — so repeated runs don't
 * produce identical rows in the database.
 */

export interface ListingTemplate {
  city: string
  country: string
  area: string
  street: string
  listingType: 'rent' | 'sale'
  pricePerMonth: number
  sizeSqMeters: number
  bedrooms: number
  bathrooms: number
  floor: number
  heatingCategory: string
  heatingAgent: string
  parking: boolean
  yearBuilt: number
  yearRenovated: number | null
  energyClass: string
  availableFrom: string
  description: string
  descriptionGreek: string
}

export const LISTING_TEMPLATES: ListingTemplate[] = [
  {
    // Studio near Panteion University — budget student rental
    city: 'Athens',
    country: 'Greece',
    area: 'Kallithea',
    street: 'Davaki 14',
    listingType: 'rent',
    pricePerMonth: 420,
    sizeSqMeters: 32,
    bedrooms: 0,
    bathrooms: 1,
    floor: 2,
    heatingCategory: 'Autonomous',
    heatingAgent: 'Power',
    parking: false,
    yearBuilt: 1975,
    yearRenovated: 2019,
    energyClass: 'E',
    availableFrom: '2025-09-01',
    description: 'Cosy studio on the 2nd floor, recently updated kitchen and bathroom. Walking distance to Kallithea metro and Panteion University. Suitable for a single student or young professional.',
    descriptionGreek: 'Άνετο studio στον 2ο όροφο, με πρόσφατα ανακαινισμένη κουζίνα και μπάνιο. Σε απόσταση βαδίσματος από το μετρό Καλλιθέας και το Πάντειο Πανεπιστήμιο. Κατάλληλο για φοιτητή ή νέο επαγγελματία.',
  },
  {
    // 1BR in Nea Smyrni — family neighbourhood, near metro
    city: 'Athens',
    country: 'Greece',
    area: 'Nea Smyrni',
    street: 'Omonias 8',
    listingType: 'rent',
    pricePerMonth: 620,
    sizeSqMeters: 58,
    bedrooms: 1,
    bathrooms: 1,
    floor: 3,
    heatingCategory: 'Central',
    heatingAgent: 'Oil',
    parking: false,
    yearBuilt: 1988,
    yearRenovated: 2022,
    energyClass: 'C',
    availableFrom: '2025-10-01',
    description: 'Bright, south-facing apartment on the 3rd floor in one of Athens\'s most sought-after family neighbourhoods. Renovated bathroom and kitchen, air conditioning, 5-minute walk to Nea Smyrni metro station.',
    descriptionGreek: 'Φωτεινό, νότιο διαμέρισμα στον 3ο όροφο σε μια από τις πιο περιζήτητες οικογενειακές συνοικίες της Αθήνας. Ανακαινισμένο μπάνιο και κουζίνα, κλιματισμός, 5 λεπτά με τα πόδια από το μετρό Νέας Σμύρνης.',
  },
  {
    // 2BR in Glyfada — upscale coastal area, professionals
    city: 'Athens',
    country: 'Greece',
    area: 'Glyfada',
    street: 'Grigorou Lampraki 22',
    listingType: 'rent',
    pricePerMonth: 1150,
    sizeSqMeters: 88,
    bedrooms: 2,
    bathrooms: 1,
    floor: 4,
    heatingCategory: 'Autonomous',
    heatingAgent: 'Natural gas',
    parking: true,
    yearBuilt: 2003,
    yearRenovated: null,
    energyClass: 'B',
    availableFrom: '2025-08-15',
    description: 'Modern 2-bedroom flat in a well-maintained 2003 building, 4th floor with private parking. 10-minute walk to Glyfada beach and the vibrant restaurant strip. Ideal for a couple or two professionals.',
    descriptionGreek: 'Σύγχρονο διαμέρισμα 2 υπνοδωματίων σε καλοσυντηρημένη πολυκατοικία του 2003, 4ος όροφος με ιδιωτική θέση στάθμευσης. 10 λεπτά με τα πόδια από την παραλία Γλυφάδας και τον εμπορικό δρόμο. Ιδανικό για ζευγάρι ή δύο επαγγελματίες.',
  },
  {
    // 3BR in Kifisia — affluent northern suburb, large family home
    city: 'Athens',
    country: 'Greece',
    area: 'Kifisia',
    street: 'Kolokotroni 5',
    listingType: 'rent',
    pricePerMonth: 1900,
    sizeSqMeters: 145,
    bedrooms: 3,
    bathrooms: 2,
    floor: 1,
    heatingCategory: 'Central',
    heatingAgent: 'Natural gas',
    parking: true,
    yearBuilt: 1995,
    yearRenovated: 2020,
    energyClass: 'B',
    availableFrom: '2025-11-01',
    description: 'Spacious 3-bedroom apartment on the 1st floor in the prestigious Kifisia district. Two full bathrooms, storage room, underground parking, and a private garden patio. Minutes from Kifisia metro and the commercial centre.',
    descriptionGreek: 'Ευρύχωρο διαμέρισμα 3 υπνοδωματίων στον 1ο όροφο στην πολυτελή περιοχή της Κηφισιάς. Δύο πλήρη μπάνια, αποθήκη, υπόγεια θέση στάθμευσης και ιδιωτική αυλή με κήπο. Λίγα λεπτά από το μετρό Κηφισιάς και το εμπορικό κέντρο.',
  },
  {
    // 1BR in Zografou — university belt, student-friendly
    city: 'Athens',
    country: 'Greece',
    area: 'Zografou',
    street: 'Zoodohou Pigis 11',
    listingType: 'rent',
    pricePerMonth: 530,
    sizeSqMeters: 48,
    bedrooms: 1,
    bathrooms: 1,
    floor: 0,
    heatingCategory: 'Autonomous',
    heatingAgent: 'Power',
    parking: false,
    yearBuilt: 1970,
    yearRenovated: 2018,
    energyClass: 'D',
    availableFrom: '2025-09-15',
    description: 'Ground-floor 1-bedroom apartment on a quiet street near the National Technical University. Updated in 2018 with new windows and insulation. Small private courtyard — ideal for a student who values outdoor space.',
    descriptionGreek: 'Ισόγειο διαμέρισμα 1 υπνοδωματίου σε ήσυχο δρόμο κοντά στο Εθνικό Μετσόβιο Πολυτεχνείο. Ανανεώθηκε το 2018 με νέα κουφώματα και μόνωση. Μικρή ιδιωτική αυλή — ιδανικό για φοιτητή που εκτιμά τον εξωτερικό χώρο.',
  },
  {
    // 2BR in Palaio Faliro — seafront suburb, sea-view upper floor
    city: 'Athens',
    country: 'Greece',
    area: 'Palaio Faliro',
    street: 'Amfitheas 33',
    listingType: 'rent',
    pricePerMonth: 1080,
    sizeSqMeters: 92,
    bedrooms: 2,
    bathrooms: 1,
    floor: 5,
    heatingCategory: 'Central',
    heatingAgent: 'Oil',
    parking: false,
    yearBuilt: 1982,
    yearRenovated: 2016,
    energyClass: 'C',
    availableFrom: '2025-10-15',
    description: 'Top-floor 2-bedroom with sweeping sea views and a large wraparound balcony. Renovated kitchen and double-glazed windows. A 5-minute walk to the Faliro coastal promenade and tram stop.',
    descriptionGreek: 'Τελευταίος όροφος με 2 υπνοδωμάτια, θέα θάλασσα και μεγάλο περιμετρικό μπαλκόνι. Ανακαινισμένη κουζίνα και διπλά κουφώματα. 5 λεπτά με τα πόδια από την παραλιακή πεζόδρομο και τη στάση τραμ Φαλήρου.',
  },
  {
    // 1BR in Chalandri — quiet north-eastern suburb
    city: 'Athens',
    country: 'Greece',
    area: 'Chalandri',
    street: 'Pentelis 18',
    listingType: 'rent',
    pricePerMonth: 590,
    sizeSqMeters: 52,
    bedrooms: 1,
    bathrooms: 1,
    floor: 2,
    heatingCategory: 'Autonomous',
    heatingAgent: 'Natural gas',
    parking: false,
    yearBuilt: 1990,
    yearRenovated: 2021,
    energyClass: 'C',
    availableFrom: '2025-09-01',
    description: 'Well-maintained 1-bedroom in a tree-lined street in Chalandri. Fully renovated in 2021 — new kitchen, bathroom, and flooring. Quiet neighbourhood with excellent bus connections to the city centre.',
    descriptionGreek: 'Καλοσυντηρημένο διαμέρισμα 1 υπνοδωματίου σε δεντροφυτεμένο δρόμο στο Χαλάνδρι. Πλήρως ανακαινισμένο το 2021 — νέα κουζίνα, μπάνιο και δάπεδα. Ήσυχη γειτονιά με άριστες συνδέσεις λεωφορείου προς το κέντρο.',
  },
  {
    // 3BR in Vyronas — hillside family district, large living area
    city: 'Athens',
    country: 'Greece',
    area: 'Vyronas',
    street: 'Plastira 7',
    listingType: 'rent',
    pricePerMonth: 890,
    sizeSqMeters: 118,
    bedrooms: 3,
    bathrooms: 1,
    floor: 1,
    heatingCategory: 'Central',
    heatingAgent: 'Oil',
    parking: true,
    yearBuilt: 1985,
    yearRenovated: 2017,
    energyClass: 'D',
    availableFrom: '2025-10-01',
    description: 'Large 3-bedroom family apartment with a covered parking space. On the slopes of Hymettus with hill views. Storage room included. Close to Vyronas park and local schools — ideal for a family.',
    descriptionGreek: 'Μεγάλο διαμέρισμα 3 υπνοδωματίων για οικογένεια με κλειστή θέση στάθμευσης. Στις πλαγιές του Υμηττού με θέα στο βουνό. Περιλαμβάνεται αποθήκη. Κοντά στο πάρκο Βύρωνα και σχολεία — ιδανικό για οικογένεια.',
  },
  {
    // 2BR in Piraeus — port city, convenient transport hub
    city: 'Athens',
    country: 'Greece',
    area: 'Piraeus',
    street: 'Notara 42',
    listingType: 'rent',
    pricePerMonth: 680,
    sizeSqMeters: 72,
    bedrooms: 2,
    bathrooms: 1,
    floor: 3,
    heatingCategory: 'Autonomous',
    heatingAgent: 'Natural gas',
    parking: false,
    yearBuilt: 1978,
    yearRenovated: 2015,
    energyClass: 'D',
    availableFrom: '2025-08-01',
    description: 'Central Piraeus 2-bedroom, 3rd floor, 5 minutes on foot from Piraeus metro and the port. Updated plumbing and electrical system. Great connectivity — direct metro to the airport and central Athens.',
    descriptionGreek: 'Κεντρικός Πειραιάς, 2 υπνοδωμάτια, 3ος όροφος, 5 λεπτά με τα πόδια από το μετρό Πειραιά και το λιμάνι. Ανανεωμένα υδραυλικά και ηλεκτρολογικά. Άριστη συνδεσιμότητα — απευθείας μετρό σε αεροδρόμιο και κέντρο Αθήνας.',
  },
  {
    // 1BR in Alimos — southern coastal suburb, young professionals
    city: 'Athens',
    country: 'Greece',
    area: 'Alimos',
    street: 'Poseidonos 17',
    listingType: 'rent',
    pricePerMonth: 780,
    sizeSqMeters: 60,
    bedrooms: 1,
    bathrooms: 1,
    floor: 2,
    heatingCategory: 'Autonomous',
    heatingAgent: 'Natural gas',
    parking: false,
    yearBuilt: 2001,
    yearRenovated: null,
    energyClass: 'B',
    availableFrom: '2025-09-01',
    description: 'Modern 1-bedroom in a 2001 building on Alimos\'s main coastal avenue. Large balcony, open-plan living area, and tasteful finishes throughout. A 2-minute walk to the beach and marina.',
    descriptionGreek: 'Σύγχρονο διαμέρισμα 1 υπνοδωματίου σε κτίριο του 2001 στην κεντρική παραλιακή λεωφόρο Αλίμου. Μεγάλο μπαλκόνι, ανοιχτό σαλοντραπεζαρία και φινετσάτες λεπτομέρειες παντού. 2 λεπτά από την παραλία και τη μαρίνα.',
  },
]

/**
 * Returns a listing template, rotating through the array based on the current
 * epoch second so different test runs pick different properties.
 */
export function pickListingTemplate(): ListingTemplate {
  const idx = Math.floor(Date.now() / 1000) % LISTING_TEMPLATES.length
  return LISTING_TEMPLATES[idx]
}

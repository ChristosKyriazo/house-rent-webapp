import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const areas = [
  // ── Athens ──────────────────────────────────────────────────────────────────
  { name: 'Agia Paraskevi',            nameGreek: 'Αγία Παρασκευή',              city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Agia Varvara',              nameGreek: 'Αγία Βαρβάρα',                city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Agioi Anargyroi-Kamatero', nameGreek: 'Άγιοι Ανάργυροι-Καματερό',   city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Agios Dimitrios',           nameGreek: 'Άγιος Δημήτριος',             city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Aigaleo',                   nameGreek: 'Αιγάλεω',                     city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Alimos',                    nameGreek: 'Άλιμος',                      city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Amarousio',                 nameGreek: 'Αμαρούσιο',                   city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Athens',                    nameGreek: 'Αθήνα',                       city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Chaidari',                  nameGreek: 'Χαϊδάρι',                     city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Chalandri',                 nameGreek: 'Χαλάνδρι',                    city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Dafni-Ymittos',             nameGreek: 'Δάφνη-Υμηττός',              city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Elliniko-Argyroupoli',      nameGreek: 'Ελληνικό-Αργυρούπολη',       city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Filadelfeia-Chalkidona',    nameGreek: 'Φιλαδέλφεια-Χαλκηδόνα',     city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Filothei-Psychiko',         nameGreek: 'Φιλοθέη-Ψυχικό',             city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Galatsi',                   nameGreek: 'Γαλάτσι',                     city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Glyfada',                   nameGreek: 'Γλυφάδα',                     city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Ilion',                     nameGreek: 'Ίλιον',                       city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Ilioupoli',                 nameGreek: 'Ηλιούπολη',                   city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Irakleio',                  nameGreek: 'Ηράκλειο',                    city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Kaisariani',                nameGreek: 'Καισαριανή',                  city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Kallithea',                 nameGreek: 'Καλλιθέα',                    city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Keratsini-Drapetsona',      nameGreek: 'Κερατσίνι-Δραπετσώνα',       city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Kifisia',                   nameGreek: 'Κηφισιά',                     city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Korydallos',                nameGreek: 'Κορυδαλλός',                  city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Lykovrysi-Pefki',           nameGreek: 'Λυκόβρυση-Πεύκη',            city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Metamorfosi',               nameGreek: 'Μεταμόρφωση',                 city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Moschato-Tavros',           nameGreek: 'Μοσχάτο-Ταύρος',             city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Nea Ionia',                 nameGreek: 'Νέα Ιωνία',                   city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Nea Smyrni',                nameGreek: 'Νέα Σμύρνη',                  city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα', safety: 8.5, vibe: 'family-friendly' },
  { name: 'Nikaia-Agios Ioannis Rentis', nameGreek: 'Νίκαια-Άγιος Ιωάννης Ρέντης', city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Palaio Faliro',             nameGreek: 'Παλαιό Φάληρο',               city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Papagou-Cholargos',         nameGreek: 'Παπάγου-Χολαργός',            city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Piraeus',                   nameGreek: 'Πειραιάς',                    city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Peristeri',                 nameGreek: 'Περιστέρι',                   city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Petroupoli',                nameGreek: 'Πετρούπολη',                  city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Vrilissia',                 nameGreek: 'Βριλήσσια',                   city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Vyronas',                   nameGreek: 'Βύρωνας',                     city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Zografou',                  nameGreek: 'Ζωγράφου',                    city: 'Athens', cityGreek: 'Αθήνα', country: 'Greece', countryGreek: 'Ελλάδα' },

  // ── Thessaloniki ─────────────────────────────────────────────────────────────
  { name: 'Ampelokipoi-Menemeni',      nameGreek: 'Αμπελόκιποι-Μενεμένη',       city: 'Thessaloniki', cityGreek: 'Θεσσαλονίκη', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Chalkidona',                nameGreek: 'Χαλκηδόνα',                   city: 'Thessaloniki', cityGreek: 'Θεσσαλονίκη', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Delta',                     nameGreek: 'Δέλτα',                       city: 'Thessaloniki', cityGreek: 'Θεσσαλονίκη', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Kalamaria',                 nameGreek: 'Καλαμαριά',                   city: 'Thessaloniki', cityGreek: 'Θεσσαλονίκη', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Kordelio-Evosmos',          nameGreek: 'Κορδελιό-Εύοσμος',            city: 'Thessaloniki', cityGreek: 'Θεσσαλονίκη', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Lagkadas',                  nameGreek: 'Λαγκαδάς',                    city: 'Thessaloniki', cityGreek: 'Θεσσαλονίκη', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Neapoli-Sykies',            nameGreek: 'Νεάπολη-Συκιές',              city: 'Thessaloniki', cityGreek: 'Θεσσαλονίκη', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Oraiokastro',               nameGreek: 'Ωραιόκαστρο',                 city: 'Thessaloniki', cityGreek: 'Θεσσαλονίκη', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Pavlos Melas',              nameGreek: 'Παύλος Μελάς',                city: 'Thessaloniki', cityGreek: 'Θεσσαλονίκη', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Pylaia-Chortiatis',         nameGreek: 'Πυλαία-Χορτιάτης',            city: 'Thessaloniki', cityGreek: 'Θεσσαλονίκη', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Thermaikos',                nameGreek: 'Θερμαϊκός',                   city: 'Thessaloniki', cityGreek: 'Θεσσαλονίκη', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Thermi',                    nameGreek: 'Θέρμη',                       city: 'Thessaloniki', cityGreek: 'Θεσσαλονίκη', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Thessaloniki',              nameGreek: 'Θεσσαλονίκη',                 city: 'Thessaloniki', cityGreek: 'Θεσσαλονίκη', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Volvi',                     nameGreek: 'Βόλβη',                       city: 'Thessaloniki', cityGreek: 'Θεσσαλονίκη', country: 'Greece', countryGreek: 'Ελλάδα' },

  // ── Volos ────────────────────────────────────────────────────────────────────
  { name: 'Volos',      nameGreek: 'Βόλος',      city: 'Volos', cityGreek: 'Βόλος', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Nea Ionia',  nameGreek: 'Νέα Ιωνία',  city: 'Volos', cityGreek: 'Βόλος', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Iolkos',     nameGreek: 'Ιωλκός',     city: 'Volos', cityGreek: 'Βόλος', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Artemida',   nameGreek: 'Αρτεμίδα',   city: 'Volos', cityGreek: 'Βόλος', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Aisonia',    nameGreek: 'Αισωνία',    city: 'Volos', cityGreek: 'Βόλος', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Makrinitsa', nameGreek: 'Μακρινίτσα', city: 'Volos', cityGreek: 'Βόλος', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Agria',      nameGreek: 'Άγρια',      city: 'Volos', cityGreek: 'Βόλος', country: 'Greece', countryGreek: 'Ελλάδα' },

  // ── Ioannina ─────────────────────────────────────────────────────────────────
  { name: 'Ioannina', nameGreek: 'Ιωάννινα', city: 'Ioannina', cityGreek: 'Ιωάννινα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Dodoni',   nameGreek: 'Δωδώνη',   city: 'Ioannina', cityGreek: 'Ιωάννινα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Konitsa',  nameGreek: 'Κόνιτσα',  city: 'Ioannina', cityGreek: 'Ιωάννινα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Metsovo',  nameGreek: 'Μέτσοβο',  city: 'Ioannina', cityGreek: 'Ιωάννινα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Zagori',   nameGreek: 'Ζαγόρι',   city: 'Ioannina', cityGreek: 'Ιωάννινα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Zitsa',    nameGreek: 'Ζίτσα',    city: 'Ioannina', cityGreek: 'Ιωάννινα', country: 'Greece', countryGreek: 'Ελλάδα' },

  // ── Serres ───────────────────────────────────────────────────────────────────
  { name: 'Serres',             nameGreek: 'Σέρρες',           city: 'Serres', cityGreek: 'Σέρρες', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Ano Vrontou',        nameGreek: 'Άνω Βροντού',      city: 'Serres', cityGreek: 'Σέρρες', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Kapetan Mitrousi',   nameGreek: 'Καπετάν Μητρούσι', city: 'Serres', cityGreek: 'Σέρρες', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Lefkonas',           nameGreek: 'Λευκώνας',         city: 'Serres', cityGreek: 'Σέρρες', country: 'Greece', countryGreek: 'Ελλάδα' },

  // ── Komotini ─────────────────────────────────────────────────────────────────
  { name: 'Komotini', nameGreek: 'Κομοτηνή', city: 'Komotini', cityGreek: 'Κομοτηνή', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Iasmos',   nameGreek: 'Ίασμος',   city: 'Komotini', cityGreek: 'Κομοτηνή', country: 'Greece', countryGreek: 'Ελλάδα' },

  // ── Chania ───────────────────────────────────────────────────────────────────
  { name: 'Chania',      nameGreek: 'Χανιά',       city: 'Chania', cityGreek: 'Χανιά', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Apokoronas',  nameGreek: 'Αποκόρωνας',  city: 'Chania', cityGreek: 'Χανιά', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Kissamos',    nameGreek: 'Κίσσαμος',    city: 'Chania', cityGreek: 'Χανιά', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Platanias',   nameGreek: 'Πλατανιάς',   city: 'Chania', cityGreek: 'Χανιά', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Sfakia',      nameGreek: 'Σφακιά',      city: 'Chania', cityGreek: 'Χανιά', country: 'Greece', countryGreek: 'Ελλάδα' },

  // ── Iraklio (Heraklion) ──────────────────────────────────────────────────────
  { name: 'Heraklion',      nameGreek: 'Ηράκλειο',      city: 'Iraklio', cityGreek: 'Ηράκλειο', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Hersonissos',    nameGreek: 'Χερσόνησος',    city: 'Iraklio', cityGreek: 'Ηράκλειο', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Minoa Pediada',  nameGreek: 'Μινώα Πεδιάδα', city: 'Iraklio', cityGreek: 'Ηράκλειο', country: 'Greece', countryGreek: 'Ελλάδα' },

  // ── Patra ────────────────────────────────────────────────────────────────────
  { name: 'Patras',     nameGreek: 'Πάτρα',      city: 'Patra', cityGreek: 'Πάτρα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Messatida',  nameGreek: 'Μεσσάτιδα',  city: 'Patra', cityGreek: 'Πάτρα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Paralia',    nameGreek: 'Παραλία',    city: 'Patra', cityGreek: 'Πάτρα', country: 'Greece', countryGreek: 'Ελλάδα' },
  { name: 'Rio',        nameGreek: 'Ρίο',        city: 'Patra', cityGreek: 'Πάτρα', country: 'Greece', countryGreek: 'Ελλάδα' },
]

async function main() {
  console.log(`Seeding ${areas.length} areas...`)

  let created = 0
  let updated = 0

  for (const area of areas) {
    const existing = await prisma.area.findFirst({
      where: { name: area.name, city: area.city ?? undefined },
    })

    if (existing) {
      await prisma.area.update({ where: { id: existing.id }, data: area })
      updated++
    } else {
      await prisma.area.create({ data: area })
      created++
    }
  }

  console.log(`Done. Created: ${created}, Updated: ${updated}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

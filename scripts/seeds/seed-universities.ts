import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

function generateCuid(): string {
  const random = randomBytes(12)
  const hex = random.toString('hex').toLowerCase()
  return `cl${hex.substring(0, 24)}`
}

const universities: Array<{ name: string; city: string }> = [
  // Athens
  { name: 'National and Kapodistrian University of Athens', city: 'Athens' },
  { name: 'National Technical University of Athens', city: 'Athens' },
  { name: 'Athens University of Economics and Business', city: 'Athens' },
  { name: 'Agricultural University of Athens', city: 'Athens' },
  { name: 'Panteion University', city: 'Athens' },
  { name: 'Harokopio University', city: 'Athens' },
  { name: 'University of Piraeus', city: 'Athens' },
  { name: 'University of West Attica', city: 'Athens' },
  { name: 'Athens School of Fine Arts', city: 'Athens' },

  // Thessaloniki
  { name: 'Aristotle University of Thessaloniki', city: 'Thessaloniki' },
  { name: 'International Hellenic University', city: 'Thessaloniki' },
  { name: 'University of Macedonia', city: 'Thessaloniki' },
  { name: 'Alexander Technological Educational Institute of Thessaloniki', city: 'Thessaloniki' },

  // Patra
  { name: 'University of Patras', city: 'Patra' },
  { name: 'Hellenic Open University', city: 'Patra' },

  // Volos
  { name: 'University of Thessaly', city: 'Volos' },

  // Ioannina
  { name: 'University of Ioannina', city: 'Ioannina' },

  // Komotini
  { name: 'Democritus University of Thrace', city: 'Komotini' },

  // Iraklio
  { name: 'University of Crete', city: 'Iraklio' },
  { name: 'Hellenic Mediterranean University', city: 'Iraklio' },
]

async function seedUniversities() {
  console.log('Seeding universities...')

  let created = 0
  let skipped = 0

  for (const u of universities) {
    const existing = await prisma.university.findFirst({
      where: { name: u.name, city: u.city },
    })

    if (existing) {
      console.log(`⏭  Already exists: ${u.name} (${u.city})`)
      skipped++
      continue
    }

    try {
      const university = await prisma.university.create({
        data: { key: generateCuid(), name: u.name, city: u.city },
      })
      console.log(`✅ Created: ${u.name} (${u.city}) — id: ${university.id}`)
      created++
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Key collision — retry with new key
        await prisma.university.create({
          data: { key: generateCuid(), name: u.name, city: u.city },
        })
        console.log(`✅ Created (retry): ${u.name} (${u.city})`)
        created++
      } else {
        throw error
      }
    }
  }

  console.log(`\n✅ Done. Created: ${created}, Skipped (already exist): ${skipped}`)
}

seedUniversities()
  .catch((e) => { console.error('Error seeding universities:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })

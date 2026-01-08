import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

// Generate a CUID-like key (matching Prisma's format: 'cl' + 24 lowercase hex chars)
function generateCuid(): string {
  const random = randomBytes(12)
  const hex = random.toString('hex').toLowerCase()
  return `cl${hex.substring(0, 24)}`
}

const universities = [
  'National and Kapodistrian University of Athens',
  'National Technical University of Athens',
  'Athens University of Economics and Business',
  'Agricultural University of Athens',
  'Panteion University',
  'Harokopio University',
  'University of Piraeus',
  'University of West Attica',
  'Athens School of Fine Arts',
]

async function seedUniversities() {
  console.log('Seeding universities...')

  for (const name of universities) {
    try {
      const key = generateCuid()
      const university = await prisma.university.create({
        data: {
          key,
          name,
          city: 'Athens',
        },
      })
      console.log(`✅ Created: ${name}`)
      console.log(`   ID: ${university.id}, Key: ${university.key}`)
    } catch (error: any) {
      // If key collision, try again
      if (error.code === 'P2002') {
        console.log(`⚠️  Key collision for ${name}, retrying...`)
        const key = generateCuid()
        const university = await prisma.university.create({
          data: {
            key,
            name,
            city: 'Athens',
          },
        })
        console.log(`✅ Created: ${name} (retry)`)
        console.log(`   ID: ${university.id}, Key: ${university.key}`)
      } else {
        throw error
      }
    }
  }

  console.log('\n✅ All universities seeded successfully!')
}

seedUniversities()
  .catch((e) => {
    console.error('Error seeding universities:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


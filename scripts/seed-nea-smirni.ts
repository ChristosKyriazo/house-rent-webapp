import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Check if Nea Smirni already exists
  const existingArea = await prisma.area.findFirst({
    where: {
      name: 'Nea Smirni',
    },
  })

  if (existingArea) {
    console.log('Nea Smirni already exists, updating...')
    await prisma.area.update({
      where: { id: existingArea.id },
      data: {
        nameGreek: 'Νέα Σμύρνη',
        city: 'Athens',
        country: 'Greece',
        safety: 8.5, // rating out of 10
        vibe: 'family-friendly',
      },
    })
    console.log('Nea Smirni updated successfully!')
  } else {
    console.log('Creating Nea Smirni area...')
    await prisma.area.create({
      data: {
        name: 'Nea Smirni',
        nameGreek: 'Νέα Σμύρνη',
        city: 'Athens',
        country: 'Greece',
        safety: 8.5, // rating out of 10
        vibe: 'family-friendly',
      },
    })
    console.log('Nea Smirni created successfully!')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import { generateEmbedding, buildHomeText } from '../../lib/embeddings'

const prisma = new PrismaClient()

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set in .env')
    process.exit(1)
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const homes = await (prisma.home as any).findMany({
    where: { embedding: null },
    select: {
      id: true, title: true, description: true,
      city: true, country: true, area: true,
      listingType: true, bedrooms: true, bathrooms: true,
      pricePerMonth: true, sizeSqMeters: true,
    },
  })

  console.log(`Generating embeddings for ${homes.length} homes...`)

  let done = 0
  for (const home of homes) {
    const text = buildHomeText(home)
    const embedding = await generateEmbedding(text, openai)
    await (prisma.home as any).update({
      where: { id: home.id },
      data: { embedding },
    })
    done++
    if (done % 5 === 0 || done === homes.length) {
      console.log(`  ${done}/${homes.length} done`)
    }
  }

  console.log('Done.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

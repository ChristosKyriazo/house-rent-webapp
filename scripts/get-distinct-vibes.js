const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function getDistinctVibes() {
  try {
    const areas = await prisma.area.findMany({
      select: { vibe: true },
      where: { vibe: { not: null } }
    })

    const allVibes = new Set()
    
    areas.forEach(area => {
      if (area.vibe) {
        // Split by comma and trim each vibe
        area.vibe.split(',').forEach(v => {
          const trimmed = v.trim()
          if (trimmed) {
            allVibes.add(trimmed)
          }
        })
      }
    })

    const sortedVibes = Array.from(allVibes).sort()
    
    console.log('Distinct individual vibes (split by comma):')
    console.log('='.repeat(50))
    sortedVibes.forEach((vibe, index) => {
      console.log(`${index + 1}. ${vibe}`)
    })
    console.log('='.repeat(50))
    console.log(`Total distinct vibes: ${sortedVibes.length}`)
    
    // Also show as comma-separated list
    console.log('\nComma-separated list:')
    console.log(sortedVibes.join(', '))
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

getDistinctVibes()


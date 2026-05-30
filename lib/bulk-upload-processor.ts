import { prisma } from '@/lib/prisma'
import { calculatePropertyDistances } from '@/lib/google-maps'
import { findBestMatch, matchParkingValue, getUniqueFieldValues } from '@/lib/value-matcher'
import { toEnglishValue } from '@/lib/translations'
import { generateHouseDescriptions } from '@/lib/house-description-generator'
import { analyzePhotosForTags } from '@/lib/photo-vision'
import { generateEmbedding, buildHomeText } from '@/lib/embeddings'
import { normalizeBulkTextFields } from '@/lib/bulk-upload-normalizer'
import OpenAI from 'openai'
import * as XLSX from 'xlsx'
import { readFile, rm } from 'fs/promises'
import { dirname } from 'path'
import { resolveAreaToEnglishCanonical, resolveCityToEnglishCanonical, resolveCountryToEnglishCanonical } from '@/lib/utils'
import pino from 'pino'

const log = pino({ name: 'bulk-upload-processor' })

export async function processBulkUploadJob(jobId: string) {
  await prisma.bulkUploadJob.update({
    where: { id: jobId },
    data: { status: 'processing' },
  })

  try {
    const job = await prisma.bulkUploadJob.findUniqueOrThrow({ where: { id: jobId } })
    const options = job.options as {
      useAIDescription: boolean
      confirmedNewAreas: Array<{ rowIndex: number; area: string; city?: string; country?: string }>
      photosByIndex: Record<string, string[]>
    }

    const excelBuffer = await readFile(job.filePath)
    const workbook = XLSX.read(excelBuffer, { type: 'buffer' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    const [uniqueHeatingCategories, uniqueHeatingAgents, uniqueEnergyClasses] = await Promise.all([
      getUniqueFieldValues(prisma, 'heatingCategory'),
      getUniqueFieldValues(prisma, 'heatingAgent'),
      getUniqueFieldValues(prisma, 'energyClass'),
    ])

    const validHeatingCategories = uniqueHeatingCategories.length > 0 ? uniqueHeatingCategories : ['central', 'autonomous']
    const validHeatingAgents = uniqueHeatingAgents.length > 0 ? uniqueHeatingAgents : ['oil', 'natural gas', 'electricity', 'other']
    const validEnergyClasses = uniqueEnergyClasses.length > 0 ? uniqueEnergyClasses : ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']

    // Insert any owner-confirmed new areas before processing rows
    const rowAreaOverrides = new Map<number, string>()
    for (const ca of (options.confirmedNewAreas || [])) {
      if (!ca.area) continue
      rowAreaOverrides.set(ca.rowIndex, ca.area)
      const existing = await prisma.area.findFirst({ where: { name: ca.area } })
      if (!existing) {
        await prisma.area.create({
          data: { name: ca.area, city: ca.city || null, country: ca.country || null },
        })
      }
    }

    const allAreas = await prisma.area.findMany({
      select: { name: true, nameGreek: true, city: true, cityGreek: true, country: true, countryGreek: true },
    })

    const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

    const results: Array<{ row: number; title: string; key: string }> = []
    const errors: string[] = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNumber = i + 2

      try {
        if (!row['Title'] || !row['City'] || !row['Country'] || !row['Price Per Month'] || !row['Size (sq meters)']) {
          errors.push(`Row ${rowNumber}: Missing required fields (Title, City, Country, Price Per Month, Size)`)
          continue
        }

        const rawTitle = String(row['Title']).trim()
        const rawDescription = row['Description'] ? String(row['Description']).trim() : null
        const rawStreet = row['Street'] ? String(row['Street']).trim() : null

        let title = rawTitle
        let titleGreek: string | null = null
        let street = rawStreet
        let streetGreek: string | null = null
        let description = rawDescription
        let descriptionGreek: string | null = null

        if (openai) {
          try {
            const normalized = await normalizeBulkTextFields(
              { title: rawTitle, street: rawStreet, description: rawDescription },
              openai
            )
            title = normalized.titleEn
            titleGreek = normalized.titleEl
            street = normalized.streetEn
            streetGreek = normalized.streetEl
            description = normalized.descriptionEn
            descriptionGreek = normalized.descriptionEl
          } catch (err) {
            log.error({ err, rowNumber }, 'Error normalizing text fields, using raw values')
          }
        }

        const city = resolveCityToEnglishCanonical(String(row['City']).trim(), allAreas)
        const country = resolveCountryToEnglishCanonical(String(row['Country']).trim(), allAreas)

        const areaInput = rowAreaOverrides.has(i)
          ? rowAreaOverrides.get(i)!
          : (row['Area'] ? String(row['Area']).trim() : null)
        const area = resolveAreaToEnglishCanonical(areaInput, allAreas)

        const listingTypeInput = row['Listing Type'] ? String(row['Listing Type']).trim().toLowerCase() : 'rent'
        const listingType =
          listingTypeInput === 'sale' || listingTypeInput === 'sell' ||
          listingTypeInput === 'πώληση' || listingTypeInput === 'πωληση' ||
          listingTypeInput.includes('sale') || listingTypeInput.includes('sell')
            ? 'sale' : 'rent'

        const pricePerMonth = Number(row['Price Per Month'])
        const bedrooms = Number(row['Bedrooms'] || 0)
        const bathrooms = Number(row['Bathrooms'] || 0)
        const floorInput = row['Floor']
        const floor = floorInput !== null && floorInput !== undefined && String(floorInput).trim() !== '' ? Number(floorInput) : null

        const heatingCategoryInput = row['Heating Category'] ? String(row['Heating Category']).trim() : null
        const heatingCategory = heatingCategoryInput
          ? findBestMatch(toEnglishValue(heatingCategoryInput), validHeatingCategories) || toEnglishValue(heatingCategoryInput)
          : null

        const heatingAgentInput = row['Heating Agent'] ? String(row['Heating Agent']).trim() : null
        const heatingAgent = heatingAgentInput
          ? findBestMatch(toEnglishValue(heatingAgentInput), validHeatingAgents) || toEnglishValue(heatingAgentInput)
          : null

        const parking = matchParkingValue(row['Parking'] ? String(row['Parking']).trim() : null)
        const sizeSqMeters = Number(row['Size (sq meters)'])
        const yearBuilt = row['Year Built'] && row['Year Built'] !== '' ? Number(row['Year Built']) : null
        const yearRenovated = row['Year Renovated'] && row['Year Renovated'] !== '' ? Number(row['Year Renovated']) : null
        const availableFrom = row['Available From'] ? new Date(String(row['Available From'])) : new Date()

        const energyClassInput = row['Energy Class'] ? String(row['Energy Class']).trim() : null
        let energyClass: string | null = null
        if (energyClassInput) {
          const energyClassMap = new Map(validEnergyClasses.map(v => [v.toUpperCase(), v]))
          const matched = findBestMatch(energyClassInput.toUpperCase(), Array.from(energyClassMap.keys()))
          energyClass = matched ? energyClassMap.get(matched) || energyClassInput.toUpperCase() : energyClassInput.toUpperCase()
        }

        if (isNaN(pricePerMonth) || isNaN(bedrooms) || isNaN(bathrooms) || isNaN(sizeSqMeters)) {
          errors.push(`Row ${rowNumber}: Invalid numeric values`)
          continue
        }

        if (isNaN(availableFrom.getTime())) {
          errors.push(`Row ${rowNumber}: Invalid date format for Available From`)
          continue
        }

        let distances = {
          closestMetro: null as number | null,
          closestBus: null as number | null,
          closestSchool: null as number | null,
          closestHospital: null as number | null,
          closestPark: null as number | null,
          closestUniversity: null as number | null,
        }
        try {
          const d = await calculatePropertyDistances(street, area, city, country)
          distances = {
            closestMetro: d.closestMetro,
            closestBus: d.closestBus,
            closestSchool: d.closestSchool,
            closestHospital: d.closestHospital,
            closestPark: d.closestPark,
            closestUniversity: d.closestUniversity,
          }
        } catch (err) {
          log.error({ err, rowNumber }, 'Error calculating distances')
        }

        // Photos were already saved at job creation time
        const housePhotos: string[] = options.photosByIndex?.[String(i)] || []
        const photosJson = housePhotos.length > 0 ? JSON.stringify(housePhotos) : null

        let photoTagsList: string[] = []
        if (housePhotos.length > 0 && openai) {
          photoTagsList = await analyzePhotosForTags(housePhotos, openai)
        }
        const photoTagsJson = photoTagsList.length > 0 ? JSON.stringify(photoTagsList) : null

        let areaSafety: number | null = null
        let areaVibe: string | null = null
        if (area) {
          const areaData = await prisma.area.findFirst({
            where: { name: area },
            select: { safety: true, vibe: true },
          })
          if (areaData) {
            areaSafety = areaData.safety
            areaVibe = areaData.vibe
          }
        }

        let finalDescription = description
        let finalDescriptionGreek: string | null = descriptionGreek
        if (options.useAIDescription) {
          const aiDescriptions = await generateHouseDescriptions({
            title, city, country, area,
            listingType: listingType === 'sale' ? 'sale' : 'rent',
            pricePerMonth, bedrooms, bathrooms, floor, sizeSqMeters,
            yearBuilt, yearRenovated, heatingCategory, heatingAgent, parking, energyClass,
            closestMetro: distances.closestMetro,
            closestBus: distances.closestBus,
            closestSchool: distances.closestSchool,
            closestHospital: distances.closestHospital,
            closestPark: distances.closestPark,
            closestUniversity: distances.closestUniversity,
            areaSafety, areaVibe,
            availableFrom: availableFrom ? availableFrom.toISOString().split('T')[0] : null,
            ownerNotes: rawDescription || null,
            photoFeatures: photoTagsList.length > 0 ? photoTagsList : null,
          }, openai)

          if (aiDescriptions?.description) {
            finalDescription = aiDescriptions.description
            finalDescriptionGreek = aiDescriptions.descriptionGreek
          }
        }

        const home = await prisma.home.create({
          data: {
            title, titleGreek, description: finalDescription, descriptionGreek: finalDescriptionGreek,
            street, streetGreek, city, country, area,
            listingType: listingType === 'sale' ? 'sale' : 'rent',
            pricePerMonth, bedrooms, bathrooms, floor,
            heatingCategory, heatingAgent, parking, sizeSqMeters,
            yearBuilt, yearRenovated, availableFrom,
            photos: photosJson, photoTags: photoTagsJson, energyClass,
            closestMetro: distances.closestMetro,
            closestBus: distances.closestBus,
            closestSchool: distances.closestSchool,
            closestHospital: distances.closestHospital,
            closestPark: distances.closestPark,
            closestUniversity: distances.closestUniversity,
            ownerId: job.userId,
          },
        })

        if (openai) {
          generateEmbedding(buildHomeText(home), openai)
            .then((embedding) => prisma.home.update({ where: { id: home.id }, data: { embedding } }))
            .catch((err) => log.error({ err, homeId: home.id }, 'Failed to generate embedding'))
        }

        results.push({ row: rowNumber, title, key: home.key })
      } catch (err: any) {
        log.error({ err, rowNumber }, 'Error processing bulk upload row')
        errors.push(`Row ${rowNumber}: ${err.message || 'Unknown error'}`)
      }

      // Update progress after each row
      await prisma.bulkUploadJob.update({
        where: { id: jobId },
        data: { progress: i + 1 },
      })
    }

    await prisma.bulkUploadJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        progress: data.length,
        results: results as any,
        errors: errors.length > 0 ? (errors as any) : null,
      },
    })

    // Clean up the job's Excel file directory
    try {
      await rm(dirname(job.filePath), { recursive: true, force: true })
    } catch { /* ignore cleanup errors */ }
  } catch (err: any) {
    log.error({ err, jobId }, 'Bulk upload job failed')
    await prisma.bulkUploadJob.update({
      where: { id: jobId },
      data: { status: 'failed', errors: [err.message || 'Job failed'] as any },
    }).catch(() => {})
  }
}

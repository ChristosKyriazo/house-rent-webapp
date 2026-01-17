import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculatePropertyDistances } from '@/lib/google-maps'
import { findBestMatch, matchParkingValue, getUniqueFieldValues } from '@/lib/value-matcher'
import { toEnglishValue } from '@/lib/translations'
import { generateHouseDescriptions } from '@/lib/house-description-generator'
import OpenAI from 'openai'
import * as XLSX from 'xlsx'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user has owner/broker role
    const userRole = user.role || 'user'
    if (userRole !== 'owner' && userRole !== 'both' && userRole !== 'broker') {
      return NextResponse.json(
        { error: 'Only owners and brokers can upload listings' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const excelFile = formData.get('excelFile') as File
    const useAIDescription = formData.get('useAIDescription') === 'true'

    if (!excelFile) {
      return NextResponse.json(
        { error: 'Excel file is required' },
        { status: 400 }
      )
    }

    // Check subscription and home count limits
    const subscription = user.subscription || 1
    const currentHomeCount = await prisma.home.count({
      where: { ownerId: user.id },
    })

    // Read Excel file to get row count and check limits
    const arrayBuffer = await excelFile.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]
    const newHomesCount = data.length

    if (subscription === 1) {
      if (currentHomeCount + newHomesCount > 2) {
        return NextResponse.json(
          { error: 'Free plan allows up to 2 homes total. Please upgrade to Plus or Unlimited.' },
          { status: 403 }
        )
      }
    } else if (subscription === 2) {
      if (currentHomeCount + newHomesCount > 10) {
        return NextResponse.json(
          { error: 'Plus plan allows up to 10 homes total. Please upgrade to Unlimited.' },
          { status: 403 }
        )
      }
    }
    // Unlimited: no limit

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'Excel file is empty' },
        { status: 400 }
      )
    }

    // Parse photos by house index (photos_0, photos_1, etc.)
    const photosByHouseIndex: { [key: number]: File[] } = {}
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('photos_')) {
        const index = parseInt(key.replace('photos_', ''))
        if (!isNaN(index)) {
          if (!photosByHouseIndex[index]) {
            photosByHouseIndex[index] = []
          }
          photosByHouseIndex[index].push(value as File)
        }
      }
    }

    // Get unique values from database for matching
    const [uniqueHeatingCategories, uniqueHeatingAgents, uniqueEnergyClasses, areas] = await Promise.all([
      getUniqueFieldValues(prisma, 'heatingCategory'),
      getUniqueFieldValues(prisma, 'heatingAgent'),
      getUniqueFieldValues(prisma, 'energyClass'),
      prisma.area.findMany({
        select: {
          city: true,
          cityGreek: true,
          country: true,
          countryGreek: true,
        },
        distinct: ['city', 'country']
      })
    ])

    // Get all areas with name translations for area field conversion
    const allAreas = await prisma.area.findMany({
      select: {
        name: true,
        nameGreek: true,
        city: true,
        cityGreek: true,
        country: true,
        countryGreek: true,
      }
    })

    // Helper function to convert area from Greek to English
    const convertAreaToEnglish = (input: string | null): string | null => {
      if (!input) return null
      const normalized = input.trim()
      
      // Find matching area with Greek name
      const matchingArea = allAreas.find(a => 
        a.nameGreek && a.nameGreek.toLowerCase() === normalized.toLowerCase()
      )
      if (matchingArea && matchingArea.name) {
        return matchingArea.name
      }
      
      // Check if it's already in English (exists in areas as English)
      const englishMatch = allAreas.find(a => 
        a.name && a.name.toLowerCase() === normalized.toLowerCase()
      )
      if (englishMatch && englishMatch.name) {
        return englishMatch.name
      }
      
      // If not found, return as-is (might be a new area)
      return normalized
    }

    // Helper function to convert city/country from Greek to English
    const convertCityToEnglish = (input: string): string => {
      if (!input) return input
      const normalized = input.trim()
      
      // Find matching area with Greek city name
      const matchingArea = areas.find(a => 
        a.cityGreek && a.cityGreek.toLowerCase() === normalized.toLowerCase()
      )
      if (matchingArea && matchingArea.city) {
        return matchingArea.city
      }
      
      // Check if it's already in English (exists in areas as English)
      const englishMatch = areas.find(a => 
        a.city && a.city.toLowerCase() === normalized.toLowerCase()
      )
      if (englishMatch && englishMatch.city) {
        return englishMatch.city
      }
      
      // If not found, return as-is (might be a new city)
      return normalized
    }

    const convertCountryToEnglish = (input: string): string => {
      if (!input) return input
      const normalized = input.trim()
      
      // Find matching area with Greek country name
      const matchingArea = areas.find(a => 
        a.countryGreek && a.countryGreek.toLowerCase() === normalized.toLowerCase()
      )
      if (matchingArea && matchingArea.country) {
        return matchingArea.country
      }
      
      // Check if it's already in English (exists in areas as English)
      const englishMatch = areas.find(a => 
        a.country && a.country.toLowerCase() === normalized.toLowerCase()
      )
      if (englishMatch && englishMatch.country) {
        return englishMatch.country
      }
      
      // If not found, return as-is (might be a new country)
      return normalized
    }

    // Define valid values (fallback if DB is empty)
    const validHeatingCategories = uniqueHeatingCategories.length > 0 
      ? uniqueHeatingCategories 
      : ['central', 'autonomous']
    const validHeatingAgents = uniqueHeatingAgents.length > 0 
      ? uniqueHeatingAgents 
      : ['oil', 'natural gas', 'electricity', 'other']
    const validEnergyClasses = uniqueEnergyClasses.length > 0 
      ? uniqueEnergyClasses 
      : ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G']

    // Helper function to upload photos for a specific house
    const uploadPhotosForHouse = async (houseIndex: number): Promise<string[]> => {
      const photos: string[] = []
      const housePhotos = photosByHouseIndex[houseIndex] || []
      
      for (const photoFile of housePhotos) {
        if (photoFile.size > 5 * 1024 * 1024) {
          throw new Error(`Photo ${photoFile.name} for house ${houseIndex + 1} exceeds 5MB limit`)
        }

        const bytes = await photoFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const timestamp = Date.now()
        const randomSuffix = Math.random().toString(36).substring(7)
        const filename = `${timestamp}-${randomSuffix}-${photoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const uploadsDir = join(process.cwd(), 'public', 'uploads')
        
        try {
          await mkdir(uploadsDir, { recursive: true })
        } catch (err: any) {
          if (err.code !== 'EEXIST') throw err
        }

        const filepath = join(uploadsDir, filename)
        await writeFile(filepath, buffer)
        photos.push(`/uploads/${filename}`)
      }
      
      return photos
    }

    // Process each row and create homes
    const results = []
    const errors = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNumber = i + 2 // +2 because Excel rows start at 1 and we have a header

      try {
        // Validate required fields
        if (!row['Title'] || !row['City'] || !row['Country'] || !row['Price Per Month'] || !row['Size (sq meters)']) {
          errors.push(`Row ${rowNumber}: Missing required fields (Title, City, Country, Price Per Month, Size)`)
          continue
        }

        // Parse data
        // Title and description are kept as-is (can be in any language)
        const title = String(row['Title']).trim()
        const description = row['Description'] ? String(row['Description']).trim() : null
        const street = row['Street'] ? String(row['Street']).trim() : null
        
        // Convert city, country, and area to English
        const cityInput = String(row['City']).trim()
        const city = convertCityToEnglish(cityInput)
        
        const countryInput = String(row['Country']).trim()
        const country = convertCountryToEnglish(countryInput)
        
        // Convert area to English
        const areaInput = row['Area'] ? String(row['Area']).trim() : null
        const area = convertAreaToEnglish(areaInput)
        
        // Listing type - convert to English (rent or sale)
        const listingTypeInput = row['Listing Type'] ? String(row['Listing Type']).trim().toLowerCase() : 'rent'
        let listingType = 'rent'
        if (listingTypeInput === 'sale' || listingTypeInput === 'sell' || 
            listingTypeInput === 'πώληση' || listingTypeInput === 'πωληση' ||
            listingTypeInput.includes('sale') || listingTypeInput.includes('sell')) {
          listingType = 'sale'
        } else if (listingTypeInput === 'rent' || listingTypeInput === 'rental' ||
                   listingTypeInput === 'ενοικίαση' || listingTypeInput === 'ενοικιαση' ||
                   listingTypeInput.includes('rent')) {
          listingType = 'rent'
        }
        const pricePerMonth = Number(row['Price Per Month'])
        const bedrooms = Number(row['Bedrooms'] || 0)
        const bathrooms = Number(row['Bathrooms'] || 0)
        // Allow 0 and negative numbers for ground floor and basement
        const floorInput = row['Floor']
        const floor = floorInput !== null && floorInput !== undefined && String(floorInput).trim() !== '' ? Number(floorInput) : null
        
        // Match heating category with fuzzy matching and convert to English
        const heatingCategoryInput = row['Heating Category'] ? String(row['Heating Category']).trim() : null
        let heatingCategory: string | null = null
        if (heatingCategoryInput) {
          // First convert to English (handles Greek translations)
          const englishValue = toEnglishValue(heatingCategoryInput)
          // Then match with existing DB values
          heatingCategory = findBestMatch(englishValue, validHeatingCategories) || englishValue
        }
        
        // Match heating agent with fuzzy matching and convert to English
        const heatingAgentInput = row['Heating Agent'] ? String(row['Heating Agent']).trim() : null
        let heatingAgent: string | null = null
        if (heatingAgentInput) {
          // First convert to English (handles Greek translations)
          const englishValue = toEnglishValue(heatingAgentInput)
          // Then match with existing DB values
          heatingAgent = findBestMatch(englishValue, validHeatingAgents) || englishValue
        }
        
        // Match parking value (handles 1, yes, ναι, 0, no, όχι, etc.)
        const parkingInput = row['Parking'] ? String(row['Parking']).trim() : null
        const parking = matchParkingValue(parkingInput)
        
        const sizeSqMeters = Number(row['Size (sq meters)'])
        const yearBuilt = row['Year Built'] && row['Year Built'] !== '' ? Number(row['Year Built']) : null
        const yearRenovated = row['Year Renovated'] && row['Year Renovated'] !== '' ? Number(row['Year Renovated']) : null
        const availableFrom = row['Available From'] 
          ? new Date(String(row['Available From']))
          : new Date()
        
        // Match energy class with fuzzy matching (normalize to uppercase for comparison)
        const energyClassInput = row['Energy Class'] ? String(row['Energy Class']).trim() : null
        let energyClass: string | null = null
        if (energyClassInput) {
          // Create a map for case-insensitive matching but preserve original case
          const energyClassMap = new Map<string, string>()
          validEnergyClasses.forEach(val => {
            energyClassMap.set(val.toUpperCase(), val)
          })
          
          const matched = findBestMatch(energyClassInput.toUpperCase(), Array.from(energyClassMap.keys()))
          energyClass = matched ? energyClassMap.get(matched) || energyClassInput.toUpperCase() : energyClassInput.toUpperCase()
        }

        // Validate data types
        if (isNaN(pricePerMonth) || isNaN(bedrooms) || isNaN(bathrooms) || isNaN(sizeSqMeters)) {
          errors.push(`Row ${rowNumber}: Invalid numeric values`)
          continue
        }

        if (isNaN(availableFrom.getTime())) {
          errors.push(`Row ${rowNumber}: Invalid date format for Available From`)
          continue
        }

        // Calculate distances using Google Maps API
        let distances = {
          closestMetro: null,
          closestBus: null,
          closestSchool: null,
          closestHospital: null,
          closestPark: null,
          closestUniversity: null,
        }

        try {
          const distanceResult = await calculatePropertyDistances(
            street,
            area, // area is already converted to English above
            city, // city is already converted to English above
            country // country is already converted to English above
          )
          
          distances = {
            closestMetro: distanceResult.closestMetro,
            closestBus: distanceResult.closestBus,
            closestSchool: distanceResult.closestSchool,
            closestHospital: distanceResult.closestHospital,
            closestPark: distanceResult.closestPark,
            closestUniversity: distanceResult.closestUniversity,
          }
        } catch (distError) {
          console.error(`Error calculating distances for row ${rowNumber}:`, distError)
          // Continue without distances if calculation fails
        }

        // Upload photos for this specific house
        let housePhotos: string[] = []
        try {
          housePhotos = await uploadPhotosForHouse(i)
        } catch (photoError: any) {
          errors.push(`Row ${rowNumber}: ${photoError.message}`)
          // Continue with home creation even if photo upload fails
        }
        const photosJson = housePhotos.length > 0 ? JSON.stringify(housePhotos) : null

        // Get area safety and vibe if area is provided
        let areaSafety: number | null = null
        let areaVibe: string | null = null
        if (area) {
          const areaData = await prisma.area.findFirst({
            where: { name: area },
            select: { safety: true, vibe: true }
          })
          if (areaData) {
            areaSafety = areaData.safety
            areaVibe = areaData.vibe
          }
        }

        // Generate descriptions using AI only if useAIDescription is checked and description is empty
        let finalDescription = description
        let finalDescriptionGreek: string | null = null
        
        // Only generate AI descriptions for Plus (2) or Unlimited (3) subscriptions
        const canUseAI = subscription === 2 || subscription === 3
        
        if (useAIDescription && canUseAI && (!finalDescription || finalDescription.trim() === '')) {
          const openai = process.env.OPENAI_API_KEY ? new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          }) : null

          const aiDescriptions = await generateHouseDescriptions({
            title,
            city,
            country,
            area,
            listingType: listingType === 'sale' ? 'sale' : 'rent',
            pricePerMonth,
            bedrooms,
            bathrooms,
            floor,
            sizeSqMeters,
            yearBuilt,
            yearRenovated,
            heatingCategory,
            heatingAgent,
            parking,
            energyClass,
            closestMetro: distances.closestMetro,
            closestBus: distances.closestBus,
            closestSchool: distances.closestSchool,
            closestHospital: distances.closestHospital,
            closestPark: distances.closestPark,
            closestUniversity: distances.closestUniversity,
            areaSafety,
            areaVibe,
            availableFrom: availableFrom ? availableFrom.toISOString().split('T')[0] : null,
          }, openai)

          if (aiDescriptions) {
            finalDescription = aiDescriptions.description
            finalDescriptionGreek = aiDescriptions.descriptionGreek
          }
        }

        // Create home
        const home = await prisma.home.create({
          data: {
            title,
            description: finalDescription,
            descriptionGreek: finalDescriptionGreek,
            street,
            city,
            country,
            area,
            listingType: listingType === 'sale' ? 'sale' : 'rent',
            pricePerMonth,
            bedrooms,
            bathrooms,
            floor,
            heatingCategory,
            heatingAgent,
            parking,
            sizeSqMeters,
            yearBuilt,
            yearRenovated,
            availableFrom,
            photos: photosJson,
            energyClass,
            closestMetro: distances.closestMetro,
            closestBus: distances.closestBus,
            closestSchool: distances.closestSchool,
            closestHospital: distances.closestHospital,
            closestPark: distances.closestPark,
            closestUniversity: distances.closestUniversity,
            ownerId: user.id,
          },
        })

        results.push({
          row: rowNumber,
          title,
          key: home.key,
        })
      } catch (error: any) {
        console.error(`Error processing row ${rowNumber}:`, error)
        errors.push(`Row ${rowNumber}: ${error.message || 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      created: results.length,
      errors: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Bulk upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process bulk upload' },
      { status: 500 }
    )
  }
}



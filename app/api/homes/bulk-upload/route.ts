import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculatePropertyDistances } from '@/lib/google-maps'
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
    const photoFiles = formData.getAll('photos') as File[]

    if (!excelFile) {
      return NextResponse.json(
        { error: 'Excel file is required' },
        { status: 400 }
      )
    }

    // Read Excel file
    const arrayBuffer = await excelFile.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    if (data.length === 0) {
      return NextResponse.json(
        { error: 'Excel file is empty' },
        { status: 400 }
      )
    }

    // Upload photos
    const uploadedPhotos: string[] = []
    if (photoFiles.length > 0) {
      for (const photoFile of photoFiles) {
        if (photoFile.size > 5 * 1024 * 1024) {
          return NextResponse.json(
            { error: `Photo ${photoFile.name} exceeds 5MB limit` },
            { status: 400 }
          )
        }

        const bytes = await photoFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const timestamp = Date.now()
        const filename = `${timestamp}-${photoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const uploadsDir = join(process.cwd(), 'public', 'uploads')
        
        try {
          await mkdir(uploadsDir, { recursive: true })
        } catch (err: any) {
          if (err.code !== 'EEXIST') throw err
        }

        const filepath = join(uploadsDir, filename)
        await writeFile(filepath, buffer)
        uploadedPhotos.push(`/uploads/${filename}`)
      }
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
        const title = String(row['Title']).trim()
        const description = row['Description'] ? String(row['Description']).trim() : null
        const street = row['Street'] ? String(row['Street']).trim() : null
        const city = String(row['City']).trim()
        const country = String(row['Country']).trim()
        const area = row['Area'] ? String(row['Area']).trim() : null
        const listingType = row['Listing Type'] ? String(row['Listing Type']).trim().toLowerCase() : 'rent'
        const pricePerMonth = Number(row['Price Per Month'])
        const bedrooms = Number(row['Bedrooms'] || 0)
        const bathrooms = Number(row['Bathrooms'] || 0)
        const floor = row['Floor'] && row['Floor'] !== '' ? Number(row['Floor']) : null
        const heatingCategory = row['Heating Category'] ? String(row['Heating Category']).trim() : null
        const heatingAgent = row['Heating Agent'] ? String(row['Heating Agent']).trim() : null
        const parking = row['Parking'] 
          ? (String(row['Parking']).toLowerCase() === 'yes' ? true : String(row['Parking']).toLowerCase() === 'no' ? false : null)
          : null
        const sizeSqMeters = Number(row['Size (sq meters)'])
        const yearBuilt = row['Year Built'] && row['Year Built'] !== '' ? Number(row['Year Built']) : null
        const yearRenovated = row['Year Renovated'] && row['Year Renovated'] !== '' ? Number(row['Year Renovated']) : null
        const availableFrom = row['Available From'] 
          ? new Date(String(row['Available From']))
          : new Date()
        const energyClass = row['Energy Class'] ? String(row['Energy Class']).trim() : null

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
            area,
            city,
            country
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

        // Assign photos - distribute photos evenly across homes, or use all for first home
        // For simplicity, we'll assign all photos to all homes (they can be edited later)
        const photosJson = uploadedPhotos.length > 0 ? JSON.stringify(uploadedPhotos) : null

        // Create home
        const home = await prisma.home.create({
          data: {
            title,
            description,
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


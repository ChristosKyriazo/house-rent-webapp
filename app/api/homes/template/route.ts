import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  try {
    // Create Excel template with all home fields (without photos)
    const templateData = [
      {
        'Title': 'Example Home',
        'Description': 'A beautiful home in the city center',
        'Street': '123 Main Street',
        'City': 'Athens',
        'Country': 'Greece',
        'Area': 'Kolonaki',
        'Listing Type': 'rent', // rent or sale
        'Price Per Month': 800,
        'Bedrooms': 2,
        'Bathrooms': 1,
        'Floor': 3,
        'Heating Category': 'central', // central or autonomous
        'Heating Agent': 'natural gas', // oil, natural gas, electricity, other
        'Parking': 'yes', // yes, no, or leave empty
        'Size (sq meters)': 75,
        'Year Built': 2010,
        'Year Renovated': 2020,
        'Available From': '2024-02-01', // YYYY-MM-DD format
        'Energy Class': 'B', // A+, A, B, C, D, E, F, G
      }
    ]

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    
    // Set column widths
    const columnWidths = [
      { wch: 20 }, // Title
      { wch: 40 }, // Description
      { wch: 25 }, // Street
      { wch: 15 }, // City
      { wch: 15 }, // Country
      { wch: 15 }, // Area
      { wch: 15 }, // Listing Type
      { wch: 15 }, // Price Per Month
      { wch: 10 }, // Bedrooms
      { wch: 10 }, // Bathrooms
      { wch: 10 }, // Floor
      { wch: 18 }, // Heating Category
      { wch: 15 }, // Heating Agent
      { wch: 10 }, // Parking
      { wch: 15 }, // Size
      { wch: 12 }, // Year Built
      { wch: 15 }, // Year Renovated
      { wch: 15 }, // Available From
      { wch: 12 }, // Energy Class
    ]
    worksheet['!cols'] = columnWidths

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Homes')

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Return as download
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="home_listing_template.xlsx"',
      },
    })
  } catch (error) {
    console.error('Error generating template:', error)
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    )
  }
}




import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findBestMatch } from '@/lib/value-matcher'
import { removeGreekAccents, resolveCityToEnglishCanonical, resolveCountryToEnglishCanonical } from '@/lib/utils'
import * as XLSX from 'xlsx'

export interface AreaIssue {
  rowIndex: number
  rowNumber: number
  areaInput: string
  suggestion: string | null
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userRole = user.role || 'user'
    if (userRole !== 'owner' && userRole !== 'both' && userRole !== 'broker') {
      return NextResponse.json({ error: 'Only owners and brokers can use bulk upload' }, { status: 403 })
    }

    const { checkTier } = await import('@/lib/subscription')
    const tierBlock = checkTier(user.subscriptionTier ?? 'free', 'plus')
    if (tierBlock) return tierBlock

    const formData = await request.formData()
    const excelFile = formData.get('excelFile') as File

    if (!excelFile) {
      return NextResponse.json({ error: 'Excel file is required' }, { status: 400 })
    }

    if (excelFile.name.toLowerCase().endsWith('.numbers')) {
      return NextResponse.json(
        { error: 'Apple Numbers files cannot be uploaded directly. In Numbers, choose File → Export To → Excel (.xlsx), then upload the exported file.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await excelFile.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    const allAreas = await prisma.area.findMany({
      select: { name: true, nameGreek: true, city: true, cityGreek: true, country: true, countryGreek: true },
    })

    function isKnownArea(input: string): boolean {
      const lower = input.trim().toLowerCase()
      const norm = removeGreekAccents(lower)
      for (const a of allAreas) {
        if (a.name) {
          const nl = a.name.toLowerCase()
          if (nl === lower || removeGreekAccents(nl) === norm) return true
        }
        if (a.nameGreek) {
          const gl = a.nameGreek.toLowerCase()
          if (gl === lower || removeGreekAccents(gl) === norm) return true
        }
      }
      return false
    }

    const unknownAreas: AreaIssue[] = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const areaInput = row['Area'] ? String(row['Area']).trim() : null
      if (!areaInput) continue

      if (!isKnownArea(areaInput)) {
        // Resolve the row's city/country to canonical English so we can scope suggestions
        const rowCity = row['City'] ? resolveCityToEnglishCanonical(String(row['City']).trim(), allAreas) : null
        const rowCountry = row['Country'] ? resolveCountryToEnglishCanonical(String(row['Country']).trim(), allAreas) : null

        // Narrow the candidate pool to areas that belong to the same city+country.
        // Falls back to the full pool only if the city/country is unknown (no areas match at all).
        const filteredAreas = (() => {
          if (!rowCity && !rowCountry) return allAreas
          const scoped = allAreas.filter(a => {
            const cityMatch = !rowCity || (a.city ?? '') === rowCity
            const countryMatch = !rowCountry || (a.country ?? '') === rowCountry
            return cityMatch && countryMatch
          })
          return scoped.length > 0 ? scoped : allAreas
        })()

        const candidateNames = [
          ...filteredAreas.map(a => a.name).filter(Boolean) as string[],
          ...filteredAreas.map(a => a.nameGreek).filter(Boolean) as string[],
        ]

        // Normalize accents on the input so e.g. "Κεραμεικός" matches "Κεραμεικος"
        const normalizedInput = removeGreekAccents(areaInput.toLowerCase())
        // Threshold raised to 0.88 — stricter than the default 0.82 to reduce false positives
        // within the already city-scoped pool.
        const rawSuggestion = findBestMatch(normalizedInput, candidateNames.map(n => removeGreekAccents(n.toLowerCase())), 0.88)
        // Map back to the original (non-normalized) canonical name
        const suggestion = rawSuggestion
          ? (candidateNames.find(n => removeGreekAccents(n.toLowerCase()) === rawSuggestion) ?? rawSuggestion)
          : null

        unknownAreas.push({
          rowIndex: i,
          rowNumber: i + 2,
          areaInput,
          suggestion,
        })
      }
    }

    return NextResponse.json({
      valid: unknownAreas.length === 0,
      unknownAreas,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Validation failed' },
      { status: 500 }
    )
  }
}

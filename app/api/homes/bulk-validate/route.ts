import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findBestMatch } from '@/lib/value-matcher'
import { removeGreekAccents } from '@/lib/utils'
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

    const formData = await request.formData()
    const excelFile = formData.get('excelFile') as File

    if (!excelFile) {
      return NextResponse.json({ error: 'Excel file is required' }, { status: 400 })
    }

    const arrayBuffer = await excelFile.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    const allAreas = await prisma.area.findMany({
      select: { name: true, nameGreek: true },
    })

    const allAreaNames = allAreas.map((a) => a.name).filter(Boolean) as string[]

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
        unknownAreas.push({
          rowIndex: i,
          rowNumber: i + 2,
          areaInput,
          suggestion: findBestMatch(areaInput, allAreaNames, 0.5),
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

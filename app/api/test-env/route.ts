import { NextRequest, NextResponse } from 'next/server'

// Test endpoint to check environment variables
export async function GET(request: NextRequest) {
  const allEnvVars = Object.keys(process.env)
    .filter(key => 
      key.includes('GOOGLE') || 
      key.includes('OPENAI') || 
      key.includes('DATABASE')
    )
    .reduce((acc, key) => {
      acc[key] = process.env[key] ? `${process.env[key]?.substring(0, 10)}...` : 'NOT SET'
      return acc
    }, {} as Record<string, string>)

  return NextResponse.json({
    message: 'Environment variables check',
    foundVars: allEnvVars,
    googleMapsKeyExists: !!process.env.GOOGLE_MAPS_API_KEY,
    googleMapsKeyLength: process.env.GOOGLE_MAPS_API_KEY?.length || 0,
  })
}



import { removeGreekAccents } from '../utils'

export function createLocationMaps(areas: Array<{
  name?: string | null
  nameGreek?: string | null
  city?: string | null
  cityGreek?: string | null
  country?: string | null
  countryGreek?: string | null
}>) {
  const cityMap = new Map<string, Set<string>>()
  const countryMap = new Map<string, Set<string>>()
  const areaNameMap = new Map<string, Set<string>>()

  areas.forEach(area => {
    if (area.city && area.cityGreek) {
      const cityLower = area.city.toLowerCase()
      const cityGreekLower = area.cityGreek.toLowerCase()
      const cityGreekNorm = removeGreekAccents(cityGreekLower)

      if (!cityMap.has(cityLower)) cityMap.set(cityLower, new Set())
      cityMap.get(cityLower)!.add(cityGreekLower)

      if (!cityMap.has(cityGreekLower)) cityMap.set(cityGreekLower, new Set())
      cityMap.get(cityGreekLower)!.add(cityLower)

      if (cityGreekNorm !== cityGreekLower) {
        if (!cityMap.has(cityGreekNorm)) cityMap.set(cityGreekNorm, new Set())
        cityMap.get(cityGreekNorm)!.add(cityLower)
        cityMap.get(cityLower)!.add(cityGreekNorm)
      }
    }

    if (area.country && area.countryGreek) {
      const countryLower = area.country.toLowerCase()
      const countryGreekLower = area.countryGreek.toLowerCase()
      const countryGreekNorm = removeGreekAccents(countryGreekLower)

      if (!countryMap.has(countryLower)) countryMap.set(countryLower, new Set())
      countryMap.get(countryLower)!.add(countryGreekLower)

      if (!countryMap.has(countryGreekLower)) countryMap.set(countryGreekLower, new Set())
      countryMap.get(countryGreekLower)!.add(countryLower)

      if (countryGreekNorm !== countryGreekLower) {
        if (!countryMap.has(countryGreekNorm)) countryMap.set(countryGreekNorm, new Set())
        countryMap.get(countryGreekNorm)!.add(countryLower)
        countryMap.get(countryLower)!.add(countryGreekNorm)
      }
    }

    if (area.name && area.nameGreek) {
      const nameLower = area.name.toLowerCase()
      const nameGreekLower = area.nameGreek.toLowerCase()
      const nameGreekNorm = removeGreekAccents(nameGreekLower)

      if (!areaNameMap.has(nameLower)) areaNameMap.set(nameLower, new Set())
      areaNameMap.get(nameLower)!.add(nameGreekLower)

      if (!areaNameMap.has(nameGreekLower)) areaNameMap.set(nameGreekLower, new Set())
      areaNameMap.get(nameGreekLower)!.add(nameLower)

      if (nameGreekNorm !== nameGreekLower) {
        if (!areaNameMap.has(nameGreekNorm)) areaNameMap.set(nameGreekNorm, new Set())
        areaNameMap.get(nameGreekNorm)!.add(nameLower)
        areaNameMap.get(nameLower)!.add(nameGreekNorm)
      }
    }
  })

  return { cityMap, countryMap, areaNameMap }
}

export function matchesLocation(
  locationName: string | null | undefined,
  filterValue: string,
  locationMap: Map<string, Set<string>>,
  allVariations?: Set<string>
): boolean {
  if (!locationName) return false

  const locationLower = locationName.toLowerCase().trim()
  const locationNormalized = removeGreekAccents(locationLower)
  const filterLower = filterValue.toLowerCase().trim()
  const filterNormalized = removeGreekAccents(filterLower)

  if (locationLower === filterLower) return true
  if (locationNormalized === filterNormalized) return true

  if (allVariations) {
    if (allVariations.has(locationLower)) return true
    if (allVariations.has(locationNormalized)) return true
  }

  if (locationMap.has(locationLower) && locationMap.get(locationLower)!.has(filterLower)) return true
  if (locationMap.has(filterLower) && locationMap.get(filterLower)!.has(locationLower)) return true

  return false
}

export function getLocationVariations(
  filterValue: string,
  locationMap: Map<string, Set<string>>
): Set<string> {
  const filterLower = filterValue.toLowerCase().trim()
  const filterNormalized = removeGreekAccents(filterLower)

  const variations = new Set<string>([filterLower, filterNormalized])

  if (locationMap.has(filterLower)) {
    locationMap.get(filterLower)!.forEach(name => {
      variations.add(name)
      variations.add(removeGreekAccents(name))
    })
  }

  return variations
}

export function getDistanceFields(extractedFilters: Record<string, unknown>): Array<{
  field: 'closestMetro' | 'closestBus' | 'closestSchool' | 'closestHospital' | 'closestPark' | 'closestUniversity'
  category: string | null | undefined
  name: string
}> {
  return [
    { field: 'closestMetro', category: extractedFilters.Metro as string, name: 'Metro' },
    { field: 'closestBus', category: extractedFilters.Bus as string, name: 'Bus' },
    { field: 'closestUniversity', category: extractedFilters.University as string, name: 'University' },
    { field: 'closestSchool', category: extractedFilters.School as string, name: 'School' },
    { field: 'closestPark', category: extractedFilters.Park as string, name: 'Park' },
    { field: 'closestHospital', category: extractedFilters.Hospital as string, name: 'Hospital' },
  ]
}

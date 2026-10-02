import { test, expect } from '@playwright/test'
import path from 'path'
import { clearState, writeState } from './helpers/state'
import { pickListingTemplate } from '../fixtures/listing-templates'

test.use({ storageState: path.join(__dirname, '../.auth/owner.json') })

test('01 — owner creates a listing', async ({ page }) => {
  clearState()

  // Navigate first so the browser has an active Clerk session
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const template = pickListingTemplate()
  const title = `E2E Test Listing ${Date.now()}`

  // Create listing via API through the browser (so Clerk auth cookies are included)
  const result = await page.evaluate(async (data) => {
    const resp = await fetch('/api/homes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const body = await resp.json().catch(() => ({}))
    return { ok: resp.ok, status: resp.status, body }
  }, {
    title,
    description: template.description,
    descriptionGreek: template.descriptionGreek,
    street: template.street,
    city: template.city,
    country: template.country,
    area: template.area,
    listingType: template.listingType,
    pricePerMonth: template.pricePerMonth,
    sizeSqMeters: template.sizeSqMeters,
    bedrooms: template.bedrooms,
    bathrooms: template.bathrooms,
    floor: template.floor,
    heatingCategory: template.heatingCategory,
    heatingAgent: template.heatingAgent,
    parking: template.parking,
    yearBuilt: template.yearBuilt,
    yearRenovated: template.yearRenovated,
    energyClass: template.energyClass,
    availableFrom: template.availableFrom,
  })

  expect(result.ok, `Create listing API failed (${result.status}): ${JSON.stringify(result.body)}`).toBeTruthy()

  const listingKey = result.body.home?.key
  expect(listingKey, 'API did not return a listing key').toBeTruthy()
  expect(listingKey).not.toBe('new')

  // Confirm the listing page is publicly visible
  await page.goto(`/homes/${listingKey}`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })

  writeState({ listingKey, listingTitle: title })
  console.log(`  ✓ Listing created: key=${listingKey}, area=${template.area}, price=${template.pricePerMonth}€`)
})

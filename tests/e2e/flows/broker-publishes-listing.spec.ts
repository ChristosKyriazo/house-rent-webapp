import { test, expect } from '@playwright/test'
import path from 'path'
import { pickListingTemplate } from '../fixtures/listing-templates'

test.use({ storageState: path.join(__dirname, '../.auth/broker.json') })

test('broker publishes a new home listing', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const template = pickListingTemplate()
  const title = `E2E Test Listing ${Date.now()}`

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

  expect(result.ok, `Create listing failed (${result.status}): ${JSON.stringify(result.body)}`).toBeTruthy()

  const listingKey = result.body.home?.key
  expect(listingKey, 'API did not return a listing key').toBeTruthy()

  // Navigate to the published listing page
  await page.goto(`/homes/${listingKey}`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })

  // Show the broker's listing dashboard
  await page.goto('/homes/my-listings')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })

  console.log(`  ✓ Broker listing created: key=${listingKey}, area=${template.area}, price=${template.pricePerMonth}€`)
})

import { test, expect } from '@playwright/test'
import path from 'path'
import { pickListingTemplate } from '../fixtures/listing-templates'

test.use({ storageState: path.join(__dirname, '../.auth/broker.json') })

test('broker publishes a new home listing', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Clean up any previous E2E listings created by this broker so we don't hit the subscription limit
  const myListings = await page.evaluate(async () => {
    const resp = await fetch('/api/homes/my-listings')
    if (!resp.ok) return []
    const data = await resp.json()
    return (data.homes ?? []) as Array<{ id: string; title: string }>
  })
  for (const listing of myListings) {
    if (listing.title?.startsWith('E2E Test Listing')) {
      await page.evaluate(async (id) => {
        await fetch(`/api/homes/${id}`, { method: 'DELETE' })
      }, listing.id)
    }
  }

  const template = pickListingTemplate()
  const title = `E2E Test Listing ${Date.now()}`

  // Create listing via API using the broker's authenticated session
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

  // Navigate to the new listing so the recording shows the published page
  await page.goto(`/homes/${listingKey}`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })

  // Also show the broker's listing dashboard
  await page.goto('/homes/my-listings')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })

  console.log(`  ✓ Broker listing created: key=${listingKey}, area=${template.area}, price=${template.pricePerMonth}€`)
})

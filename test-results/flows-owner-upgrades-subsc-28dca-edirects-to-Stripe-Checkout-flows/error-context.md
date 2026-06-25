# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flows/owner-upgrades-subscription.spec.ts >> owner upgrade to plus redirects to Stripe Checkout
- Location: tests/e2e/flows/owner-upgrades-subscription.spec.ts:6:5

# Error details

```
Error: Expected 200 but got 503: {"error":"payment_required","message":"Subscription upgrades require payment. Payment integration coming soon."}

expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - button "Notifications" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
      - button "Toggle language" [ref=e9]: ΕΛ
    - generic [ref=e10]:
      - link "Αρχική σελίδα" [ref=e11] [cursor=pointer]:
        - /url: /
        - img [ref=e13]
        - generic [ref=e16]: Kaparro
      - button "Εμφάνιση Μενού" [ref=e17]
    - generic [ref=e23]:
      - heading "Μενού" [level=2] [ref=e24]
      - navigation [ref=e25]:
        - link "👤 Προφίλ" [ref=e26] [cursor=pointer]:
          - /url: /profile
          - generic [ref=e27]: 👤
          - generic [ref=e28]: Προφίλ
        - link "📋 Οι Αγγελίες μου" [ref=e29] [cursor=pointer]:
          - /url: /homes/my-listings
          - generic [ref=e30]: 📋
          - generic [ref=e31]: Οι Αγγελίες μου
        - link "📬 Αιτήματα ενδιαφέροντος" [ref=e32] [cursor=pointer]:
          - /url: /homes/inquiries
          - generic [ref=e33]: 📬
          - generic [ref=e34]: Αιτήματα ενδιαφέροντος
        - link "✅ Εγκεκριμένα Αιτήματα" [ref=e35] [cursor=pointer]:
          - /url: /homes/approved
          - generic [ref=e36]: ✅
          - generic [ref=e37]: Εγκεκριμένα Αιτήματα
        - link "🏠 Δημοσίευση Ακινήτου" [ref=e38] [cursor=pointer]:
          - /url: /homes/new
          - generic [ref=e39]: 🏠
          - generic [ref=e40]: Δημοσίευση Ακινήτου
        - link "📅 Ημερολόγιο" [ref=e41] [cursor=pointer]:
          - /url: /homes/calendar
          - generic [ref=e42]: 📅
          - generic [ref=e43]: Ημερολόγιο
      - link "✨ Αναβάθμιση σε Plus Απεριόριστες αγγελίες & analytics →" [ref=e45] [cursor=pointer]:
        - /url: /upgrade
        - generic [ref=e47]: ✨
        - generic [ref=e48]:
          - paragraph [ref=e49]: Αναβάθμιση σε Plus
          - paragraph [ref=e50]: Απεριόριστες αγγελίες & analytics
        - generic [ref=e51]: →
      - button "🚪 Αποσύνδεση" [ref=e53]:
        - generic [ref=e54]: 🚪
        - generic [ref=e55]: Αποσύνδεση
    - main [ref=e56]:
      - generic [ref=e58]:
        - link "← Προφίλ" [ref=e60] [cursor=pointer]:
          - /url: /profile
        - generic [ref=e61]:
          - heading "Επιλέξτε το πλάνο σας" [level=1] [ref=e62]
          - paragraph [ref=e63]: Αναβαθμίστε για να αποκτήσετε εργαλεία που κάνουν τη διαχείριση ακινήτων πιο αποτελεσματική.
        - generic [ref=e64]:
          - generic [ref=e65]: ⚗️
          - paragraph [ref=e66]: Δοκιμαστική λειτουργία — η κάρτα σας δεν θα χρεωθεί.
        - generic [ref=e67]:
          - generic [ref=e68]:
            - generic [ref=e69]:
              - heading "Pro" [level=2] [ref=e70]
              - paragraph [ref=e71]: €39.99 / μήνα
            - generic [ref=e72]:
              - paragraph [ref=e73]: Ξεκλειδώνετε
              - paragraph [ref=e74]: Απεριόριστες αγγελίες, 5 × 30ήμερες premium θέσεις, portfolio analytics, branding
            - generic [ref=e75]:
              - list [ref=e77]:
                - listitem [ref=e78]:
                  - generic [ref=e79]: ●
                  - generic [ref=e80]: Απεριόριστες αγγελίες
                - listitem [ref=e81]:
                  - generic [ref=e82]: ●
                  - generic [ref=e83]: Μαζική ανάρτηση + AI περιγραφές
              - list [ref=e86]:
                - listitem [ref=e87]:
                  - generic [ref=e88]: ●
                  - generic [ref=e89]: 5 × 30ήμερες premium θέσεις
                - listitem [ref=e90]:
                  - generic [ref=e91]: ●
                  - generic [ref=e92]: "Αγορά: €1.99 / 7 μέρες · €4.99 / 30 μέρες"
              - list [ref=e95]:
                - listitem [ref=e96]:
                  - generic [ref=e97]: ●
                  - generic [ref=e98]: Διαχείριση αιτημάτων
                - listitem [ref=e99]:
                  - generic [ref=e100]: ●
                  - generic [ref=e101]: Κρατήσεις & ημερολόγιο
                - listitem [ref=e102]:
                  - generic [ref=e103]: ●
                  - generic [ref=e104]: Δείκτες ποιότητας ενδιαφερόμενων
              - list [ref=e107]:
                - listitem [ref=e108]:
                  - generic [ref=e109]: ●
                  - generic [ref=e110]: Ειδοποιήσεις εντός εφαρμογής
                - listitem [ref=e111]:
                  - generic [ref=e112]: ●
                  - generic [ref=e113]: Ειδοποιήσεις Viber / SMS
                - listitem [ref=e114]:
                  - generic [ref=e115]: ●
                  - generic [ref=e116]: Στατιστικά ανά αγγελία
                - listitem [ref=e117]:
                  - generic [ref=e118]: ●
                  - generic [ref=e119]: Στατιστικά χαρτοφυλακίου
                - listitem [ref=e120]:
                  - generic [ref=e121]: ●
                  - generic [ref=e122]: Εξαγωγή CSV
              - list [ref=e125]:
                - listitem [ref=e126]:
                  - generic [ref=e127]: ●
                  - generic [ref=e128]: Δυνατότητα Verified badge
                - listitem [ref=e129]:
                  - generic [ref=e130]: ●
                  - generic [ref=e131]: Branding γραφείου σε αγγελίες
            - button "Αναβάθμιση σε Pro" [ref=e133]
          - generic [ref=e134]:
            - generic [ref=e139]: Πιο δημοφιλές
            - generic [ref=e140]:
              - heading "Plus" [level=2] [ref=e141]
              - paragraph [ref=e142]: €19.99 / μήνα
            - generic [ref=e143]:
              - paragraph [ref=e144]: Ξεκλειδώνετε
              - paragraph [ref=e145]: 10 αγγελίες, 2 × 7ήμερες θέσεις, analytics, Viber
            - generic [ref=e146]:
              - list [ref=e148]:
                - listitem [ref=e149]:
                  - generic [ref=e150]: ●
                  - generic [ref=e151]: 10 αγγελίες
                - listitem [ref=e152]:
                  - generic [ref=e153]: ●
                  - generic [ref=e154]: Μαζική ανάρτηση + AI περιγραφές
              - list [ref=e157]:
                - listitem [ref=e158]:
                  - generic [ref=e159]: ●
                  - generic [ref=e160]: 2 × 7ήμερες θέσεις προβολής
                - listitem [ref=e161]:
                  - generic [ref=e162]: ●
                  - generic [ref=e163]: "Αγορά: €1.99 / 7 μέρες · €4.99 / 30 μέρες"
              - list [ref=e166]:
                - listitem [ref=e167]:
                  - generic [ref=e168]: ●
                  - generic [ref=e169]: Διαχείριση αιτημάτων
                - listitem [ref=e170]:
                  - generic [ref=e171]: ●
                  - generic [ref=e172]: Κρατήσεις & ημερολόγιο
              - list [ref=e175]:
                - listitem [ref=e176]:
                  - generic [ref=e177]: ●
                  - generic [ref=e178]: Ειδοποιήσεις εντός εφαρμογής
                - listitem [ref=e179]:
                  - generic [ref=e180]: ●
                  - generic [ref=e181]: Ειδοποιήσεις Viber / SMS
                - listitem [ref=e182]:
                  - generic [ref=e183]: ●
                  - generic [ref=e184]: Στατιστικά ανά αγγελία
              - list [ref=e187]:
                - listitem [ref=e188]:
                  - generic [ref=e189]: ●
                  - generic [ref=e190]: Δυνατότητα Verified badge
            - button "Αναβάθμιση σε Plus" [ref=e192]: Αναβάθμιση σε Plus
          - generic [ref=e194]:
            - generic [ref=e195]: Τρέχον πλάνο
            - generic [ref=e196]:
              - heading "Βασικό" [level=2] [ref=e197]
              - paragraph [ref=e198]: €0 / μήνα
            - generic [ref=e199]:
              - list [ref=e201]:
                - listitem [ref=e202]:
                  - generic [ref=e203]: ●
                  - generic [ref=e204]: 1 αγγελία
              - list [ref=e207]:
                - listitem [ref=e208]:
                  - generic [ref=e209]: ●
                  - generic [ref=e210]: Διαχείριση αιτημάτων
                - listitem [ref=e211]:
                  - generic [ref=e212]: ●
                  - generic [ref=e213]: Κρατήσεις & ημερολόγιο
              - list [ref=e216]:
                - listitem [ref=e217]:
                  - generic [ref=e218]: ●
                  - generic [ref=e219]: Ειδοποιήσεις εντός εφαρμογής
            - generic [ref=e220]:
              - button "Τρέχον πλάνο" [disabled]
        - paragraph [ref=e221]: Χωρίς δέσμευση · Ακυρώστε οποτεδήποτε · Χρέωση μέσω Stripe (σύντομα)
    - contentinfo [ref=e222]:
      - generic [ref=e223]:
        - generic [ref=e224]: © 2026 Kaparro
        - generic [ref=e225]:
          - link "Πολιτική Απορρήτου" [ref=e226] [cursor=pointer]:
            - /url: /privacy
          - link "privacy@kaparro.gr" [ref=e227] [cursor=pointer]:
            - /url: mailto:privacy@kaparro.gr
  - alert [ref=e228]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | import path from 'path'
  3  | 
  4  | test.use({ storageState: path.join(__dirname, '../.auth/owner.json') })
  5  | 
  6  | test('owner upgrade to plus redirects to Stripe Checkout', async ({ page }) => {
  7  |   await page.goto('/')
  8  |   await page.waitForLoadState('networkidle')
  9  | 
  10 |   // Check current tier
  11 |   const profile = await page.evaluate(async () => {
  12 |     const resp = await fetch('/api/profile')
  13 |     const data = await resp.json()
  14 |     return { tier: data.user?.subscriptionTier ?? 'unknown' }
  15 |   })
  16 |   console.log(`  Current tier: ${profile.tier}`)
  17 | 
  18 |   // Navigate to upgrade page so the recording shows it
  19 |   await page.goto('/upgrade')
  20 |   await page.waitForLoadState('networkidle')
  21 | 
  22 |   // Request a Stripe Checkout Session
  23 |   const result = await page.evaluate(async () => {
  24 |     const resp = await fetch('/api/subscription/upgrade', {
  25 |       method: 'POST',
  26 |       headers: { 'Content-Type': 'application/json' },
  27 |       body: JSON.stringify({ tier: 'plus' }),
  28 |     })
  29 |     const body = await resp.json().catch(() => ({}))
  30 |     return { ok: resp.ok, status: resp.status, body }
  31 |   })
  32 | 
  33 |   console.log(`  Upgrade response: ${result.status} — ${JSON.stringify(result.body)}`)
  34 | 
  35 |   // Expect a Stripe Checkout URL back (tier only flips after webhook fires)
> 36 |   expect(result.ok, `Expected 200 but got ${result.status}: ${JSON.stringify(result.body)}`).toBeTruthy()
     |                                                                                              ^ Error: Expected 200 but got 503: {"error":"payment_required","message":"Subscription upgrades require payment. Payment integration coming soon."}
  37 |   expect(result.body.checkoutUrl, 'Expected a Stripe checkoutUrl in the response').toBeTruthy()
  38 |   expect(result.body.checkoutUrl).toContain('checkout.stripe.com')
  39 | 
  40 |   console.log(`  ✓ Stripe Checkout URL received: ${result.body.checkoutUrl}`)
  41 |   console.log(`  (tier flips to plus after completing payment at the above URL)`)
  42 | })
  43 | 
```
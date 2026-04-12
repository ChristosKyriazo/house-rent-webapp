import OpenAI from 'openai'

export type UserProfileContext = {
  name: string | null
  occupation: string | null
  /** Approximate age in years, from date of birth if available */
  ageYears: number | null
}

export type HomeCompatibilityInput = {
  id: number
  title: string
  description: string | null
  descriptionGreek: string | null
}

export type BlockerResult = {
  homeId: number
  blocked: boolean
  reason: string | null
}

const MAX_DESC_CHARS = 2800

function truncate(text: string | null): string {
  if (!text || !text.trim()) return ''
  const t = text.trim()
  if (t.length <= MAX_DESC_CHARS) return t
  return `${t.slice(0, MAX_DESC_CHARS)}…`
}

function ageFromDateOfBirth(dob: Date | null): number | null {
  if (!dob) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age >= 0 && age < 120 ? age : null
}

/**
 * Infer incompatible listings using the model (query + profile vs owner rules in descriptions).
 * Fail-open: returns empty map on error so search still works.
 */
export async function analyzeCompatibilityBlockers(
  openai: OpenAI,
  userQuery: string,
  profile: UserProfileContext | null,
  homes: HomeCompatibilityInput[]
): Promise<Map<number, BlockerResult>> {
  const out = new Map<number, BlockerResult>()
  if (!homes.length) return out

  const model = process.env.OPENAI_COMPATIBILITY_MODEL || 'gpt-4o-mini'
  const chunkSize = 8

  const profileJson = profile
    ? JSON.stringify({
        name: profile.name,
        occupation: profile.occupation,
        estimatedAgeYears: profile.ageYears,
      })
    : 'null'

  for (let i = 0; i < homes.length; i += chunkSize) {
    const chunk = homes.slice(i, i + chunkSize)
    const listingsPayload = chunk.map((h) => {
      const en = truncate(h.description)
      const el = truncate(h.descriptionGreek)
      const combined = [en && `EN: ${en}`, el && `EL: ${el}`].filter(Boolean).join('\n\n')
      return {
        homeId: h.id,
        title: h.title,
        listingText: combined || '(no description)',
      }
    })

    const userMessage = `USER_QUERY:\n${userQuery.trim()}\n\nUSER_PROFILE_JSON:\n${profileJson}\n\nLISTINGS_JSON:\n${JSON.stringify(listingsPayload, null, 2)}\n\nRespond with JSON only: {"results":[{"homeId":number,"blocked":boolean,"reason":string|null}]} — include every homeId from this chunk.`

    try {
      const completion = await openai.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You decide if rental listings conflict with what the tenant needs, using reasoning (not keyword matching only).

Inputs:
- USER_QUERY: what they typed (any language). Infer needs they clearly express or strongly imply (pets, smoking, being a student, children, etc.).
- USER_PROFILE_JSON: optional name, occupation, estimatedAgeYears. Use these when the listing restricts WHO may rent (e.g. "students only", "professionals", age limits). If occupation suggests they are not a student and the listing says "only students", that can be a conflict when the query does not say they are a student.
- Each listing has listingText: rules may appear in English (EN) and/or Greek (EL).

Set blocked=true only when the listing CLEARLY forbids or excludes something the tenant clearly needs, or CLEARLY requires a category the tenant clearly does not fit (and the query does not contradict that). Examples:
- User needs a pet / mentions a dog or cat, listing says no pets / no animals → blocked=true.
- Listing says "students only" / "μόνο φοιτητές" and profile+query indicate a non-student working person → blocked=true.
- Listing says no smoking and user clearly wants to smoke indoors → blocked=true.

Set blocked=false when:
- The listing is silent or vague about the topic.
- You are unsure or the conflict is weak.
- Rules are compatible or only preference (e.g. "families welcome" does not block a single person).

reason: short English (max 120 chars) when blocked=true; use null when blocked=false.

Output valid JSON: {"results":[{"homeId":number,"blocked":boolean,"reason":string|null}]}`,
          },
          { role: 'user', content: userMessage },
        ],
      })

      const raw = completion.choices[0]?.message?.content
      if (!raw) continue

      const parsed = JSON.parse(raw) as { results?: Array<{ homeId: number; blocked: boolean; reason?: string | null }> }
      const allowedIds = new Set(chunk.map((h) => h.id))

      for (const row of parsed.results || []) {
        if (typeof row.homeId !== 'number' || !allowedIds.has(row.homeId)) continue
        out.set(row.homeId, {
          homeId: row.homeId,
          blocked: Boolean(row.blocked),
          reason: row.blocked && row.reason ? String(row.reason).slice(0, 200) : null,
        })
      }

      // Default missing ids in chunk to not blocked
      for (const h of chunk) {
        if (!out.has(h.id)) {
          out.set(h.id, { homeId: h.id, blocked: false, reason: null })
        }
      }
    } catch (e) {
      console.error('[compatibility-blockers] chunk failed:', e)
      for (const h of chunk) {
        if (!out.has(h.id)) {
          out.set(h.id, { homeId: h.id, blocked: false, reason: null })
        }
      }
    }
  }

  return out
}

export function buildProfileContext(user: {
  name: string | null
  occupation: string | null
  dateOfBirth: Date | null
} | null): UserProfileContext | null {
  if (!user) return null
  return {
    name: user.name,
    occupation: user.occupation,
    ageYears: ageFromDateOfBirth(user.dateOfBirth),
  }
}

export function inferStudentContext(query: string, occupation: string | null | undefined): boolean {
  const occ = (occupation || '').trim()
  if (occ) {
    if (
      /\b(phd|master'?s?|undergraduate|postgraduate)\s+student\b/i.test(occ) ||
      /\bstudent\b/i.test(occ) ||
      /φοιτητ(ής|ές)/i.test(occ) ||
      /προπτυχιακ(ός|οί)|μεταπτυχιακ(ός|οί)/i.test(occ)
    ) {
      return true
    }
  }

  const q = query.trim()
  if (!q) return false

  return (
    /(^|[\s,.;])(student|students)([\s,.;]|$)/i.test(q) ||
    /\b(undergraduate|postgraduate)\b/i.test(q) ||
    /\bi'?m\s+a\s+student\b/i.test(q) ||
    /\bcollege\s+student\b/i.test(q) ||
    /φοιτητ(ής|ές|ικό|ική)/i.test(q) ||
    /\bσπουδάζω\b/i.test(q) ||
    /\bπροπτυχιακ(ός|ή|οί)\b/i.test(q) ||
    /\bμεταπτυχιακ(ός|ή|οί)\b/i.test(q)
  )
}

export function applyStudentTransitBoost<T extends Record<string, unknown>>(filters: T): T {
  const out = { ...filters } as Record<string, unknown>
  const lift = (v: unknown): string | unknown => {
    if (v == null) return 'Strong'
    const s = String(v).trim()
    if (s === 'Avoid' || s === 'Essential' || s === 'Strong') return v
    if (s === '' || s === 'Not mentioned') return 'Strong'
    return v
  }
  out.Metro = lift(out.Metro)
  out.Bus = lift(out.Bus)
  out.University = lift(out.University)
  return out as T
}

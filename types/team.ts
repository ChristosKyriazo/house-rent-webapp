// Shared types for the broker hierarchy ("Main" / "Default" broker teams) feature.

export type BrokerCategory = 'standalone' | 'parent' | 'child'

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked'

export type BoostRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'paid'

/** A Default (child) broker as seen by their Main broker in the agency dashboard. */
export interface TeamMember {
  id: number
  key: string
  name: string | null
  email: string
  listingCount: number
  avgRating: number | null
  ratingCount: number
  pendingBoostRequests: number
  isLead: boolean
  /** Palette slot index used for calendar/agent color-coding (0 = lead). */
  colorSlot: number
}

/** A pending/decided invitation shown to the Main broker. */
export interface TeamInvitationView {
  id: number
  key: string
  inviteeEmail: string
  status: InvitationStatus
  createdAt: string
  expiresAt: string
}

/** Details shown on the /join-team acceptance page. */
export interface InvitationDetails {
  valid: boolean
  reason?: 'not_found' | 'expired' | 'already_decided' | 'email_mismatch'
  inviterName: string | null
  agencyName: string | null
  inviteeEmail: string
  message: string | null
}

/** Aggregate KPIs for the agency overview. */
export interface AgencySummary {
  agencyName: string | null
  memberCount: number
  totalListings: number
  activeBoosts: number
  viewingsThisWeek: number
  avgRating: number | null
}

/** A boost request from either party's perspective. */
export interface BoostRequestView {
  id: number
  key: string
  status: BoostRequestStatus
  proactive: boolean
  amountCents: number
  days: number
  note: string | null
  decisionNote: string | null
  createdAt: string
  decidedAt: string | null
  home: { key: string; title: string }
  requester: { id: number; name: string | null }
}

export interface AgencyOverviewResponse {
  summary: AgencySummary
  members: TeamMember[]
  invitations: TeamInvitationView[]
}

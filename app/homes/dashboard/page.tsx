'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'

interface DashboardStats {
  activeListings: number
  pendingInquiries: number
  approvedInquiries: number
}

interface UpcomingBooking {
  id: number
  startTime: string
  endTime: string
  home?: { key: string; title: string }
  user?: { name: string | null; email: string }
}

export default function OwnerDashboardPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const isEl = language === 'el'

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [bookings, setBookings] = useState<UpcomingBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, listingsRes, inquiriesRes, bookingsRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/homes/my-listings'),
          fetch('/api/inquiries'),
          fetch('/api/bookings'),
        ])

        const profileData = await profileRes.json()
        const role = profileData.user?.role
        if (!role || (role !== 'owner' && role !== 'both' && role !== 'broker')) {
          router.replace('/homes')
          return
        }

        const listingsData = await listingsRes.json()
        const inquiriesData = await inquiriesRes.json()
        const bookingsData = await bookingsRes.json()

        const homes: Array<{ finalized: boolean }> = listingsData.homes ?? []
        const inquiries: Array<{ approved: boolean; dismissed: boolean }> = inquiriesData.inquiries ?? []
        const allBookings: UpcomingBooking[] = bookingsData.bookings ?? []

        const now = new Date()
        const upcoming = allBookings
          .filter(b => new Date(b.startTime) > now)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
          .slice(0, 8)

        setStats({
          activeListings: homes.filter(h => !h.finalized).length,
          pendingInquiries: inquiries.filter(i => !i.approved && !i.dismissed).length,
          approvedInquiries: inquiries.filter(i => i.approved && !i.dismissed).length,
        })
        setBookings(upcoming)
      } catch {
        setError(isEl ? 'Σφάλμα φόρτωσης' : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router, isEl])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)]/25 border-t-[var(--accent)] animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--ink-soft)] flex items-center justify-center">
        <p className="text-[var(--text-muted)]">{error}</p>
      </div>
    )
  }

  const statCards = [
    {
      label: isEl ? 'Ενεργές αγγελίες' : 'Active listings',
      value: stats?.activeListings ?? 0,
      icon: '🏠',
      href: '/homes/my-listings',
      color: 'var(--accent)',
    },
    {
      label: isEl ? 'Εκκρεμή αιτήματα' : 'Pending inquiries',
      value: stats?.pendingInquiries ?? 0,
      icon: '📬',
      href: '/homes/inquiries',
      color: 'var(--status-warning)',
    },
    {
      label: isEl ? 'Εγκεκριμένα' : 'Approved',
      value: stats?.approvedInquiries ?? 0,
      icon: '✅',
      href: '/homes/approved',
      color: 'var(--status-success)',
    },
  ]

  return (
    <div className="min-h-screen bg-[var(--ink-soft)] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[var(--text)] mb-2">
            {isEl ? 'Πίνακας ελέγχου' : 'Dashboard'}
          </h1>
          <p className="text-[var(--text-muted)]">
            {isEl ? 'Επισκόπηση της δραστηριότητάς σας' : 'Overview of your activity'}
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {statCards.map(card => (
            <Link
              key={card.label}
              href={card.href}
              className="bg-[var(--surface)] backdrop-blur-sm rounded-2xl p-5 border border-[var(--border-subtle)] hover:border-[var(--accent)]/35 transition-all hover:-translate-y-1 shadow-xl"
            >
              <div className="text-3xl mb-2">{card.icon}</div>
              <div className="text-3xl font-bold mb-1" style={{ color: card.color }}>
                {card.value}
              </div>
              <div className="text-xs text-[var(--text-muted)]">{card.label}</div>
            </Link>
          ))}
        </div>

        {/* Upcoming events */}
        <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-[var(--border-subtle)] mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-[var(--text)]">
              📅 {isEl ? 'Επερχόμενες επισκέψεις' : 'Upcoming viewings'}
            </h2>
            <Link href="/homes/calendar" className="text-xs text-[var(--accent)] hover:underline">
              {isEl ? 'Ημερολόγιο' : 'Calendar'}
            </Link>
          </div>
          {bookings.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              {isEl ? 'Δεν υπάρχουν προγραμματισμένες επισκέψεις' : 'No upcoming viewings scheduled'}
            </p>
          ) : (
            <div className="space-y-3">
              {bookings.map(b => (
                <div key={b.id} className="flex items-center gap-4 p-3 rounded-xl bg-[var(--ink-soft)]">
                  <div className="shrink-0 text-center min-w-[3rem]">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                      {new Date(b.startTime).toLocaleDateString(isEl ? 'el-GR' : 'en-GB', { weekday: 'short' })}
                    </p>
                    <p className="text-xl font-bold text-[var(--accent)] leading-none">
                      {new Date(b.startTime).getDate()}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(b.startTime).toLocaleDateString(isEl ? 'el-GR' : 'en-GB', { month: 'short' })}
                    </p>
                  </div>
                  <div className="w-px h-10 bg-[var(--border-subtle)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--text)] truncate">
                      {b.home?.title || '—'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {b.user?.name ? ` · ${b.user.name}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3">
          <Link href="/homes/new" className="btn-primary text-sm px-5 py-2.5">
            + {isEl ? 'Νέα αγγελία' : 'New listing'}
          </Link>
          <Link href="/homes/my-listings" className="btn-secondary text-sm px-5 py-2.5">
            {isEl ? 'Οι αγγελίες μου' : 'My listings'}
          </Link>
          <Link href="/homes/inquiries" className="btn-secondary text-sm px-5 py-2.5">
            {isEl ? 'Αιτήματα' : 'Inquiries'}
          </Link>
        </div>
      </div>
    </div>
  )
}

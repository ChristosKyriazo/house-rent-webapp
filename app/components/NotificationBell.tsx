'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../contexts/LanguageContext'
import { useRole } from '../contexts/RoleContext'
import { getTranslation } from '@/lib/translations'
import FinalizeNotificationModal from './FinalizeNotificationModal'

interface Notification {
  id: number
  type:
    | 'inquiry'
    | 'approved'
    | 'dismissed'
    | 'finalize'
    | 'availability_set'
    | 'booking_created'
    | 'booking_reminder'
    | 'rate'
    | 'rejected'
  message: string
  homeKey: string
  inquiryId: number | null
  createdAt: string
  viewed: boolean
}

export default function NotificationBell() {
  const router = useRouter()
  const { language } = useLanguage()
  const { selectedRole, actualRole } = useRole()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [unviewedCount, setUnviewedCount] = useState(0)
  const [finalizeNotification, setFinalizeNotification] = useState<Notification | null>(null)
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Determine display role
  const displayRole = (actualRole === 'both' && selectedRole) 
    ? selectedRole 
    : (actualRole || 'user')

  useEffect(() => {
    let inFlight = false

    const fetchNotifications = async () => {
      if (inFlight) return
      inFlight = true
      try {
        const response = await fetch(`/api/notifications?language=${language}`)
        if (response && response.ok) {
          const data = await response.json()
          setNotifications(data.notifications || [])
          setUnviewedCount(data.unviewedCount || 0)
        } else if (response) {
          if (response.status !== 401) {
            console.warn('Error fetching notifications:', response.status)
          }
          setNotifications([])
          setUnviewedCount(0)
        } else {
          setNotifications([])
          setUnviewedCount(0)
        }
      } catch {
        setNotifications([])
        setUnviewedCount(0)
      } finally {
        inFlight = false
        setLoading(false)
      }
    }

    // Initial load
    fetchNotifications()

    // Near real-time: poll while tab is visible so owners see new inquiries within a couple of seconds
    const POLL_MS_VISIBLE = 2000
    const POLL_MS_HIDDEN = 30000

    let intervalId: ReturnType<typeof setInterval> | null = null

    const pollIntervalMs = () =>
      typeof document !== 'undefined' && document.visibilityState === 'visible'
        ? POLL_MS_VISIBLE
        : POLL_MS_HIDDEN

    const restartInterval = () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
      intervalId = setInterval(fetchNotifications, pollIntervalMs())
    }

    restartInterval()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications()
      }
      restartInterval()
    }

    const onFocus = () => fetchNotifications()
    const onOnline = () => fetchNotifications()

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)

    return () => {
      if (intervalId !== null) clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onOnline)
    }
  }, [language])

  // Position fixed panel under bell (portal) — avoids overflow:hidden on chrome dock clipping the dropdown
  useLayoutEffect(() => {
    if (!isOpen) {
      setPanelPos(null)
      return
    }
    const button = buttonRef.current
    if (!button) return

    const update = () => {
      const r = button.getBoundingClientRect()
      setPanelPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [isOpen])

  // Close when tapping/clicking outside. Defer registration so Safari/iOS does not treat the
  // same gesture that opened the panel as an outside close (mousedown/touch order differs).
  useEffect(() => {
    if (!isOpen) return

    const handleOutside = (event: Event) => {
      const t = event.target as Node
      if (notificationRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setIsOpen(false)
    }

    let cleanup: (() => void) | undefined
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', handleOutside)
      document.addEventListener('touchstart', handleOutside, { passive: true })
      cleanup = () => {
        document.removeEventListener('mousedown', handleOutside)
        document.removeEventListener('touchstart', handleOutside)
      }
    }, 0)

    return () => {
      window.clearTimeout(timer)
      cleanup?.()
    }
  }, [isOpen])

  const removeFromBell = async (notification: Notification) => {
    try {
      const response = await fetch(`/api/notifications?id=${notification.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
        if (!notification.viewed) {
          setUnviewedCount((c) => Math.max(0, c - 1))
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    setIsOpen(false)

    // Finalize: open modal; still remove from dropdown so the bell matches “already seen”
    if (notification.type === 'finalize') {
      await removeFromBell(notification)
      setFinalizeNotification(notification)
      return
    }

    await removeFromBell(notification)

    if (notification.type === 'approved') {
      router.push('/homes/approved')
      return
    }

    // Inquiry alerts are always for the listing owner — do not gate on selectedRole ("both" was breaking owner flow)
    if (notification.type === 'inquiry' && notification.homeKey) {
      const q = notification.inquiryId ? `?inquiryId=${notification.inquiryId}` : ''
      router.push(`/homes/inquiries/${notification.homeKey}${q}`)
      return
    }

    if (notification.type === 'dismissed' || notification.type === 'rejected') {
      router.push('/homes/my-inquiries')
      return
    }

    if (notification.type === 'availability_set' && notification.homeKey) {
      try {
        const [profileRes, bookingsRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/bookings'),
        ])
        const profile = profileRes.ok ? await profileRes.json() : null
        const myId = profile?.user?.id as number | undefined
        const bookingsData = bookingsRes.ok ? await bookingsRes.json() : { bookings: [] }
        const hasScheduled =
          myId &&
          (bookingsData.bookings || []).some(
            (b: { userId?: number; status?: string; home?: { key?: string } }) =>
              b.userId === myId &&
              b.status === 'scheduled' &&
              b.home?.key === notification.homeKey
          )
        if (hasScheduled) {
          router.push('/homes/calendar')
          return
        }
      } catch {
        /* fall through to book page */
      }
      const queryParams = notification.inquiryId ? `?inquiryId=${notification.inquiryId}` : ''
      router.push(`/homes/${notification.homeKey}/book${queryParams}`)
      return
    }

    if (notification.type === 'booking_created' && notification.homeKey) {
      router.push('/homes/approved')
      return
    }

    if (notification.type === 'rate') {
      if (displayRole === 'owner' || (actualRole === 'both' && selectedRole === 'owner')) {
        router.push('/homes/rate-user')
      } else {
        router.push('/homes/rate-owner')
      }
    }
  }

  const handleFinalizeClose = () => {
    setFinalizeNotification(null)
  }

  const handleFinalizeApprove = async () => {
    if (finalizeNotification) {
      // Idempotent: already soft-deleted when the bell row was clicked
      try {
        await fetch(`/api/notifications?id=${finalizeNotification.id}`, {
          method: 'DELETE',
        })
      } catch (error) {
        console.error('Error deleting notification:', error)
      }
      setNotifications((prev) => prev.filter((n) => n.id !== finalizeNotification.id))
      setFinalizeNotification(null)
    }
  }

  const handleFinalizeDismiss = async () => {
    if (finalizeNotification) {
      try {
        await fetch(`/api/notifications?id=${finalizeNotification.id}`, {
          method: 'DELETE',
        })
      } catch (error) {
        console.error('Error deleting notification:', error)
      }
      setNotifications((prev) => prev.filter((n) => n.id !== finalizeNotification.id))
      setFinalizeNotification(null)
    }
  }

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation()
    const notification = notifications.find((n) => n.id === notificationId)
    if (notification) {
      await removeFromBell(notification)
    }
  }

  // Mark all notifications as viewed when bell is opened
  const handleBellClick = async (e: React.MouseEvent) => {
    // Do not preventDefault — breaks tap/click on Safari (especially iOS)
    e.stopPropagation()

    const wasOpen = isOpen
    setIsOpen(!isOpen)
    
    // If opening the bell (not closing), mark all as viewed
    if (!wasOpen && unviewedCount > 0) {
      try {
        const response = await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markAllAsViewed: true }),
        })
        if (response.ok) {
          // Update local state to mark all as viewed
          setNotifications(notifications.map(n => ({ ...n, viewed: true })))
          setUnviewedCount(0)
        }
      } catch (error) {
        console.error('Error marking notifications as viewed:', error)
      }
    }
  }

  // Always render the notification bell - don't hide it
  return (
    <div className="relative pointer-events-auto" ref={notificationRef} style={{ isolation: 'isolate' }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleBellClick}
        className="btn-icon-dock relative cursor-pointer px-4 [-webkit-tap-highlight-color:transparent]"
        aria-label="Notifications"
        aria-expanded={isOpen}
        style={{ pointerEvents: 'auto', touchAction: 'manipulation', isolation: 'isolate' }}
      >
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="text-[var(--ink)]"
        >
          <path 
            d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M13.73 21a2 2 0 0 1-3.46 0" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        {unviewedCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-red-500 text-xs font-bold text-white">
            {unviewedCount > 9 ? '9+' : unviewedCount}
          </span>
        )}
      </button>

      {isOpen &&
        panelPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            className="animate-fadeIn w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-2xl backdrop-blur-xl"
            style={{
              position: 'fixed',
              top: panelPos.top,
              right: panelPos.right,
              maxHeight: 'min(24rem, calc(100vh - 1rem))',
              zIndex: 30001,
              WebkitOverflowScrolling: 'touch',
            }}
            role="dialog"
            aria-label={getTranslation(language, 'notifications')}
          >
            <div className="border-b border-[var(--border-subtle)] bg-[var(--ink-soft)]/50 p-4">
              <h3 className="font-display text-lg font-semibold text-[var(--text)]">
                {getTranslation(language, 'notifications')}
              </h3>
            </div>
            <div className="max-h-[min(24rem,calc(100vh-8rem))] overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-[var(--text-muted)]">
                  {getTranslation(language, 'loading')}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-[var(--text-muted)]">
                  {getTranslation(language, 'noNotifications')}
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="group relative cursor-pointer border-b border-[var(--border-subtle)]/50 p-4 transition-colors hover:bg-[var(--ink-soft)]/80"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm text-[var(--text)] transition-colors group-hover:text-[var(--accent-light)]">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {new Date(notification.createdAt).toLocaleDateString(
                            language === 'el' ? 'el-GR' : 'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNotification(e, notification.id)}
                        className="text-lg text-[var(--text-muted)] opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                        aria-label="Delete notification"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Finalize Notification Modal */}
      {finalizeNotification && (
        <FinalizeNotificationModal
          notification={finalizeNotification}
          onClose={handleFinalizeClose}
          onApprove={handleFinalizeApprove}
          onDismiss={handleFinalizeDismiss}
        />
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}


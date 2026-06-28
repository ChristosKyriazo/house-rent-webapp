'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { useRole } from '@/app/contexts/RoleContext'
import { getTranslation } from '@/lib/translations'
import { useClerk } from '@clerk/nextjs'
import AppLogo from './AppLogo'

interface HamburgerMenuProps {
  userRole: string // 'owner', 'user', 'both', 'broker', or 'guest'
  subscriptionTier?: string
}

export default function HamburgerMenu({ userRole: initialRole, subscriptionTier = 'free' }: HamburgerMenuProps) {
  const { language } = useLanguage()
  const { selectedRole, actualRole, setSelectedRole } = useRole()
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useClerk()

  // Determine which role to use for menu display
  // If user has "both" role, use selectedRole from context
  // Otherwise, use the actual role
  const displayRole = actualRole === 'both' && selectedRole 
    ? selectedRole 
    : (actualRole || initialRole || 'user')

  // Normalize role to lowercase for comparison
  const normalizedRole = displayRole.toLowerCase()
  const isGuest = normalizedRole !== 'owner' && normalizedRole !== 'user' && normalizedRole !== 'both' && normalizedRole !== 'broker'

  // Guest menu: only Profile -> Login
  if (isGuest) {
    const guestMenuItems = [
      {
        href: '/login?from=profile',
        icon: '👤',
        label: getTranslation(language, 'profile'),
      },
    ]

    const toggleMenu = () => setIsOpen(!isOpen)
    const closeMenu = () => setIsOpen(false)

    return (
      <>
        <div className="fixed left-4 top-[max(1rem,env(safe-area-inset-top))] z-[var(--z-chrome)] flex items-center gap-2 pl-[env(safe-area-inset-left)]">
          <AppLogo className="shrink-0" />
          <button
            type="button"
            onClick={toggleMenu}
            className="btn-secondary shrink-0 min-h-[44px] min-w-[44px] p-3 text-[var(--btn-secondary-fg)] shadow-md transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            aria-label={getTranslation(language, 'showMenu')}
          >
            <div className="flex h-5 w-6 flex-col justify-between" aria-hidden>
              <span
                className={`block h-0.5 w-full rounded-sm bg-current transition-all duration-300 ${
                  isOpen ? 'translate-y-2 rotate-45' : ''
                }`}
              />
              <span
                className={`block h-0.5 w-full rounded-sm bg-current transition-all duration-300 ${
                  isOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`block h-0.5 w-full rounded-sm bg-current transition-all duration-300 ${
                  isOpen ? '-translate-y-2 -rotate-45' : ''
                }`}
              />
            </div>
          </button>
        </div>

        {/* Overlay - only block when menu is open */}
        {isOpen && (
          <div
            className="fixed inset-0 z-[var(--z-menu-backdrop)] bg-black/50 transition-opacity duration-300"
            onClick={closeMenu}
          />
        )}

        {/* Menu Panel */}
        <div
          className={`fixed left-0 top-0 z-[var(--z-menu-panel)] h-full w-80 max-w-[min(100vw,20rem)] transform bg-[var(--ink-soft)] shadow-2xl transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col p-6 pt-20">
            <h2 className="mb-8 text-2xl font-bold text-[var(--text)]">{getTranslation(language, 'menu')}</h2>
            <nav className="space-y-2 flex-1">
              {guestMenuItems.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault()
                    closeMenu()
                    router.push(item.href)
                  }}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 bg-[var(--ink)]/50 text-[var(--text)] hover:bg-[var(--ink)]"
                  style={
                    isOpen
                      ? {
                          animation: `slideInLeft 0.3s ease-out ${index * 50}ms both`,
                        }
                      : undefined
                  }
                >
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <span className="text-lg truncate">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <style jsx global>{`
          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}</style>
      </>
    )
  }

  // Authenticated menu below

  // Define all possible menu items with translations
  // Inquiries item will be dynamically set based on selected role
  const allMenuItems = [
    { href: '/profile', labelKey: 'profile', icon: '👤', roles: ['owner', 'user', 'both', 'broker'] },
    { href: '/homes/analytics', labelKey: 'analytics', icon: '📊', roles: ['owner', 'both', 'broker'] },
    { href: '/homes/my-listings', labelKey: 'myListings', icon: '📋', roles: ['owner', 'both', 'broker'] },
    { href: '/homes/new', labelKey: 'publishProperty', icon: '🏠', roles: ['owner', 'both', 'broker'] },
    { href: '/homes/search', labelKey: 'searchProperties', icon: '🔍', roles: ['user', 'both'] },
    { href: '/homes/map', labelKey: 'mapView', icon: '🗺️', roles: ['user', 'both'] },
    { href: '/homes/saved', labelKey: 'savedProperties', icon: '♥', roles: ['user', 'both'] },
    { href: '/homes/saved-searches', labelKey: 'savedSearches', icon: '🔔', roles: ['user', 'both'] },
    { href: '/homes/calendar', labelKey: 'calendar', icon: '📅', roles: ['owner', 'user', 'both', 'broker'] },
  ]

  // Build menu items based on display role
  // When user has "both" role but has selected a specific role via switch,
  // show menu items for that selected role only
  const menuItems = allMenuItems
    .filter(item => item.roles.includes(normalizedRole))
    .filter(item => item.href !== '/homes/analytics' || subscriptionTier !== 'free')
    .map(item => ({
      ...item,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      label: getTranslation(language, item.labelKey as any)
    }))

  // Add inquiries item based on display role
  // For owner: link to /homes/inquiries
  // For user: link to /homes/my-inquiries
  // For broker: same as owner
  if (normalizedRole === 'owner' || normalizedRole === 'user' || normalizedRole === 'both' || normalizedRole === 'broker') {
    let inquiriesHref = '/homes/my-inquiries'
    let insertIndex = menuItems.findIndex(item => item.href === '/profile') + 1
    
    if (normalizedRole === 'owner' || normalizedRole === 'broker' || (normalizedRole === 'both' && selectedRole === 'owner')) {
      inquiriesHref = '/homes/inquiries'
      insertIndex = menuItems.findIndex(item => item.href === '/homes/my-listings') + 1
      if (insertIndex === 0) {
        insertIndex = menuItems.findIndex(item => item.href === '/profile') + 1
      }
    }
    
     
    menuItems.splice(insertIndex, 0, {
      href: inquiriesHref,
      labelKey: 'inquiries',
      icon: '📬',
      label: getTranslation(language, 'inquiries'),
      roles: [], // roles not used after initial filter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    // Add approved inquiries link after inquiries
     
    menuItems.splice(insertIndex + 1, 0, {
      href: '/homes/approved',
      labelKey: 'approvedInquiries',
      icon: '✅',
      label: getTranslation(language, 'approvedInquiries'),
      roles: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

  }

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const closeMenu = () => {
    setIsOpen(false)
  }

  const handleLogout = async () => {
    try {
      await signOut({ redirectUrl: '/login' })
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/login')
    }
  }

  return (
    <>
      <div className="fixed left-4 top-[max(1rem,env(safe-area-inset-top))] z-[var(--z-chrome)] flex items-center gap-2 pl-[env(safe-area-inset-left)]">
        <AppLogo className="shrink-0" />
        <button
          type="button"
          onClick={toggleMenu}
          className="btn-secondary shrink-0 min-h-[44px] min-w-[44px] p-3 text-[var(--btn-secondary-fg)] shadow-md transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
          aria-label={getTranslation(language, 'showMenu')}
        >
          <div className="flex h-5 w-6 flex-col justify-between" aria-hidden>
            <span
              className={`block h-0.5 w-full rounded-sm bg-current transition-all duration-300 ${
                isOpen ? 'translate-y-2 rotate-45' : ''
              }`}
            />
            <span
              className={`block h-0.5 w-full rounded-sm bg-current transition-all duration-300 ${
                isOpen ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <span
              className={`block h-0.5 w-full rounded-sm bg-current transition-all duration-300 ${
                isOpen ? '-translate-y-2 -rotate-45' : ''
              }`}
            />
          </div>
        </button>
      </div>

      {/* Overlay - only block when menu is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[var(--z-menu-backdrop)] bg-black/50 transition-opacity duration-300"
          onClick={closeMenu}
        />
      )}

      {/* Menu Panel */}
      <div
        className={`fixed left-0 top-0 z-[var(--z-menu-panel)] h-full w-80 max-w-[min(100vw,20rem)] transform bg-[var(--ink-soft)] shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col p-6 pt-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-[var(--text)]">{getTranslation(language, 'menu')}</h2>
            <button
              onClick={closeMenu}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--ink)] transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Role switcher — only visible for users with "both" role */}
          {actualRole === 'both' && (
            <div className="mb-6 flex items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-1">
              <button
                onClick={() => { setSelectedRole('user'); closeMenu() }}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                  selectedRole === 'user' || !selectedRole
                    ? 'bg-[var(--accent)] text-[var(--ink)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                🔍 {language === 'el' ? 'Ενοικιαστής' : 'Renter'}
              </button>
              <button
                onClick={() => { setSelectedRole('owner'); closeMenu() }}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                  selectedRole === 'owner'
                    ? 'bg-[var(--accent)] text-[var(--ink)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                🏠 {language === 'el' ? 'Ιδιοκτήτης' : 'Owner'}
              </button>
            </div>
          )}
          <nav className="space-y-2 flex-1">
            {menuItems.map((item, index) => {
              // More precise active state matching
              // Only use startsWith for paths that should have sub-routes
              // For /homes, only match exactly (not /homes/inquiries, etc.)
              let isActive = false
              if (item.href === '/homes') {
                // Only match /homes exactly, not sub-routes
                isActive = pathname === item.href
              } else {
                // For other paths, match exactly or if it's a sub-route
                isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault()
                    closeMenu()
                    router.push(item.href)
                  }}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-colors duration-200 ${
                    isActive
                      ? 'bg-[var(--btn-primary-bg)] font-semibold text-[var(--btn-primary-fg)] shadow-md'
                      : 'bg-[var(--ink)]/50 text-[var(--text)] hover:bg-[var(--ink)]'
                  }`}
                  style={
                    isOpen
                      ? {
                          animation: `slideInLeft 0.3s ease-out ${index * 50}ms both`,
                        }
                      : undefined
                  }
                >
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <span className="text-lg truncate">{item.label}</span>
                </Link>
              )
            })}
          </nav>
          
          {/* Upgrade link — free → Plus, Plus → Pro; hidden for Pro */}
          {(subscriptionTier === 'free' || subscriptionTier === 'plus') && (normalizedRole === 'owner' || normalizedRole === 'broker' || normalizedRole === 'both') && (
            <div className="border-t border-[var(--border-subtle)] pt-4 mb-2">
              <Link
                href="/upgrade"
                onClick={() => closeMenu()}
                className="group relative flex items-center gap-3 px-4 py-3.5 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(217,119,6,0.15) 100%)',
                  border: '1px solid rgba(245,158,11,0.4)',
                  boxShadow: '0 0 20px rgba(245,158,11,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent" />
                <span className="text-xl animate-pulse">{subscriptionTier === 'plus' ? '◆' : '✨'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-amber-300 leading-none mb-0.5">
                    {subscriptionTier === 'plus'
                      ? (language === 'el' ? 'Αναβάθμιση σε Pro' : 'Upgrade to Pro')
                      : (language === 'el' ? 'Αναβάθμιση σε Plus' : 'Upgrade to Plus')}
                  </p>
                  <p className="text-xs text-amber-500/70">
                    {subscriptionTier === 'plus'
                      ? (language === 'el' ? '5 θέσεις, portfolio analytics' : '5 slots, portfolio analytics')
                      : (language === 'el' ? 'Απεριόριστες αγγελίες & analytics' : 'Unlimited listings & analytics')}
                  </p>
                </div>
                <span className="text-amber-400 text-sm group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>
          )}

          {/* Logout Button at Bottom */}
          <div className="mt-2 border-t border-[var(--border-subtle)] pt-4">
            <button
              onClick={() => {
                closeMenu()
                handleLogout()
              }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 bg-[var(--status-error-bg)] text-[var(--status-error)] hover:bg-[var(--status-error-bg)] border border-[var(--status-error)]"
            >
              <span className="text-2xl">🚪</span>
              <span className="text-lg font-semibold">{getTranslation(language, 'logout')}</span>
            </button>
          </div>
        </div>
      </div>

    </>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { useRole } from '@/app/contexts/RoleContext'
import { getTranslation } from '@/lib/translations'
import { useClerk } from '@clerk/nextjs'
import AppLogo from './AppLogo'

interface HamburgerMenuProps {
  userRole: string // 'owner', 'user', 'both', 'broker', or 'guest'
}

export default function HamburgerMenu({ userRole: initialRole }: HamburgerMenuProps) {
  const { language } = useLanguage()
  const { selectedRole, actualRole } = useRole()
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
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-lg">{item.label}</span>
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
    { href: '/homes/my-listings', labelKey: 'myListings', icon: '📋', roles: ['owner', 'both', 'broker'] },
    { href: '/homes/new', labelKey: 'publishProperty', icon: '🏠', roles: ['owner', 'both', 'broker'] },
    { href: '/homes', labelKey: 'searchProperties', icon: '🔍', roles: ['user', 'both'] },
    { href: '/homes/calendar', labelKey: 'calendar', icon: '📅', roles: ['owner', 'user', 'both', 'broker'] },
  ]

  // Build menu items based on display role
  // When user has "both" role but has selected a specific role via switch,
  // show menu items for that selected role only
  let menuItems = allMenuItems
    .filter(item => item.roles.includes(normalizedRole))
    .map(item => ({
      ...item,
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
    } as any)

    // Add approved inquiries link after inquiries
    menuItems.splice(insertIndex + 1, 0, {
      href: '/homes/approved',
      labelKey: 'approvedInquiries',
      icon: '✅',
      label: getTranslation(language, 'approvedInquiries'),
      roles: [],
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
          <h2 className="mb-8 text-2xl font-bold text-[var(--text)]">{getTranslation(language, 'menu')}</h2>
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
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-lg">{item.label}</span>
                </Link>
              )
            })}
          </nav>
          
          {/* Logout Button at Bottom */}
          <div className="mt-auto border-t border-[var(--border-subtle)] pt-4">
            <button
              onClick={() => {
                closeMenu()
                handleLogout()
              }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
            >
              <span className="text-2xl">🚪</span>
              <span className="text-lg font-semibold">{getTranslation(language, 'logout')}</span>
            </button>
          </div>
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

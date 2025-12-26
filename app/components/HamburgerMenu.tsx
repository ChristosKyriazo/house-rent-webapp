'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { useRole } from '@/app/contexts/RoleContext'
import { getTranslation } from '@/lib/translations'
import { useClerk } from '@clerk/nextjs'

interface HamburgerMenuProps {
  userRole: string // 'owner', 'user', or 'both'
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

  // Define all possible menu items with translations
  // Inquiries item will be dynamically set based on selected role
  const allMenuItems = [
    { href: '/profile', labelKey: 'profile', icon: '👤', roles: ['owner', 'user', 'both'] },
    { href: '/homes/my-listings', labelKey: 'myListings', icon: '📋', roles: ['owner', 'both'] },
    { href: '/homes/new', labelKey: 'publishProperty', icon: '🏠', roles: ['owner', 'both'] },
    { href: '/homes', labelKey: 'searchProperties', icon: '🔍', roles: ['user', 'both'] },
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
  if (normalizedRole === 'owner' || normalizedRole === 'user') {
    const inquiriesHref = normalizedRole === 'owner' ? '/homes/inquiries' : '/homes/my-inquiries'
    // Insert inquiries after my-listings if owner, or after profile if user
    const insertIndex = normalizedRole === 'owner' 
      ? menuItems.findIndex(item => item.href === '/homes/my-listings') + 1
      : menuItems.findIndex(item => item.href === '/profile') + 1
    
    menuItems.splice(insertIndex, 0, {
      href: inquiriesHref,
      labelKey: 'inquiries',
      icon: '📬',
      label: getTranslation(language, 'inquiries')
    })

    // Add approved inquiries link after inquiries
    menuItems.splice(insertIndex + 1, 0, {
      href: '/homes/approved',
      labelKey: 'approvedInquiries',
      icon: '✅',
      label: getTranslation(language, 'approvedInquiries')
    })

    // Add rating pages after approved inquiries
    if (normalizedRole === 'owner') {
      menuItems.splice(insertIndex + 2, 0, {
        href: '/homes/rate-user',
        labelKey: 'rateUser',
        icon: '⭐',
        label: getTranslation(language, 'rateUser')
      })
    } else if (normalizedRole === 'user') {
      menuItems.splice(insertIndex + 2, 0, {
        href: '/homes/rate-owner',
        labelKey: 'rateOwner',
        icon: '⭐',
        label: getTranslation(language, 'rateOwner')
      })
    }
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
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className="fixed top-4 left-4 z-[9999] p-3 bg-[#E8D5B7] rounded-xl shadow-lg hover:bg-[#D4C19F] transition-all duration-300 transform hover:scale-110 active:scale-95 pointer-events-auto"
        aria-label={getTranslation(language, 'showMenu')}
      >
        <div className="w-6 h-5 flex flex-col justify-between">
          <span
            className={`block h-0.5 w-full bg-[#2D3748] rounded transition-all duration-300 ${
              isOpen ? 'rotate-45 translate-y-2' : ''
            }`}
          />
          <span
            className={`block h-0.5 w-full bg-[#2D3748] rounded transition-all duration-300 ${
              isOpen ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <span
            className={`block h-0.5 w-full bg-[#2D3748] rounded transition-all duration-300 ${
              isOpen ? '-rotate-45 -translate-y-2' : ''
            }`}
          />
        </div>
      </button>

      {/* Overlay - only block when menu is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={closeMenu}
        />
      )}

      {/* Menu Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-[#1A202C] shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 pt-20 flex flex-col h-full">
          <h2 className="text-2xl font-bold text-[#E8D5B7] mb-8">{getTranslation(language, 'menu')}</h2>
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
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                    isActive
                      ? 'bg-[#E8D5B7] text-[#2D3748] font-semibold shadow-lg'
                      : 'bg-[#2D3748]/50 text-[#E8D5B7] hover:bg-[#2D3748]'
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
          <div className="pt-4 border-t border-[#E8D5B7]/20 mt-auto">
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

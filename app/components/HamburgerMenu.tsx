'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation } from '@/lib/translations'

interface HamburgerMenuProps {
  userRole: string // 'owner', 'user', or 'both'
}

export default function HamburgerMenu({ userRole: initialRole }: HamburgerMenuProps) {
  const { language } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [currentRole, setCurrentRole] = useState(initialRole || 'user')
  const pathname = usePathname()
  const router = useRouter()

  // Fetch current role from API to ensure we have the latest value
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await fetch('/api/profile')
        if (response.ok) {
          const data = await response.json()
          if (data.user?.role) {
            setCurrentRole(data.user.role.toLowerCase())
          }
        }
      } catch (error) {
        console.error('Error fetching role:', error)
      }
    }
    
    // Fetch role on mount and when pathname changes (user might have updated profile)
    fetchRole()
  }, [pathname])

  // Normalize role to lowercase for comparison
  const normalizedRole = (currentRole || 'user').toLowerCase()

  // Define all possible menu items with translations
  const allMenuItems = [
    { href: '/profile', labelKey: 'profile', icon: '👤', roles: ['owner', 'user', 'both'] },
    { href: '/homes/my-listings', labelKey: 'myListings', icon: '📋', roles: ['owner', 'both'] },
    { href: '/homes/new', labelKey: 'publishProperty', icon: '🏠', roles: ['owner', 'both'] },
    { href: '/homes', labelKey: 'searchProperties', icon: '🔍', roles: ['user', 'both'] },
  ]

  // Filter menu items based on user role and add translated labels
  const menuItems = allMenuItems
    .filter(item => item.roles.includes(normalizedRole))
    .map(item => ({
      ...item,
      label: getTranslation(language, item.labelKey as keyof typeof translations.el)
    }))
  
  // Debug: Log menu items for troubleshooting
  console.log('HamburgerMenu - User role:', normalizedRole, 'Menu items:', menuItems.map(i => i.label))

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const closeMenu = () => {
    setIsOpen(false)
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })
      
      if (response.ok) {
        // Refresh router to update server components
        router.refresh()
        router.push('/login')
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect to login even if there's an error
      router.push('/login')
    }
  }

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className="fixed top-4 left-4 z-50 p-3 bg-[#E8D5B7] rounded-xl shadow-lg hover:bg-[#D4C19F] transition-all duration-300 transform hover:scale-110 active:scale-95"
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

      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMenu}
      />

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
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
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

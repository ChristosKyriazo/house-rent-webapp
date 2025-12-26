'use client'

import { usePathname } from 'next/navigation'
import LanguageToggle from './LanguageToggle'
import RoleSwitch from './RoleSwitch'
import NotificationBell from './NotificationBell'

export default function ConditionalLanguageToggle() {
  const pathname = usePathname()
  const hideOnPaths = ['/login', '/signup']
  
  if (hideOnPaths.includes(pathname)) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] flex items-center gap-2 pointer-events-none" style={{ isolation: 'isolate' }}>
      <RoleSwitch />
      <NotificationBell />
      <LanguageToggle />
    </div>
  )
}


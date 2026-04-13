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
    <div
      className="pointer-events-auto fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-[var(--z-chrome)] flex max-w-[calc(100vw-1rem)] flex-shrink-0 items-center gap-1.5 overflow-visible rounded-2xl surface-dock px-2 py-2 pr-[max(0.5rem,env(safe-area-inset-right))] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.45)]"
      style={{ isolation: 'isolate' }}
    >
      <RoleSwitch />
      <NotificationBell />
      <LanguageToggle />
    </div>
  )
}

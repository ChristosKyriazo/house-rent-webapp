'use client'

import { usePathname } from 'next/navigation'

export default function ConditionalNavBar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideOnPaths = ['/login', '/signup', '/']

  if (hideOnPaths.includes(pathname)) {
    return null
  }

  return <>{children}</>
}


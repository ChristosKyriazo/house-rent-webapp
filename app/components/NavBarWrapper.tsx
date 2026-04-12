'use client'

import { usePathname } from 'next/navigation'

export default function NavBarWrapper({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname()
  const hideOnPaths = ['/login', '/signup']
  
  // Hide navbar on auth pages
  if (hideOnPaths.some(path => pathname.startsWith(path))) {
    return null
  }

  return <>{children}</>
}


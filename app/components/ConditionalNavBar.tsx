'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

// This component just hides the navbar slot on certain pages
// The actual NavBar (server component) is rendered separately in layout
export default function ConditionalNavBar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [showNavBar, setShowNavBar] = useState(true)

  useEffect(() => {
    // Hide navbar on login, signup, and home (landing) pages
    const hideOnPaths = ['/login', '/signup', '/']
    setShowNavBar(!hideOnPaths.includes(pathname))
  }, [pathname])

  if (!showNavBar) {
    return null
  }

  return <>{children}</>
}


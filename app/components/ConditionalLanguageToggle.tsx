'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import LanguageToggle from './LanguageToggle'

// This component hides the language toggle ONLY on login and signup pages
export default function ConditionalLanguageToggle() {
  const pathname = usePathname()
  const [showToggle, setShowToggle] = useState(true)

  useEffect(() => {
    // Only hide language toggle on login and signup pages
    // Show on all other pages including home page (/)
    const hideOnPaths = ['/login', '/signup']
    const shouldHide = hideOnPaths.includes(pathname)
    setShowToggle(!shouldHide)
  }, [pathname])

  // Show toggle on all pages except login and signup
  if (!showToggle) {
    return null
  }

  return <LanguageToggle />
}


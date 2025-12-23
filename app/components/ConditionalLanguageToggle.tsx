'use client'

import { usePathname } from 'next/navigation'
import LanguageToggle from './LanguageToggle'

export default function ConditionalLanguageToggle() {
  const pathname = usePathname()
  const hideOnPaths = ['/login', '/signup']
  
  if (hideOnPaths.includes(pathname)) {
    return null
  }

  return <LanguageToggle />
}


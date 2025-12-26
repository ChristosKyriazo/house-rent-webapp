'use client'

import { LanguageProvider } from '../contexts/LanguageContext'
import { RoleProvider } from '../contexts/RoleContext'

export default function LanguageProviderWrapper({ children }: { children: React.ReactNode }) {
  // Always provide the context - LanguageProvider handles SSR internally
  return (
    <LanguageProvider>
      <RoleProvider>
        {children}
      </RoleProvider>
    </LanguageProvider>
  )
}


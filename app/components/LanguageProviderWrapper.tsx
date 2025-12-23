'use client'

import { LanguageProvider } from '../contexts/LanguageContext'

export default function LanguageProviderWrapper({ children }: { children: React.ReactNode }) {
  // Always provide the context - LanguageProvider handles SSR internally
  return <LanguageProvider>{children}</LanguageProvider>
}


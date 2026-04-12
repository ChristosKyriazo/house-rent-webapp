'use client'

import { SignIn } from '@clerk/nextjs'
import { GraphicAuth } from '@/app/components/visual/PageGraphics'
import AppLogo from '@/app/components/AppLogo'

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col lg:flex-row">
      <AppLogo className="fixed left-4 top-4 z-[10000]" />
      <div className="relative hidden min-h-[240px] flex-1 flex-col justify-center border-r border-[var(--border-subtle)] bg-[var(--ink-soft)] lg:flex lg:min-h-screen lg:max-w-[44%]">
        <div className="relative flex flex-1 flex-col items-center justify-center px-8 py-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(227,167,95,0.08),transparent_55%)]" aria-hidden />
          <GraphicAuth className="relative z-[1] max-h-[min(72vh,560px)] w-full max-w-[min(100%,280px)]" />
        </div>
        <div className="pointer-events-none absolute bottom-8 left-8 max-w-xs text-[var(--text-muted)]">
          <p className="text-lg font-semibold tracking-tight text-[var(--text)]">House Rent</p>
          <p className="mt-1 text-sm">Find your space. List with confidence.</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-16">
        <div className="animate-fade-up w-full max-w-md">
          <SignIn routing="hash" signUpUrl="/signup" afterSignInUrl="/" />
        </div>
      </div>
    </div>
  )
}

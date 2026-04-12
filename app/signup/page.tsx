'use client'

import { useState, useEffect } from 'react'
import { SignUp } from '@clerk/nextjs'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getTranslation, translateRole } from '@/lib/translations'
import { GraphicAuth, GraphicOnboarding } from '@/app/components/visual/PageGraphics'
import AppLogo from '@/app/components/AppLogo'

export default function SignupPage() {
  const { language } = useLanguage()
  const [showRoleSelection, setShowRoleSelection] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('signupRole')
    }
    setShowRoleSelection(true)
  }, [])

  const handleRoleSelect = (role: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('signupRole', role)
    }
    setShowRoleSelection(false)
  }

  if (showRoleSelection) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 lg:flex-row lg:items-stretch lg:gap-10">
        <AppLogo className="fixed left-4 top-4 z-[10000]" />
        <div className="animate-fade-up mb-8 w-full max-w-lg lg:mb-0 lg:flex lg:max-w-md lg:flex-col lg:justify-center">
          <div className="surface-dock relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] shadow-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_30%,rgba(227,167,95,0.09),transparent_60%)]" aria-hidden />
            <div className="relative px-6 pb-8 pt-10">
              <GraphicOnboarding className="mx-auto h-auto w-full max-w-[420px]" />
            </div>
            <div className="border-t border-[var(--border-subtle)] bg-[var(--ink-soft)]/50 px-6 py-5">
              <p className="text-center text-sm font-medium text-[var(--text-muted)]">
                {language === 'el' ? 'Ξεκινήστε με τον ρόλο σας' : 'Start with your role'}
              </p>
            </div>
          </div>
        </div>
        <div className="w-full max-w-md animate-fade-in-slow">
          <div className="surface-dock rounded-3xl border border-[var(--border-subtle)] p-8 shadow-2xl sm:p-10">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-3xl font-bold text-[var(--text)]">
                {language === 'el' ? 'Επιλέξτε Ρόλο' : 'Select Role'}
              </h2>
              <p className="text-[var(--text-muted)]">
                {language === 'el'
                  ? 'Επιλέξτε τον ρόλο που θέλετε να έχετε στον λογαριασμό σας'
                  : 'Select the role you want to have in your account'}
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleRoleSelect('user')}
                className="btn-secondary w-full !justify-start !text-left px-5 py-4 transition-colors hover:border-[var(--accent)]/40"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--ink-soft)] text-lg font-semibold text-[var(--accent)]">
                    U
                  </span>
                  <div>
                    <div className="text-lg font-semibold text-[var(--text)]">{translateRole(language, 'user')}</div>
                    <div className="text-sm text-[var(--text-muted)]">{getTranslation(language, 'searchProperties')}</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('owner')}
                className="btn-secondary w-full !justify-start !text-left px-5 py-4 transition-colors hover:border-[var(--accent)]/40"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--ink-soft)] text-lg font-semibold text-[var(--accent)]">
                    O
                  </span>
                  <div>
                    <div className="text-lg font-semibold text-[var(--text)]">{translateRole(language, 'owner')}</div>
                    <div className="text-sm text-[var(--text-muted)]">{getTranslation(language, 'publishProperty')}</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('both')}
                className="btn-secondary w-full !justify-start !text-left px-5 py-4 transition-colors hover:border-[var(--accent)]/40"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--ink-soft)] text-lg font-semibold text-[var(--accent)]">
                    B
                  </span>
                  <div>
                    <div className="text-lg font-semibold text-[var(--text)]">
                      {language === 'el' ? 'Και τα δύο' : 'Both'}
                    </div>
                    <div className="text-sm text-[var(--text-muted)]">{translateRole(language, 'both')}</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('broker')}
                className="btn-secondary w-full !justify-start !text-left px-5 py-4 transition-colors hover:border-[var(--accent)]/40"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--ink-soft)] text-lg font-semibold text-[var(--accent)]">
                    K
                  </span>
                  <div>
                    <div className="text-lg font-semibold text-[var(--text)]">{translateRole(language, 'broker')}</div>
                    <div className="text-sm text-[var(--text-muted)]">{getTranslation(language, 'publishProperty')}</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="signup-page relative flex min-h-screen flex-col items-center justify-center px-4 py-12 lg:flex-row lg:gap-12">
      <AppLogo className="fixed left-4 top-4 z-[10000]" />
      <div className="mb-10 hidden max-w-sm animate-fade-up lg:mb-0 lg:block lg:self-stretch">
        <div className="surface-dock relative flex h-full min-h-[320px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-[var(--border-subtle)] p-8 shadow-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_35%,rgba(227,167,95,0.08),transparent_55%)]" aria-hidden />
          <GraphicAuth className="relative z-[1] h-auto w-full max-w-[260px] opacity-95" />
        </div>
      </div>
      <div className="animate-fade-up w-full max-w-md">
        <SignUp routing="hash" signInUrl="/login" afterSignUpUrl="/" forceRedirectUrl="/" />
      </div>
    </div>
  )
}

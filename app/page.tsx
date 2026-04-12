'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useLanguage } from './contexts/LanguageContext'
import { useRole } from './contexts/RoleContext'
import { getTranslation } from '@/lib/translations'
import { greekUppercaseNoAnnotations } from '@/lib/utils'
import { GraphicWelcome } from './components/visual/PageGraphics'

type WelcomeMode = 'guest' | 'loading' | 'publishOnly' | 'searchOnly' | 'both' | 'fallback'

function resolveWelcomeMode(
  isSignedIn: boolean,
  role: string | null,
  profileLoaded: boolean
): WelcomeMode {
  if (!isSignedIn) return 'guest'
  if (!profileLoaded && !role) return 'loading'
  if (!role) return 'fallback'
  const r = role.toLowerCase()
  if (r === 'both') return 'both'
  if (r === 'user') return 'searchOnly'
  if (r === 'owner' || r === 'broker') return 'publishOnly'
  return 'fallback'
}

export default function Home() {
  const { language } = useLanguage()
  const { isSignedIn } = useUser()
  const { actualRole } = useRole()
  const [profileRole, setProfileRole] = useState<string | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    if (!isSignedIn) {
      setProfileRole(null)
      setProfileLoaded(true)
      return
    }
    setProfileLoaded(false)
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/profile')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data?.user?.role) {
          setProfileRole(String(data.user.role).toLowerCase())
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setProfileLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isSignedIn])

  const effectiveRole = (actualRole ?? profileRole)?.toLowerCase() ?? null
  const mode = resolveWelcomeMode(Boolean(isSignedIn), effectiveRole, profileLoaded)

  const eyebrow =
    mode === 'guest'
      ? language === 'el'
        ? 'Ενοικίαση & αγορά'
        : 'Rent & buy'
      : mode === 'publishOnly'
        ? getTranslation(language, 'welcomeEyebrowOwner')
        : mode === 'searchOnly'
          ? getTranslation(language, 'welcomeEyebrowUser')
          : mode === 'both'
            ? getTranslation(language, 'welcomeEyebrowBoth')
            : language === 'el'
              ? 'Ενοικίαση & αγορά'
              : 'Rent & buy'

  const subtitle =
    mode === 'publishOnly'
      ? getTranslation(language, 'welcomeSubtitleOwner')
      : mode === 'searchOnly'
        ? getTranslation(language, 'welcomeSubtitleUser')
        : mode === 'both'
          ? getTranslation(language, 'welcomeSubtitleBoth')
          : getTranslation(language, 'appDescription')

  const showGuestChips = mode === 'guest'
  const showAuthLinks = mode === 'guest'

  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-20 pt-12 sm:pt-16">
      <div
        className="pointer-events-none absolute -left-1/4 top-24 h-px w-[70%] max-w-3xl bg-gradient-to-r from-transparent via-[var(--accent)]/35 to-transparent hero-drift"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-12 lg:items-center lg:gap-10">
        {/* Blueprint graphic — level, centered */}
        <div className="relative flex justify-center lg:col-span-7">
          <div className="relative w-full max-w-xl [transform:translateZ(0)]">
            {/* Static glow — no float animation (Safari + blur compositing looked skewed vs Chrome) */}
            <div
              className="pointer-events-none absolute -inset-3 rounded-2xl bg-gradient-to-br from-[var(--accent)]/12 via-transparent to-[#6d8f82]/8 blur-3xl"
              aria-hidden
            />
            <div className="relative isolate rotate-0 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--ink-soft)]/40 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.06] [backface-visibility:hidden]">
              <GraphicWelcome className="mx-auto block h-auto w-full max-w-none align-middle" />
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-8 text-center lg:col-span-5 lg:text-left">
          <div className="space-y-5 will-rise will-rise-delay-1">
            <p className="inline-flex items-center justify-center self-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-1.5 text-[0.7rem] font-semibold tracking-[0.28em] text-[var(--text-muted)] lg:self-start">
              {language === 'el' ? greekUppercaseNoAnnotations(eyebrow) : eyebrow.toUpperCase()}
            </p>
            <h1 className="font-display text-[2.35rem] font-medium leading-[1.08] tracking-tight text-[var(--text)] sm:text-5xl md:text-[3.25rem]">
              {getTranslation(language, 'appTitle')}
            </h1>
            <p className="text-lg font-light leading-relaxed text-[var(--text-muted)] sm:text-xl">
              {subtitle}
            </p>
          </div>

          {mode === 'loading' && (
            <div className="flex justify-center py-6 lg:justify-start will-rise will-rise-delay-2">
              <div className="h-12 w-12 rounded-full border-2 border-[var(--accent)]/25 border-t-[var(--accent)] motion-safe:animate-spin" />
            </div>
          )}

          <div className="flex flex-col items-stretch gap-3 will-rise will-rise-delay-2 sm:items-center lg:items-start">
            {showAuthLinks && (
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link href="/signup" className="btn-primary min-w-[200px] px-8 py-3.5 text-base">
                  {getTranslation(language, 'signUp')}
                </Link>
                <Link href="/login" className="btn-secondary min-w-[200px] px-8 py-3.5 text-base">
                  {getTranslation(language, 'signIn')}
                </Link>
              </div>
            )}

            {mode === 'publishOnly' && (
              <Link href="/homes/new" className="btn-primary min-w-[200px] px-8 py-3.5 text-base">
                {getTranslation(language, 'publishProperty')}
              </Link>
            )}

            {mode === 'searchOnly' && (
              <Link href="/homes" className="btn-primary min-w-[200px] px-8 py-3.5 text-base">
                {getTranslation(language, 'searchProperties')}
              </Link>
            )}

            {(mode === 'both' || mode === 'fallback') && (
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link href="/homes/new" className="btn-primary min-w-[200px] px-8 py-3.5 text-base">
                  {getTranslation(language, 'publishProperty')}
                </Link>
                <Link href="/homes" className="btn-secondary min-w-[200px] px-8 py-3.5 text-base">
                  {getTranslation(language, 'searchProperties')}
                </Link>
              </div>
            )}
          </div>

          {showGuestChips && (
            <div className="flex flex-wrap justify-center gap-2.5 pt-2 will-rise will-rise-delay-3 lg:justify-start">
              {[
                { k: 'searchProperties' as const, icon: '◇' },
                { k: 'publishProperty' as const, icon: '⌂' },
              ].map(({ k, icon }) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-[var(--ink-soft)]/50 px-3.5 py-2 text-sm text-[var(--text-muted)] backdrop-blur-sm transition duration-300 hover:border-[var(--accent)]/30 hover:text-[var(--text)]"
                >
                  <span className="text-[var(--accent)]" aria-hidden>
                    {icon}
                  </span>
                  {getTranslation(language, k)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

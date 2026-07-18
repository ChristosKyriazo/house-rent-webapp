'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/app/contexts/LanguageContext'

interface ViberAlertModalProps {
  onClose: () => void
}

export default function ViberAlertModal({ onClose }: ViberAlertModalProps) {
  const { isEl } = useLanguage()
  const [activating, setActivating] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  async function activate() {
    setActivating(true)
    setError(false)
    try {
      const res = await fetch('/api/subscription/viber-alerts', { method: 'POST' })
      if (res.ok) {
        setDone(true)
        setTimeout(onClose, 1800)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setActivating(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="fixed z-[9999] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm mx-4"
        style={{ animation: 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        <div
          className="rounded-3xl p-7 flex flex-col gap-5"
          style={{
            background: 'linear-gradient(145deg, var(--surface) 0%, color-mix(in srgb, var(--surface) 90%, rgb(120,53,15)) 100%)',
            border: '1px solid rgba(245,158,11,0.25)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,158,11,0.1)',
          }}
        >
          {/* Icon */}
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl mx-auto"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))', border: '1px solid rgba(245,158,11,0.3)' }}>
            <span className="text-2xl">📲</span>
          </div>

          {/* Copy */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-[var(--text)] mb-2 font-[var(--font-fraunces)]">
              {isEl ? 'Μάθετε πρώτοι' : 'Be the first to know'}
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              {isEl
                ? 'Λάβετε άμεση ειδοποίηση στο Viber ή SMS όταν ο ιδιοκτήτης εγκρίνει το αίτημά σας ή ανταποκριθεί.'
                : 'Get an instant Viber or SMS alert the moment an owner approves your inquiry or responds to you.'}
            </p>
          </div>

          {/* Features */}
          <ul className="space-y-2">
            {[
              isEl ? '✓  Έγκριση αιτήματος' : '✓  Inquiry approved',
              isEl ? '✓  Απόρριψη αιτήματος' : '✓  Inquiry dismissed',
              isEl ? '✓  Οριστικοποίηση ενοικίου' : '✓  Deal finalized',
              isEl ? '✓  Υπενθύμιση επίσκεψης' : '✓  Viewing reminder',
            ].map(f => (
              <li key={f} className="text-sm text-amber-300/80">{f}</li>
            ))}
          </ul>

          {/* Price + test badge */}
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-amber-500/8 border border-amber-500/15">
            <div>
              <p className="text-lg font-bold text-amber-300">€2.99</p>
              <p className="text-xs text-[var(--text-muted)]">
                {isEl ? 'εφάπαξ · για όλη τη διάρκεια αναζήτησης' : 'one-time · for your entire search'}
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">
              {isEl ? 'Δοκιμή' : 'Test'}
            </span>
          </div>

          {/* CTAs */}
          {done ? (
            <div className="text-center py-2">
              <span className="text-green-400 font-semibold">
                ✓ {isEl ? 'Ειδοποιήσεις ενεργοποιήθηκαν!' : 'Alerts activated!'}
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col gap-2">
              <p className="text-center text-sm text-red-400">
                {isEl ? 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.' : 'Something went wrong. Please try again.'}
              </p>
              <button
                onClick={activate}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-stone-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 4px 20px rgba(245,158,11,0.35)' }}
              >
                {isEl ? 'Επανάληψη' : 'Retry'}
              </button>
              <button onClick={onClose} className="w-full py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                {isEl ? 'Ίσως αργότερα' : 'Maybe later'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={activate}
                disabled={activating}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-stone-950 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  boxShadow: '0 4px 20px rgba(245,158,11,0.35)',
                }}
              >
                {activating
                  ? (isEl ? 'Ενεργοποίηση...' : 'Activating...')
                  : (isEl ? '📲 Ενεργοποίηση Viber / SMS' : '📲 Activate Viber / SMS alerts')}
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                {isEl ? 'Ίσως αργότερα' : 'Maybe later'}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.92); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>,
    document.body
  )
}

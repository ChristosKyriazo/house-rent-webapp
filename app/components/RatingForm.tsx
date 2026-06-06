'use client'

import { useState } from 'react'

interface Question {
  key: string
  label: string
}

interface RatingSection {
  title?: string
  questions: Question[]
}

interface RatingFormProps {
  sections: RatingSection[]
  allowComment?: boolean
  commentMaxLength?: number
  commentPlaceholder?: string
  onSubmit: (scores: Record<string, number>, comment: string) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className={`text-3xl transition-all ${
            star <= (hovered || value) ? 'text-yellow-400 scale-110' : 'text-[var(--text)]/25 hover:text-yellow-400/60'
          }`}
        >
          ★
        </button>
      ))}
      <span className="ml-2 text-sm font-semibold text-[var(--text-muted)]">{value}/5</span>
    </div>
  )
}

export default function RatingForm({
  sections,
  allowComment = false,
  commentMaxLength = 400,
  commentPlaceholder = 'Share your experience (optional)...',
  onSubmit,
  onCancel,
  submitLabel = 'Submit rating',
}: RatingFormProps) {
  const allKeys = sections.flatMap(s => s.questions.map(q => q.key))
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(allKeys.map(k => [k, 5]))
  )
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(scores, comment)
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {sections.map((section, si) => (
        <div key={si}>
          {section.title && (
            <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wider mb-3">
              {section.title}
            </h3>
          )}
          <div className="space-y-5">
            {section.questions.map(q => (
              <div key={q.key}>
                <p className="text-sm text-[var(--text)] mb-2">{q.label}</p>
                <StarInput value={scores[q.key]} onChange={v => setScores(prev => ({ ...prev, [q.key]: v }))} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {allowComment && (
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            Written review <span className="font-normal">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value.slice(0, commentMaxLength))}
            placeholder={commentPlaceholder}
            rows={4}
            className="w-full px-4 py-3 bg-[var(--ink-soft)] border border-[var(--border-subtle)] rounded-xl text-[var(--text)] placeholder:text-[var(--text)]/40 focus:outline-none focus:border-[var(--accent)] resize-none text-sm"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1 text-right">{comment.length}/{commentMaxLength}</p>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 px-4 py-3 bg-[var(--ink-soft)] text-[var(--text)] rounded-xl font-semibold transition-all disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 px-4 py-3 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover-bg)] text-[var(--btn-primary-fg)] rounded-xl font-semibold transition-all disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : submitLabel}
        </button>
      </div>
    </div>
  )
}

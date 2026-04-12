'use client'

import { getTranslation } from '@/lib/translations'

interface ConfirmDialogProps {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  language: 'el' | 'en'
  variant?: 'danger' | 'default'
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  language,
  variant = 'default',
}: ConfirmDialogProps) {
  if (!open) return null

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover-bg)] text-[var(--btn-primary-fg)]'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'confirm-dialog-title' : undefined}
    >
      <div
        className="bg-[var(--ink-soft)] rounded-3xl p-8 max-w-md w-full border border-[var(--border-subtle)] shadow-2xl animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 id="confirm-dialog-title" className="text-xl font-bold text-[var(--text)] mb-3">
            {title}
          </h2>
        )}
        <p className="text-[var(--text)] text-sm leading-relaxed mb-6 whitespace-pre-wrap">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl font-semibold text-[var(--text)] border border-[var(--border-subtle)] hover:bg-[var(--ink-soft)] transition-all"
          >
            {cancelLabel ?? getTranslation(language, 'cancel')}
          </button>
          <button type="button" onClick={onConfirm} className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${confirmClass}`}>
            {confirmLabel ?? getTranslation(language, 'confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

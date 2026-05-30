interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: { label: string; onClick: () => void } | { label: string; href: string }
}

export default function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-[var(--surface)] backdrop-blur-sm rounded-3xl p-12 text-center shadow-xl border border-[var(--border-subtle)]">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-[var(--text)] mb-2">{title}</h3>
      {description && <p className="text-[var(--text-muted)] mb-6 max-w-sm mx-auto">{description}</p>}
      {action && (
        'href' in action ? (
          <a
            href={action.href}
            className="inline-flex items-center px-6 py-3 rounded-2xl font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover-bg)] transition-all"
          >
            {action.label}
          </a>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center px-6 py-3 rounded-2xl font-semibold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover-bg)] transition-all"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  )
}

/**
 * Purpose-built line graphics (blueprint / wayfinding). Stroke + currentColor — Safari-safe.
 */

type SvgProps = { className?: string }

/** Home: horizon + threshold (arrival). */
export function GraphicWelcome({ className = '' }: SvgProps) {
  return (
    <svg
      className={`text-[color:var(--graphic-stroke)] ${className}`}
      viewBox="0 0 560 360"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="gw-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.12" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M40 220 Q280 140 520 200"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.25"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M180 220 L280 120 L380 220"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M220 220 V280 M340 220 V280"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <rect
        x="250"
        y="240"
        width="60"
        height="40"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="120" cy="100" r="28" stroke="currentColor" strokeWidth="1.5" opacity="0.85" vectorEffect="non-scaling-stroke" />
      <rect x="0" y="280" width="560" height="80" fill="url(#gw-fade)" />
    </svg>
  )
}

/** Search: rings + axes (discovery). */
export function GraphicSearch({ className = '' }: SvgProps) {
  return (
    <svg className={`text-[color:var(--graphic-stroke)] ${className}`} viewBox="0 0 560 320" fill="none" aria-hidden>
      <circle cx="280" cy="160" r="120" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <circle cx="280" cy="160" r="80" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <circle cx="280" cy="160" r="40" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <path
        d="M280 40 V280 M40 160 H520"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1"
        strokeDasharray="4 8"
        vectorEffect="non-scaling-stroke"
      />
      <path d="M360 100 L440 60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx="400" cy="120" r="48" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Auth: portal frame (access). */
export function GraphicAuth({ className = '' }: SvgProps) {
  return (
    <svg className={`text-[color:var(--graphic-stroke)] ${className}`} viewBox="0 0 320 480" fill="none" aria-hidden>
      <rect x="48" y="80" width="224" height="320" rx="8" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <path d="M48 140 H272" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <circle cx="160" cy="260" r="36" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <path d="M160 224 V296" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <rect x="136" y="320" width="48" height="56" rx="2" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <path
        d="M80 420 L160 360 L240 420"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/** Profile: registration marks + record frame (identity). */
export function GraphicProfile({ className = '' }: SvgProps) {
  return (
    <svg className={`text-[color:var(--graphic-stroke)] ${className}`} viewBox="0 0 600 120" fill="none" aria-hidden>
      <path d="M24 24 L44 24 M24 24 L24 44" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <path d="M576 24 L556 24 M576 24 L576 44" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <path d="M24 96 L44 96 M24 96 L24 76" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <path d="M576 96 L556 96 M576 96 L576 76" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <rect x="120" y="32" width="360" height="56" rx="4" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <circle cx="160" cy="60" r="20" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <path d="M200 72 H420" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d="M200 52 H360" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Listings / search route strip: cadastral line + bearing. */
export function GraphicSearchBanner({ className = '' }: SvgProps) {
  return (
    <svg className={`text-[color:var(--graphic-stroke)] ${className}`} viewBox="0 0 600 96" fill="none" aria-hidden>
      <path d="M0 48 H600" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {[80, 200, 320, 440, 560].map((x) => (
        <path key={x} d={`M${x} 36 V60`} stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      ))}
      <circle cx="300" cy="48" r="14" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <path d="M292 48 H308 M300 40 V56" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Role choice: fork (two paths). */
export function GraphicOnboarding({ className = '' }: SvgProps) {
  return (
    <svg className={`text-[color:var(--graphic-stroke)] ${className}`} viewBox="0 0 480 280" fill="none" aria-hidden>
      <path d="M240 40 V120" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <path d="M240 120 L120 220 M240 120 L360 220" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx="120" cy="230" r="12" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <circle cx="360" cy="230" r="12" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <rect x="60" y="200" width="120" height="56" rx="4" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <rect x="300" y="200" width="120" height="56" rx="4" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

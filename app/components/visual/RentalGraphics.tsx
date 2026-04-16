/**
 * Original inline SVG decorations — no external assets or licensing.
 */

export function RentalHeroIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 560 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="rh-sun" x1="72" y1="48" x2="140" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F6E7C8" />
          <stop offset="1" stopColor="#E8B86D" />
        </linearGradient>
        <linearGradient id="rh-sky" x1="0" y1="0" x2="560" y2="280" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3D4F68" />
          <stop offset="1" stopColor="#2D3748" />
        </linearGradient>
        <linearGradient id="rh-glow" x1="280" y1="80" x2="520" y2="360" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8D5B7" stopOpacity="0.35" />
          <stop offset="1" stopColor="#E8D5B7" stopOpacity="0" />
        </linearGradient>
        <filter id="rh-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <rect width="560" height="280" rx="24" fill="url(#rh-sky)" />
      <ellipse cx="420" cy="200" rx="180" ry="140" fill="url(#rh-glow)" filter="url(#rh-soft)" opacity="0.9" />
      <circle cx="96" cy="88" r="44" fill="url(#rh-sun)" className="motion-safe:animate-pulse-glow" />
      <path
        d="M0 240 C120 200 200 260 320 220 C420 188 480 200 560 180 V280 H0 Z"
        fill="#1A202C"
        opacity="0.85"
      />
      <path d="M0 268 C160 248 240 288 360 252 C440 228 500 236 560 224 V420 H0 Z" fill="#243044" />
      {/* Houses */}
      <g opacity="0.95">
        <path d="M72 228 L120 180 L168 228 V284 H72 Z" fill="#C9B08A" stroke="#E8D5B7" strokeWidth="2" />
        <rect x="96" y="248" width="28" height="36" rx="2" fill="#2D3748" />
        <path d="M200 236 L260 184 L320 236 V288 H200 Z" fill="#E8D5B7" stroke="#F5E6D3" strokeWidth="2" />
        <rect x="248" y="252" width="32" height="36" rx="2" fill="#2D3748" />
        <rect x="216" y="216" width="22" height="22" rx="2" fill="#2D3748" opacity="0.5" />
        <path d="M340 244 L400 196 L460 244 V292 H340 Z" fill="#D4C19F" stroke="#E8D5B7" strokeWidth="2" />
        <rect x="384" y="256" width="30" height="36" rx="2" fill="#2D3748" />
        <rect x="352" y="220" width="20" height="20" rx="2" fill="#2D3748" opacity="0.45" />
      </g>
      {/* Tree */}
      <ellipse cx="488" cy="248" rx="28" ry="52" fill="#3D5A4A" opacity="0.9" />
      <rect x="482" y="288" width="12" height="36" rx="2" fill="#5C4A3A" />
      {/* Path */}
      <path
        d="M40 360 Q200 320 280 360 T520 352"
        stroke="#E8D5B7"
        strokeOpacity="0.25"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="180" cy="352" r="6" fill="#E8D5B7" fillOpacity="0.5" />
      <circle cx="300" cy="364" r="5" fill="#E8D5B7" fillOpacity="0.35" />
      <circle cx="400" cy="348" r="7" fill="#E8D5B7" fillOpacity="0.4" />
    </svg>
  )
}

export function AuthSideIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="as-sky" x1="0" y1="0" x2="320" y2="400" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3D4F68" />
          <stop offset="1" stopColor="#1A202C" />
        </linearGradient>
        <linearGradient id="as-window" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#E8D5B7" stopOpacity="0.35" />
          <stop offset="1" stopColor="#E8D5B7" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <rect width="320" height="480" rx="0" fill="url(#as-sky)" />
      <circle cx="260" cy="72" r="36" fill="#E8B86D" fillOpacity="0.35" />
      <path d="M0 300 Q80 260 160 280 T320 260 V480 H0 Z" fill="#243044" />
      <g transform="translate(40 120)">
        <rect x="0" y="80" width="240" height="200" rx="12" fill="#2D3748" stroke="#E8D5B7" strokeOpacity="0.35" strokeWidth="2" />
        <path d="M0 120 L120 40 L240 120" stroke="#E8D5B7" strokeOpacity="0.5" strokeWidth="3" />
        <rect x="24" y="140" width="64" height="72" rx="4" fill="url(#as-window)" stroke="#E8D5B7" strokeOpacity="0.25" />
        <rect x="152" y="140" width="64" height="72" rx="4" fill="url(#as-window)" stroke="#E8D5B7" strokeOpacity="0.25" />
        <rect x="88" y="200" width="64" height="56" rx="4" fill="#1A202C" stroke="#E8D5B7" strokeOpacity="0.3" />
      </g>
      <ellipse cx="72" cy="380" rx="40" ry="12" fill="#E8D5B7" fillOpacity="0.08" />
      <ellipse cx="248" cy="392" rx="52" ry="14" fill="#E8D5B7" fillOpacity="0.06" />
    </svg>
  )
}

export function HomesSearchBannerArt({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 600 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="hsb" x1="0" y1="60" x2="600" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8D5B7" stopOpacity="0.12" />
          <stop offset="0.5" stopColor="#E8D5B7" stopOpacity="0.22" />
          <stop offset="1" stopColor="#E8D5B7" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <rect width="600" height="120" rx="20" fill="url(#hsb)" />
      <path
        d="M32 78 L76 44 L120 78 V96 H32 Z"
        fill="#E8D5B7"
        fillOpacity="0.15"
        stroke="#E8D5B7"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <path
        d="M140 84 L188 48 L236 84 V98 H140 Z"
        fill="#E8D5B7"
        fillOpacity="0.12"
        stroke="#E8D5B7"
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
      <path
        d="M420 80 L472 38 L524 80 V96 H420 Z"
        fill="#E8D5B7"
        fillOpacity="0.14"
        stroke="#E8D5B7"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <circle cx="560" cy="40" r="16" fill="#E8B86D" fillOpacity="0.35" />
    </svg>
  )
}

interface StarRatingProps {
  rating: number | null | undefined
  size?: 'sm' | 'base' | 'lg' | 'xl'
  showNumber?: boolean
}

export default function StarRating({ rating, size = 'base', showNumber = false }: StarRatingProps) {
  const sizeClasses = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }

  const starSize = sizeClasses[size]

  // Handle null/undefined - treat as 0
  const numericRating = rating === null || rating === undefined ? 0 : rating
  
  // Clamp rating between 0 and 5
  const clampedRating = Math.max(0, Math.min(5, numericRating))
  const fullStars = Math.floor(clampedRating)
  const hasPartialStar = clampedRating > 0 && clampedRating % 1 !== 0
  const partialStarFill = hasPartialStar ? (clampedRating % 1) * 100 : 0

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => {
        if (i < fullStars) {
          // Fully filled star
          return (
            <span key={i} className={`${starSize} text-yellow-400`}>
              ⭐
            </span>
          )
        } else if (i === fullStars && hasPartialStar && partialStarFill > 0) {
          // Partially filled star - use a more Safari-compatible approach
          return (
            <span key={i} className={`${starSize} relative inline-block`} style={{ width: '1em', height: '1em', lineHeight: '1' }}>
              {/* Gray background star */}
              <span className="absolute inset-0 text-[var(--text)]/30" style={{ display: 'block' }}>⭐</span>
              {/* Yellow foreground star with width-based clipping */}
              <span
                className="absolute inset-0 text-yellow-400"
                style={{ 
                  display: 'block',
                  width: `${partialStarFill}%`,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                ⭐
              </span>
            </span>
          )
        } else {
          // Empty star - explicitly gray
          return (
            <span key={i} className={`${starSize} text-[var(--text)]/30`}>
              ⭐
            </span>
          )
        }
      })}
      {showNumber && (
        <span className={`ml-2 font-bold text-[var(--text)] ${starSize}`}>
          {clampedRating.toFixed(1)}
        </span>
      )}
    </div>
  )
}


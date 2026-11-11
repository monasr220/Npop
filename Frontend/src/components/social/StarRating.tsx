import { Star } from "lucide-react"
import { cn } from "../../utils/cn"

export function StarRating({
  value,
  count,
  onChange,
  size = 16,
  className,
}: {
  value: number | null | undefined
  count?: number
  onChange?: (rating: number) => void
  size?: number
  className?: string
}) {
  const rounded = Math.round(value ?? 0)
  const interactive = Boolean(onChange)

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div
        className="flex items-center gap-0.5"
        role={interactive ? "radiogroup" : "img"}
        aria-label={
          value ? `Rated ${Number(value).toFixed(1)} out of 5` : "Not rated yet"
        }
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= rounded
          const content = (
            <Star
              size={size}
              aria-hidden="true"
              className={filled ? "fill-current" : ""}
            />
          )
          return interactive ? (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === rounded}
              aria-label={`Rate ${star} out of 5`}
              onClick={() => onChange?.(star)}
              className={cn(
                "rounded p-0.5 transition-colors hover:text-brand-social",
                filled ? "text-brand-social" : "text-app-muted"
              )}
            >
              {content}
            </button>
          ) : (
            <span
              key={star}
              className={filled ? "text-brand-social" : "text-app-border"}
            >
              {content}
            </span>
          )
        })}
      </div>
      <span className="text-xs tabular-nums text-app-muted">
        {value ? Number(value).toFixed(1) : "—"}
        {typeof count === "number" && count > 0 && (
          <span className="ml-1">({count})</span>
        )}
      </span>
    </div>
  )
}

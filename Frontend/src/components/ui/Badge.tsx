import type { ReactNode } from "react"
import { cn } from "../../utils/cn"

type Variant = "neutral" | "primary" | "social" | "success"

const VARIANTS: Record<Variant, string> = {
  neutral: "bg-app-raised text-app-muted",
  primary: "bg-brand-primary/10 text-brand-primary",
  social: "bg-brand-social/10 text-brand-social",
  success: "bg-brand-success/15 text-brand-success",
}

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: ReactNode
  variant?: Variant
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold",
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function VerifiedBadge() {
  return (
    <Badge variant="success">
      <span aria-hidden="true">✓</span> Verified
    </Badge>
  )
}

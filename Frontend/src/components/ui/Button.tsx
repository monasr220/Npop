import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "../../utils/cn"

type Variant = "primary" | "secondary" | "ghost" | "danger" | "social"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-solid text-brand-on hover:bg-brand-solid/90 active:bg-brand-solid/80",
  secondary:
    "border border-app-border bg-app-raised text-app-text hover:border-brand-primary/60 hover:text-app-text",
  ghost: "text-app-muted hover:bg-app-raised hover:text-app-text",
  danger:
    "border border-brand-social/40 bg-brand-social/10 text-brand-social hover:bg-brand-social/20",
  social:
    "bg-brand-solid text-brand-on hover:bg-brand-solid/90 active:bg-brand-solid/80",
}

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icon
      )}
      {children}
    </button>
  )
}

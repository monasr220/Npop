import type { ReactNode } from "react"
import { cn } from "../../utils/cn"

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-end justify-between gap-4",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brand-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-app-text sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-app-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string
  value: ReactNode
  hint?: string
  icon?: ReactNode
}) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-app-muted">
          {label}
        </p>
        {icon && <span className="text-brand-primary">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-app-text">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-app-muted">{hint}</p>}
    </div>
  )
}

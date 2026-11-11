import type { ReactNode } from "react"
import { cn } from "../../utils/cn"

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-app-border border-t-brand-primary",
        className
      )}
    />
  )
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-sm text-app-muted">
      <Spinner />
      {label}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} aria-hidden="true" />
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="surface-card space-y-3 p-4">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon = "♪",
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-app-border px-6 py-14 text-center">
      <div
        aria-hidden="true"
        className="grid h-12 w-12 place-items-center rounded-full bg-brand-primary/10 text-xl text-brand-primary"
      >
        {icon}
      </div>
      <h3 className="text-base font-semibold text-app-text">{title}</h3>
      {description && <p className="max-w-sm text-sm text-app-muted">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-brand-social/40 bg-brand-social/5 px-5 py-4 text-sm text-brand-social"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{message}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full border border-brand-social/40 px-3 py-1 text-xs font-semibold"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "../../utils/cn"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  children: ReactNode
}

export function Card({ interactive, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "surface-card p-5",
        interactive &&
          "cursor-pointer transition duration-200 hover:-translate-y-0.5 hover:border-brand-primary/50 hover:shadow-soft",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight text-app-text">{title}</h2>
        {subtitle && <p className="text-sm text-app-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

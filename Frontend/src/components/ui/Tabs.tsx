import { cn } from "../../utils/cn"

export interface TabItem<T extends string> {
  value: T
  label: string
  count?: number
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label="Sections"
      className={cn(
        "flex gap-1 overflow-x-auto rounded-full border border-app-border bg-app-surface p-1",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-solid text-brand-on"
                : "text-app-muted hover:bg-app-raised hover:text-app-text"
            )}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[0.68rem] font-semibold",
                  active ? "bg-brand-on/20" : "bg-app-raised text-app-muted"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

import { Link } from "react-router-dom"

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 rounded-lg"
      aria-label="Npop home"
    >
      <span
        aria-hidden="true"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-solid text-lg font-black text-brand-on shadow-soft"
      >
        N
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-xl font-semibold tracking-tight text-app-text">
            Npop<span aria-hidden="true" className="text-brand-primary">.</span>
          </span>
          <span className="mt-1 text-[0.62rem] font-medium uppercase tracking-[0.18em] text-app-muted">
            music social
          </span>
        </span>
      )}
    </Link>
  )
}

export function BrandDots() {
  return (
    <span className="flex items-center gap-1.5" aria-hidden="true">
      <span className="h-2 w-2 rounded-full bg-brand-solid" />
      <span className="h-2 w-2 rounded-full bg-app-text" />
      <span className="h-2 w-2 rounded-full bg-brand-success" />
    </span>
  )
}

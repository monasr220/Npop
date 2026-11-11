import { cn } from "../../utils/cn"
import { gradientFor, initials } from "../../utils/format"

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
}

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string
  src?: string | null
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-app-border font-semibold text-brand-on",
        SIZES[size],
        className
      )}
      style={!src ? { backgroundImage: gradientFor(name || "npop") } : undefined}
      aria-hidden="true"
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  )
}

import { useEffect, useState } from "react"
import { Music2 } from "lucide-react"
import { cn } from "../../utils/cn"
import { gradientFor } from "../../utils/format"

const ROUNDING = {
  md: "rounded-xl",
  lg: "rounded-2xl",
  full: "rounded-full",
}

export function CoverArt({
  src,
  seed,
  alt = "",
  size = "md",
  className,
  iconSize = 28,
}: {
  src?: string | null
  seed: string
  alt?: string
  size?: keyof typeof ROUNDING
  className?: string
  iconSize?: number
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  const showImage = Boolean(src) && !failed

  return (
    <div
      className={cn(
        "relative aspect-square w-full shrink-0 overflow-hidden border border-app-border/70",
        ROUNDING[size],
        className
      )}
      style={!showImage ? { backgroundImage: gradientFor(seed || "npop") } : undefined}
    >
      {showImage ? (
        <img
          src={src ?? ""}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-brand-on/55">
          <Music2 size={iconSize} aria-hidden="true" />
        </span>
      )}
    </div>
  )
}

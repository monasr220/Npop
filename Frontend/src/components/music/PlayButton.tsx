import { Pause, Play } from "lucide-react"
import { usePlayer } from "../../context/PlayerContext"
import type { Track } from "../../types"
import { cn } from "../../utils/cn"

export function PlayButton({
  track,
  queue,
  size = "md",
  className,
  label,
}: {
  track: Track
  queue?: Track[]
  size?: "sm" | "md" | "lg"
  className?: string
  label?: string
}) {
  const player = usePlayer()
  const active = player.isCurrent(track.id)
  const playing = active && player.isPlaying

  const dimensions =
    size === "sm"
      ? "h-8 w-8"
      : size === "lg"
        ? "h-14 w-14"
        : "h-11 w-11"
  const iconSize = size === "sm" ? 14 : size === "lg" ? 24 : 18

  return (
    <button
      type="button"
      aria-label={label ?? (playing ? `Pause ${track.title}` : `Play ${track.title}`)}
      onClick={() => {
        if (active) {
          player.toggle()
        } else {
          player.play(track, queue)
        }
      }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-brand-solid text-brand-on shadow-soft transition-transform hover:scale-105 active:scale-95",
        dimensions,
        className
      )}
    >
      {playing ? (
        <Pause size={iconSize} fill="currentColor" aria-hidden="true" />
      ) : (
        <Play size={iconSize} fill="currentColor" className="ml-0.5" aria-hidden="true" />
      )}
    </button>
  )
}

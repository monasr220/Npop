import { Link } from "react-router-dom"
import { Play, Pause } from "lucide-react"
import { usePlayer } from "../../context/PlayerContext"
import type { Track } from "../../types"
import { CoverArt } from "./CoverArt"

export function TrackAttachment({ track }: { track: Track }) {
  const player = usePlayer()
  const active = player.isCurrent(track.id)
  const playing = active && player.isPlaying

  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-app-border bg-app-raised/60 p-2.5">
      <CoverArt
        src={track.album?.cover_url}
        seed={track.title}
        alt={`${track.title} artwork`}
        className="h-12 w-12"
        iconSize={18}
      />
      <div className="min-w-0 flex-1">
        <Link
          to={`/tracks/${track.id}`}
          className="block truncate text-sm font-semibold text-app-text hover:underline"
        >
          {track.title}
        </Link>
        <p className="truncate text-xs text-app-muted">
          {track.artist?.name ?? "Unknown artist"}
        </p>
      </div>
      <button
        type="button"
        onClick={() => (active ? player.toggle() : player.play(track))}
        aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-solid text-brand-on transition-transform hover:scale-105"
      >
        {playing ? (
          <Pause size={14} fill="currentColor" aria-hidden="true" />
        ) : (
          <Play size={14} fill="currentColor" className="ml-0.5" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}

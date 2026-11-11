import { type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ListEnd, ListPlus, MoreHorizontal, Pause, Play } from "lucide-react"
import { useToast } from "../../context/ToastContext"
import { usePlayer } from "../../context/PlayerContext"
import type { Track } from "../../types"
import { cn } from "../../utils/cn"
import { formatCount, formatDuration } from "../../utils/format"
import { Dropdown, DropdownItem } from "../ui/Dropdown"
import { CoverArt } from "./CoverArt"

export function TrackRow({
  track,
  index,
  queue,
  showCover = true,
  showAlbum = false,
  actions,
  className,
}: {
  track: Track
  index?: number
  queue?: Track[]
  showCover?: boolean
  showAlbum?: boolean
  actions?: ReactNode
  className?: string
}) {
  const player = usePlayer()
  const { notify } = useToast()
  const active = player.isCurrent(track.id)
  const playing = active && player.isPlaying

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-app-raised/70",
        active && "bg-brand-primary/10",
        className
      )}
    >
      {typeof index === "number" && (
        <span className="w-6 shrink-0 text-right text-xs tabular-nums text-app-muted">
          {index + 1}
        </span>
      )}

      <button
        type="button"
        aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
        onClick={() => (active ? player.toggle() : player.play(track, queue))}
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full text-app-muted transition-colors hover:bg-brand-solid hover:text-brand-on",
          active && "bg-brand-solid text-brand-on"
        )}
      >
        {playing ? (
          <Pause size={13} fill="currentColor" aria-hidden="true" />
        ) : (
          <Play size={13} fill="currentColor" className="ml-0.5" aria-hidden="true" />
        )}
      </button>

      {showCover && (
        <CoverArt
          src={track.album?.cover_url}
          seed={track.title}
          alt={`${track.title} artwork`}
          className="h-10 w-10"
          iconSize={16}
        />
      )}

      <div className="min-w-0 flex-1">
        <Link
          to={`/tracks/${track.id}`}
          className={cn(
            "block truncate text-sm font-medium hover:underline",
            active ? "text-brand-primary" : "text-app-text"
          )}
        >
          {track.title}
          {track.explicit && (
            <span
              className="ml-2 rounded bg-app-raised px-1 py-0.5 align-middle text-[0.6rem] font-bold text-app-muted"
              title="Explicit"
            >
              E
            </span>
          )}
        </Link>
        <div className="truncate text-xs text-app-muted">
          {track.artist ? (
            <Link
              to={`/artists/${track.artist.id}`}
              className="hover:text-app-text hover:underline"
            >
              {track.artist.name}
            </Link>
          ) : (
            "Unknown artist"
          )}
          {showAlbum && track.album && (
            <>
              <span aria-hidden="true"> · </span>
              <Link
                to={`/albums/${track.album.id}`}
                className="hover:text-app-text hover:underline"
              >
                {track.album.title}
              </Link>
            </>
          )}
        </div>
      </div>

      <span className="hidden w-16 text-right text-xs tabular-nums text-app-muted sm:block">
        {formatCount(track.plays)} plays
      </span>
      <span className="w-10 text-right text-xs tabular-nums text-app-muted">
        {formatDuration(track.duration)}
      </span>
      <Dropdown
        label={`Options for ${track.title}`}
        trigger={({ toggle, open }) => (
          <button
            type="button"
            onClick={toggle}
            aria-label={`Options for ${track.title}`}
            aria-expanded={open}
            className="rounded-full p-1.5 text-app-muted transition-colors hover:bg-app-raised hover:text-app-text"
          >
            <MoreHorizontal size={16} aria-hidden="true" />
          </button>
        )}
      >
        <DropdownItem
          onClick={() => {
            player.playNext(track)
            notify(`“${track.title}” plays next`, "success")
          }}
        >
          <ListPlus size={15} aria-hidden="true" /> Play next
        </DropdownItem>
        <DropdownItem
          onClick={() => {
            player.addToQueue(track)
            notify(`Added “${track.title}” to the queue`, "success")
          }}
        >
          <ListEnd size={15} aria-hidden="true" /> Add to queue
        </DropdownItem>
      </Dropdown>
      {actions}
    </div>
  )
}

export function TrackList({
  tracks,
  title,
  subtitle,
  actions,
  showAlbum = false,
  className,
}: {
  tracks: Track[]
  title?: string
  subtitle?: string
  actions?: ReactNode
  showAlbum?: boolean
  className?: string
}) {
  const player = usePlayer()
  const isPlayingQueue =
    tracks.length > 0 &&
    player.current !== null &&
    tracks.some((track) => track.id === player.current?.id)

  return (
    <section className={className}>
      {(title || actions) && (
        <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-lg font-semibold tracking-tight text-app-text">
                {title}
              </h2>
            )}
            {subtitle && <p className="text-sm text-app-muted">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="surface-card divide-y divide-app-border/60 p-2">
        {tracks.map((track, index) => (
          <TrackRow
            key={`${track.id}-${index}`}
            track={track}
            index={index}
            queue={tracks}
            showAlbum={showAlbum}
          />
        ))}
      </div>
      {tracks.length > 1 && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() =>
              isPlayingQueue ? player.toggle() : player.playQueue(tracks, 0)
            }
            className="text-xs font-semibold text-brand-primary hover:underline"
          >
            {isPlayingQueue && player.isPlaying ? "Pause queue" : "Play all"}
          </button>
        </div>
      )}
    </section>
  )
}

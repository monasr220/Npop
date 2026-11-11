import { useCallback, useState } from "react"
import { Link } from "react-router-dom"
import {
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from "lucide-react"
import { usePlayer } from "../../context/PlayerContext"
import { useEqualizer } from "../../hooks/useEqualizer"
import { cn } from "../../utils/cn"
import { formatDuration } from "../../utils/format"
import { CoverArt } from "../music/CoverArt"
import { EqualizerPanel, QueuePanel } from "./PlayerPanels"

type PanelName = "queue" | "eq" | null

const toggleClass = (active: boolean) =>
  cn(
    "relative rounded-full p-1.5 transition-colors hover:text-app-text",
    active ? "text-brand-primary" : "text-app-muted"
  )

export function PlayerBar() {
  const player = usePlayer()
  const eq = useEqualizer()
  const [panel, setPanel] = useState<PanelName>(null)
  const closePanel = useCallback(() => setPanel(null), [])
  const track = player.current

  if (!track) return null

  const repeatLabel = { off: "Repeat off", all: "Repeat all", one: "Repeat one" }[
    player.repeat
  ]
  const RepeatIcon = player.repeat === "one" ? Repeat1 : Repeat

  const total = player.duration || track.duration || 0
  const progress = total > 0 ? Math.min(100, (player.currentTime / total) * 100) : 0

  // Panels are siblings of the bar: its backdrop-blur would otherwise become
  // the containing block for their `position: fixed`.
  return (
    <>
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-app-border bg-app-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-3 py-2.5 sm:gap-5 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:max-w-[300px]">
          <CoverArt
            src={track.album?.cover_url}
            seed={track.title}
            alt={`${track.title} artwork`}
            className="h-12 w-12"
            iconSize={18}
          />
          <div className="min-w-0">
            <Link
              to={`/tracks/${track.id}`}
              className="block truncate text-sm font-semibold text-app-text hover:underline"
            >
              {track.title}
            </Link>
            <p className="truncate text-xs text-app-muted">
              {track.artist ? (
                <Link to={`/artists/${track.artist.id}`} className="hover:underline">
                  {track.artist.name}
                </Link>
              ) : (
                "Unknown artist"
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={player.toggleShuffle}
              aria-label={player.shuffle ? "Shuffle on" : "Shuffle off"}
              aria-pressed={player.shuffle}
              className={cn(toggleClass(player.shuffle), "hidden sm:block")}
            >
              <Shuffle size={16} />
            </button>
            <button
              type="button"
              onClick={player.previous}
              aria-label="Previous track"
              className="rounded-full p-1.5 text-app-muted transition-colors hover:text-app-text"
            >
              <SkipBack size={18} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={player.toggle}
              aria-label={player.isPlaying ? "Pause" : "Play"}
              className="grid h-10 w-10 place-items-center rounded-full bg-brand-solid text-brand-on shadow-soft transition-transform hover:scale-105"
            >
              {player.isPlaying ? (
                <Pause size={17} fill="currentColor" />
              ) : (
                <Play size={17} fill="currentColor" className="ml-0.5" />
              )}
            </button>
            <button
              type="button"
              onClick={player.next}
              aria-label="Next track"
              className="rounded-full p-1.5 text-app-muted transition-colors hover:text-app-text"
            >
              <SkipForward size={18} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={player.cycleRepeat}
              aria-label={repeatLabel}
              aria-pressed={player.repeat !== "off"}
              className={cn(toggleClass(player.repeat !== "off"), "hidden sm:block")}
            >
              <RepeatIcon size={16} />
            </button>
          </div>
          <div className="hidden w-full max-w-[460px] items-center gap-2 sm:flex">
            <span className="w-9 text-right text-[0.68rem] tabular-nums text-app-muted">
              {formatDuration(player.currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={total || 0}
              step={1}
              value={Math.min(player.currentTime, total || 0)}
              onChange={(event) => player.seek(Number(event.target.value))}
              aria-label="Seek"
              className="h-1.5 flex-1 cursor-pointer accent-brand-primary"
              style={{
                background: `linear-gradient(to right, rgb(var(--brand-primary)) ${progress}%, rgb(var(--border)) ${progress}%)`,
              }}
            />
            <span className="w-9 text-[0.68rem] tabular-nums text-app-muted">
              {formatDuration(total)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:w-[230px] sm:justify-end sm:gap-2">
          <button
            type="button"
            onClick={() => setPanel(panel === "eq" ? null : "eq")}
            aria-label="Equalizer"
            aria-expanded={panel === "eq"}
            className={toggleClass(eq.enabled || panel === "eq")}
          >
            <SlidersHorizontal size={17} />
            {eq.enabled && (
              <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-brand-success" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "queue" ? null : "queue")}
            aria-label={`Queue, ${player.queue.length} tracks`}
            aria-expanded={panel === "queue"}
            className={cn(toggleClass(panel === "queue"), "flex items-center gap-1")}
          >
            <ListMusic size={17} />
            <span className="hidden text-xs tabular-nums sm:inline">
              {player.position + 1}/{player.queue.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => player.setVolume(player.volume > 0 ? 0 : 0.8)}
            aria-label={player.volume > 0 ? "Mute" : "Unmute"}
            className="hidden rounded-full p-1.5 text-app-muted hover:text-app-text sm:block"
          >
            {player.volume > 0 ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={player.volume}
            onChange={(event) => player.setVolume(Number(event.target.value))}
            aria-label="Volume"
            className="hidden h-1.5 w-20 cursor-pointer accent-brand-primary sm:block"
          />
        </div>
      </div>
    </div>
    {panel === "queue" && <QueuePanel onClose={closePanel} />}
    {panel === "eq" && <EqualizerPanel onClose={closePanel} />}
    </>
  )
}

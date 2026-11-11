import { useEffect, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ListMusic, Shuffle, SlidersHorizontal, X } from "lucide-react"
import {
  CUSTOM_PRESET,
  EQ_BANDS,
  EQ_MAX_GAIN,
  EQ_MIN_GAIN,
  EQ_PRESETS,
} from "../../audio/equalizer"
import { usePlayer } from "../../context/PlayerContext"
import { useEqualizer } from "../../hooks/useEqualizer"
import { cn } from "../../utils/cn"
import { formatDuration } from "../../utils/format"
import { CoverArt } from "../music/CoverArt"

function PanelShell({
  title,
  icon,
  onClose,
  headerExtra,
  children,
}: {
  title: string
  icon: ReactNode
  onClose: () => void
  headerExtra?: ReactNode
  children: ReactNode
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return (
    <section
      role="dialog"
      aria-label={title}
      className="animate-fade-in fixed bottom-[4.75rem] right-3 z-50 w-[min(calc(100vw-1.5rem),27rem)] rounded-2xl border border-app-border bg-app-surface shadow-lift sm:right-5"
    >
      <header className="flex items-center gap-2 border-b border-app-border px-4 py-3">
        <span className="text-app-muted" aria-hidden="true">
          {icon}
        </span>
        <h2 className="text-sm font-semibold text-app-text">{title}</h2>
        <div className="ml-auto flex items-center gap-2">
          {headerExtra}
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title.toLowerCase()}`}
            className="rounded-full p-1.5 text-app-muted transition-colors hover:bg-app-raised hover:text-app-text"
          >
            <X size={16} />
          </button>
        </div>
      </header>
      {children}
    </section>
  )
}

// ------------------------------------------------------------------- queue
export function QueuePanel({ onClose }: { onClose: () => void }) {
  const player = usePlayer()
  const { queue, order, position, current } = player
  const upcoming = order.slice(position + 1)

  return (
    <PanelShell
      title="Queue"
      icon={<ListMusic size={16} />}
      onClose={onClose}
      headerExtra={
        upcoming.length > 0 && (
          <button
            type="button"
            onClick={player.clearUpcoming}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-primary hover:bg-brand-primary/10"
          >
            Clear queue
          </button>
        )
      }
    >
      <div className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
        {current && (
          <div className="mb-1 flex items-center gap-3 rounded-xl bg-brand-primary/10 px-2 py-2">
            <CoverArt
              src={current.album?.cover_url}
              seed={current.title}
              alt={`${current.title} artwork`}
              className="h-10 w-10"
              iconSize={16}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-brand-primary">
                {current.title}
              </p>
              <p className="truncate text-xs text-app-muted">
                {current.artist?.name ?? "Unknown artist"}
              </p>
            </div>
            <span className="text-xs text-app-muted">Now playing</span>
          </div>
        )}

        {upcoming.length > 0 ? (
          <>
            <p className="flex items-center gap-1.5 px-2 pb-1 pt-2 text-xs font-semibold text-app-muted">
              Next up
              {player.shuffle && (
                <span className="flex items-center gap-1 font-normal">
                  <Shuffle size={12} aria-hidden="true" /> shuffled
                </span>
              )}
            </p>
            <ul>
              {upcoming.map((queueIndex) => {
                const track = queue[queueIndex]
                if (!track) return null
                return (
                  <li
                    key={`${track.id}-${queueIndex}`}
                    className="group flex items-center gap-1 rounded-xl hover:bg-app-raised/70"
                  >
                    <button
                      type="button"
                      onClick={() => player.playAt(queueIndex)}
                      aria-label={`Play ${track.title}`}
                      className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-left"
                    >
                      <CoverArt
                        src={track.album?.cover_url}
                        seed={track.title}
                        alt=""
                        className="h-9 w-9"
                        iconSize={14}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-app-text">
                          {track.title}
                        </span>
                        <span className="block truncate text-xs text-app-muted">
                          {track.artist?.name ?? "Unknown artist"}
                        </span>
                      </span>
                      <span className="text-xs tabular-nums text-app-muted">
                        {formatDuration(track.duration)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => player.removeFromQueue(queueIndex)}
                      aria-label={`Remove ${track.title} from queue`}
                      className="mr-1 rounded-full p-1.5 text-app-muted hover:bg-app-border hover:text-app-text focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <p className="px-3 py-6 text-center text-sm text-app-muted">
            Nothing after this track. Use “Add to queue” on any song, or{" "}
            <Link to="/" onClick={onClose} className="text-brand-primary hover:underline">
              find more music
            </Link>
            .
          </p>
        )}
      </div>
    </PanelShell>
  )
}

// --------------------------------------------------------------- equalizer
const BAND_LABELS = EQ_BANDS.map((hz) => (hz >= 1000 ? `${hz / 1000}k` : String(hz)))

function formatGain(gain: number): string {
  if (gain === 0) return "0"
  return `${gain > 0 ? "+" : ""}${gain}`
}

/** Smooth response curve through the ten band gains. */
function CurvePath({ gains }: { gains: number[] }) {
  const width = 300
  const height = 56
  const mid = height / 2
  const points = gains.map((gain, i) => ({
    x: ((i + 0.5) / gains.length) * width,
    y: mid - (gain / EQ_MAX_GAIN) * (mid - 4),
  }))
  let line = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]
    const point = points[i]
    line += ` Q ${prev.x} ${prev.y} ${(prev.x + point.x) / 2} ${(prev.y + point.y) / 2}`
  }
  const last = points[points.length - 1]
  line += ` T ${last.x} ${last.y}`
  const area = `${line} L ${last.x} ${mid} L ${points[0].x} ${mid} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-14 w-full text-brand-primary"
      aria-hidden="true"
    >
      <line
        x1="0"
        x2={width}
        y1={mid}
        y2={mid}
        stroke="rgb(var(--border))"
        strokeDasharray="3 4"
        vectorEffect="non-scaling-stroke"
      />
      <path d={area} fill="currentColor" opacity="0.14" />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export function EqualizerPanel({ onClose }: { onClose: () => void }) {
  const eq = useEqualizer()
  const { controls } = eq

  return (
    <PanelShell
      title="Equalizer"
      icon={<SlidersHorizontal size={16} />}
      onClose={onClose}
      headerExtra={
        <button
          type="button"
          role="switch"
          aria-checked={eq.enabled}
          aria-label="Equalizer on"
          onClick={() => controls.setEnabled(!eq.enabled)}
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            eq.enabled ? "bg-brand-solid" : "bg-app-border"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-brand-on shadow transition-[left]",
              eq.enabled ? "left-[1.375rem]" : "left-0.5"
            )}
          />
        </button>
      }
    >
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <label htmlFor="eq-preset" className="text-xs font-semibold text-app-muted">
            Preset
          </label>
          <select
            id="eq-preset"
            value={eq.preset}
            onChange={(event) => controls.applyPreset(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-app-strong bg-app-raised px-2.5 py-1.5 text-sm text-app-text"
          >
            {eq.preset === CUSTOM_PRESET && <option value={CUSTOM_PRESET}>Custom</option>}
            {Object.keys(EQ_PRESETS).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => controls.applyPreset("Flat")}
            className="rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-primary/10"
          >
            Reset
          </button>
        </div>

        {!eq.available && (
          <p className="rounded-lg bg-app-raised px-3 py-2 text-xs text-app-muted">
            This track is hosted somewhere that blocks audio processing, so the
            equalizer can’t change it. Tracks uploaded to Npop work.
          </p>
        )}

        <div className={cn("transition-opacity", !eq.enabled && "opacity-50")}>
          <CurvePath gains={eq.gains} />
          <div className="mt-1 grid grid-cols-10 gap-0">
            {EQ_BANDS.map((hz, i) => (
              <div key={hz} className="flex flex-col items-center gap-1">
                <span className="text-[0.65rem] tabular-nums text-app-muted">
                  {formatGain(eq.gains[i])}
                </span>
                <input
                  type="range"
                  className="eq-slider"
                  min={EQ_MIN_GAIN}
                  max={EQ_MAX_GAIN}
                  step={0.5}
                  value={eq.gains[i]}
                  onChange={(event) => controls.setGain(i, Number(event.target.value))}
                  aria-label={`${BAND_LABELS[i]} Hz`}
                  aria-valuetext={`${formatGain(eq.gains[i])} dB`}
                />
                <span className="text-[0.65rem] text-app-muted">{BAND_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-center text-[0.7rem] text-app-muted">
          {eq.enabled ? "Gain in dB, −12 to +12" : "Equalizer is off. Turn it on to hear changes."}
        </p>
      </div>
    </PanelShell>
  )
}

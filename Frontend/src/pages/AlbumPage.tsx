import { Link, useParams } from "react-router-dom"
import { CalendarDays, Disc3, ListMusic, Pause, Play } from "lucide-react"
import { usePlayer } from "../context/PlayerContext"
import { useAsyncData } from "../hooks/useAsyncData"
import { api } from "../services/api"
import { formatCount } from "../utils/format"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { EmptyState, ErrorState, PageLoader } from "../components/ui/Feedback"
import { PageHeader } from "../components/ui/PageHeader"
import { CoverArt } from "../components/music/CoverArt"
import { TrackList } from "../components/music/TrackRow"

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>()
  const player = usePlayer()

  const { data, loading, error, reload } = useAsyncData(async () => {
    if (!id) throw new Error("Album not found")
    return api.getAlbum(id)
  }, [id])

  if (loading) return <PageLoader label="Loading album…" />
  if (error || !data) {
    return <ErrorState message={error ?? "Album not found."} onRetry={reload} />
  }

  const tracks = [...data.tracks].sort((a, b) => a.track_number - b.track_number)
  const totalPlays = tracks.reduce((sum, track) => sum + track.plays, 0)

  return (
    <div className="space-y-8">
      <section className="surface-card overflow-hidden">
        <div className="grid gap-6 p-5 sm:grid-cols-[minmax(180px,260px)_1fr] sm:p-7">
          <CoverArt
            src={data.cover_url}
            seed={data.title}
            alt={`${data.title} cover`}
            className="mx-auto w-full max-w-[260px] rounded-2xl shadow-lift"
            iconSize={48}
          />
          <div className="flex min-w-0 flex-col justify-end">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">
                <Disc3 size={12} /> {data.kind}
              </Badge>
              {data.release_year > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-app-muted">
                  <CalendarDays size={12} /> {data.release_year}
                </span>
              )}
            </div>
            <h1 className="mt-3 break-words font-display text-3xl font-semibold tracking-tight text-app-text sm:text-4xl">
              {data.title}
            </h1>
            <p className="mt-2 text-base text-app-muted">
              {data.artist ? (
                <Link
                  to={`/artists/${data.artist.id}`}
                  className="font-semibold text-app-text hover:underline"
                >
                  {data.artist.name}
                </Link>
              ) : (
                <Link
                  to={`/artists/${data.artist_id}`}
                  className="font-semibold text-app-text hover:underline"
                >
                  View artist
                </Link>
              )}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {tracks.length > 0 && (
                <Button
                  icon={
                    player.isPlaying &&
                    tracks.some((track) => player.isCurrent(track.id)) ? (
                      <Pause size={16} />
                    ) : (
                      <Play size={16} />
                    )
                  }
                  onClick={() => {
                    const inQueue = tracks.some((track) => player.isCurrent(track.id))
                    if (inQueue) player.toggle()
                    else player.playQueue(tracks, 0)
                  }}
                >
                  {player.isPlaying && tracks.some((track) => player.isCurrent(track.id))
                    ? "Pause album"
                    : "Play album"}
                </Button>
              )}
              {data.artist && (
                <Link to={`/artists/${data.artist.id}`}>
                  <Button variant="secondary" icon={<ListMusic size={16} />}>
                    Artist profile
                  </Button>
                </Link>
              )}
            </div>

            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-app-muted">Tracks</dt>
                <dd className="font-semibold tabular-nums text-app-text">{tracks.length}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-app-muted">Total plays</dt>
                <dd className="font-semibold tabular-nums text-app-text">
                  {formatCount(totalPlays)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-app-muted">Released</dt>
                <dd className="font-semibold text-app-text">
                  {data.release_year > 0 ? data.release_year : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {tracks.length > 0 ? (
        <TrackList
          tracks={tracks}
          title="Track listing"
          subtitle={`${tracks.length} ${tracks.length === 1 ? "track" : "tracks"} on this release.`}
        />
      ) : (
        <EmptyState
          title="This release has no tracks yet"
          description="Tracks added to this album will appear here in order."
          icon="♪"
        />
      )}

      <PageHeader
        title="About this release"
        subtitle="Album pages collect the full track listing, artwork and artist information in one place."
        className="mb-0"
      />
    </div>
  )
}

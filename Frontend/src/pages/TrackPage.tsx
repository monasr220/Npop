import { Link, useParams } from "react-router-dom"
import { Heart, ListPlus, Music2, Play } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { useAsyncData } from "../hooks/useAsyncData"
import { api } from "../services/api"
import { formatCount, formatDate, formatDuration } from "../utils/format"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { Dropdown, DropdownItem } from "../components/ui/Dropdown"
import { EmptyState, ErrorState, PageLoader } from "../components/ui/Feedback"
import { CoverArt } from "../components/music/CoverArt"
import { PlayButton } from "../components/music/PlayButton"
import { TrackList } from "../components/music/TrackRow"

export default function TrackPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isAuthenticated } = useAuth()
  const { notify } = useToast()

  const { data, loading, error, reload } = useAsyncData(async () => {
    if (!id) throw new Error("Track not found")
    const track = await api.getTrack(id)
    const [albumTracks, artistTracks] = await Promise.all([
      api.getAlbumTracks(track.album_id),
      api.getArtistTracks(track.artist_id),
    ])
    return { track, albumTracks, artistTracks }
  }, [id])

  const { data: favorites, reload: reloadFavorites } = useAsyncData(
    () => (user ? api.getFavorites(user.id, 0, 100) : Promise.resolve([])),
    [user?.id],
    { enabled: isAuthenticated }
  )

  const { data: playlists } = useAsyncData(
    () => (user ? api.getPlaylists(user.id, false, 0, 50) : Promise.resolve([])),
    [user?.id],
    { enabled: isAuthenticated }
  )

  if (loading) return <PageLoader label="Loading track…" />
  if (error || !data) {
    return <ErrorState message={error ?? "Track not found."} onRetry={reload} />
  }

  const { track, albumTracks, artistTracks } = data
  const isFavorite = Boolean(favorites?.some((item) => item.id === track.id))

  async function toggleFavorite() {
    if (!user) {
      notify("Sign in to save favorites", "info")
      return
    }
    try {
      if (isFavorite) {
        await api.removeFavorite(user.id, track.id)
        notify("Removed from favorites", "success")
      } else {
        await api.addFavorite(user.id, track.id)
        notify("Saved to favorites", "success")
      }
      reloadFavorites()
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not update favorite", "error")
    }
  }

  async function addToPlaylist(playlistId: string, playlistName: string) {
    try {
      await api.addTrackToPlaylist(playlistId, track.id)
      notify(`Added to ${playlistName}`, "success")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not add to playlist", "error")
    }
  }

  return (
    <div className="space-y-8">
      <section className="surface-card overflow-hidden">
        <div className="grid gap-6 p-5 sm:grid-cols-[minmax(180px,260px)_1fr] sm:p-7">
          <CoverArt
            src={track.album?.cover_url}
            seed={track.title}
            alt={`${track.title} artwork`}
            className="mx-auto w-full max-w-[260px] rounded-2xl shadow-lift"
            iconSize={48}
          />
          <div className="flex min-w-0 flex-col justify-end">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">Track</Badge>
              {track.explicit && <Badge variant="social">Explicit</Badge>}
              {track.album && (
                <Link
                  to={`/albums/${track.album.id}`}
                  className="text-xs font-medium text-app-muted hover:text-app-text hover:underline"
                >
                  {track.album.title}
                </Link>
              )}
            </div>
            <h1 className="mt-3 break-words font-display text-3xl font-semibold tracking-tight text-app-text sm:text-4xl">
              {track.title}
            </h1>
            <p className="mt-2 text-base text-app-muted">
              {track.artist ? (
                <Link
                  to={`/artists/${track.artist.id}`}
                  className="font-semibold text-app-text hover:underline"
                >
                  {track.artist.name}
                </Link>
              ) : (
                "Unknown artist"
              )}
              {track.album && (
                <>
                  <span aria-hidden="true"> · </span>
                  <Link
                    to={`/albums/${track.album.id}`}
                    className="hover:text-app-text hover:underline"
                  >
                    {track.album.title}
                  </Link>
                  <span aria-hidden="true"> · </span>
                  {track.album.release_year}
                </>
              )}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <PlayButton track={track} queue={albumTracks} size="lg" />
              <Button
                variant={isFavorite ? "social" : "secondary"}
                size="md"
                icon={<Heart size={16} className={isFavorite ? "fill-current" : ""} />}
                onClick={toggleFavorite}
              >
                {isFavorite ? "Favorited" : "Favorite"}
              </Button>
              <Dropdown
                label="Add to playlist"
                trigger={({ toggle }) => (
                  <Button
                    variant="secondary"
                    size="md"
                    icon={<ListPlus size={16} />}
                    onClick={toggle}
                  >
                    Add to playlist
                  </Button>
                )}
              >
                {playlists && playlists.length > 0 ? (
                  playlists.map((playlist) => (
                    <DropdownItem
                      key={playlist.id}
                      onClick={() => addToPlaylist(playlist.id, playlist.name)}
                    >
                      <Music2 size={14} /> {playlist.name}
                    </DropdownItem>
                  ))
                ) : (
                  <DropdownItem onClick={() => notify("Create a playlist first", "info")}>
                    No playlists yet — create one in Library
                  </DropdownItem>
                )}
              </Dropdown>
            </div>

            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-app-muted">Plays</dt>
                <dd className="font-semibold tabular-nums text-app-text">
                  {formatCount(track.plays)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-app-muted">Duration</dt>
                <dd className="font-semibold tabular-nums text-app-text">
                  {formatDuration(track.duration)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-app-muted">Released</dt>
                <dd className="font-semibold text-app-text">
                  {track.album ? formatDate(`${track.album.release_year}-01-01`) : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {albumTracks.length > 0 && (
        <TrackList
          tracks={albumTracks}
          title={track.album ? `From ${track.album.title}` : "From the album"}
          subtitle="The full release in track order."
          showAlbum={false}
        />
      )}

      {artistTracks.filter((item) => item.id !== track.id).length > 0 && (
        <TrackList
          tracks={artistTracks.filter((item) => item.id !== track.id).slice(0, 6)}
          title={`More from ${track.artist?.name ?? "this artist"}`}
          showAlbum
        />
      )}

      {albumTracks.length === 0 && artistTracks.length === 0 && (
        <EmptyState
          title="No related music yet"
          description="This track does not have other tracks in its album or artist catalogue."
          icon="♪"
        />
      )}

      {track.audio_url && (
        <p className="flex items-center gap-2 text-xs text-app-muted">
          <Play size={12} aria-hidden="true" />
          Audio is streamed directly from the artist's hosted file.
        </p>
      )}
    </div>
  )
}

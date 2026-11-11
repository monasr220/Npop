import { Link } from "react-router-dom"
import {
  BarChart3,
  Disc3,
  Headphones,
  LayoutDashboard,
  Music2,
  Plus,
  Upload,
  Users,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useAsyncData } from "../hooks/useAsyncData"
import { api } from "../services/api"
import { formatCount } from "../utils/format"
import { Avatar } from "../components/ui/Avatar"
import { Badge, VerifiedBadge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { EmptyState, ErrorState, PageLoader } from "../components/ui/Feedback"
import { PageHeader, StatCard } from "../components/ui/PageHeader"
import { AlbumCard } from "../components/music/AlbumCard"
import { TrackList } from "../components/music/TrackRow"

export default function ArtistDashboardPage() {
  const { artist } = useAuth()

  const { data, loading, error, reload } = useAsyncData(
    async () => {
      if (!artist) return null
      const [tracks, albums, counts] = await Promise.all([
        api.getArtistTracks(artist.id),
        api.getArtistAlbums(artist.id),
        artist.user_id
          ? api.getFollowCounts(artist.user_id).catch(() => ({ followers: 0, followings: 0 }))
          : Promise.resolve({ followers: 0, followings: 0 }),
      ])
      return { tracks, albums, counts }
    },
    [artist?.id, artist?.user_id],
    { enabled: Boolean(artist) }
  )

  if (!artist) {
    return (
      <EmptyState
        title="No artist profile yet"
        description="Create an artist profile in Settings to unlock the studio."
        icon={<LayoutDashboard size={22} />}
        action={
          <Link to="/settings">
            <Button size="sm">Open settings</Button>
          </Link>
        }
      />
    )
  }

  if (loading) return <PageLoader label="Loading studio…" />
  if (error || !data) {
    return <ErrorState message={error ?? "Studio could not be loaded."} onRetry={reload} />
  }

  const totalPlays = data.tracks.reduce((sum, track) => sum + track.plays, 0)
  const topTracks = [...data.tracks].sort((a, b) => b.plays - a.plays).slice(0, 5)

  return (
    <div className="space-y-8">
      <section className="surface-card overflow-hidden">
        <div aria-hidden="true" className="hero-wash h-24 w-full bg-app-raised" />
        <div className="-mt-10 flex flex-col gap-4 px-5 pb-6 sm:-mt-12 sm:flex-row sm:items-end sm:px-7">
          <Avatar
            name={artist.name}
            src={artist.image_url}
            size="xl"
            className="h-20 w-20 border-4 border-app-surface shadow-lift sm:h-24 sm:w-24"
          />
          <div className="min-w-0 flex-1 sm:pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">Artist studio</Badge>
              {artist.verified && <VerifiedBadge />}
            </div>
            <h1 className="mt-2 break-words font-display text-3xl font-semibold tracking-tight text-app-text">
              {artist.name}
            </h1>
            <p className="mt-1 text-sm text-app-muted">
              {formatCount(artist.monthly_listeners)} monthly listeners ·{" "}
              {formatCount(data.counts.followers)} followers
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:pb-1">
            <Link to="/studio/upload">
              <Button icon={<Upload size={16} />}>Upload track</Button>
            </Link>
            <Link to="/studio/albums">
              <Button variant="secondary" icon={<Plus size={16} />}>
                New album
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tracks"
          value={data.tracks.length}
          hint="Published on your profile"
          icon={<Music2 size={18} />}
        />
        <StatCard
          label="Releases"
          value={data.albums.length}
          hint="Albums, EPs and singles"
          icon={<Disc3 size={18} />}
        />
        <StatCard
          label="Total plays"
          value={formatCount(totalPlays)}
          hint="Across your catalogue"
          icon={<Headphones size={18} />}
        />
        <StatCard
          label="Followers"
          value={formatCount(data.counts.followers)}
          hint="Listeners following your account"
          icon={<Users size={18} />}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section>
          <PageHeader
            title="Top tracks"
            subtitle="Your most played tracks right now."
            actions={
              <Link
                to="/studio/music"
                className="text-sm font-semibold text-brand-primary hover:underline"
              >
                Manage music
              </Link>
            }
            className="mb-3"
          />
          {topTracks.length > 0 ? (
            <TrackList tracks={topTracks} showAlbum />
          ) : (
            <EmptyState
              title="No tracks published"
              description="Upload your first track to start seeing play statistics."
              icon={<Music2 size={22} />}
              action={
                <Link to="/studio/upload">
                  <Button size="sm" icon={<Upload size={14} />}>
                    Upload track
                  </Button>
                </Link>
              }
            />
          )}
        </section>

        <section className="surface-card h-fit p-5">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-brand-primary" />
            <h2 className="text-base font-semibold text-app-text">Audience</h2>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-muted">Monthly listeners</dt>
              <dd className="font-semibold tabular-nums text-app-text">
                {formatCount(artist.monthly_listeners)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-muted">Followers</dt>
              <dd className="font-semibold tabular-nums text-app-text">
                {formatCount(data.counts.followers)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-muted">Average plays / track</dt>
              <dd className="font-semibold tabular-nums text-app-text">
                {data.tracks.length > 0
                  ? formatCount(Math.round(totalPlays / data.tracks.length))
                  : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-muted">Verification</dt>
              <dd className="font-semibold text-app-text">
                {artist.verified ? "Verified" : "Not verified"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 border-t border-app-border pt-3 text-xs leading-5 text-app-muted">
            Verification is granted by administrators. Monthly listeners grow as
            listeners play your tracks.
          </p>
        </section>
      </div>

      <section>
        <PageHeader
          title="Your releases"
          subtitle="Albums, EPs and singles published under your artist profile."
          actions={
            <Link
              to="/studio/albums"
              className="text-sm font-semibold text-brand-primary hover:underline"
            >
              Manage albums
            </Link>
          }
          className="mb-3"
        />
        {data.albums.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
            {data.albums.map((album) => (
              <AlbumCard key={album.id} album={album} artistName={artist.name} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No releases yet"
            description="Create an album or single before uploading tracks — every track belongs to a release."
            icon={<Disc3 size={22} />}
            action={
              <Link to="/studio/albums">
                <Button size="sm" icon={<Plus size={14} />}>
                  Create release
                </Button>
              </Link>
            }
          />
        )}
      </section>
    </div>
  )
}

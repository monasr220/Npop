import { Link } from "react-router-dom"
import { ArrowRight, Headphones, Radio, Sparkles, TrendingUp } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useAsyncData } from "../hooks/useAsyncData"
import { api } from "../services/api"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { SectionHeader } from "../components/ui/Card"
import { EmptyState, ErrorState, PageLoader } from "../components/ui/Feedback"
import { PageHeader } from "../components/ui/PageHeader"
import { AlbumCard } from "../components/music/AlbumCard"
import { ArtistCard } from "../components/music/ArtistCard"
import { CoverArt } from "../components/music/CoverArt"
import { PlayButton } from "../components/music/PlayButton"
import { TrackList } from "../components/music/TrackRow"
import { PostCard } from "../components/social/PostCard"

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const { data, loading, error, reload } = useAsyncData(async () => {
    const [tracks, albums, artists, hashtags, posts] = await Promise.all([
      api.getMostPlayed(10),
      api.getAlbums(undefined, 0, 12),
      api.getArtists(undefined, 0, 8),
      api.getTrendingHashtags(10),
      api.getPosts(undefined, 0, 3),
    ])
    return { tracks, albums, artists, hashtags, posts }
  }, [])

  if (loading) return <PageLoader label="Loading discovery…" />
  if (error || !data) {
    return (
      <ErrorState
        message={error ?? "Discovery could not be loaded."}
        onRetry={reload}
      />
    )
  }

  const featured = data.tracks[0]

  return (
    <div className="space-y-10">
      <section className="hero-wash relative overflow-hidden rounded-3xl border border-app-border bg-app-surface p-6 shadow-soft sm:p-9">
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <Badge variant="primary">
              <Sparkles size={12} /> Npop discovery
            </Badge>
            <h1 className="mt-4 max-w-xl font-display text-3xl font-semibold leading-[1.08] tracking-tight text-app-text sm:text-5xl">
              Find your next
              <span className="text-brand-primary"> favorite sound</span>.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-app-muted sm:text-base">
              Stream independent music, follow the artists behind it, and turn
              every listen into a conversation. Discovery, publishing and social
              listening in one place.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              {featured && (
                <PlayButton
                  track={featured}
                  queue={data.tracks}
                  size="lg"
                  label={`Play ${featured.title}`}
                />
              )}
              <Link to="/feed">
                <Button size="lg" variant="secondary" icon={<Radio size={17} />}>
                  Open the feed
                </Button>
              </Link>
              {!isAuthenticated && (
                <Link to="/register">
                  <Button size="lg" icon={<ArrowRight size={17} />}>
                    Join Npop
                  </Button>
                </Link>
              )}
            </div>
            <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-app-muted">Tracks</dt>
                <dd className="text-lg font-bold tabular-nums text-app-text">
                  {data.tracks.length > 0 ? `${data.tracks.length}+` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-app-muted">Artists</dt>
                <dd className="text-lg font-bold tabular-nums text-app-text">
                  {data.artists.length > 0 ? `${data.artists.length}+` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-app-muted">Releases</dt>
                <dd className="text-lg font-bold tabular-nums text-app-text">
                  {data.albums.length > 0 ? `${data.albums.length}+` : "—"}
                </dd>
              </div>
            </dl>
          </div>

          {featured ? (
            <div className="surface-card mx-auto w-full max-w-sm p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-app-muted">
                <TrendingUp size={14} className="text-brand-success" />
                Most played right now
              </div>
              <div className="mt-3">
                <CoverArt
                  src={featured.album?.cover_url}
                  seed={featured.title}
                  alt={`${featured.title} artwork`}
                  className="rounded-2xl"
                />
              </div>
              <h2 className="mt-3 line-clamp-1 text-lg font-bold text-app-text">
                {featured.title}
              </h2>
              <p className="line-clamp-1 text-sm text-app-muted">
                {featured.artist?.name ?? "Unknown artist"}
                {featured.album ? ` · ${featured.album.title}` : ""}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs text-app-muted">
                  <Headphones size={14} /> {featured.plays.toLocaleString()} plays
                </span>
                <Link
                  to={`/tracks/${featured.id}`}
                  className="text-xs font-semibold text-brand-primary hover:underline"
                >
                  Track details
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No tracks yet"
              description="Once artists publish music it will show up here."
              icon="♪"
            />
          )}
        </div>
      </section>

      {data.tracks.length > 0 && (
        <TrackList
          tracks={data.tracks.slice(0, 8)}
          title="Trending now"
          subtitle="The tracks listeners keep coming back to."
          showAlbum
        />
      )}

      <section>
        <SectionHeader
          title="New releases"
          subtitle="Fresh albums and singles from Npop artists."
          action={
            <Link to="/albums" className="text-sm font-semibold text-brand-primary hover:underline">
              All albums
            </Link>
          }
        />
        {data.albums.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
            {data.albums.slice(0, 8).map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No releases yet"
            description="Albums created by artists will appear here."
            icon="◎"
          />
        )}
      </section>

      <section>
        <SectionHeader
          title="Artists to follow"
          subtitle="Independent voices publishing on Npop."
          action={
            <Link to="/artists" className="text-sm font-semibold text-brand-primary hover:underline">
              All artists
            </Link>
          }
        />
        {data.artists.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
            {data.artists.slice(0, 6).map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No artists yet"
            description="Artist profiles will appear here as the community grows."
            icon="★"
          />
        )}
      </section>

      {data.hashtags.length > 0 && (
        <section>
          <SectionHeader title="Trending topics" subtitle="What the community is talking about." />
          <div className="flex flex-wrap gap-2">
            {data.hashtags.map((hashtag) => (
              <Link
                key={hashtag.id}
                to={`/search?q=${encodeURIComponent(hashtag.tag)}`}
                className="rounded-full border border-app-border bg-app-surface px-3.5 py-1.5 text-sm text-app-text transition-colors hover:border-brand-primary/60 hover:text-brand-primary"
              >
                #{hashtag.tag}
                <span className="ml-2 text-xs text-app-muted">{hashtag.usage}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader
          title="From the community"
          subtitle="Posts, ratings and music shared by listeners and artists."
          action={
            <Link to="/feed" className="text-sm font-semibold text-brand-primary hover:underline">
              Open feed
            </Link>
          }
        />
        {data.posts.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.posts.map((post) => (
              <PostCard key={post.id} post={post} onChanged={reload} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="The feed is quiet"
            description="Be the first to share a track or start a conversation."
            icon="✎"
          />
        )}
      </section>

      {!isAuthenticated && (
        <section className="relative overflow-hidden rounded-3xl border border-brand-primary/30 bg-brand-primary/10 p-6 sm:p-8">
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div className="max-w-xl">
              <PageHeader
                eyebrow="Your library awaits"
                title="Create an account and make Npop yours."
                subtitle="Follow artists, save favorites, build playlists and join the conversation. Artist tools unlock when you are ready to publish."
                className="mb-0"
              />
            </div>
            <div className="flex gap-2">
              <Link to="/register">
                <Button size="lg">Create account</Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="secondary">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

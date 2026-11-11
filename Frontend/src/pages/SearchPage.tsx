import { useEffect, useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Search, X } from "lucide-react"
import { useAsyncData } from "../hooks/useAsyncData"
import { api } from "../services/api"
import { formatCount } from "../utils/format"
import { Avatar } from "../components/ui/Avatar"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { EmptyState, ErrorState, PageLoader } from "../components/ui/Feedback"
import { PageHeader } from "../components/ui/PageHeader"
import { Tabs } from "../components/ui/Tabs"
import { AlbumCard } from "../components/music/AlbumCard"
import { ArtistCard } from "../components/music/ArtistCard"
import { TrackList } from "../components/music/TrackRow"

type Section = "all" | "tracks" | "artists" | "albums" | "users" | "hashtags"

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get("q")?.trim() ?? ""
  const [input, setInput] = useState(query)
  const [section, setSection] = useState<Section>("all")

  useEffect(() => {
    setInput(query)
  }, [query])

  const { data, loading, error, reload } = useAsyncData(
    async () => {
      if (!query) {
        return { tracks: [], artists: [], albums: [], users: [], hashtags: [] }
      }
      const [tracks, artists, albums, users, hashtags] = await Promise.all([
        api.getTracks({ q: query, limit: 50 }).catch(() => []),
        api.getArtists(query, 0, 50).catch(() => []),
        api.getAlbums(undefined, 0, 100).catch(() => []),
        api.getUsers(query, 0, 50).catch(() => []),
        api.getHashtags(100).catch(() => []),
      ])
      const needle = query.toLowerCase()
      return {
        tracks,
        artists,
        albums: albums.filter(
          (album) =>
            album.title.toLowerCase().includes(needle) ||
            (album.artist?.name ?? "").toLowerCase().includes(needle)
        ),
        users,
        hashtags: hashtags.filter((tag) => tag.tag.toLowerCase().includes(needle)),
      }
    },
    [query]
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = input.trim()
    if (next) setParams({ q: next })
    else setParams({})
  }

  const results = data ?? { tracks: [], artists: [], albums: [], users: [], hashtags: [] }
  const total =
    results.tracks.length +
    results.artists.length +
    results.albums.length +
    results.users.length +
    results.hashtags.length

  return (
    <div>
      <PageHeader
        eyebrow="Search"
        title={query ? `Results for “${query}”` : "Search Npop"}
        subtitle={
          query
            ? `${total} ${total === 1 ? "match" : "matches"} across tracks, artists, albums, people and topics.`
            : "Find tracks, artists, albums, listeners and hashtags across the network."
        }
      />

      <form onSubmit={submit} role="search" className="mb-5 max-w-2xl">
        <div className="relative">
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-app-muted"
          />
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Search tracks, artists, albums, people, #topics…"
            aria-label="Search Npop"
            autoFocus
            className="h-12 w-full rounded-full border border-app-strong bg-app-surface pl-11 pr-24 text-sm text-app-text placeholder:text-app-muted/70 focus:border-brand-primary/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {input && (
              <button
                type="button"
                onClick={() => {
                  setInput("")
                  setParams({})
                }}
                aria-label="Clear search"
                className="rounded-full p-1.5 text-app-muted hover:bg-app-raised hover:text-app-text"
              >
                <X size={15} />
              </button>
            )}
            <Button type="submit" size="sm">
              Search
            </Button>
          </div>
        </div>
      </form>

      {!query ? (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <EmptyState
            title="Start with a name, a track or a topic"
            description="Search is available for everyone — sign in to follow artists and save what you find."
            icon={<Search size={22} />}
          />
          <TrendingTopics />
        </div>
      ) : loading ? (
        <PageLoader label="Searching…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : total === 0 ? (
        <EmptyState
          title="No matches found"
          description="Try a different spelling, a shorter query, or browse discovery instead."
          icon={<Search size={22} />}
          action={
            <Link to="/">
              <Button size="sm">Browse discovery</Button>
            </Link>
          }
        />
      ) : (
        <>
          <Tabs
            value={section}
            onChange={setSection}
            tabs={[
              { value: "all", label: "All", count: total },
              { value: "tracks", label: "Tracks", count: results.tracks.length },
              { value: "artists", label: "Artists", count: results.artists.length },
              { value: "albums", label: "Albums", count: results.albums.length },
              { value: "users", label: "People", count: results.users.length },
              { value: "hashtags", label: "Topics", count: results.hashtags.length },
            ]}
            className="mb-5 w-fit"
          />

          {(section === "all" || section === "tracks") && results.tracks.length > 0 && (
            <div className="mb-8">
              <TrackList
                tracks={results.tracks}
                title="Tracks"
                subtitle={`${results.tracks.length} matching tracks`}
                showAlbum
              />
            </div>
          )}

          {(section === "all" || section === "artists") && results.artists.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold tracking-tight text-app-text">
                Artists
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
                {results.artists.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            </section>
          )}

          {(section === "all" || section === "albums") && results.albums.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold tracking-tight text-app-text">
                Albums
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
                {results.albums.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </section>
          )}

          {(section === "all" || section === "users") && results.users.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold tracking-tight text-app-text">
                People
              </h2>
              <ul className="surface-card divide-y divide-app-border/60 p-2">
                {results.users.map((person) => (
                  <li key={person.id}>
                    <Link
                      to={`/users/${person.id}`}
                      className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-app-raised/70"
                    >
                      <Avatar name={person.username} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-app-text">
                          {person.username}
                        </p>
                        <p className="truncate text-xs text-app-muted">
                          {person.bio || "Listener"}
                        </p>
                      </div>
                      <Badge variant={person.role === "artist" ? "primary" : "neutral"}>
                        {person.role}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(section === "all" || section === "hashtags") && results.hashtags.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold tracking-tight text-app-text">
                Topics
              </h2>
              <div className="flex flex-wrap gap-2">
                {results.hashtags.map((hashtag) => (
                  <Link
                    key={hashtag.id}
                    to={`/search?q=${encodeURIComponent(hashtag.tag)}`}
                    className="rounded-full border border-app-border bg-app-surface px-3.5 py-1.5 text-sm text-app-text transition-colors hover:border-brand-primary/60 hover:text-brand-primary"
                  >
                    #{hashtag.tag}
                    <span className="ml-2 text-xs text-app-muted">
                      {formatCount(hashtag.usage)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function TrendingTopics() {
  const { data } = useAsyncData(() => api.getTrendingHashtags(12), [])
  if (!data || data.length === 0) return null

  return (
    <div className="surface-card p-5">
      <h2 className="text-base font-semibold text-app-text">Trending topics</h2>
      <p className="mt-1 text-sm text-app-muted">
        What the community is talking about right now.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {data.map((hashtag) => (
          <Link
            key={hashtag.id}
            to={`/search?q=${encodeURIComponent(hashtag.tag)}`}
            className="rounded-full border border-app-border bg-app-raised px-3 py-1.5 text-sm text-app-text transition-colors hover:border-brand-primary/60 hover:text-brand-primary"
          >
            #{hashtag.tag}
          </Link>
        ))}
      </div>
    </div>
  )
}

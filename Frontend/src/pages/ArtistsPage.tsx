import { useState } from "react"
import { Link } from "react-router-dom"
import { Search, Users } from "lucide-react"
import { useAsyncData, useDebouncedValue } from "../hooks/useAsyncData"
import { api } from "../services/api"
import { EmptyState, ErrorState, CardGridSkeleton } from "../components/ui/Feedback"
import { PageHeader } from "../components/ui/PageHeader"
import { Tabs } from "../components/ui/Tabs"
import { ArtistCard } from "../components/music/ArtistCard"

export default function ArtistsPage() {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "verified">("all")
  const debounced = useDebouncedValue(query, 300)

  const { data, loading, error, reload } = useAsyncData(
    () => api.getArtists(debounced.trim() || undefined, 0, 100),
    [debounced]
  )

  const artists = (data ?? []).filter(
    (artist) => filter === "all" || artist.verified
  )

  return (
    <div>
      <PageHeader
        eyebrow="Artists"
        title="The voices behind the music"
        subtitle="Browse independent artists on Npop, follow their work and explore their discography."
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-md">
          <Search
            size={17}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-muted"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search artists by name…"
            aria-label="Search artists"
            className="h-11 w-full rounded-full border border-app-strong bg-app-surface pl-9 pr-3 text-sm text-app-text placeholder:text-app-muted/70 focus:border-brand-primary/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: "all", label: "All artists" },
            { value: "verified", label: "Verified" },
          ]}
          className="w-fit"
        />
      </div>

      {loading ? (
        <CardGridSkeleton count={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : artists.length === 0 ? (
        <EmptyState
          title={query ? "No artists match your search" : "No artists yet"}
          description={
            query
              ? "Try a different name or clear the search."
              : "Artist profiles will appear here as people publish music."
          }
          icon={<Users size={22} />}
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-app-muted">
            {artists.length} {artists.length === 1 ? "artist" : "artists"}
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
            {artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        </>
      )}

      <div className="mt-10 surface-card p-5">
        <p className="text-sm font-semibold text-app-text">Are you an artist?</p>
        <p className="mt-1 text-sm text-app-muted">
          Create an artist profile from{" "}
          <Link to="/settings#artist" className="font-semibold text-brand-primary hover:underline">
            account settings
          </Link>{" "}
          to publish tracks, manage albums and appear in discovery.
        </p>
      </div>
    </div>
  )
}

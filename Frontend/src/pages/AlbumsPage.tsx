import { useMemo, useState } from "react"
import { Disc3, Search } from "lucide-react"
import { useAsyncData, useDebouncedValue } from "../hooks/useAsyncData"
import { api } from "../services/api"
import { CardGridSkeleton, EmptyState, ErrorState } from "../components/ui/Feedback"
import { PageHeader } from "../components/ui/PageHeader"
import { Tabs } from "../components/ui/Tabs"
import { AlbumCard } from "../components/music/AlbumCard"

type KindFilter = "all" | "album" | "single" | "ep"

export default function AlbumsPage() {
  const [query, setQuery] = useState("")
  const [kind, setKind] = useState<KindFilter>("all")
  const debounced = useDebouncedValue(query, 250)

  const { data, loading, error, reload } = useAsyncData(
    () => api.getAlbums(undefined, 0, 100),
    []
  )

  const albums = useMemo(() => {
    const search = debounced.trim().toLowerCase()
    return (data ?? []).filter((album) => {
      const matchesKind = kind === "all" || album.kind.toLowerCase() === kind
      const matchesQuery =
        !search ||
        album.title.toLowerCase().includes(search) ||
        (album.artist?.name ?? "").toLowerCase().includes(search)
      return matchesKind && matchesQuery
    })
  }, [data, debounced, kind])

  return (
    <div>
      <PageHeader
        eyebrow="Albums"
        title="Releases from the Npop community"
        subtitle="Full-length records, EPs and singles published by independent artists."
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
            placeholder="Search releases or artists…"
            aria-label="Search albums"
            className="h-11 w-full rounded-full border border-app-strong bg-app-surface pl-9 pr-3 text-sm text-app-text placeholder:text-app-muted/70 focus:border-brand-primary/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <Tabs
          value={kind}
          onChange={setKind}
          tabs={[
            { value: "all", label: "All releases" },
            { value: "album", label: "Albums" },
            { value: "ep", label: "EPs" },
            { value: "single", label: "Singles" },
          ]}
          className="w-fit"
        />
      </div>

      {loading ? (
        <CardGridSkeleton count={10} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : albums.length === 0 ? (
        <EmptyState
          title={query ? "No releases match your search" : "No releases yet"}
          description={
            query
              ? "Try a different title or artist name."
              : "Albums and singles will appear here as artists publish them."
          }
          icon={<Disc3 size={22} />}
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-app-muted">
            {albums.length} {albums.length === 1 ? "release" : "releases"}
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

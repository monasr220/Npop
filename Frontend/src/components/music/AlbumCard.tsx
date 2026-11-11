import { Link } from "react-router-dom"
import type { Album } from "../../types"
import { formatCount } from "../../utils/format"
import { CoverArt } from "./CoverArt"

export function AlbumCard({
  album,
  artistName,
  trackCount,
}: {
  album: Album
  artistName?: string
  trackCount?: number
}) {
  return (
    <article className="group surface-card overflow-hidden p-3 transition duration-200 hover:-translate-y-0.5 hover:border-brand-primary/50 hover:shadow-soft">
      <Link to={`/albums/${album.id}`} className="block">
        <CoverArt
          src={album.cover_url}
          seed={album.title}
          alt={`${album.title} cover`}
          className="rounded-xl"
        />
        <div className="mt-3">
          <h3 className="line-clamp-1 text-sm font-semibold text-app-text group-hover:underline">
            {album.title}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-app-muted">
            {artistName ?? album.artist?.name ?? album.kind}
            {typeof trackCount === "number" && (
              <> · {formatCount(trackCount)} tracks</>
            )}
          </p>
        </div>
      </Link>
    </article>
  )
}

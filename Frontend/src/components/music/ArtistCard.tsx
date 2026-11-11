import { Link } from "react-router-dom"
import type { Artist } from "../../types"
import { formatCount } from "../../utils/format"
import { Avatar } from "../ui/Avatar"
import { VerifiedBadge } from "../ui/Badge"

export function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <article className="group surface-card flex flex-col items-center p-4 text-center transition duration-200 hover:-translate-y-0.5 hover:border-brand-primary/50 hover:shadow-soft">
      <Link to={`/artists/${artist.id}`} className="flex w-full flex-col items-center">
        <div className="aspect-square w-full max-w-[160px]">
          <Avatar
            name={artist.name}
            src={artist.image_url}
            size="xl"
            className="h-full w-full rounded-full shadow-soft"
          />
        </div>
        <h3 className="mt-3 line-clamp-1 text-sm font-semibold text-app-text group-hover:underline">
          {artist.name}
        </h3>
      </Link>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
        {artist.verified && <VerifiedBadge />}
        <span className="text-xs text-app-muted">
          {formatCount(artist.monthly_listeners)} listeners
        </span>
      </div>
    </article>
  )
}

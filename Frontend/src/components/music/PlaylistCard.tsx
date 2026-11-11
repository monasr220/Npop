import { Link } from "react-router-dom"
import { ListMusic } from "lucide-react"
import type { Playlist } from "../../types"
import { CoverArt } from "./CoverArt"

export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <article className="group surface-card p-3 transition duration-200 hover:-translate-y-0.5 hover:border-brand-primary/50 hover:shadow-soft">
      <Link to={`/playlists/${playlist.id}`} className="block">
        <div className="relative">
          <CoverArt
            src={playlist.cover_url}
            seed={playlist.name}
            alt={`${playlist.name} cover`}
            className="rounded-xl"
          />
          <span
            className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-brand-solid text-brand-on shadow-soft"
            aria-hidden="true"
          >
            <ListMusic size={15} />
          </span>
        </div>
        <h3 className="mt-3 line-clamp-1 text-sm font-semibold text-app-text group-hover:underline">
          {playlist.name}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-app-muted">
          {playlist.is_system ? "Npop playlist" : playlist.description || "Your playlist"}
        </p>
      </Link>
    </article>
  )
}

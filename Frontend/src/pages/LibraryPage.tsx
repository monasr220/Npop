import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Heart, History, ListMusic, Users } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useAsyncData } from "../hooks/useAsyncData"
import { api } from "../services/api"
import { Avatar } from "../components/ui/Avatar"
import { Button } from "../components/ui/Button"
import { EmptyState, ErrorState, PageLoader } from "../components/ui/Feedback"
import { PageHeader } from "../components/ui/PageHeader"
import { Tabs } from "../components/ui/Tabs"
import { PlaylistCard } from "../components/music/PlaylistCard"
import { TrackList } from "../components/music/TrackRow"

type Section = "recent" | "favorites" | "playlists" | "following"

export default function LibraryPage() {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()
  const [section, setSection] = useState<Section>(
    location.pathname === "/favorites" ? "favorites" : "recent"
  )

  const { data, loading, error, reload } = useAsyncData(
    async () => {
      if (!user) {
        return {
          recent: [],
          favorites: [],
          playlists: [],
          following: [],
        }
      }
      const [recent, favorites, playlists, following] = await Promise.all([
        api.getRecentlyPlayed(user.id, 30).catch(() => []),
        api.getFavorites(user.id, 0, 100).catch(() => []),
        api.getPlaylists(user.id, false, 0, 100).catch(() => []),
        api.getFollowings(user.id).catch(() => []),
      ])
      return { recent, favorites, playlists, following }
    },
    [user?.id],
    { enabled: isAuthenticated }
  )

  if (!isAuthenticated) {
    return (
      <div>
        <PageHeader
          eyebrow="Your library"
          title="Everything you save, in one place"
          subtitle="Favorites, playlists and listening history live in your library."
        />
        <EmptyState
          title="Sign in to open your library"
          description="Your library is tied to your account so it follows you across devices."
          icon={<ListMusic size={22} />}
          action={
            <div className="flex gap-2">
              <Link to="/login">
                <Button variant="secondary" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Create account</Button>
              </Link>
            </div>
          }
        />
      </div>
    )
  }

  if (loading) return <PageLoader label="Loading your library…" />
  if (error || !data) {
    return <ErrorState message={error ?? "Library could not be loaded."} onRetry={reload} />
  }

  return (
    <div>
      <PageHeader
        eyebrow="Your library"
        title="Your listening, collected"
        subtitle="Jump back into recent listens, saved favorites and the people you follow."
        actions={
          <Link to="/playlists">
            <Button variant="secondary" size="sm" icon={<ListMusic size={15} />}>
              Manage playlists
            </Button>
          </Link>
        }
      />

      <Tabs
        value={section}
        onChange={setSection}
        tabs={[
          { value: "recent", label: "Recently played", count: data.recent.length },
          { value: "favorites", label: "Favorites", count: data.favorites.length },
          { value: "playlists", label: "Playlists", count: data.playlists.length },
          { value: "following", label: "Following", count: data.following.length },
        ]}
        className="mb-5 w-fit"
      />

      {section === "recent" &&
        (data.recent.length > 0 ? (
          <TrackList
            tracks={data.recent}
            title="Recently played"
            subtitle="Tracks played from your signed-in sessions."
            showAlbum
          />
        ) : (
          <EmptyState
            title="Nothing played yet"
            description="Start a track and your listening history will build here."
            icon={<History size={22} />}
          />
        ))}

      {section === "favorites" &&
        (data.favorites.length > 0 ? (
          <TrackList
            tracks={data.favorites}
            title="Favorite tracks"
            subtitle="Everything you have saved with the heart button."
            showAlbum
          />
        ) : (
          <EmptyState
            title="No favorites yet"
            description="Open any track and press Favorite to save it here."
            icon={<Heart size={22} />}
            action={
              <Link to="/">
                <Button size="sm">Discover music</Button>
              </Link>
            }
          />
        ))}

      {section === "playlists" &&
        (data.playlists.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
            {data.playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No playlists yet"
            description="Create a playlist to start collecting tracks."
            icon={<ListMusic size={22} />}
            action={
              <Link to="/playlists">
                <Button size="sm">Go to playlists</Button>
              </Link>
            }
          />
        ))}

      {section === "following" &&
        (data.following.length > 0 ? (
          <ul className="surface-card divide-y divide-app-border/60 p-2">
            {data.following.map((person) => (
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
                      {person.bio || (person.role === "artist" ? "Artist" : "Listener")}
                    </p>
                  </div>
                  <Users size={15} className="shrink-0 text-app-muted" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="You are not following anyone yet"
            description="Follow artists and listeners to keep up with what they share."
            icon={<Users size={22} />}
            action={
              <Link to="/artists">
                <Button size="sm">Browse artists</Button>
              </Link>
            }
          />
        ))}
    </div>
  )
}

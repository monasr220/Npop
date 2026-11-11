import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { CalendarDays, LayoutDashboard, Settings, UserPlus, UserMinus, Users } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { useAsyncData } from "../hooks/useAsyncData"
import { api } from "../services/api"
import type { FollowCounts } from "../types"
import { formatCount, formatDate } from "../utils/format"
import { Avatar } from "../components/ui/Avatar"
import { Badge, VerifiedBadge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { EmptyState, ErrorState, PageLoader } from "../components/ui/Feedback"
import { PageHeader } from "../components/ui/PageHeader"
import { Tabs } from "../components/ui/Tabs"
import { AlbumCard } from "../components/music/AlbumCard"
import { TrackList } from "../components/music/TrackRow"

type Section = "tracks" | "albums" | "about"

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isAuthenticated } = useAuth()
  const { notify } = useToast()
  const [section, setSection] = useState<Section>("tracks")
  const [counts, setCounts] = useState<FollowCounts | null>(null)
  const [following, setFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)

  const { data, loading, error, reload } = useAsyncData(async () => {
    if (!id) throw new Error("Artist not found")
    const artist = await api.getArtist(id)
    const [tracks, albums] = await Promise.all([
      api.getArtistTracks(id),
      api.getArtistAlbums(id),
    ])
    let followCounts: FollowCounts | null = null
    let isFollowing = false
    if (artist.user_id) {
      followCounts = await api.getFollowCounts(artist.user_id).catch(() => null)
      if (user) {
        isFollowing = (await api.isFollowing(user.id, artist.user_id).catch(() => ({ following: false }))).following
      }
    }
    return { artist, tracks, albums, followCounts, isFollowing }
  }, [id, user?.id])

  useEffect(() => {
    if (data) {
      setCounts(data.followCounts)
      setFollowing(data.isFollowing)
    }
  }, [data])

  if (loading) return <PageLoader label="Loading artist…" />
  if (error || !data) {
    return <ErrorState message={error ?? "Artist not found."} onRetry={reload} />
  }

  const { artist, tracks, albums } = data
  const isOwner = Boolean(user && artist.user_id === user.id)

  async function toggleFollow() {
    if (!artist.user_id) return
    if (!isAuthenticated || !user) {
      notify("Sign in to follow artists", "info")
      return
    }
    setFollowBusy(true)
    try {
      if (following) {
        await api.unfollowUser(artist.user_id)
        setFollowing(false)
        setCounts((current) =>
          current ? { ...current, followers: Math.max(0, current.followers - 1) } : current
        )
        notify(`Unfollowed ${artist.name}`, "success")
      } else {
        await api.followUser(artist.user_id)
        setFollowing(true)
        setCounts((current) =>
          current ? { ...current, followers: current.followers + 1 } : current
        )
        notify(`Following ${artist.name}`, "success")
      }
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not update follow", "error")
    } finally {
      setFollowBusy(false)
    }
  }

  return (
    <div>
      <section className="surface-card overflow-hidden">
        <div
          aria-hidden="true"
          className="hero-wash h-28 w-full bg-app-raised sm:h-36"
        />
        <div className="-mt-12 flex flex-col gap-4 px-5 pb-6 sm:-mt-16 sm:flex-row sm:items-end sm:px-7">
          <Avatar
            name={artist.name}
            src={artist.image_url}
            size="xl"
            className="h-24 w-24 border-4 border-app-surface shadow-lift sm:h-32 sm:w-32"
          />
          <div className="min-w-0 flex-1 sm:pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">Artist</Badge>
              {artist.verified && <VerifiedBadge />}
            </div>
            <h1 className="mt-2 break-words font-display text-3xl font-semibold tracking-tight text-app-text sm:text-4xl">
              {artist.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-app-muted">
              <span className="inline-flex items-center gap-1.5">
                <Users size={14} /> {formatCount(counts?.followers ?? 0)} followers
              </span>
              <span>{formatCount(artist.monthly_listeners)} monthly listeners</span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={14} /> Joined {formatDate(artist.created_at)}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:pb-1">
            {isOwner ? (
              <>
                <Link to="/studio">
                  <Button icon={<LayoutDashboard size={16} />}>Artist studio</Button>
                </Link>
                <Link to="/settings#artist">
                  <Button variant="secondary" icon={<Settings size={16} />}>
                    Manage profile
                  </Button>
                </Link>
              </>
            ) : (
              artist.user_id && (
                <Button
                  variant={following ? "secondary" : "primary"}
                  loading={followBusy}
                  icon={following ? <UserMinus size={16} /> : <UserPlus size={16} />}
                  onClick={toggleFollow}
                >
                  {following ? "Following" : "Follow"}
                </Button>
              )
            )}
            {artist.user_id && (
              <Link to={`/users/${artist.user_id}`}>
                <Button variant="ghost">User profile</Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="mt-6">
        <Tabs
          value={section}
          onChange={setSection}
          tabs={[
            { value: "tracks", label: "Tracks", count: tracks.length },
            { value: "albums", label: "Albums", count: albums.length },
            { value: "about", label: "About" },
          ]}
          className="w-fit"
        />
      </div>

      <div className="mt-5">
        {section === "tracks" &&
          (tracks.length > 0 ? (
            <TrackList tracks={tracks} showAlbum />
          ) : (
            <EmptyState
              title="No tracks published yet"
              description={`${artist.name} has not published any tracks.`}
              icon="♪"
            />
          ))}

        {section === "albums" &&
          (albums.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
              {albums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No albums yet"
              description={`${artist.name} has not published an album or single.`}
              icon="◎"
            />
          ))}

        {section === "about" && (
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="surface-card p-5">
              <PageHeader title="About" className="mb-3" />
              <p className="whitespace-pre-wrap text-sm leading-7 text-app-muted">
                {artist.bio || "This artist has not written a biography yet."}
              </p>
            </div>
            <div className="surface-card p-5">
              <h2 className="text-sm font-semibold text-app-text">At a glance</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-app-muted">Monthly listeners</dt>
                  <dd className="font-semibold tabular-nums text-app-text">
                    {formatCount(artist.monthly_listeners)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-app-muted">Followers</dt>
                  <dd className="font-semibold tabular-nums text-app-text">
                    {formatCount(counts?.followers ?? 0)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-app-muted">Tracks</dt>
                  <dd className="font-semibold tabular-nums text-app-text">{tracks.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-app-muted">Releases</dt>
                  <dd className="font-semibold tabular-nums text-app-text">{albums.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-app-muted">Verified</dt>
                  <dd className="font-semibold text-app-text">
                    {artist.verified ? "Yes" : "Not yet"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

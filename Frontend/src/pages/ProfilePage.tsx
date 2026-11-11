import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  CalendarDays,
  Heart,
  Link2,
  ListMusic,
  Settings,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { useAsyncData } from "../hooks/useAsyncData"
import { api } from "../services/api"
import type { FollowCounts } from "../types"
import { formatCount, formatDate } from "../utils/format"
import { safeExternalUrl } from "../utils/url"
import { Avatar } from "../components/ui/Avatar"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { EmptyState, ErrorState, PageLoader } from "../components/ui/Feedback"
import { Tabs } from "../components/ui/Tabs"
import { PlaylistCard } from "../components/music/PlaylistCard"
import { TrackList } from "../components/music/TrackRow"
import { PostCard } from "../components/social/PostCard"

type Section = "posts" | "playlists" | "favorites" | "history" | "about"

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { user, isAuthenticated } = useAuth()
  const { notify } = useToast()
  const [section, setSection] = useState<Section>("posts")
  const [counts, setCounts] = useState<FollowCounts | null>(null)
  const [following, setFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)

  const { data, loading, error, reload } = useAsyncData(async () => {
    if (!id) throw new Error("Profile not found")
    const [music, pictures, covers, socialLinks, followCounts] = await Promise.all([
      api.getProfileMusic(id),
      api.getProfilePictures(id).catch(() => []),
      api.getCoverPhotos(id).catch(() => []),
      api.getSocialLinks(id).catch(() => []),
      api.getFollowCounts(id).catch(() => ({ followers: 0, followings: 0 })),
    ])
    let isFollowing = false
    if (user && user.id !== id) {
      isFollowing = (await api.isFollowing(user.id, id).catch(() => ({ following: false })))
        .following
    }
    return {
      music,
      avatar:
        pictures.length > 0 ? pictures[pictures.length - 1].image_url : null,
      cover: covers.length > 0 ? covers[covers.length - 1].image_url : null,
      socialLinks,
      followCounts,
      isFollowing,
    }
  }, [id, user?.id])

  useEffect(() => {
    if (data) {
      setCounts(data.followCounts)
      setFollowing(data.isFollowing)
    }
  }, [data])

  if (loading) return <PageLoader label="Loading profile…" />
  if (error || !data) {
    return <ErrorState message={error ?? "Profile not found."} onRetry={reload} />
  }

  const { music, avatar, cover, socialLinks } = data
  const profile = music.user
  const isOwner = Boolean(user && user.id === profile.id)

  async function toggleFollow() {
    if (!profile.id) return
    if (!isAuthenticated) {
      notify("Sign in to follow listeners", "info")
      return
    }
    setFollowBusy(true)
    try {
      if (following) {
        await api.unfollowUser(profile.id)
        setFollowing(false)
        setCounts((current) =>
          current ? { ...current, followers: Math.max(0, current.followers - 1) } : current
        )
      } else {
        await api.followUser(profile.id)
        setFollowing(true)
        setCounts((current) =>
          current ? { ...current, followers: current.followers + 1 } : current
        )
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
          className="hero-wash h-32 w-full bg-app-raised sm:h-44"
          style={
            cover
              ? { backgroundImage: `url("${cover}")`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        />
        <div className="-mt-12 flex flex-col gap-4 px-5 pb-6 sm:-mt-14 sm:flex-row sm:items-end sm:px-7">
          <Avatar
            name={profile.username}
            src={avatar}
            size="xl"
            className="h-24 w-24 border-4 border-app-surface shadow-lift sm:h-28 sm:w-28"
          />
          <div className="min-w-0 flex-1 sm:pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={profile.role === "artist" ? "primary" : "neutral"}>
                {profile.role === "artist" ? "Artist" : "Listener"}
              </Badge>
              {profile.role === "admin" && <Badge variant="success">Administrator</Badge>}
            </div>
            <h1 className="mt-2 break-words font-display text-3xl font-semibold tracking-tight text-app-text sm:text-4xl">
              {profile.username}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-app-muted">
              <span className="inline-flex items-center gap-1.5">
                <Users size={14} /> {formatCount(counts?.followers ?? 0)} followers
              </span>
              <span>{formatCount(counts?.followings ?? 0)} following</span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={14} /> Joined {formatDate(profile.created_at)}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:pb-1">
            {isOwner ? (
              <Link to="/settings">
                <Button variant="secondary" icon={<Settings size={16} />}>
                  Edit profile
                </Button>
              </Link>
            ) : (
              <Button
                variant={following ? "secondary" : "primary"}
                loading={followBusy}
                icon={following ? <UserMinus size={16} /> : <UserPlus size={16} />}
                onClick={toggleFollow}
              >
                {following ? "Following" : "Follow"}
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="mt-6">
        <Tabs
          value={section}
          onChange={setSection}
          tabs={[
            { value: "posts", label: "Posts" },
            { value: "playlists", label: "Playlists", count: music.playlists.length },
            { value: "favorites", label: "Favorites", count: music.favorite_tracks.length },
            { value: "history", label: "History" },
            { value: "about", label: "About" },
          ]}
          className="w-fit"
        />
      </div>

      <div className="mt-5">
        {section === "posts" && (
          <ProfilePosts userId={profile.id} />
        )}

        {section === "playlists" && (
          music.playlists.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
              {music.playlists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No playlists yet"
              description={
                isOwner
                  ? "Create a playlist from the Playlists page and it will show here."
                  : `${profile.username} has not created a playlist yet.`
              }
              icon={<ListMusic size={22} />}
            />
          )
        )}

        {section === "favorites" && (
          music.favorite_tracks.length > 0 ? (
            <TrackList tracks={music.favorite_tracks} showAlbum />
          ) : (
            <EmptyState
              title="No favorites yet"
              description={
                isOwner
                  ? "Favorite a track from its page to build your collection."
                  : `${profile.username} has not favorited any tracks yet.`
              }
              icon={<Heart size={22} />}
            />
          )
        )}

        {section === "history" && (
          music.recently_played.length > 0 ? (
            <TrackList
              tracks={music.recently_played}
              title="Recently played"
              subtitle="The latest listens on this profile."
              showAlbum
            />
          ) : (
            <EmptyState
              title="No listening history"
              description="Tracks played while signed in are recorded here."
              icon="♪"
            />
          )
        )}

        {section === "about" && (
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="surface-card p-5">
              <h2 className="text-sm font-semibold text-app-text">Bio</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-app-muted">
                {profile.bio || "This listener has not written a bio yet."}
              </p>
            </div>
            <div className="surface-card p-5">
              <h2 className="text-sm font-semibold text-app-text">Links</h2>
              {socialLinks.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {socialLinks.map((link) => {
                    const href = safeExternalUrl(link.link)
                    if (!href) return null
                    return (
                      <li key={link.id}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-2 break-all text-brand-primary hover:underline"
                        >
                          <Link2 size={14} /> {link.link}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-app-muted">
                  No external links shared.
                </p>
              )}
              <dl className="mt-5 space-y-2 border-t border-app-border pt-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-app-muted">Favorites</dt>
                  <dd className="font-semibold tabular-nums text-app-text">
                    {music.favorite_tracks.length}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-app-muted">Playlists</dt>
                  <dd className="font-semibold tabular-nums text-app-text">
                    {music.playlists.length}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-app-muted">Followers</dt>
                  <dd className="font-semibold tabular-nums text-app-text">
                    {formatCount(counts?.followers ?? 0)}
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

function ProfilePosts({ userId }: { userId: string }) {
  const { data, loading, error, reload } = useAsyncData(
    () => api.getPosts(userId, 0, 30),
    [userId]
  )

  if (loading) return <PageLoader label="Loading posts…" />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No posts yet"
        description="Posts shared by this listener will appear here."
        icon="✎"
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {data.map((post) => (
        <PostCard key={post.id} post={post} onChanged={reload} />
      ))}
    </div>
  )
}

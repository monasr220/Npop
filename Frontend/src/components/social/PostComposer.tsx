import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { ImagePlus, Loader2, Music2, Send, X } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { useDebouncedValue } from "../../hooks/useAsyncData"
import { useProfilePicture } from "../../hooks/useProfilePicture"
import { api } from "../../services/api"
import type { Post, Track } from "../../types"
import { Avatar } from "../ui/Avatar"
import { Button } from "../ui/Button"
import { Input } from "../ui/Field"
import { TrackAttachment } from "../music/TrackAttachment"

export function PostComposer({ onCreated }: { onCreated?: (post: Post) => void }) {
  const { user, isAuthenticated } = useAuth()
  const { notify } = useToast()
  const avatar = useProfilePicture(user?.id)

  const [content, setContent] = useState("")
  const [image, setImage] = useState("")
  const [video, setVideo] = useState("")
  const [showMedia, setShowMedia] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [showTrackSearch, setShowTrackSearch] = useState(false)
  const [trackQuery, setTrackQuery] = useState("")
  const [results, setResults] = useState<Track[]>([])
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const debouncedQuery = useDebouncedValue(trackQuery, 300)

  useEffect(() => {
    const query = debouncedQuery.trim()
    if (!query) {
      setResults([])
      setSearching(false)
      return
    }
    let active = true
    setSearching(true)
    api
      .getTracks({ q: query, limit: 5 })
      .then((tracks) => {
        if (active) setResults(tracks)
      })
      .catch(() => {
        if (active) setResults([])
      })
      .finally(() => {
        if (active) setSearching(false)
      })
    return () => {
      active = false
    }
  }, [debouncedQuery])

  if (!isAuthenticated) {
    return (
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-app-muted">
          Sign in to share what you are listening to and join the conversation.
        </p>
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
      </div>
    )
  }

  const hasBody = Boolean(
    content.trim() || image.trim() || video.trim() || selectedTrack
  )

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!hasBody || submitting) return
    setSubmitting(true)
    try {
      const post = await api.createPost({
        content: content.trim() || null,
        image: image.trim() || null,
        video: video.trim() || null,
        track_id: selectedTrack?.id ?? null,
      })
      setContent("")
      setImage("")
      setVideo("")
      setSelectedTrack(null)
      setShowMedia(false)
      notify("Post published", "success")
      onCreated?.(post)
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not publish post", "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card p-4">
      <div className="flex gap-3">
        <Avatar name={user?.username ?? "You"} src={avatar} size="md" />
        <div className="min-w-0 flex-1">
          <label htmlFor="composer-content" className="sr-only">
            Write a post
          </label>
          <textarea
            id="composer-content"
            value={content}
            maxLength={1024}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Share a track, a thought, or what you are listening to…"
            className="min-h-[84px] w-full resize-y rounded-xl border border-app-strong bg-app-raised px-3.5 py-3 text-sm text-app-text placeholder:text-app-muted/70 focus:border-brand-primary/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
          />
          <div className="mt-1 flex justify-end text-[0.7rem] tabular-nums text-app-muted">
            {content.length}/1024
          </div>

          {selectedTrack && (
            <div className="relative">
              <TrackAttachment track={selectedTrack} />
              <button
                type="button"
                aria-label="Remove attached track"
                onClick={() => setSelectedTrack(null)}
                className="absolute right-2 top-2 rounded-full bg-app-surface p-1 text-app-muted hover:text-app-text"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {showMedia && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Input
                value={image}
                onChange={(event) => setImage(event.target.value)}
                placeholder="Image URL (https://…)"
                aria-label="Image URL"
              />
              <Input
                value={video}
                onChange={(event) => setVideo(event.target.value)}
                placeholder="Video URL (https://…)"
                aria-label="Video URL"
              />
            </div>
          )}

          {showTrackSearch && (
            <div className="mt-3">
              <div className="relative">
                <Input
                  autoFocus
                  value={trackQuery}
                  onChange={(event) => setTrackQuery(event.target.value)}
                  placeholder="Search a track to attach…"
                  aria-label="Search tracks to attach"
                />
                {searching && (
                  <Loader2
                    size={16}
                    className="absolute right-3 top-3 animate-spin text-app-muted"
                  />
                )}
              </div>
              {results.length > 0 && (
                <ul className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-app-border bg-app-surface p-1.5">
                  {results.map((track) => (
                    <li key={track.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTrack(track)
                          setTrackQuery("")
                          setResults([])
                          setShowTrackSearch(false)
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-app-raised"
                      >
                        <Music2 size={14} className="shrink-0 text-brand-primary" />
                        <span className="min-w-0 flex-1 truncate text-app-text">
                          {track.title}
                        </span>
                        <span className="shrink-0 text-xs text-app-muted">
                          {track.artist?.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!searching && debouncedQuery.trim() && results.length === 0 && (
                <p className="mt-2 text-xs text-app-muted">No tracks found.</p>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                icon={<Music2 size={15} />}
                onClick={() => {
                  setShowTrackSearch((value) => !value)
                  setTrackQuery("")
                  setResults([])
                }}
              >
                Track
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<ImagePlus size={15} />}
                onClick={() => setShowMedia((value) => !value)}
              >
                Media
              </Button>
            </div>
            <Button
              type="submit"
              size="sm"
              loading={submitting}
              disabled={!hasBody}
              icon={<Send size={15} />}
            >
              Publish
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

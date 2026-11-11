import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Music2, Pencil, Search, Trash2, Upload } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { useAsyncData } from "../hooks/useAsyncData"
import { api } from "../services/api"
import type { Album, Track } from "../types"
import { Button } from "../components/ui/Button"
import { ConfirmDialog } from "../components/ui/ConfirmDialog"
import { EmptyState, ErrorState, PageLoader } from "../components/ui/Feedback"
import { Field, Input, Select } from "../components/ui/Field"
import { Modal } from "../components/ui/Modal"
import { PageHeader } from "../components/ui/PageHeader"
import { TrackRow } from "../components/music/TrackRow"

export default function ArtistMusicPage() {
  const { artist } = useAuth()
  const { notify } = useToast()
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<Track | null>(null)
  const [deleting, setDeleting] = useState<Track | null>(null)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [albumId, setAlbumId] = useState("")
  const [trackNumber, setTrackNumber] = useState(1)
  const [explicit, setExplicit] = useState(false)
  const [audioUrl, setAudioUrl] = useState("")

  const { data, loading, error, reload } = useAsyncData(
    async () => {
      if (!artist) return null
      const [tracks, albums] = await Promise.all([
        api.getArtistTracks(artist.id),
        api.getArtistAlbums(artist.id),
      ])
      return { tracks, albums }
    },
    [artist?.id],
    { enabled: Boolean(artist) }
  )

  useEffect(() => {
    if (editing) {
      setTitle(editing.title)
      setAlbumId(editing.album_id)
      setTrackNumber(editing.track_number)
      setExplicit(editing.explicit)
      setAudioUrl(editing.audio_url)
    }
  }, [editing])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return data?.tracks ?? []
    return (data?.tracks ?? []).filter(
      (track) =>
        track.title.toLowerCase().includes(needle) ||
        (track.album?.title ?? "").toLowerCase().includes(needle)
    )
  }, [data?.tracks, query])

  if (!artist) {
    return (
      <EmptyState
        title="Artist profile required"
        description="Create an artist profile to manage music."
        icon={<Music2 size={22} />}
        action={
          <Link to="/settings">
            <Button size="sm">Open settings</Button>
          </Link>
        }
      />
    )
  }

  if (loading) return <PageLoader label="Loading your music…" />
  if (error || !data) {
    return <ErrorState message={error ?? "Music could not be loaded."} onRetry={reload} />
  }

  const albumOptions: Album[] = data.albums

  async function saveTrack() {
    if (!editing) return
    if (!title.trim()) {
      notify("Track title is required", "error")
      return
    }
    setSaving(true)
    try {
      await api.updateTrack(editing.id, {
        title: title.trim(),
        album_id: albumId,
        track_number: trackNumber,
        explicit,
        audio_url: audioUrl.trim(),
      })
      setEditing(null)
      reload()
      notify("Track updated", "success")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not update track", "error")
    } finally {
      setSaving(false)
    }
  }

  async function deleteTrack() {
    if (!deleting) return
    setSaving(true)
    try {
      await api.deleteTrack(deleting.id)
      setDeleting(null)
      reload()
      notify("Track deleted", "success")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not delete track", "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Artist studio"
        title="My music"
        subtitle="Edit metadata, move tracks between releases, or remove music from your catalogue."
        actions={
          <Link to="/studio/upload">
            <Button icon={<Upload size={16} />}>Upload track</Button>
          </Link>
        }
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
            placeholder="Search your tracks…"
            aria-label="Search your tracks"
            className="h-11 w-full rounded-full border border-app-strong bg-app-surface pl-9 pr-3 text-sm text-app-text placeholder:text-app-muted/70 focus:border-brand-primary/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <span className="text-sm text-app-muted">
          {data.tracks.length} {data.tracks.length === 1 ? "track" : "tracks"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? "No tracks match your search" : "No tracks yet"}
          description={
            query
              ? "Try a different title or clear the search."
              : "Create a release first, then upload your first track."
          }
          icon={<Music2 size={22} />}
          action={
            !query ? (
              <Link to="/studio/upload">
                <Button size="sm" icon={<Upload size={14} />}>
                  Upload track
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="surface-card divide-y divide-app-border/60 p-2">
          {filtered.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index}
              queue={filtered}
              showAlbum
              actions={
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(track)}
                    aria-label={`Edit ${track.title}`}
                    className="rounded-full p-1.5 text-app-muted hover:bg-app-surface hover:text-app-text"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(track)}
                    aria-label={`Delete ${track.title}`}
                    className="rounded-full p-1.5 text-app-muted hover:bg-brand-social/10 hover:text-brand-social"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        title="Edit track"
        description="Update how this track appears across Npop."
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={saveTrack}>
              Save track
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Title" htmlFor="edit-track-title" required>
            <Input
              id="edit-track-title"
              value={title}
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Album" htmlFor="edit-track-album">
              <Select
                id="edit-track-album"
                value={albumId}
                onChange={(event) => setAlbumId(event.target.value)}
              >
                {albumOptions.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Track number" htmlFor="edit-track-number">
              <Input
                id="edit-track-number"
                type="number"
                min={1}
                value={trackNumber}
                onChange={(event) => setTrackNumber(Number(event.target.value) || 1)}
              />
            </Field>
          </div>
          <Field
            label="Audio URL"
            htmlFor="edit-track-audio"
            hint="A directly hosted audio file. Uploading a new file is done from the upload page."
          >
            <Input
              id="edit-track-audio"
              value={audioUrl}
              onChange={(event) => setAudioUrl(event.target.value)}
              placeholder="https://…"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-app-text">
            <input
              type="checkbox"
              checked={explicit}
              onChange={(event) => setExplicit(event.target.checked)}
              className="h-4 w-4 accent-brand-primary"
            />
            Explicit content
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete “${deleting?.title ?? "track"}”?`}
        description="The track will be removed from your catalogue, playlists and profiles. This cannot be undone."
        confirmLabel="Delete track"
        loading={saving}
        onConfirm={deleteTrack}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}

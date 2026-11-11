import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ArrowDown,
  ArrowUp,
  ListMusic,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { usePlayer } from "../context/PlayerContext"
import { useToast } from "../context/ToastContext"
import { useAsyncData, useDebouncedValue } from "../hooks/useAsyncData"
import { api } from "../services/api"
import type { Track } from "../types"
import { Button } from "../components/ui/Button"
import { ConfirmDialog } from "../components/ui/ConfirmDialog"
import { Dropdown, DropdownItem } from "../components/ui/Dropdown"
import { EmptyState, ErrorState, PageLoader } from "../components/ui/Feedback"
import { Field, Input, Textarea } from "../components/ui/Field"
import { Modal } from "../components/ui/Modal"
import { CoverArt } from "../components/music/CoverArt"
import { TrackRow } from "../components/music/TrackRow"

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { notify } = useToast()
  const player = usePlayer()

  const { data, loading, error, reload } = useAsyncData(async () => {
    if (!id) throw new Error("Playlist not found")
    return api.getPlaylist(id)
  }, [id])

  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [coverUrl, setCoverUrl] = useState("")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Track[]>([])
  const [searching, setSearching] = useState(false)
  const debounced = useDebouncedValue(query, 300)

  const isOwner = Boolean(data && user && data.owner_id === user.id && !data.is_system)
  const entries = data ? [...data.entries].sort((a, b) => a.position - b.position) : []
  const tracks = entries
    .map((entry) => entry.track)
    .filter((track): track is Track => Boolean(track))

  useEffect(() => {
    if (data) {
      setName(data.name)
      setDescription(data.description ?? "")
      setCoverUrl(data.cover_url ?? "")
    }
  }, [data])

  useEffect(() => {
    const search = debounced.trim()
    if (!addOpen || !search) {
      setResults([])
      setSearching(false)
      return
    }
    let active = true
    setSearching(true)
    api
      .getTracks({ q: search, limit: 10 })
      .then((found) => {
        if (active) setResults(found)
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
  }, [debounced, addOpen])

  if (loading) return <PageLoader label="Loading playlist…" />
  if (error || !data) {
    return <ErrorState message={error ?? "Playlist not found."} onRetry={reload} />
  }

  async function saveDetails() {
    if (!id) return
    setSaving(true)
    try {
      await api.updatePlaylist(id, {
        name: name.trim(),
        description: description.trim(),
        cover_url: coverUrl.trim(),
      })
      setEditOpen(false)
      reload()
      notify("Playlist updated", "success")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not update playlist", "error")
    } finally {
      setSaving(false)
    }
  }

  async function removePlaylist() {
    if (!id) return
    setSaving(true)
    try {
      await api.deletePlaylist(id)
      notify("Playlist deleted", "success")
      navigate("/playlists")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not delete playlist", "error")
    } finally {
      setSaving(false)
      setDeleteOpen(false)
    }
  }

  async function addTrack(track: Track) {
    if (!id) return
    try {
      await api.addTrackToPlaylist(id, track.id)
      setQuery("")
      setResults([])
      setAddOpen(false)
      reload()
      notify(`Added ${track.title}`, "success")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not add track", "error")
    }
  }

  async function removeTrack(track: Track) {
    if (!id) return
    try {
      await api.removeTrackFromPlaylist(id, track.id)
      reload()
      notify("Track removed", "success")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not remove track", "error")
    }
  }

  async function moveTrack(index: number, direction: -1 | 1) {
    if (!id) return
    const target = index + direction
    if (target < 0 || target >= tracks.length) return
    const reordered = [...tracks]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(target, 0, moved)
    try {
      await api.reorderPlaylistTracks(
        id,
        reordered.map((track) => track.id)
      )
      reload()
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not reorder tracks", "error")
    }
  }

  const isCurrentQueue =
    tracks.length > 0 && tracks.some((track) => player.isCurrent(track.id))

  return (
    <div className="space-y-8">
      <section className="surface-card overflow-hidden">
        <div className="grid gap-6 p-5 sm:grid-cols-[minmax(180px,260px)_1fr] sm:p-7">
          <CoverArt
            src={data.cover_url}
            seed={data.name}
            alt={`${data.name} cover`}
            className="mx-auto w-full max-w-[260px] rounded-2xl shadow-lift"
            iconSize={44}
          />
          <div className="flex min-w-0 flex-col justify-end">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brand-primary">
              {data.is_system ? "Npop playlist" : "Playlist"}
            </p>
            <h1 className="mt-2 break-words font-display text-3xl font-semibold tracking-tight text-app-text sm:text-4xl">
              {data.name}
            </h1>
            {data.description && (
              <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-app-muted">
                {data.description}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {tracks.length > 0 && (
                <Button
                  icon={<ListMusic size={16} />}
                  onClick={() =>
                    isCurrentQueue ? player.toggle() : player.playQueue(tracks, 0)
                  }
                >
                  {isCurrentQueue && player.isPlaying ? "Pause playlist" : "Play playlist"}
                </Button>
              )}
              {isOwner && (
                <>
                  <Button
                    variant="secondary"
                    icon={<Plus size={16} />}
                    onClick={() => setAddOpen(true)}
                  >
                    Add tracks
                  </Button>
                  <Dropdown
                    label="Playlist actions"
                    trigger={({ toggle }) => (
                      <Button
                        variant="ghost"
                        onClick={toggle}
                        aria-label="Playlist actions"
                        icon={<Pencil size={16} />}
                      >
                        Edit
                      </Button>
                    )}
                  >
                    <DropdownItem onClick={() => setEditOpen(true)}>
                      <Pencil size={15} /> Edit details
                    </DropdownItem>
                    <DropdownItem danger onClick={() => setDeleteOpen(true)}>
                      <Trash2 size={15} /> Delete playlist
                    </DropdownItem>
                  </Dropdown>
                </>
              )}
            </div>

            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-app-muted">Tracks</dt>
                <dd className="font-semibold tabular-nums text-app-text">{tracks.length}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-app-muted">Owner</dt>
                <dd className="font-semibold text-app-text">
                  {data.is_system ? "Npop" : "You"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {tracks.length === 0 ? (
        <EmptyState
          title="This playlist is empty"
          description={
            isOwner
              ? "Add tracks from here or from any track page to get started."
              : "The owner has not added any tracks yet."
          }
          icon={<ListMusic size={22} />}
          action={
            isOwner ? (
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
                Add tracks
              </Button>
            ) : undefined
          }
        />
      ) : (
        <section>
          <h2 className="mb-2 text-lg font-semibold tracking-tight text-app-text">
            Track listing
          </h2>
          <div className="surface-card divide-y divide-app-border/60 p-2">
            {tracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                index={index}
                queue={tracks}
                showAlbum
                actions={
                  isOwner ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        aria-label={`Move ${track.title} up`}
                        disabled={index === 0}
                        onClick={() => moveTrack(index, -1)}
                        className="rounded-full p-1.5 text-app-muted hover:bg-app-surface hover:text-app-text disabled:opacity-30"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${track.title} down`}
                        disabled={index === tracks.length - 1}
                        onClick={() => moveTrack(index, 1)}
                        className="rounded-full p-1.5 text-app-muted hover:bg-app-surface hover:text-app-text disabled:opacity-30"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${track.title}`}
                        onClick={() => removeTrack(track)}
                        className="rounded-full p-1.5 text-app-muted hover:bg-brand-social/10 hover:text-brand-social"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : undefined
                }
              />
            ))}
          </div>
        </section>
      )}

      <Modal
        open={editOpen}
        title="Edit playlist"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={saveDetails}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Name" htmlFor="edit-playlist-name" required>
            <Input
              id="edit-playlist-name"
              value={name}
              maxLength={200}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Description" htmlFor="edit-playlist-description">
            <Textarea
              id="edit-playlist-description"
              value={description}
              maxLength={1024}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-[72px]"
            />
          </Field>
          <Field label="Cover image URL" htmlFor="edit-playlist-cover">
            <Input
              id="edit-playlist-cover"
              value={coverUrl}
              onChange={(event) => setCoverUrl(event.target.value)}
              placeholder="https://…"
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={addOpen}
        title="Add tracks"
        description="Search the Npop catalogue and add a track to this playlist."
        onClose={() => setAddOpen(false)}
      >
        <div className="relative">
          <Search
            size={17}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-muted"
          />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tracks…"
            aria-label="Search tracks"
            className="pl-9"
          />
          {searching && (
            <Loader2
              size={16}
              className="absolute right-3 top-3 animate-spin text-app-muted"
            />
          )}
        </div>
        <div className="mt-3 max-h-[340px] overflow-y-auto">
          {results.length > 0 ? (
            <ul className="space-y-1">
              {results.map((track) => (
                <li key={track.id}>
                  <button
                    type="button"
                    onClick={() => addTrack(track)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-app-raised"
                  >
                    <span className="min-w-0 flex-1 truncate text-app-text">
                      {track.title}
                    </span>
                    <span className="shrink-0 text-xs text-app-muted">
                      {track.artist?.name ?? "Unknown artist"}
                    </span>
                    <Plus size={14} className="shrink-0 text-brand-primary" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 py-6 text-center text-sm text-app-muted">
              {query.trim()
                ? searching
                  ? "Searching…"
                  : "No tracks found."
                : "Start typing to search the catalogue."}
            </p>
          )}
        </div>
        <p className="mt-2 text-xs text-app-muted">
          Looking for something else?{" "}
          <Link to="/search" className="font-semibold text-brand-primary hover:underline">
            Use global search
          </Link>
          .
        </p>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this playlist?"
        description={`"${data.name}" and its track list will be removed. Tracks themselves are not deleted.`}
        confirmLabel="Delete playlist"
        loading={saving}
        onConfirm={removePlaylist}
        onCancel={() => setDeleteOpen(false)}
      />

      {!isAuthenticated && (
        <p className="text-sm text-app-muted">
          <Link to="/login" className="font-semibold text-brand-primary hover:underline">
            Sign in
          </Link>{" "}
          to create and manage your own playlists.
        </p>
      )}
    </div>
  )
}

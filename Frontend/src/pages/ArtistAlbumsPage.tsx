import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Disc3, ImagePlus, Music2, Pencil, Plus, Trash2 } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { useAsyncData } from "../hooks/useAsyncData"
import { api } from "../services/api"
import type { Album } from "../types"
import { Button } from "../components/ui/Button"
import { ConfirmDialog } from "../components/ui/ConfirmDialog"
import { EmptyState, ErrorState, PageLoader } from "../components/ui/Feedback"
import { Field, Input, Select } from "../components/ui/Field"
import { Modal } from "../components/ui/Modal"
import { PageHeader } from "../components/ui/PageHeader"
import { CoverArt } from "../components/music/CoverArt"

const KINDS = ["album", "ep", "single", "compilation"]

export default function ArtistAlbumsPage() {
  const { artist } = useAuth()
  const { notify } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Album | null>(null)
  const [deleting, setDeleting] = useState<Album | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [releaseYear, setReleaseYear] = useState(new Date().getFullYear())
  const [kind, setKind] = useState("album")
  const [coverUrl, setCoverUrl] = useState("")

  const { data, loading, error, reload } = useAsyncData(
    async () => {
      if (!artist) return null
      const [albums, tracks] = await Promise.all([
        api.getArtistAlbums(artist.id),
        api.getArtistTracks(artist.id),
      ])
      return { albums, tracks }
    },
    [artist?.id],
    { enabled: Boolean(artist) }
  )

  useEffect(() => {
    if (editing) {
      setTitle(editing.title)
      setReleaseYear(editing.release_year || new Date().getFullYear())
      setKind(editing.kind || "album")
      setCoverUrl(editing.cover_url)
    }
  }, [editing])

  if (!artist) {
    return (
      <EmptyState
        title="Artist profile required"
        description="Create an artist profile to manage albums."
        icon={<Disc3 size={22} />}
        action={
          <Link to="/settings">
            <Button size="sm">Open settings</Button>
          </Link>
        }
      />
    )
  }

  if (loading) return <PageLoader label="Loading your releases…" />
  if (error || !data) {
    return <ErrorState message={error ?? "Releases could not be loaded."} onRetry={reload} />
  }

  function openCreate() {
    setTitle("")
    setReleaseYear(new Date().getFullYear())
    setKind("album")
    setCoverUrl("")
    setCreateOpen(true)
  }

  async function createAlbum() {
    if (!title.trim()) {
      notify("Release title is required", "error")
      return
    }
    setSaving(true)
    try {
      await api.createAlbum({
        title: title.trim(),
        artist_id: artist!.id,
        release_year: releaseYear,
        kind,
        cover_url: coverUrl.trim(),
      })
      setCreateOpen(false)
      reload()
      notify("Release created", "success")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not create release", "error")
    } finally {
      setSaving(false)
    }
  }

  async function saveAlbum() {
    if (!editing) return
    if (!title.trim()) {
      notify("Release title is required", "error")
      return
    }
    setSaving(true)
    try {
      await api.updateAlbum(editing.id, {
        title: title.trim(),
        release_year: releaseYear,
        kind,
        cover_url: coverUrl.trim(),
      })
      setEditing(null)
      reload()
      notify("Release updated", "success")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not update release", "error")
    } finally {
      setSaving(false)
    }
  }

  async function deleteAlbum() {
    if (!deleting) return
    setSaving(true)
    try {
      await api.deleteAlbum(deleting.id)
      setDeleting(null)
      reload()
      notify("Release deleted", "success")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not delete release", "error")
    } finally {
      setSaving(false)
    }
  }

  async function uploadCover(album: Album, file: File | undefined) {
    if (!file) return
    setUploadingId(album.id)
    try {
      await api.uploadAlbumCover(album.id, file)
      reload()
      notify("Cover updated", "success")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not upload cover", "error")
    } finally {
      setUploadingId(null)
    }
  }

  const tracksByAlbum = new Map<string, number>()
  for (const track of data.tracks) {
    tracksByAlbum.set(track.album_id, (tracksByAlbum.get(track.album_id) ?? 0) + 1)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Artist studio"
        title="My albums"
        subtitle="Every track belongs to a release. Create an album, EP or single, then add music to it."
        actions={
          <Button icon={<Plus size={16} />} onClick={openCreate}>
            New release
          </Button>
        }
      />

      {data.albums.length === 0 ? (
        <EmptyState
          title="No releases yet"
          description="Create your first album or single to start uploading tracks."
          icon={<Disc3 size={22} />}
          action={
            <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>
              Create release
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {data.albums.map((album) => (
            <li key={album.id} className="surface-card flex flex-wrap items-center gap-4 p-4">
              <CoverArt
                src={album.cover_url}
                seed={album.title}
                alt={`${album.title} cover`}
                className="h-20 w-20"
                iconSize={22}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-app-text">
                  {album.title}
                </p>
                <p className="mt-0.5 text-sm text-app-muted">
                  {album.kind} · {album.release_year || "No year"} ·{" "}
                  {tracksByAlbum.get(album.id) ?? 0}{" "}
                  {(tracksByAlbum.get(album.id) ?? 0) === 1 ? "track" : "tracks"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link to={`/albums/${album.id}`}>
                    <Button variant="ghost" size="sm">
                      View page
                    </Button>
                  </Link>
                  <Link to="/studio/music">
                    <Button variant="ghost" size="sm" icon={<Music2 size={14} />}>
                      Manage tracks
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-app-strong bg-app-raised px-3 py-1.5 text-xs font-semibold text-app-text hover:border-brand-primary/60">
                  {uploadingId === album.id ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <ImagePlus size={14} />
                  )}
                  Cover
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      void uploadCover(album, event.target.files?.[0])
                      event.target.value = ""
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setEditing(album)}
                  aria-label={`Edit ${album.title}`}
                  className="rounded-full p-1.5 text-app-muted hover:bg-app-raised hover:text-app-text"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(album)}
                  aria-label={`Delete ${album.title}`}
                  className="rounded-full p-1.5 text-app-muted hover:bg-brand-social/10 hover:text-brand-social"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={createOpen}
        title="Create a release"
        description="Give the release a title and type. You can add tracks and artwork next."
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={createAlbum}>
              Create release
            </Button>
          </>
        }
      >
        <AlbumFields
          title={title}
          setTitle={setTitle}
          releaseYear={releaseYear}
          setReleaseYear={setReleaseYear}
          kind={kind}
          setKind={setKind}
          coverUrl={coverUrl}
          setCoverUrl={setCoverUrl}
          idPrefix="create"
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        title="Edit release"
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={saveAlbum}>
              Save release
            </Button>
          </>
        }
      >
        <AlbumFields
          title={title}
          setTitle={setTitle}
          releaseYear={releaseYear}
          setReleaseYear={setReleaseYear}
          kind={kind}
          setKind={setKind}
          coverUrl={coverUrl}
          setCoverUrl={setCoverUrl}
          idPrefix="edit"
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete “${deleting?.title ?? "release"}”?`}
        description="Tracks that belong to this release may also be removed. This cannot be undone."
        confirmLabel="Delete release"
        loading={saving}
        onConfirm={deleteAlbum}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}

function AlbumFields({
  title,
  setTitle,
  releaseYear,
  setReleaseYear,
  kind,
  setKind,
  coverUrl,
  setCoverUrl,
  idPrefix,
}: {
  title: string
  setTitle: (value: string) => void
  releaseYear: number
  setReleaseYear: (value: number) => void
  kind: string
  setKind: (value: string) => void
  coverUrl: string
  setCoverUrl: (value: string) => void
  idPrefix: string
}) {
  return (
    <div className="grid gap-4">
      <Field label="Title" htmlFor={`${idPrefix}-album-title`} required>
        <Input
          id={`${idPrefix}-album-title`}
          value={title}
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Release title"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor={`${idPrefix}-album-kind`}>
          <Select
            id={`${idPrefix}-album-kind`}
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            {KINDS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Release year" htmlFor={`${idPrefix}-album-year`}>
          <Input
            id={`${idPrefix}-album-year`}
            type="number"
            min={0}
            max={9999}
            value={releaseYear}
            onChange={(event) => setReleaseYear(Number(event.target.value) || 0)}
          />
        </Field>
      </div>
      <Field
        label="Cover image URL"
        htmlFor={`${idPrefix}-album-cover`}
        hint="Optional. You can also upload a cover file from the release list."
      >
        <Input
          id={`${idPrefix}-album-cover`}
          value={coverUrl}
          onChange={(event) => setCoverUrl(event.target.value)}
          placeholder="https://…"
        />
      </Field>
    </div>
  )
}

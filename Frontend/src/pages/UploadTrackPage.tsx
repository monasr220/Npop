import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { CheckCircle2, Disc3, FileAudio, Link2, Music2, Upload } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { useAsyncData } from "../hooks/useAsyncData"
import { api } from "../services/api"
import { formatDuration } from "../utils/format"
import { Button } from "../components/ui/Button"
import { EmptyState, ErrorState, PageLoader } from "../components/ui/Feedback"
import { Field, Input, Select } from "../components/ui/Field"
import { PageHeader } from "../components/ui/PageHeader"

type Source = "file" | "url"

function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const audio = new Audio()
    audio.preload = "metadata"
    audio.onloadedmetadata = () => {
      const seconds = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0
      URL.revokeObjectURL(objectUrl)
      resolve(seconds)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(0)
    }
    audio.src = objectUrl
  })
}

export default function UploadTrackPage() {
  const { artist } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()

  const { data: albums, loading, error, reload } = useAsyncData(
    async () => {
      if (!artist) return []
      return api.getArtistAlbums(artist.id)
    },
    [artist?.id],
    { enabled: Boolean(artist) }
  )

  const [title, setTitle] = useState("")
  const [albumId, setAlbumId] = useState("")
  const [trackNumber, setTrackNumber] = useState(1)
  const [duration, setDuration] = useState(0)
  const [explicit, setExplicit] = useState(false)
  const [source, setSource] = useState<Source>("file")
  const [audioUrl, setAudioUrl] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [readingFile, setReadingFile] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (albums && albums.length > 0 && !albumId) {
      setAlbumId(albums[0].id)
      setTrackNumber(1)
    }
  }, [albums, albumId])

  if (!artist) {
    return (
      <EmptyState
        title="Artist profile required"
        description="Create an artist profile in Settings before uploading music."
        icon={<Music2 size={22} />}
        action={
          <Link to="/settings">
            <Button size="sm">Open settings</Button>
          </Link>
        }
      />
    )
  }

  if (loading) return <PageLoader label="Loading your releases…" />
  if (error || !albums) {
    return <ErrorState message={error ?? "Releases could not be loaded."} onRetry={reload} />
  }

  if (albums.length === 0) {
    return (
      <EmptyState
        title="Create a release first"
        description="Every track belongs to an album, EP or single. Create one, then come back to upload the audio."
        icon={<Disc3 size={22} />}
        action={
          <Link to="/studio/albums">
            <Button size="sm">Create release</Button>
          </Link>
        }
      />
    )
  }

  async function pickFile(next: File | undefined) {
    setFile(next ?? null)
    if (!next) {
      setDuration(0)
      return
    }
    setReadingFile(true)
    try {
      const seconds = await readAudioDuration(next)
      if (seconds > 0) setDuration(seconds)
    } finally {
      setReadingFile(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      notify("Enter a track title", "error")
      return
    }
    if (!albumId) {
      notify("Choose the release this track belongs to", "error")
      return
    }
    if (source === "file" && !file) {
      notify("Choose an audio file to upload", "error")
      return
    }
    if (source === "url" && !audioUrl.trim()) {
      notify("Enter the hosted audio URL", "error")
      return
    }

    setSaving(true)
    try {
      const track =
        source === "file" && file
          ? await api.uploadTrackFile({
              title: title.trim(),
              album_id: albumId,
              duration,
              track_number: trackNumber,
              explicit,
              file,
            })
          : await api.uploadHostedTrack({
              title: title.trim(),
              album_id: albumId,
              duration,
              track_number: trackNumber,
              explicit,
              audio_url: audioUrl.trim(),
            })
      notify(`“${track.title}” is live on Npop`, "success")
      navigate(`/tracks/${track.id}`)
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not upload track", "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Artist studio"
        title="Upload a track"
        subtitle="Publish audio to one of your releases. Tracks appear on your artist page, in discovery and in the player immediately."
        actions={
          <Link to="/studio/music">
            <Button variant="secondary" size="sm">
              Manage music
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <form onSubmit={handleSubmit} className="surface-card grid gap-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Track title" htmlFor="upload-title" required>
              <Input
                id="upload-title"
                value={title}
                maxLength={200}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Name of the track"
              />
            </Field>
            <Field label="Release" htmlFor="upload-album" required>
              <Select
                id="upload-album"
                value={albumId}
                onChange={(event) => setAlbumId(event.target.value)}
              >
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.title} ({album.kind})
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Track number" htmlFor="upload-number" hint="Position within the release.">
              <Input
                id="upload-number"
                type="number"
                min={1}
                value={trackNumber}
                onChange={(event) => setTrackNumber(Number(event.target.value) || 1)}
              />
            </Field>
            <Field
              label="Duration (seconds)"
              htmlFor="upload-duration"
              hint={
                readingFile
                  ? "Reading audio metadata…"
                  : "Detected automatically from a file when possible."
              }
            >
              <Input
                id="upload-duration"
                type="number"
                min={0}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value) || 0)}
              />
            </Field>
          </div>

          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium text-app-text">Audio source</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSource("file")}
                aria-pressed={source === "file"}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                  source === "file"
                    ? "border-brand-primary/60 bg-brand-primary/10"
                    : "border-app-strong bg-app-raised/50 hover:border-brand-primary/40"
                }`}
              >
                <FileAudio size={18} className="mt-0.5 shrink-0 text-brand-primary" />
                <span>
                  <span className="block text-sm font-semibold text-app-text">
                    Upload an audio file
                  </span>
                  <span className="mt-0.5 block text-xs text-app-muted">
                    Sent to the configured media storage.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSource("url")}
                aria-pressed={source === "url"}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                  source === "url"
                    ? "border-brand-primary/60 bg-brand-primary/10"
                    : "border-app-strong bg-app-raised/50 hover:border-brand-primary/40"
                }`}
              >
                <Link2 size={18} className="mt-0.5 shrink-0 text-brand-primary" />
                <span>
                  <span className="block text-sm font-semibold text-app-text">
                    Use a hosted URL
                  </span>
                  <span className="mt-0.5 block text-xs text-app-muted">
                    Link audio that already lives on the web.
                  </span>
                </span>
              </button>
            </div>
          </fieldset>

          {source === "file" ? (
            <Field
              label="Audio file"
              htmlFor="upload-file"
              hint="MP3, WAV, OGG, FLAC or M4A. Choose a file you own the rights to."
            >
              <input
                id="upload-file"
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a"
                onChange={(event) => void pickFile(event.target.files?.[0])}
                className="block w-full cursor-pointer rounded-xl border border-app-strong bg-app-raised px-3 py-2.5 text-sm text-app-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-solid file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-on"
              />
            </Field>
          ) : (
            <Field
              label="Audio URL"
              htmlFor="upload-url"
              hint="A direct link to an audio file (https://…)."
            >
              <Input
                id="upload-url"
                value={audioUrl}
                onChange={(event) => setAudioUrl(event.target.value)}
                placeholder="https://cdn.example.com/track.mp3"
              />
            </Field>
          )}

          {file && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-app-border bg-app-raised/50 px-3 py-2 text-xs text-app-muted">
              <span className="font-semibold text-app-text">{file.name}</span>
              <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              {duration > 0 && <span>{formatDuration(duration)}</span>}
            </p>
          )}

          <label className="flex items-center gap-2 text-sm text-app-text">
            <input
              type="checkbox"
              checked={explicit}
              onChange={(event) => setExplicit(event.target.checked)}
              className="h-4 w-4 accent-brand-primary"
            />
            Mark as explicit content
          </label>

          <div className="flex justify-end gap-2 border-t border-app-border pt-4">
            <Link to="/studio/music">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" loading={saving} icon={<Upload size={16} />}>
              Publish track
            </Button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="surface-card p-5">
            <h2 className="text-base font-semibold text-app-text">Before you publish</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-app-muted">
              {[
                "You must own or have permission to distribute the audio you upload.",
                "Every track belongs to a release — create an album, EP or single first.",
                "Artwork is set on the release, not on individual tracks.",
                "Uploads are validated server-side before they are stored.",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2
                    size={15}
                    className="mt-0.5 shrink-0 text-brand-success"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="surface-card p-5">
            <h2 className="text-base font-semibold text-app-text">Publishing as</h2>
            <p className="mt-1 text-sm text-app-text">{artist.name}</p>
            <p className="mt-1 text-xs text-app-muted">
              Tracks are attributed to this artist profile and appear in the
              release you choose above.
            </p>
            <Link to="/settings" className="mt-3 inline-block text-sm font-semibold text-brand-primary hover:underline">
              Edit artist profile
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}

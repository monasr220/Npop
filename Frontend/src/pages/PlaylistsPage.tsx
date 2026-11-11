import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { ListMusic, Plus } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { useAsyncData } from "../hooks/useAsyncData"
import { api } from "../services/api"
import { Button } from "../components/ui/Button"
import { EmptyState, ErrorState, CardGridSkeleton } from "../components/ui/Feedback"
import { Field, Input, Textarea } from "../components/ui/Field"
import { Modal } from "../components/ui/Modal"
import { PageHeader } from "../components/ui/PageHeader"
import { Tabs } from "../components/ui/Tabs"
import { PlaylistCard } from "../components/music/PlaylistCard"

type Scope = "mine" | "system"

export default function PlaylistsPage() {
  const { user, isAuthenticated } = useAuth()
  const { notify } = useToast()
  const [scope, setScope] = useState<Scope>(isAuthenticated ? "mine" : "system")
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [coverUrl, setCoverUrl] = useState("")
  const [saving, setSaving] = useState(false)

  const { data, loading, error, reload } = useAsyncData(
    () =>
      scope === "mine" && user
        ? api.getPlaylists(user.id, false, 0, 100)
        : api.getPlaylists(undefined, true, 0, 100),
    [scope, user?.id]
  )

  async function submitCreate() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await api.createPlaylist({
        name: name.trim(),
        description: description.trim() || undefined,
        cover_url: coverUrl.trim() || undefined,
      })
      setName("")
      setDescription("")
      setCoverUrl("")
      setCreateOpen(false)
      setScope("mine")
      reload()
      notify("Playlist created", "success")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not create playlist", "error")
    } finally {
      setSaving(false)
    }
  }

  function handleCreate(event: FormEvent) {
    event.preventDefault()
    void submitCreate()
  }

  const playlists = data ?? []

  return (
    <div>
      <PageHeader
        eyebrow="Playlists"
        title={scope === "mine" ? "Your playlists" : "Curated by Npop"}
        subtitle={
          scope === "mine"
            ? "Collect the tracks you love, order them your way and keep them close."
            : "Editorial collections built to help you discover something new."
        }
        actions={
          isAuthenticated ? (
            <Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              New playlist
            </Button>
          ) : undefined
        }
      />

      <Tabs
        value={scope}
        onChange={setScope}
        tabs={[
          { value: "mine", label: "Your playlists" },
          { value: "system", label: "Npop playlists" },
        ]}
        className="mb-5 w-fit"
      />

      {scope === "mine" && !isAuthenticated ? (
        <EmptyState
          title="Sign in to build playlists"
          description="Your playlists are tied to your account so they follow you across devices."
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
      ) : loading ? (
        <CardGridSkeleton count={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : playlists.length === 0 ? (
        <EmptyState
          title={scope === "mine" ? "No playlists yet" : "No Npop playlists yet"}
          description={
            scope === "mine"
              ? "Create your first playlist and start adding tracks from any track page."
              : "Curated playlists will appear here."
          }
          icon={<ListMusic size={22} />}
          action={
            scope === "mine" && isAuthenticated ? (
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
                Create playlist
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        title="Create a playlist"
        description="Give it a name now — you can add tracks and artwork afterwards."
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreateOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={submitCreate}>
              Create playlist
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="grid gap-4">
          <Field label="Name" htmlFor="playlist-name" required>
            <Input
              id="playlist-name"
              value={name}
              maxLength={200}
              onChange={(event) => setName(event.target.value)}
              placeholder="Late night discoveries"
            />
          </Field>
          <Field label="Description" htmlFor="playlist-description">
            <Textarea
              id="playlist-description"
              value={description}
              maxLength={1024}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What ties these tracks together?"
              className="min-h-[72px]"
            />
          </Field>
          <Field
            label="Cover image URL"
            htmlFor="playlist-cover"
            hint="Optional. Use an https:// image URL."
          >
            <Input
              id="playlist-cover"
              value={coverUrl}
              onChange={(event) => setCoverUrl(event.target.value)}
              placeholder="https://…"
            />
          </Field>
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </Modal>
    </div>
  )
}

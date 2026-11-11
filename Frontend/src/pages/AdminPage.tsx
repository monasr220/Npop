import { useMemo, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import {
  BadgeCheck,
  Hash,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { useAsyncData } from "../hooks/useAsyncData"
import { api } from "../services/api"
import type { Artist, Hashtag, Role, UserPublic } from "../types"
import { formatDate } from "../utils/format"
import { Avatar } from "../components/ui/Avatar"
import { Badge, VerifiedBadge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { ConfirmDialog } from "../components/ui/ConfirmDialog"
import { EmptyState, ErrorState, PageLoader } from "../components/ui/Feedback"
import { Field, Input, Select } from "../components/ui/Field"
import { PageHeader, StatCard } from "../components/ui/PageHeader"
import { Tabs } from "../components/ui/Tabs"

type Section = "users" | "artists" | "hashtags"

const ROLES: Role[] = ["user", "artist", "admin"]

export default function AdminPage() {
  const { user, isAdmin } = useAuth()
  const { notify } = useToast()
  const [section, setSection] = useState<Section>("users")
  const [query, setQuery] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<UserPublic | null>(null)
  const [newTag, setNewTag] = useState("")
  const [creatingTag, setCreatingTag] = useState(false)

  const { data, loading, error, reload } = useAsyncData(
    async () => {
      const [users, artists, hashtags] = await Promise.all([
        api.getUsers(undefined, 0, 100),
        api.getArtists(undefined, 0, 100),
        api.getHashtags(100),
      ])
      return { users, artists, hashtags }
    },
    [],
    { enabled: isAdmin }
  )

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = data?.users ?? []
    if (!needle) return list
    return list.filter((person) => person.username.toLowerCase().includes(needle))
  }, [data?.users, query])

  if (!isAdmin) {
    return (
      <EmptyState
        title="Administrator access required"
        description="This area is limited to accounts with the administrator role."
        icon={<ShieldCheck size={22} />}
        action={
          <Link to="/">
            <Button size="sm">Back to discovery</Button>
          </Link>
        }
      />
    )
  }

  if (loading) return <PageLoader label="Loading moderation data…" />
  if (error || !data) {
    return <ErrorState message={error ?? "Moderation data could not be loaded."} onRetry={reload} />
  }

  async function changeRole(person: UserPublic, role: Role) {
    if (role === person.role) return
    if (person.id === user?.id) {
      notify("You cannot change your own administrator role", "error")
      return
    }
    setBusyId(person.id)
    try {
      await api.updateUser(person.id, { role })
      reload()
      notify(`${person.username} is now ${role === "user" ? "a listener" : `an ${role}`}`, "success")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not update role", "error")
    } finally {
      setBusyId(null)
    }
  }

  async function removeUser() {
    if (!deleting) return
    setBusyId(deleting.id)
    try {
      await api.deleteUser(deleting.id)
      notify(`${deleting.username} was deleted`, "success")
      setDeleting(null)
      reload()
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not delete user", "error")
    } finally {
      setBusyId(null)
    }
  }

  async function toggleVerification(artist: Artist) {
    setBusyId(artist.id)
    try {
      await api.verifyArtist(artist.id, !artist.verified)
      reload()
      notify(
        artist.verified ? `${artist.name} is no longer verified` : `${artist.name} is verified`,
        "success"
      )
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not update verification", "error")
    } finally {
      setBusyId(null)
    }
  }

  async function createTag(event: FormEvent) {
    event.preventDefault()
    const tag = newTag.trim().replace(/^#/, "")
    if (!tag) return
    setCreatingTag(true)
    try {
      await api.createHashtag(tag)
      setNewTag("")
      reload()
      notify(`#${tag} created`, "success")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not create hashtag", "error")
    } finally {
      setCreatingTag(false)
    }
  }

  async function deleteTag(hashtag: Hashtag) {
    setBusyId(hashtag.id)
    try {
      await api.deleteHashtag(hashtag.tag)
      reload()
      notify(`#${hashtag.tag} deleted`, "success")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not delete hashtag", "error")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Moderation and platform controls"
        subtitle="Manage account roles, artist verification and the topic catalogue. Actions here take effect immediately."
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Accounts"
          value={data.users.length}
          hint="Profiles on this instance"
          icon={<Users size={18} />}
        />
        <StatCard
          label="Artists"
          value={data.artists.length}
          hint={`${data.artists.filter((artist) => artist.verified).length} verified`}
          icon={<BadgeCheck size={18} />}
        />
        <StatCard
          label="Topics"
          value={data.hashtags.length}
          hint="Hashtags in the catalogue"
          icon={<Hash size={18} />}
        />
      </section>

      <Tabs
        value={section}
        onChange={setSection}
        tabs={[
          { value: "users", label: "Accounts", count: data.users.length },
          { value: "artists", label: "Artists", count: data.artists.length },
          { value: "hashtags", label: "Topics", count: data.hashtags.length },
        ]}
        className="mb-5 w-fit"
      />

      {section === "users" && (
        <section>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1 sm:max-w-md">
              <Search
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-muted"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter accounts by username…"
                aria-label="Filter accounts"
                className="h-11 w-full rounded-full border border-app-strong bg-app-surface pl-9 pr-3 text-sm text-app-text placeholder:text-app-muted/70 focus:border-brand-primary/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
            <p className="text-sm text-app-muted">
              {filteredUsers.length} {filteredUsers.length === 1 ? "account" : "accounts"}
            </p>
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState
              title="No accounts match"
              description="Try a different username or clear the filter."
              icon={<Users size={22} />}
            />
          ) : (
            <ul className="surface-card divide-y divide-app-border/60 p-2">
              {filteredUsers.map((person) => (
                <li
                  key={person.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl px-2 py-3"
                >
                  <Avatar name={person.username} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 truncate text-sm font-semibold text-app-text">
                      {person.username}
                      {person.id === user?.id && <Badge variant="primary">You</Badge>}
                    </p>
                    <p className="truncate text-xs text-app-muted">
                      {person.bio || "No bio"} · Joined {formatDate(person.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      aria-label={`Role for ${person.username}`}
                      value={person.role}
                      disabled={busyId === person.id || person.id === user?.id}
                      onChange={(event) => changeRole(person, event.target.value as Role)}
                      className="w-32"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      aria-label={`Delete ${person.username}`}
                      disabled={busyId === person.id || person.id === user?.id}
                      onClick={() => setDeleting(person)}
                      className="rounded-full p-1.5 text-app-muted hover:bg-brand-social/10 hover:text-brand-social disabled:opacity-30"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {section === "artists" && (
        <section>
          {data.artists.length === 0 ? (
            <EmptyState
              title="No artist profiles yet"
              description="Artist accounts appear here once listeners create artist profiles."
              icon={<UserCog size={22} />}
            />
          ) : (
            <ul className="surface-card divide-y divide-app-border/60 p-2">
              {data.artists.map((artist) => (
                <li
                  key={artist.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl px-2 py-3"
                >
                  <Avatar name={artist.name} src={artist.image_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 truncate text-sm font-semibold text-app-text">
                      {artist.name}
                      {artist.verified && <VerifiedBadge />}
                    </p>
                    <p className="truncate text-xs text-app-muted">
                      {artist.bio || "No artist bio"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/artists/${artist.id}`}
                      className="text-xs font-semibold text-brand-primary hover:underline"
                    >
                      View page
                    </Link>
                    <Button
                      variant={artist.verified ? "secondary" : "primary"}
                      size="sm"
                      loading={busyId === artist.id}
                      icon={<BadgeCheck size={14} />}
                      onClick={() => toggleVerification(artist)}
                    >
                      {artist.verified ? "Unverify" : "Verify"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {section === "hashtags" && (
        <section className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
          <form onSubmit={createTag} className="surface-card h-fit p-5">
            <h2 className="text-base font-semibold text-app-text">Create a topic</h2>
            <p className="mt-1 text-sm text-app-muted">
              Hashtags group related posts and power trending topics on discovery.
            </p>
            <div className="mt-3">
              <Field label="Hashtag" htmlFor="admin-tag">
                <Input
                  id="admin-tag"
                  value={newTag}
                  maxLength={100}
                  onChange={(event) => setNewTag(event.target.value)}
                  placeholder="independentmusic"
                />
              </Field>
            </div>
            <Button
              type="submit"
              className="mt-3 w-full"
              loading={creatingTag}
              icon={<Hash size={15} />}
            >
              Create topic
            </Button>
          </form>

          <div>
            {data.hashtags.length === 0 ? (
              <EmptyState
                title="No topics yet"
                description="Create the first hashtag to start grouping conversations."
                icon={<Hash size={22} />}
              />
            ) : (
              <ul className="surface-card divide-y divide-app-border/60 p-2">
                {data.hashtags.map((hashtag) => (
                  <li
                    key={hashtag.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
                      <Hash size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-app-text">
                        #{hashtag.tag}
                      </p>
                      <p className="text-xs text-app-muted">{hashtag.usage} uses</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete #${hashtag.tag}`}
                      disabled={busyId === hashtag.id}
                      onClick={() => deleteTag(hashtag)}
                      className="rounded-full p-1.5 text-app-muted hover:bg-brand-social/10 hover:text-brand-social disabled:opacity-30"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.username ?? "this account"}?`}
        description="The account and all content linked to it will be removed. This cannot be undone."
        confirmLabel="Delete account"
        loading={busyId === deleting?.id}
        onConfirm={removeUser}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}

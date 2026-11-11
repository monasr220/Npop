import { useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  BadgeCheck,
  Image,
  Link2,
  Music2,
  Save,
  ShieldCheck,
  UserCog,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { useToast } from "../context/ToastContext"
import { useAsyncData } from "../hooks/useAsyncData"
import { invalidateProfilePicture } from "../hooks/useProfilePicture"
import { api } from "../services/api"
import { normalizeExternalUrl } from "../utils/url"
import { Avatar } from "../components/ui/Avatar"
import { Button } from "../components/ui/Button"
import { ConfirmDialog } from "../components/ui/ConfirmDialog"
import { Field, Input, Textarea } from "../components/ui/Field"
import { PageHeader } from "../components/ui/PageHeader"
import { Tabs } from "../components/ui/Tabs"

type Section = "account" | "media" | "artist" | "danger"

export default function SettingsPage() {
  const { user, artist, refresh, setArtist, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>("account")

  const { data: media, reload: reloadMedia } = useAsyncData(
    async () => {
      if (!user) return null
      const [pictures, covers, links] = await Promise.all([
        api.getProfilePictures(user.id).catch(() => []),
        api.getCoverPhotos(user.id).catch(() => []),
        api.getSocialLinks(user.id).catch(() => []),
      ])
      return {
        avatar: pictures.length > 0 ? pictures[pictures.length - 1].image_url : "",
        cover: covers.length > 0 ? covers[covers.length - 1].image_url : "",
        links: links.map((link) => link.link).join("\n"),
      }
    },
    [user?.id],
    { enabled: Boolean(user) }
  )

  // --------------------------------------------------------------- account
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [bio, setBio] = useState("")
  const [contactInfo, setContactInfo] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingAccount, setSavingAccount] = useState(false)

  // ----------------------------------------------------------------- media
  const [avatarUrl, setAvatarUrl] = useState("")
  const [coverUrl, setCoverUrl] = useState("")
  const [linksText, setLinksText] = useState("")
  const [savingMedia, setSavingMedia] = useState(false)
  const [savingLinks, setSavingLinks] = useState(false)

  // ---------------------------------------------------------------- artist
  const [artistName, setArtistName] = useState("")
  const [artistBio, setArtistBio] = useState("")
  const [artistImage, setArtistImage] = useState("")
  const [savingArtist, setSavingArtist] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!user) return
    setUsername(user.username)
    setEmail(user.email)
    setBio(user.bio ?? "")
    setContactInfo(user.contact_info ?? "")
  }, [user])

  useEffect(() => {
    if (media) {
      setAvatarUrl(media.avatar)
      setCoverUrl(media.cover)
      setLinksText(media.links)
    }
  }, [media])

  useEffect(() => {
    if (artist) {
      setArtistName(artist.name)
      setArtistBio(artist.bio)
      setArtistImage(artist.image_url)
    }
  }, [artist])

  if (!user) return null

  async function saveAccount(event: FormEvent) {
    event.preventDefault()
    if (password && password.length < 8) {
      notify("Password must be at least 8 characters", "error")
      return
    }
    if (password && password !== confirmPassword) {
      notify("Passwords do not match", "error")
      return
    }
    setSavingAccount(true)
    try {
      await api.updateUser(user!.id, {
        username: username.trim(),
        email: email.trim(),
        bio: bio.trim() || null,
        contact_info: contactInfo.trim() || null,
        ...(password ? { password } : {}),
      })
      setPassword("")
      setConfirmPassword("")
      await refresh()
      notify("Account updated", "success")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not update account", "error")
    } finally {
      setSavingAccount(false)
    }
  }

  async function saveMedia() {
    setSavingMedia(true)
    try {
      if (avatarUrl.trim()) {
        await api.setProfilePicture(user!.id, avatarUrl.trim())
        invalidateProfilePicture(user!.id)
      }
      if (coverUrl.trim()) {
        await api.setCoverPhoto(user!.id, coverUrl.trim())
      }
      reloadMedia()
      notify("Profile media updated", "success")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not update media", "error")
    } finally {
      setSavingMedia(false)
    }
  }

  async function saveLinks() {
    const lines = linksText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const normalized: string[] = []
    for (const line of lines) {
      const url = normalizeExternalUrl(line)
      if (!url) {
        notify(`"${line}" is not a valid http(s) link`, "error")
        return
      }
      normalized.push(url)
    }
    setSavingLinks(true)
    try {
      await api.setSocialLinks(user!.id, normalized)
      notify("Social links updated", "success")
      reloadMedia()
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not update links", "error")
    } finally {
      setSavingLinks(false)
    }
  }

  async function saveArtist(event: FormEvent) {
    event.preventDefault()
    if (!artistName.trim()) {
      notify("Artist name is required", "error")
      return
    }
    setSavingArtist(true)
    try {
      if (artist) {
        await api.updateArtist(artist.id, {
          name: artistName.trim(),
          bio: artistBio.trim(),
          image_url: artistImage.trim(),
        })
        notify("Artist profile updated", "success")
      } else {
        const created = await api.createArtist({
          name: artistName.trim(),
          bio: artistBio.trim(),
          image_url: artistImage.trim(),
        })
        setArtist(created)
        notify("Artist studio unlocked", "success")
      }
      await refresh()
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not save artist profile", "error")
    } finally {
      setSavingArtist(false)
    }
  }

  async function deleteAccount() {
    setDeleting(true)
    try {
      await api.deleteUser(user!.id)
      await logout()
      notify("Your account has been deleted", "success")
      navigate("/")
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not delete account", "error")
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Your account"
        subtitle="Manage your profile, media, artist tools and account security."
      />

      <Tabs
        value={section}
        onChange={setSection}
        tabs={[
          { value: "account", label: "Account" },
          { value: "media", label: "Profile & links" },
          { value: "artist", label: "Artist studio" },
          { value: "danger", label: "Danger zone" },
        ]}
        className="mb-5 w-fit"
      />

      {section === "account" && (
        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <form onSubmit={saveAccount} className="surface-card grid gap-4 p-5">
            <div className="flex items-center gap-2">
              <UserCog size={18} className="text-brand-primary" />
              <h2 className="text-base font-semibold text-app-text">Account details</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Username" htmlFor="settings-username" required>
                <Input
                  id="settings-username"
                  value={username}
                  minLength={3}
                  maxLength={255}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </Field>
              <Field label="Email" htmlFor="settings-email" required>
                <Input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
            </div>
            <Field label="Bio" htmlFor="settings-bio" hint="Shown on your public profile.">
              <Textarea
                id="settings-bio"
                value={bio}
                maxLength={1024}
                onChange={(event) => setBio(event.target.value)}
                className="min-h-[80px]"
              />
            </Field>
            <Field
              label="Contact info"
              htmlFor="settings-contact"
              hint="Optional, up to 15 characters (for example a public contact handle)."
            >
              <Input
                id="settings-contact"
                value={contactInfo}
                maxLength={15}
                onChange={(event) => setContactInfo(event.target.value)}
              />
            </Field>

            <div className="border-t border-app-border pt-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-app-text">
                <ShieldCheck size={16} className="text-brand-success" /> Change password
              </p>
              <p className="mt-1 text-xs text-app-muted">
                Leave blank to keep your current password. New passwords need at least 8
                characters.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="New password" htmlFor="settings-password">
                  <Input
                    id="settings-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                  />
                </Field>
                <Field label="Confirm new password" htmlFor="settings-confirm">
                  <Input
                    id="settings-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                  />
                </Field>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={savingAccount} icon={<Save size={16} />}>
                Save account
              </Button>
            </div>
          </form>

          <div className="space-y-5">
            <div className="surface-card p-5">
              <h2 className="text-base font-semibold text-app-text">Appearance</h2>
              <p className="mt-1 text-sm text-app-muted">
                Choose the theme that is most comfortable for long listening
                sessions.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant={theme === "dark" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                >
                  Dark
                </Button>
                <Button
                  variant={theme === "light" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setTheme("light")}
                >
                  Light
                </Button>
              </div>
            </div>

            <div className="surface-card p-5">
              <h2 className="text-base font-semibold text-app-text">Your role</h2>
              <p className="mt-2 text-sm text-app-muted">
                You are signed in as a{" "}
                <span className="font-semibold text-app-text">
                  {artist ? "artist" : user.role === "admin" ? "administrator" : "listener"}
                </span>
                .
              </p>
              {artist ? (
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand-success">
                  <BadgeCheck size={15} /> Artist profile: {artist.name}
                </p>
              ) : (
                <p className="mt-2 text-sm text-app-muted">
                  Create an artist profile in the Artist studio tab to publish music.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {section === "media" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="surface-card p-5">
            <div className="flex items-center gap-2">
              <Image size={18} className="text-brand-primary" />
              <h2 className="text-base font-semibold text-app-text">Profile images</h2>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Avatar name={user.username} src={avatarUrl || media?.avatar} size="lg" />
              <div className="min-w-0 flex-1">
                <Field label="Profile picture URL" htmlFor="settings-avatar">
                  <Input
                    id="settings-avatar"
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.target.value)}
                    placeholder="https://…"
                  />
                </Field>
              </div>
            </div>
            <div className="mt-4">
              <Field
                label="Cover image URL"
                htmlFor="settings-cover"
                hint="Shown as the banner on your profile."
              >
                <Input
                  id="settings-cover"
                  value={coverUrl}
                  onChange={(event) => setCoverUrl(event.target.value)}
                  placeholder="https://…"
                />
              </Field>
              {coverUrl && (
                <div
                  className="mt-3 h-24 w-full rounded-xl border border-app-border bg-app-raised bg-cover bg-center"
                  style={{ backgroundImage: `url("${coverUrl}")` }}
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <Button loading={savingMedia} onClick={saveMedia} icon={<Save size={16} />}>
                Save images
              </Button>
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center gap-2">
              <Link2 size={18} className="text-brand-primary" />
              <h2 className="text-base font-semibold text-app-text">Social links</h2>
            </div>
            <p className="mt-1 text-sm text-app-muted">
              One link per line. Only http and https links are accepted and shown
              publicly on your profile.
            </p>
            <Textarea
              value={linksText}
              onChange={(event) => setLinksText(event.target.value)}
              placeholder={"https://example.com\nhttps://social.example/@you"}
              aria-label="Social links"
              className="mt-3 min-h-[160px] font-mono text-xs"
            />
            <div className="mt-4 flex justify-end">
              <Button loading={savingLinks} onClick={saveLinks} icon={<Save size={16} />}>
                Save links
              </Button>
            </div>
          </div>
        </div>
      )}

      {section === "artist" && (
        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <form onSubmit={saveArtist} className="surface-card grid gap-4 p-5">
            <div className="flex items-center gap-2">
              <Music2 size={18} className="text-brand-primary" />
              <h2 className="text-base font-semibold text-app-text">
                {artist ? "Artist profile" : "Create an artist profile"}
              </h2>
            </div>
            <p className="text-sm leading-6 text-app-muted">
              {artist
                ? "Update the public name, biography and image shown across your discography."
                : "Creating an artist profile unlocks the Artist Studio: upload tracks, create albums and see audience statistics. You can keep using Npop as a listener too."}
            </p>
            <Field label="Artist name" htmlFor="artist-name" required>
              <Input
                id="artist-name"
                value={artistName}
                maxLength={160}
                onChange={(event) => setArtistName(event.target.value)}
                placeholder="The name on your releases"
              />
            </Field>
            <Field label="Artist bio" htmlFor="artist-bio">
              <Textarea
                id="artist-bio"
                value={artistBio}
                onChange={(event) => setArtistBio(event.target.value)}
                placeholder="Tell listeners about your sound and story…"
                className="min-h-[110px]"
              />
            </Field>
            <Field label="Artist image URL" htmlFor="artist-image">
              <Input
                id="artist-image"
                value={artistImage}
                onChange={(event) => setArtistImage(event.target.value)}
                placeholder="https://…"
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={savingArtist} icon={<Save size={16} />}>
                {artist ? "Save artist profile" : "Create artist profile"}
              </Button>
            </div>
          </form>

          <div className="surface-card h-fit p-5">
            <h2 className="text-base font-semibold text-app-text">What changes</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-app-muted">
              <li className="flex gap-2">
                <BadgeCheck size={16} className="mt-0.5 shrink-0 text-brand-success" />
                Artist Studio appears in your navigation.
              </li>
              <li className="flex gap-2">
                <BadgeCheck size={16} className="mt-0.5 shrink-0 text-brand-success" />
                You can upload hosted tracks and files, and manage albums.
              </li>
              <li className="flex gap-2">
                <BadgeCheck size={16} className="mt-0.5 shrink-0 text-brand-success" />
                Your profile gains an artist page with discography and followers.
              </li>
              <li className="flex gap-2">
                <BadgeCheck size={16} className="mt-0.5 shrink-0 text-brand-success" />
                Verification is reviewed separately and cannot be self-granted.
              </li>
            </ul>
          </div>
        </div>
      )}

      {section === "danger" && (
        <div className="surface-card border-brand-social/40 p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-brand-social" />
            <h2 className="text-base font-semibold text-app-text">Delete account</h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-app-muted">
            Deleting your account removes your profile, posts, playlists, favorites,
            listening history and any artist profile you own. This action cannot be
            undone. Download anything you want to keep first.
          </p>
          <Button
            variant="danger"
            className="mt-4"
            onClick={() => setDeleteOpen(true)}
          >
            Delete my account
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete your account permanently?"
        description="Your profile and all content linked to it will be removed. This cannot be undone."
        confirmLabel="Delete account"
        loading={deleting}
        onConfirm={deleteAccount}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}

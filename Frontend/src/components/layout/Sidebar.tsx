import { NavLink, useNavigate } from "react-router-dom"
import {
  Bell,
  Disc3,
  Heart,
  Home,
  LayoutDashboard,
  Library,
  ListMusic,
  LogOut,
  PlusCircle,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCog,
  X,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useProfilePicture } from "../../hooks/useProfilePicture"
import { cn } from "../../utils/cn"
import { Avatar } from "../ui/Avatar"
import { Button } from "../ui/Button"
import { BrandMark } from "./BrandMark"

interface NavItem {
  to: string
  label: string
  icon: typeof Home
  end?: boolean
}

interface NavSection {
  title?: string
  items: NavItem[]
}

function navFor(isArtist: boolean, isAdmin: boolean): NavSection[] {
  const sections: NavSection[] = [
    {
      title: "Discover",
      items: [
        { to: "/", label: "Home", icon: Home, end: true },
        { to: "/feed", label: "Social feed", icon: Sparkles },
        { to: "/search", label: "Search", icon: Search },
      ],
    },
    {
      title: "Your library",
      items: [
        { to: "/library", label: "Library", icon: Library },
        { to: "/playlists", label: "Playlists", icon: ListMusic },
        { to: "/favorites", label: "Favorites", icon: Heart },
        { to: "/notifications", label: "Notifications", icon: Bell },
      ],
    },
  ]

  if (isArtist) {
    sections.push({
      title: "Artist studio",
      items: [
        { to: "/studio", label: "Dashboard", icon: LayoutDashboard, end: true },
        { to: "/studio/music", label: "My music", icon: Disc3 },
        { to: "/studio/albums", label: "My albums", icon: ListMusic },
        { to: "/studio/upload", label: "Upload track", icon: Upload },
      ],
    })
  }

  if (isAdmin) {
    sections.push({
      title: "Administration",
      items: [{ to: "/admin", label: "Moderation", icon: ShieldCheck }],
    })
  }

  return sections
}

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-brand-primary/10 text-brand-primary"
            : "text-app-muted hover:bg-app-raised hover:text-app-text"
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{item.label}</span>
          {isActive && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-solid" />
          )}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({
  onNavigate,
  mobile = false,
}: {
  onNavigate?: () => void
  mobile?: boolean
}) {
  const { user, artist, isAuthenticated, isArtist, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const avatar = useProfilePicture(user?.id)
  const sections = navFor(isArtist, isAdmin)

  async function handleLogout() {
    await logout()
    onNavigate?.()
    navigate("/login")
  }

  return (
    <aside
      className={cn(
        "flex h-full w-[264px] flex-col border-r border-app-border bg-app-surface/95",
        mobile && "w-full max-w-[320px]"
      )}
    >
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <BrandMark />
        {mobile && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close navigation"
            className="rounded-full p-2 text-app-muted hover:bg-app-raised hover:text-app-text"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
        {sections.map((section) => (
          <div key={section.title ?? "main"} className="mt-3">
            {section.title && (
              <p className="px-3 pb-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-app-muted/80">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavRow key={item.to} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}

        {isAuthenticated && !isArtist && (
          <div className="mt-5 rounded-2xl border border-brand-primary/25 bg-brand-primary/10 p-3.5">
            <p className="text-sm font-semibold text-app-text">Publish your music</p>
            <p className="mt-1 text-xs leading-5 text-app-muted">
              Create an artist profile to upload tracks, build albums and see your
              audience.
            </p>
            <Button
              size="sm"
              className="mt-2.5"
              icon={<PlusCircle size={14} />}
              onClick={() => {
                onNavigate?.()
                navigate("/settings#artist")
              }}
            >
              Open artist studio
            </Button>
          </div>
        )}
      </nav>

      <div className="border-t border-app-border p-3">
        {isAuthenticated ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-app-raised/70 p-2.5">
            <Avatar name={user?.username ?? "You"} src={avatar} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-app-text">
                {user?.username}
              </p>
              <p className="truncate text-[0.68rem] text-app-muted">
                {artist ? `Artist · ${artist.name}` : user?.role === "admin" ? "Administrator" : "Listener"}
              </p>
            </div>
            <NavLink
              to="/settings"
              onClick={onNavigate}
              aria-label="Account settings"
              className="rounded-full p-1.5 text-app-muted hover:bg-app-surface hover:text-app-text"
            >
              <Settings size={16} />
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="rounded-full p-1.5 text-app-muted hover:bg-app-surface hover:text-brand-social"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="space-y-2 rounded-xl border border-app-border p-3">
            <p className="text-xs text-app-muted">
              Sign in to follow artists, build playlists and join the feed.
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  onNavigate?.()
                  navigate("/login")
                }}
              >
                Sign in
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  onNavigate?.()
                  navigate("/register")
                }}
              >
                Join
              </Button>
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between px-1 text-[0.64rem] text-app-muted">
          <NavLink to="/privacy-policy" onClick={onNavigate} className="hover:text-app-text">
            Privacy
          </NavLink>
          <NavLink to="/terms-of-service" onClick={onNavigate} className="hover:text-app-text">
            Terms
          </NavLink>
          <span className="inline-flex items-center gap-1">
            <UserCog size={11} aria-hidden="true" /> v1.0
          </span>
        </div>
      </div>
    </aside>
  )
}

import { useEffect, useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { useNotificationStream } from "../../hooks/useNotificationStream"
import { useProfilePicture } from "../../hooks/useProfilePicture"
import { Avatar } from "../ui/Avatar"
import { Button } from "../ui/Button"
import { Dropdown, DropdownItem, DropdownSeparator } from "../ui/Dropdown"

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, isAuthenticated, isArtist, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { unread } = useNotificationStream()
  const avatar = useProfilePicture(user?.id)
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (location.pathname === "/search") {
      setQuery(new URLSearchParams(location.search).get("q") ?? "")
    }
  }, [location.pathname, location.search])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const trimmed = query.trim()
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`)
    else navigate("/search")
  }

  async function handleLogout() {
    await logout()
    navigate("/login")
  }

  return (
    <header className="sticky top-0 z-30 border-b border-app-border bg-app-bg/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-5">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open navigation"
          className="rounded-full p-2 text-app-muted hover:bg-app-raised hover:text-app-text lg:hidden"
        >
          <Menu size={20} />
        </button>

        <form onSubmit={submitSearch} role="search" className="min-w-0 flex-1 sm:max-w-xl">
          <div className="relative">
            <Search
              size={17}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-muted"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tracks, artists, albums, people…"
              aria-label="Search Npop"
              className="h-10 w-full rounded-full border border-app-strong bg-app-surface pl-9 pr-3 text-sm text-app-text placeholder:text-app-muted/70 focus:border-brand-primary/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="rounded-full p-2 text-app-muted transition-colors hover:bg-app-raised hover:text-app-text"
          >
            {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {isAuthenticated ? (
            <>
              <Link
                to="/notifications"
                aria-label={
                  unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
                }
                className="relative rounded-full p-2 text-app-muted transition-colors hover:bg-app-raised hover:text-app-text"
              >
                <Bell size={19} />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-brand-solid px-1 text-[0.62rem] font-bold text-brand-on">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>

              <Dropdown
                label="Account menu"
                trigger={({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label="Account menu"
                    className="ml-1 flex items-center gap-2 rounded-full border border-app-border bg-app-surface p-1 pr-2.5 text-sm hover:border-brand-primary/50"
                  >
                    <Avatar name={user?.username ?? "You"} src={avatar} size="sm" />
                    <span className="hidden max-w-[110px] truncate font-medium text-app-text sm:block">
                      {user?.username}
                    </span>
                  </button>
                )}
              >
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-semibold text-app-text">
                    {user?.username}
                  </p>
                  <p className="truncate text-xs text-app-muted">{user?.email}</p>
                </div>
                <DropdownSeparator />
                <DropdownItem onClick={() => navigate(`/users/${user?.id}`)}>
                  <User size={15} /> Your profile
                </DropdownItem>
                <DropdownItem onClick={() => navigate("/settings")}>
                  <Settings size={15} /> Settings
                </DropdownItem>
                {isArtist && (
                  <DropdownItem onClick={() => navigate("/studio")}>
                    <LayoutDashboard size={15} /> Artist studio
                  </DropdownItem>
                )}
                <DropdownSeparator />
                <DropdownItem danger onClick={handleLogout}>
                  <LogOut size={15} /> Sign out
                </DropdownItem>
              </Dropdown>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Create account</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

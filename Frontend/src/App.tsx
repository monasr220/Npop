import { useEffect, type ReactNode } from "react"
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom"
import { LockKeyhole, ShieldCheck, Sparkles } from "lucide-react"
import { useAuth } from "./context/AuthContext"
import { AppLayout } from "./layouts/AppLayout"
import { AuthLayout } from "./layouts/AuthLayout"
import { Button } from "./components/ui/Button"
import { EmptyState, PageLoader } from "./components/ui/Feedback"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import HomePage from "./pages/HomePage"
import FeedPage from "./pages/FeedPage"
import TrackPage from "./pages/TrackPage"
import ArtistsPage from "./pages/ArtistsPage"
import ArtistPage from "./pages/ArtistPage"
import AlbumsPage from "./pages/AlbumsPage"
import AlbumPage from "./pages/AlbumPage"
import PlaylistsPage from "./pages/PlaylistsPage"
import PlaylistPage from "./pages/PlaylistPage"
import ProfilePage from "./pages/ProfilePage"
import LibraryPage from "./pages/LibraryPage"
import NotificationsPage from "./pages/NotificationsPage"
import SearchPage from "./pages/SearchPage"
import SettingsPage from "./pages/SettingsPage"
import ArtistDashboardPage from "./pages/ArtistDashboardPage"
import ArtistMusicPage from "./pages/ArtistMusicPage"
import ArtistAlbumsPage from "./pages/ArtistAlbumsPage"
import UploadTrackPage from "./pages/UploadTrackPage"
import AdminPage from "./pages/AdminPage"
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage"
import TermsOfServicePage from "./pages/TermsOfServicePage"
import NotFoundPage from "./pages/NotFoundPage"

/** Reset scroll position on navigation, but keep deep links with a #hash working. */
function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1))
      if (target) {
        target.scrollIntoView({ block: "start" })
        return
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [pathname, hash])

  return null
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader label="Checking your session…" />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <>{children}</>
}

function RequireArtist({ children }: { children: ReactNode }) {
  const { isAuthenticated, isArtist, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader label="Opening the studio…" />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (!isArtist) {
    return (
      <EmptyState
        title="The studio is for artist profiles"
        description="Create an artist profile from Settings to upload music, manage releases and see your audience. You keep your listener account and library."
        icon={<Sparkles size={22} />}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link to="/settings">
              <Button size="sm">Create artist profile</Button>
            </Link>
            <Link to="/">
              <Button size="sm" variant="secondary">
                Back to discovery
              </Button>
            </Link>
          </div>
        }
      />
    )
  }
  return <>{children}</>
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader label="Checking permissions…" />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (!isAdmin) {
    return (
      <EmptyState
        title="Administrator access required"
        description="Moderation tools are limited to accounts with the administrator role. If you believe you should have access, contact the instance operator."
        icon={<ShieldCheck size={22} />}
        action={
          <Link to="/">
            <Button size="sm" variant="secondary">
              Back to discovery
            </Button>
          </Link>
        }
      />
    )
  }
  return <>{children}</>
}

function NotFoundRoute() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <EmptyState
          title="Page not found"
          description="This page does not exist or has moved."
          icon={<LockKeyhole size={22} />}
          action={
            <Link to="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          }
        />
      </div>
    )
  }
  return <NotFoundPage />
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/tracks/:id" element={<TrackPage />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/artists/:id" element={<ArtistPage />} />
          <Route path="/albums" element={<AlbumsPage />} />
          <Route path="/albums/:id" element={<AlbumPage />} />
          <Route path="/playlists" element={<PlaylistsPage />} />
          <Route path="/playlists/:id" element={<PlaylistPage />} />
          <Route path="/users/:id" element={<ProfilePage />} />
          <Route path="/search" element={<SearchPage />} />

          <Route
            path="/library"
            element={
              <RequireAuth>
                <LibraryPage />
              </RequireAuth>
            }
          />
          <Route
            path="/favorites"
            element={
              <RequireAuth>
                <LibraryPage />
              </RequireAuth>
            }
          />
          <Route
            path="/notifications"
            element={
              <RequireAuth>
                <NotificationsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />

          <Route
            path="/studio"
            element={
              <RequireArtist>
                <ArtistDashboardPage />
              </RequireArtist>
            }
          />
          <Route
            path="/studio/music"
            element={
              <RequireArtist>
                <ArtistMusicPage />
              </RequireArtist>
            }
          />
          <Route
            path="/studio/albums"
            element={
              <RequireArtist>
                <ArtistAlbumsPage />
              </RequireArtist>
            }
          />
          <Route
            path="/studio/upload"
            element={
              <RequireArtist>
                <UploadTrackPage />
              </RequireArtist>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            }
          />

          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />

          <Route path="*" element={<NotFoundRoute />} />
        </Route>
      </Routes>
    </>
  )
}

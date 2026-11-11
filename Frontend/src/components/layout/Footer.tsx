import { Link } from "react-router-dom"
import { BrandDots, BrandMark } from "./BrandMark"

export function Footer() {
  return (
    <footer className="mt-14 border-t border-app-border bg-app-surface/40 px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <BrandMark />
          <p className="mt-3 text-sm leading-6 text-app-muted">
            Npop is a music social network where listeners discover, rate and
            discuss music, and artists publish and grow their audience.
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-app-muted">
            <BrandDots />
            <span>Independent music, shared together.</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-app-text">
              Explore
            </p>
            <ul className="space-y-1.5 text-app-muted">
              <li><Link to="/" className="hover:text-app-text">Discover</Link></li>
              <li><Link to="/artists" className="hover:text-app-text">Artists</Link></li>
              <li><Link to="/albums" className="hover:text-app-text">Albums</Link></li>
              <li><Link to="/playlists" className="hover:text-app-text">Playlists</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-app-text">
              Legal
            </p>
            <ul className="space-y-1.5 text-app-muted">
              <li>
                <Link to="/privacy-policy" className="hover:text-app-text">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="hover:text-app-text">
                  Terms of Service
                </Link>
              </li>
              <li>
                <a href="/docs" className="hover:text-app-text">
                  API documentation
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-app-text">
              Account
            </p>
            <ul className="space-y-1.5 text-app-muted">
              <li><Link to="/login" className="hover:text-app-text">Sign in</Link></li>
              <li><Link to="/register" className="hover:text-app-text">Create account</Link></li>
              <li><Link to="/settings" className="hover:text-app-text">Settings</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-[1200px] flex-col gap-1 border-t border-app-border pt-4 text-xs text-app-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Npop. All rights reserved.</p>
        <p>Built with FastAPI, React and TypeScript.</p>
      </div>
    </footer>
  )
}

import { Link, Outlet } from "react-router-dom"
import { CheckCircle2, Heart, Music2, Users } from "lucide-react"
import { BrandDots, BrandMark } from "../components/layout/BrandMark"

const HIGHLIGHTS = [
  {
    icon: Music2,
    title: "Discover real music",
    text: "Browse tracks, albums and artists, then keep the player running across every page.",
  },
  {
    icon: Users,
    title: "A social layer for sound",
    text: "Post, comment, rate and repost. Follow the people and artists shaping your taste.",
  },
  {
    icon: Heart,
    title: "Build your library",
    text: "Playlists, favorites and listening history stay connected to your account.",
  },
]

export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="hero-wash relative hidden overflow-hidden border-r border-app-border bg-app-surface p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="relative">
          <BrandMark />
        </div>

        <div className="relative max-w-lg">
          <BrandDots />
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-app-text">
            Music is better
            <br />
            when it is shared.
          </h1>
          <p className="mt-4 text-base leading-7 text-app-muted">
            Npop brings listening, publishing and conversation into one place.
            Follow artists, rate what moves you, and build a library that sounds
            like you.
          </p>

          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-primary/15 text-brand-primary">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-app-text">{item.title}</p>
                    <p className="mt-0.5 text-sm leading-6 text-app-muted">{item.text}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-app-muted">
          <CheckCircle2 size={14} className="text-brand-success" aria-hidden="true" />
          Your account is protected with hashed passwords and expiring sessions.
        </div>
      </section>

      <section className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-5 py-5 lg:hidden">
          <BrandMark />
          <BrandDots />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-10">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 pb-6 text-xs text-app-muted">
          <Link to="/privacy-policy" className="hover:text-app-text">
            Privacy Policy
          </Link>
          <Link to="/terms-of-service" className="hover:text-app-text">
            Terms of Service
          </Link>
          <Link to="/" className="hover:text-app-text">
            Browse Npop
          </Link>
        </footer>
      </section>
    </div>
  )
}

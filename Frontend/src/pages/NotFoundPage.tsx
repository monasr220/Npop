import { Link, useNavigate } from "react-router-dom"
import { Compass, Home, Search } from "lucide-react"
import { BrandDots, BrandMark } from "../components/layout/BrandMark"
import { Button } from "../components/ui/Button"

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center text-center">
      <BrandMark />
      <div className="mt-8">
        <BrandDots />
      </div>
      <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-brand-primary">
        404 — Page not found
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-app-text sm:text-4xl">
        This track is not on the record.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-app-muted">
        The page may have moved, been removed, or never existed. Head back to
        discovery, or search for the music, artist or listener you were looking
        for.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/">
          <Button icon={<Home size={16} />}>Back to discovery</Button>
        </Link>
        <Button
          variant="secondary"
          icon={<Search size={16} />}
          onClick={() => navigate("/search")}
        >
          Search Npop
        </Button>
        <Link to="/artists">
          <Button variant="ghost" icon={<Compass size={16} />}>
            Browse artists
          </Button>
        </Link>
      </div>
    </div>
  )
}

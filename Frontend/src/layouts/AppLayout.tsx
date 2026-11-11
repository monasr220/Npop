import { useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Footer } from "../components/layout/Footer"
import { PlayerBar } from "../components/layout/PlayerBar"
import { Sidebar } from "../components/layout/Sidebar"
import { Topbar } from "../components/layout/Topbar"

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-brand-solid focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-on"
      >
        Skip to content
      </a>

      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="animate-fade-in absolute inset-y-0 left-0 shadow-lift">
            <Sidebar mobile onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-[264px]">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main
          id="main"
          className="mx-auto w-full max-w-[1400px] px-4 pb-44 pt-6 sm:px-6 lg:px-8"
        >
          <Outlet />
        </main>
        <Footer />
      </div>

      <PlayerBar />
    </div>
  )
}

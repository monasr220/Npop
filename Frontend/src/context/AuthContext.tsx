import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { api } from "../services/api"
import type { Artist, User } from "../types"

interface AuthContextValue {
  user: User | null
  artist: Artist | null
  isLoading: boolean
  isAuthenticated: boolean
  isArtist: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<User>
  register: (
    username: string,
    email: string,
    password: string,
    bio?: string
  ) => Promise<User>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  setArtist: (artist: Artist | null) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [artist, setArtist] = useState<Artist | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadArtist = useCallback(async () => {
    try {
      setArtist(await api.getMyArtist())
    } catch {
      setArtist(null)
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!api.getToken()) {
      setUser(null)
      setArtist(null)
      return
    }
    const current = await api.me()
    setUser(current)
    await loadArtist()
  }, [loadArtist])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (api.getToken()) {
          const current = await api.me()
          if (cancelled) return
          setUser(current)
          await loadArtist()
        }
      } catch {
        api.clearToken()
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadArtist])

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null)
      setArtist(null)
    }
    window.addEventListener("npop:unauthorized", onUnauthorized)
    return () => window.removeEventListener("npop:unauthorized", onUnauthorized)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.login({ email, password })
      setUser(response.user)
      await loadArtist()
      return response.user
    },
    [loadArtist]
  )

  const register = useCallback(
    async (username: string, email: string, password: string, bio?: string) => {
      const response = await api.register({ username, email, password, bio })
      setUser(response.user)
      await loadArtist()
      return response.user
    },
    [loadArtist]
  )

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      setUser(null)
      setArtist(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      artist,
      isLoading,
      isAuthenticated: Boolean(user),
      isArtist: Boolean(artist),
      isAdmin: user?.role === "admin",
      login,
      register,
      logout,
      refresh,
      setArtist,
    }),
    [user, artist, isLoading, login, register, logout, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}

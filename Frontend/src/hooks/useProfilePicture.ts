import { useEffect, useState } from "react"
import { api } from "../services/api"

const cache = new Map<string, string | null>()

/** Resolve the most recent profile picture for a user, cached per session. */
export function useProfilePicture(userId?: string | null): string | null {
  const [src, setSrc] = useState<string | null>(() =>
    userId ? cache.get(userId) ?? null : null
  )

  useEffect(() => {
    if (!userId) {
      setSrc(null)
      return
    }
    if (cache.has(userId)) {
      setSrc(cache.get(userId) ?? null)
      return
    }
    let active = true
    api
      .getProfilePictures(userId)
      .then((pictures) => {
        const latest =
          pictures.length > 0 ? pictures[pictures.length - 1].image_url : null
        cache.set(userId, latest)
        if (active) setSrc(latest)
      })
      .catch(() => {
        cache.set(userId, null)
        if (active) setSrc(null)
      })
    return () => {
      active = false
    }
  }, [userId])

  return src
}

/** Forget a cached avatar after the owner changes their picture. */
export function invalidateProfilePicture(userId: string) {
  cache.delete(userId)
}

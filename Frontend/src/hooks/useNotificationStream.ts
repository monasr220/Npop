import { useCallback, useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { api } from "../services/api"

/**
 * Keep the unread notification count fresh using the backend SSE stream.
 *
 * `EventSource` cannot attach an Authorization header, so the stream is read
 * with `fetch` and parsed as Server-Sent Events. A slow poll is kept as a
 * fallback for proxies that buffer streaming responses.
 */
export function useNotificationStream() {
  const { isAuthenticated } = useAuth()
  const [unread, setUnread] = useState(0)

  const refresh = useCallback(async () => {
    if (!api.getToken()) {
      setUnread(0)
      return
    }
    try {
      const { count } = await api.getUnreadCount()
      setUnread(count)
    } catch {
      // The badge is non-critical; keep the last known value.
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setUnread(0)
      return
    }
    refresh()
    const timer = window.setInterval(refresh, 60_000)
    const onLocalChange = () => refresh()
    window.addEventListener("npop:notification", onLocalChange)
    window.addEventListener("npop:notifications-read", onLocalChange)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("npop:notification", onLocalChange)
      window.removeEventListener("npop:notifications-read", onLocalChange)
    }
  }, [isAuthenticated, refresh])

  useEffect(() => {
    if (!isAuthenticated) return
    const controller = new AbortController()
    let stopped = false
    let reconnectTimer: number | undefined

    async function connect() {
      while (!stopped) {
        try {
          const token = api.getToken()
          if (!token) return
          const response = await fetch("/api/notifications/stream", {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "text/event-stream",
            },
            signal: controller.signal,
          })
          if (!response.ok || !response.body) {
            throw new Error(`Stream unavailable (${response.status})`)
          }
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ""

          while (!stopped) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            let boundary = buffer.indexOf("\n\n")
            while (boundary >= 0) {
              const chunk = buffer.slice(0, boundary)
              buffer = buffer.slice(boundary + 2)
              const data = chunk
                .split("\n")
                .filter((line) => line.startsWith("data:"))
                .map((line) => line.slice(5).trim())
                .join("\n")
              if (data) {
                refresh()
                window.dispatchEvent(
                  new CustomEvent("npop:notification", { detail: data })
                )
              }
              boundary = buffer.indexOf("\n\n")
            }
          }
        } catch {
          if (stopped || controller.signal.aborted) return
        }

        if (!stopped) {
          await new Promise<void>((resolve) => {
            reconnectTimer = window.setTimeout(resolve, 15_000)
          })
        }
      }
    }

    connect()
    return () => {
      stopped = true
      controller.abort()
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
    }
  }, [isAuthenticated, refresh])

  return { unread, refresh }
}

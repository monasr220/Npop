import { useCallback, useEffect, useState } from "react"
import { Bell, CheckCheck, Trash2 } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { useAsyncData } from "../hooks/useAsyncData"
import { api } from "../services/api"
import type { Notification } from "../types"
import { cn } from "../utils/cn"
import { formatRelative } from "../utils/format"
import { Button } from "../components/ui/Button"
import { EmptyState, ErrorState, PageLoader } from "../components/ui/Feedback"
import { PageHeader } from "../components/ui/PageHeader"
import { Tabs } from "../components/ui/Tabs"

export default function NotificationsPage() {
  const { isAuthenticated } = useAuth()
  const { notify } = useToast()
  const [scope, setScope] = useState<"all" | "unread">("all")
  const [items, setItems] = useState<Notification[]>([])
  const [busy, setBusy] = useState(false)
  const [nonce, setNonce] = useState(0)

  const { data, loading, error, reload } = useAsyncData(
    () => api.getNotifications(scope === "unread", 0, 100),
    [scope, nonce],
    { enabled: isAuthenticated }
  )

  useEffect(() => {
    if (data) setItems(data)
  }, [data])

  const refresh = useCallback(() => setNonce((value) => value + 1), [])

  useEffect(() => {
    const onNotification = () => refresh()
    window.addEventListener("npop:notification", onNotification)
    return () => window.removeEventListener("npop:notification", onNotification)
  }, [refresh])

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Sign in to see notifications"
        description="Likes, comments, follows and artist updates are delivered to your account."
        icon={<Bell size={22} />}
      />
    )
  }

  async function markRead(notification: Notification) {
    if (notification.status === "read") return
    try {
      await api.markAsRead(notification.id)
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, status: "read" } : item
        )
      )
      window.dispatchEvent(new CustomEvent("npop:notifications-read"))
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not mark as read", "error")
    }
  }

  async function markAllRead() {
    setBusy(true)
    try {
      const result = await api.markAllAsRead()
      setItems((current) => current.map((item) => ({ ...item, status: "read" })))
      window.dispatchEvent(new CustomEvent("npop:notifications-read"))
      notify(
        result.updated > 0
          ? `${result.updated} notification${result.updated === 1 ? "" : "s"} marked as read`
          : "You are already up to date",
        "success"
      )
      if (scope === "unread") reload()
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not mark all as read", "error")
    } finally {
      setBusy(false)
    }
  }

  async function remove(notification: Notification) {
    try {
      await api.deleteNotification(notification.id)
      setItems((current) => current.filter((item) => item.id !== notification.id))
      window.dispatchEvent(new CustomEvent("npop:notifications-read"))
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not delete notification", "error")
    }
  }

  const unreadCount = items.filter((item) => item.status === "unread").length

  return (
    <div>
      <PageHeader
        eyebrow="Notifications"
        title="Your activity"
        subtitle="Likes, comments, follows and updates from across Npop."
        actions={
          <Button
            variant="secondary"
            size="sm"
            loading={busy}
            icon={<CheckCheck size={15} />}
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            Mark all read
          </Button>
        }
      />

      <Tabs
        value={scope}
        onChange={setScope}
        tabs={[
          { value: "all", label: "All notifications" },
          { value: "unread", label: "Unread", count: unreadCount },
        ]}
        className="mb-5 w-fit"
      />

      {loading ? (
        <PageLoader label="Loading notifications…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title={scope === "unread" ? "No unread notifications" : "No notifications yet"}
          description={
            scope === "unread"
              ? "You have read everything. New activity will appear here."
              : "When people interact with you or artists you follow, it shows up here."
          }
          icon={<Bell size={22} />}
        />
      ) : (
        <ul className="surface-card divide-y divide-app-border/60 p-2">
          {items.map((notification) => {
            const unread = notification.status === "unread"
            return (
              <li
                key={notification.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl px-3 py-3 transition-colors",
                  unread ? "bg-brand-primary/5" : "hover:bg-app-raised/60"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full",
                    unread
                      ? "bg-brand-primary/15 text-brand-primary"
                      : "bg-app-raised text-app-muted"
                  )}
                >
                  <Bell size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "break-words text-sm",
                      unread ? "font-semibold text-app-text" : "text-app-text"
                    )}
                  >
                    {notification.message}
                  </p>
                  <p className="mt-0.5 text-xs text-app-muted">
                    {formatRelative(notification.created_at)}
                    {unread && (
                      <span className="ml-2 rounded-full bg-brand-primary/10 px-1.5 py-0.5 text-[0.62rem] font-semibold text-brand-primary">
                        New
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {unread && (
                    <button
                      type="button"
                      onClick={() => markRead(notification)}
                      aria-label="Mark as read"
                      className="rounded-full p-1.5 text-app-muted hover:bg-app-surface hover:text-brand-success"
                    >
                      <CheckCheck size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(notification)}
                    aria-label="Delete notification"
                    className="rounded-full p-1.5 text-app-muted hover:bg-brand-social/10 hover:text-brand-social"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { api } from "../services/api"
import type { Post } from "../types"
import { Button } from "../components/ui/Button"
import { EmptyState, ErrorState, PageLoader } from "../components/ui/Feedback"
import { PageHeader } from "../components/ui/PageHeader"
import { Tabs } from "../components/ui/Tabs"
import { PostCard } from "../components/social/PostCard"
import { PostComposer } from "../components/social/PostComposer"

const PAGE_SIZE = 20

export default function FeedPage() {
  const { user, isAuthenticated } = useAuth()
  const [scope, setScope] = useState<"all" | "mine">("all")
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    api
      .getPosts(scope === "mine" ? user?.id : undefined, 0, PAGE_SIZE)
      .then((data) => {
        if (active) setPosts(data)
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Could not load the feed.")
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [scope, user?.id, nonce])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const next = await api.getPosts(
        scope === "mine" ? user?.id : undefined,
        posts.length,
        PAGE_SIZE
      )
      setPosts((current) => {
        const seen = new Set(current.map((post) => post.id))
        return [...current, ...next.filter((post) => !seen.has(post.id))]
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load more posts.")
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Social feed"
        title="What the community is sharing"
        subtitle="Posts, attached tracks, comments and ratings from listeners and artists across Npop."
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={15} />}
            onClick={() => setNonce((value) => value + 1)}
          >
            Refresh
          </Button>
        }
      />

      <div className="mx-auto max-w-3xl space-y-5">
        <PostComposer
          onCreated={(post) => {
            setPosts((current) => [post, ...current])
            if (scope === "mine") setScope("all")
          }}
        />

        {isAuthenticated && (
          <Tabs
            value={scope}
            onChange={setScope}
            tabs={[
              { value: "all", label: "All posts" },
              { value: "mine", label: "Your posts" },
            ]}
            className="w-fit"
          />
        )}

        {loading ? (
          <PageLoader label="Loading posts…" />
        ) : error ? (
          <ErrorState message={error} onRetry={() => setNonce((value) => value + 1)} />
        ) : posts.length === 0 ? (
          <EmptyState
            title={scope === "mine" ? "You have not posted yet" : "The feed is empty"}
            description={
              scope === "mine"
                ? "Share a track or a thought to start your posting history."
                : "Be the first to publish a post and get the conversation going."
            }
            icon="✎"
          />
        ) : (
          <>
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onChanged={() => setNonce((value) => value + 1)}
                  onDeleted={(postId) =>
                    setPosts((current) => current.filter((item) => item.id !== postId))
                  }
                />
              ))}
            </div>
            <div className="flex justify-center">
              <Button
                variant="secondary"
                loading={loadingMore}
                onClick={loadMore}
                disabled={posts.length < PAGE_SIZE}
              >
                {posts.length < PAGE_SIZE ? "You are all caught up" : "Load more posts"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Send,
  Share2,
  Trash2,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { useAsyncData } from "../../hooks/useAsyncData"
import { useProfilePicture } from "../../hooks/useProfilePicture"
import { api } from "../../services/api"
import type { Post, PostComment } from "../../types"
import { cn } from "../../utils/cn"
import { formatRelative } from "../../utils/format"
import { Avatar } from "../ui/Avatar"
import { Button } from "../ui/Button"
import { ConfirmDialog } from "../ui/ConfirmDialog"
import { Dropdown, DropdownItem, DropdownSeparator } from "../ui/Dropdown"
import { Textarea } from "../ui/Field"
import { TrackAttachment } from "../music/TrackAttachment"
import { StarRating } from "./StarRating"

function CommentRow({
  comment,
  canDelete,
  onDelete,
}: {
  comment: PostComment
  canDelete: boolean
  onDelete: () => void
}) {
  const avatar = useProfilePicture(comment.user_id)
  return (
    <li className="flex gap-2.5">
      <Avatar name={comment.user?.username ?? "Listener"} src={avatar} size="sm" />
      <div className="min-w-0 flex-1 rounded-xl bg-app-raised/60 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <Link
            to={`/users/${comment.user_id}`}
            className="truncate text-xs font-semibold text-app-text hover:underline"
          >
            {comment.user?.username ?? "Listener"}
          </Link>
          <span className="shrink-0 text-[0.68rem] text-app-muted">
            {formatRelative(comment.created_at)}
          </span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-app-text">
          {comment.comment}
        </p>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="mt-1 text-[0.68rem] font-medium text-app-muted hover:text-brand-social"
          >
            Delete
          </button>
        )}
      </div>
    </li>
  )
}

export function PostCard({
  post,
  onChanged,
  onDeleted,
}: {
  post: Post
  onChanged?: () => void
  onDeleted?: (postId: string) => void
}) {
  const { user, isAuthenticated } = useAuth()
  const { notify } = useToast()
  const avatar = useProfilePicture(post.user_id)
  const isOwner = user?.id === post.user_id

  const [likesCount, setLikesCount] = useState(post.likes_count ?? 0)
  const [commentsCount, setCommentsCount] = useState(post.comments_count ?? 0)
  const [average, setAverage] = useState<number | null>(post.average_rating ?? null)
  const [ratingCount, setRatingCount] = useState(post.rating_count ?? 0)
  const [myRating, setMyRating] = useState<number | null>(null)

  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(post.content ?? "")
  const [showDelete, setShowDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setLikesCount(post.likes_count ?? 0)
    setCommentsCount(post.comments_count ?? 0)
    setAverage(post.average_rating ?? null)
    setRatingCount(post.rating_count ?? 0)
  }, [
    post.id,
    post.likes_count,
    post.comments_count,
    post.average_rating,
    post.rating_count,
  ])

  const { data: likes, reload: reloadLikes } = useAsyncData(
    () => api.getLikes(post.id),
    [post.id],
    { enabled: isAuthenticated }
  )
  const myLike = Boolean(
    likes?.some((like) => like.user_id === user?.id && like.liked)
  )

  const { data: comments, reload: reloadComments } = useAsyncData(
    () => api.getComments(post.id),
    [post.id],
    { enabled: showComments }
  )

  const { data: myRatingData } = useAsyncData(
    () => api.getMyRating(post.id),
    [post.id],
    { enabled: isAuthenticated }
  )

  useEffect(() => {
    setMyRating(myRatingData?.rating ?? null)
  }, [myRatingData])

  const { data: originalPost } = useAsyncData(
    () => api.getPost(post.original_post_id ?? ""),
    [post.original_post_id],
    { enabled: Boolean(post.original_post_id) }
  )

  async function toggleLike() {
    if (!isAuthenticated) {
      notify("Sign in to like posts", "info")
      return
    }
    const next = !myLike
    setLikesCount((count) => Math.max(0, count + (next ? 1 : -1)))
    try {
      if (next) await api.likePost(post.id)
      else await api.unlikePost(post.id)
      reloadLikes()
    } catch (error) {
      setLikesCount((count) => Math.max(0, count + (next ? -1 : 1)))
      notify(error instanceof Error ? error.message : "Could not update like", "error")
    }
  }

  async function submitRating(value: number) {
    if (!isAuthenticated) {
      notify("Sign in to rate posts", "info")
      return
    }
    try {
      await api.ratePost(post.id, value)
      const summary = await api.getRatingSummary(post.id)
      setAverage(summary.average_rating)
      setRatingCount(summary.rating_count)
      setMyRating(value)
      notify("Rating saved", "success")
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save rating", "error")
    }
  }

  async function addComment() {
    const text = commentText.trim()
    if (!text) return
    if (!isAuthenticated) {
      notify("Sign in to comment", "info")
      return
    }
    setBusy(true)
    try {
      await api.addComment(post.id, text)
      setCommentText("")
      setCommentsCount((count) => count + 1)
      setShowComments(true)
      reloadComments()
      notify("Comment added", "success")
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not add comment", "error")
    } finally {
      setBusy(false)
    }
  }

  async function removeComment(commentId: string) {
    try {
      await api.deleteComment(post.id, commentId)
      setCommentsCount((count) => Math.max(0, count - 1))
      reloadComments()
      notify("Comment deleted", "success")
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not delete comment", "error")
    }
  }

  async function saveEdit() {
    setBusy(true)
    try {
      await api.updatePost(post.id, { content: editText.trim() || null })
      setEditing(false)
      notify("Post updated", "success")
      onChanged?.()
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update post", "error")
    } finally {
      setBusy(false)
    }
  }

  async function deletePost() {
    setBusy(true)
    try {
      await api.deletePost(post.id)
      notify("Post deleted", "success")
      onDeleted?.(post.id)
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not delete post", "error")
    } finally {
      setBusy(false)
      setShowDelete(false)
    }
  }

  async function repost() {
    if (!isAuthenticated) {
      notify("Sign in to repost", "info")
      return
    }
    try {
      await api.repost(post.id)
      notify("Reposted to your feed", "success")
      onChanged?.()
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not repost", "error")
    }
  }

  async function share() {
    const url = `${window.location.origin}/feed#post-${post.id}`
    try {
      await navigator.clipboard.writeText(url)
      notify("Link copied", "success")
    } catch {
      notify("Could not copy link", "error")
    }
  }

  return (
    <article
      id={`post-${post.id}`}
      className="surface-card p-4 transition-colors hover:border-app-border/80"
    >
      <header className="flex items-start gap-3">
        <Link to={`/users/${post.user_id}`} aria-label={`Open ${post.user?.username ?? "user"}'s profile`}>
          <Avatar name={post.user?.username ?? "Listener"} src={avatar} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link
              to={`/users/${post.user_id}`}
              className="truncate text-sm font-semibold text-app-text hover:underline"
            >
              {post.user?.username ?? "Listener"}
            </Link>
            {post.user?.role === "artist" && (
              <span className="rounded-full bg-brand-primary/10 px-1.5 py-0.5 text-[0.62rem] font-semibold text-brand-primary">
                Artist
              </span>
            )}
            <span className="text-xs text-app-muted">·</span>
            <time
              dateTime={post.created_at}
              className="text-xs text-app-muted"
            >
              {formatRelative(post.created_at)}
            </time>
            {post.original_post_id && (
              <span className="text-xs text-app-muted">· reposted</span>
            )}
          </div>
          {post.user?.bio && (
            <p className="mt-0.5 line-clamp-1 text-xs text-app-muted">{post.user.bio}</p>
          )}
        </div>
        <Dropdown
          label="Post actions"
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-label="Post actions"
              className="rounded-full p-1.5 text-app-muted transition-colors hover:bg-app-raised hover:text-app-text"
            >
              <MoreHorizontal size={18} />
            </button>
          )}
        >
          {isOwner && (
            <>
              <DropdownItem
                onClick={() => {
                  setEditing(true)
                  setEditText(post.content ?? "")
                }}
              >
                <Pencil size={15} /> Edit post
              </DropdownItem>
              <DropdownItem danger onClick={() => setShowDelete(true)}>
                <Trash2 size={15} /> Delete post
              </DropdownItem>
              <DropdownSeparator />
            </>
          )}
          <DropdownItem onClick={repost}>
            <Repeat2 size={15} /> Repost
          </DropdownItem>
          <DropdownItem onClick={share}>
            <Share2 size={15} /> Copy link
          </DropdownItem>
        </Dropdown>
      </header>

      {editing ? (
        <div className="mt-3">
          <Textarea
            value={editText}
            maxLength={1024}
            onChange={(event) => setEditText(event.target.value)}
            aria-label="Edit post content"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={busy} onClick={saveEdit}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        post.content && (
          <p className="mt-3 whitespace-pre-wrap break-words text-[0.94rem] leading-6 text-app-text">
            {post.content}
          </p>
        )
      )}

      {post.image && (
        <img
          src={post.image}
          alt="Post attachment"
          loading="lazy"
          className="mt-3 max-h-[420px] w-full rounded-xl border border-app-border object-cover"
        />
      )}
      {post.video && (
        <video
          src={post.video}
          controls
          preload="metadata"
          className="mt-3 max-h-[420px] w-full rounded-xl border border-app-border"
        />
      )}
      {post.track && <TrackAttachment track={post.track} />}

      {post.original_post_id && (
        <div className="mt-3 rounded-xl border border-app-border bg-app-raised/40 p-3">
          {originalPost ? (
            <>
              <p className="text-xs font-semibold text-app-text">
                {originalPost.user?.username ?? "Original post"}
              </p>
              {originalPost.content && (
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-app-muted">
                  {originalPost.content}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-app-muted">Original post unavailable.</p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-app-border/60 pt-3">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={myLike}
          aria-label={myLike ? "Unlike post" : "Like post"}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium transition-colors",
            myLike
              ? "text-brand-social"
              : "text-app-muted hover:bg-brand-social/10 hover:text-brand-social"
          )}
        >
          <Heart size={16} className={myLike ? "fill-current" : ""} />
          {likesCount}
        </button>

        <button
          type="button"
          onClick={() => setShowComments((value) => !value)}
          aria-expanded={showComments}
          className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-app-muted transition-colors hover:bg-app-raised hover:text-app-text"
        >
          <MessageCircle size={16} />
          {commentsCount}
        </button>

        <button
          type="button"
          onClick={repost}
          className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-app-muted transition-colors hover:bg-app-raised hover:text-app-text"
        >
          <Repeat2 size={16} />
          Repost
        </button>

        <StarRating
          value={average}
          count={ratingCount}
          onChange={isAuthenticated ? submitRating : undefined}
          className="ml-auto"
        />
        {myRating && (
          <span className="text-[0.68rem] text-brand-success">
            You rated {myRating}/5
          </span>
        )}
      </div>

      {showComments && (
        <div className="mt-3 border-t border-app-border/60 pt-3">
          {comments && comments.length > 0 ? (
            <ul className="space-y-2.5">
              {comments.map((comment) => (
                <CommentRow
                  key={comment.id}
                  comment={comment}
                  canDelete={Boolean(user && user.id === comment.user_id)}
                  onDelete={() => removeComment(comment.id)}
                />
              ))}
            </ul>
          ) : (
            <p className="text-xs text-app-muted">
              No comments yet. Start the conversation.
            </p>
          )}
          <div className="mt-3 flex items-end gap-2">
            <Textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder={isAuthenticated ? "Add a comment…" : "Sign in to comment"}
              disabled={!isAuthenticated}
              aria-label="Add a comment"
              className="min-h-[44px] py-2"
            />
            <Button
              size="sm"
              loading={busy}
              disabled={!commentText.trim() || !isAuthenticated}
              onClick={addComment}
              icon={<Send size={14} />}
              aria-label="Send comment"
            >
              Send
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete this post?"
        description="The post, its comments and likes will be removed."
        confirmLabel="Delete post"
        loading={busy}
        onConfirm={deletePost}
        onCancel={() => setShowDelete(false)}
      />
    </article>
  )
}

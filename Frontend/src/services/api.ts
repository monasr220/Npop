import axios, { AxiosError, type AxiosInstance } from "axios"
import type {
  Album,
  AlbumDetail,
  ApiError,
  Artist,
  CoverPhoto,
  FollowCounts,
  FollowState,
  Hashtag,
  Like,
  LoginRequest,
  Notification,
  PlayHistory,
  Playlist,
  PlaylistDetail,
  PlaylistTrack,
  Post,
  PostComment,
  PostRating,
  ProfileMusic,
  ProfilePicture,
  ProfileTrack,
  RatingSummary,
  RegisterRequest,
  SocialLink,
  TokenResponse,
  Track,
  User,
  UserPublic,
} from "../types"

const TOKEN_KEY = "npop_token"

/** Thrown for every non-2xx API response, with a human-readable message. */
export class ApiRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiRequestError"
    this.status = status
  }
}

function messageFrom(error: AxiosError<ApiError>): string {
  const detail = error.response?.data?.detail
  if (typeof detail === "string") return detail
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(", ")
  }
  if (error.code === "ECONNABORTED") return "The request timed out."
  if (!error.response) return "Cannot reach the server. Is the backend running?"
  return `Request failed (${error.response.status}).`
}

class ApiClient {
  private client: AxiosInstance

  constructor() {
    // Same-origin in production; Vite proxies /api during development.
    this.client = axios.create({ baseURL: "/api", timeout: 30_000 })

    this.client.interceptors.request.use((config) => {
      const token = this.getToken()
      if (token) config.headers.Authorization = `Bearer ${token}`
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          this.clearToken()
          window.dispatchEvent(new CustomEvent("npop:unauthorized"))
        }
        return Promise.reject(
          new ApiRequestError(messageFrom(error), error.response?.status ?? 0)
        )
      }
    )
  }

  // -------------------------------------------------------------- token
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token)
  }

  clearToken() {
    localStorage.removeItem(TOKEN_KEY)
  }

  // --------------------------------------------------------------- auth
  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await this.client.post<TokenResponse>("/auth/login", data)
    this.setToken(response.data.access_token)
    return response.data
  }

  async register(data: RegisterRequest): Promise<TokenResponse> {
    const response = await this.client.post<TokenResponse>("/auth/register", data)
    this.setToken(response.data.access_token)
    return response.data
  }

  async logout(): Promise<void> {
    try {
      await this.client.post("/auth/logout")
    } finally {
      this.clearToken()
    }
  }

  async me(): Promise<User> {
    const response = await this.client.get<User>("/auth/me")
    return response.data
  }

  // -------------------------------------------------------------- users
  async getUsers(q?: string, skip = 0, limit = 50): Promise<UserPublic[]> {
    const response = await this.client.get<UserPublic[]>("/users", {
      params: { q, skip, limit },
    })
    return response.data
  }

  async getUser(id: string): Promise<UserPublic> {
    const response = await this.client.get<UserPublic>(`/users/${id}`)
    return response.data
  }

  async updateUser(
    id: string,
    data: Partial<User> & { password?: string }
  ): Promise<User> {
    const response = await this.client.patch<User>(`/users/${id}`, data)
    return response.data
  }

  async deleteUser(id: string): Promise<void> {
    await this.client.delete(`/users/${id}`)
  }

  async followUser(id: string): Promise<void> {
    await this.client.post(`/users/${id}/follow`)
  }

  async unfollowUser(id: string): Promise<void> {
    await this.client.delete(`/users/${id}/follow`)
  }

  async getFollowers(id: string): Promise<UserPublic[]> {
    const response = await this.client.get<UserPublic[]>(`/users/${id}/followers`)
    return response.data
  }

  async getFollowings(id: string): Promise<UserPublic[]> {
    const response = await this.client.get<UserPublic[]>(`/users/${id}/followings`)
    return response.data
  }

  async getFollowCounts(id: string): Promise<FollowCounts> {
    const response = await this.client.get<FollowCounts>(`/users/${id}/follow-counts`)
    return response.data
  }

  async isFollowing(id: string, targetId: string): Promise<FollowState> {
    const response = await this.client.get<FollowState>(
      `/users/${id}/is-following/${targetId}`
    )
    return response.data
  }

  async getFavorites(userId: string, skip = 0, limit = 50): Promise<Track[]> {
    const response = await this.client.get<Track[]>(`/users/${userId}/favorites`, {
      params: { skip, limit },
    })
    return response.data
  }

  async addFavorite(userId: string, trackId: string): Promise<void> {
    await this.client.post(`/users/${userId}/favorites/${trackId}`)
  }

  async removeFavorite(userId: string, trackId: string): Promise<void> {
    await this.client.delete(`/users/${userId}/favorites/${trackId}`)
  }

  async getProfileTracks(userId: string): Promise<ProfileTrack[]> {
    const response = await this.client.get<ProfileTrack[]>(
      `/users/${userId}/profile-tracks`
    )
    return response.data
  }

  async addProfileTrack(userId: string, trackId: string): Promise<ProfileTrack> {
    const response = await this.client.post<ProfileTrack>(
      `/users/${userId}/profile-tracks`,
      { track_id: trackId }
    )
    return response.data
  }

  async removeProfileTrack(userId: string, trackId: string): Promise<void> {
    await this.client.delete(`/users/${userId}/profile-tracks/${trackId}`)
  }

  async reorderProfileTracks(
    userId: string,
    trackIds: string[]
  ): Promise<ProfileTrack[]> {
    const response = await this.client.patch<ProfileTrack[]>(
      `/users/${userId}/profile-tracks/reorder`,
      { track_ids: trackIds }
    )
    return response.data
  }

  async getHistory(userId: string, limit = 50): Promise<PlayHistory[]> {
    const response = await this.client.get<PlayHistory[]>(`/users/${userId}/history`, {
      params: { limit },
    })
    return response.data
  }

  async getRecentlyPlayed(userId: string, limit = 20): Promise<Track[]> {
    const response = await this.client.get<Track[]>(
      `/users/${userId}/recently-played`,
      { params: { limit } }
    )
    return response.data
  }

  async getMostPlayedForUser(userId: string, limit = 10): Promise<Track[]> {
    const response = await this.client.get<Track[]>(`/users/${userId}/most-played`, {
      params: { limit },
    })
    return response.data
  }

  async getProfileMusic(userId: string): Promise<ProfileMusic> {
    const response = await this.client.get<ProfileMusic>(`/users/${userId}/music`)
    return response.data
  }

  async getProfilePictures(userId: string): Promise<ProfilePicture[]> {
    const response = await this.client.get<ProfilePicture[]>(
      `/users/${userId}/profile-pictures`
    )
    return response.data
  }

  async setProfilePicture(userId: string, imageUrl: string): Promise<ProfilePicture> {
    const response = await this.client.post<ProfilePicture>(
      `/users/${userId}/profile-picture`,
      { image_url: imageUrl }
    )
    return response.data
  }

  async getCoverPhotos(userId: string): Promise<CoverPhoto[]> {
    const response = await this.client.get<CoverPhoto[]>(
      `/users/${userId}/cover-photos`
    )
    return response.data
  }

  async setCoverPhoto(userId: string, imageUrl: string): Promise<CoverPhoto> {
    const response = await this.client.post<CoverPhoto>(
      `/users/${userId}/cover-photo`,
      { image_url: imageUrl }
    )
    return response.data
  }

  async getSocialLinks(userId: string): Promise<SocialLink[]> {
    const response = await this.client.get<SocialLink[]>(
      `/users/${userId}/social-links`
    )
    return response.data
  }

  async setSocialLinks(userId: string, links: string[]): Promise<SocialLink[]> {
    const response = await this.client.put<SocialLink[]>(
      `/users/${userId}/social-links`,
      { links }
    )
    return response.data
  }

  // ------------------------------------------------------------ artists
  async getArtists(q?: string, skip = 0, limit = 50): Promise<Artist[]> {
    const response = await this.client.get<Artist[]>("/artists", {
      params: { q, skip, limit },
    })
    return response.data
  }

  async getArtist(id: string): Promise<Artist> {
    const response = await this.client.get<Artist>(`/artists/${id}`)
    return response.data
  }

  async getMyArtist(): Promise<Artist> {
    const response = await this.client.get<Artist>("/artists/me")
    return response.data
  }

  async createArtist(data: {
    name: string
    bio?: string
    image_url?: string
  }): Promise<Artist> {
    const response = await this.client.post<Artist>("/artists", data)
    return response.data
  }

  async updateArtist(id: string, data: Partial<Artist>): Promise<Artist> {
    const response = await this.client.patch<Artist>(`/artists/${id}`, data)
    return response.data
  }

  async verifyArtist(id: string, verified: boolean): Promise<Artist> {
    const response = await this.client.post<Artist>(`/artists/${id}/verify`, {
      verified,
    })
    return response.data
  }

  async getArtistAlbums(id: string): Promise<Album[]> {
    const response = await this.client.get<Album[]>(`/artists/${id}/albums`)
    return response.data
  }

  async getArtistTracks(id: string): Promise<Track[]> {
    const response = await this.client.get<Track[]>(`/artists/${id}/tracks`)
    return response.data
  }

  // ------------------------------------------------------------- albums
  async getAlbums(artistId?: string, skip = 0, limit = 50): Promise<Album[]> {
    const response = await this.client.get<Album[]>("/albums", {
      params: { artist_id: artistId, skip, limit },
    })
    return response.data
  }

  async getAlbum(id: string): Promise<AlbumDetail> {
    const response = await this.client.get<AlbumDetail>(`/albums/${id}`)
    return response.data
  }

  async createAlbum(data: {
    title: string
    artist_id: string
    release_year?: number
    kind?: string
    cover_url?: string
  }): Promise<Album> {
    const response = await this.client.post<Album>("/albums", data)
    return response.data
  }

  async updateAlbum(id: string, data: Partial<Album>): Promise<Album> {
    const response = await this.client.patch<Album>(`/albums/${id}`, data)
    return response.data
  }

  async deleteAlbum(id: string): Promise<void> {
    await this.client.delete(`/albums/${id}`)
  }

  async uploadAlbumCover(id: string, file: File): Promise<Album> {
    const form = new FormData()
    form.append("file", file)
    const response = await this.client.post<Album>(`/albums/${id}/cover`, form)
    return response.data
  }

  async getAlbumTracks(id: string): Promise<Track[]> {
    const response = await this.client.get<Track[]>(`/albums/${id}/tracks`)
    return response.data
  }

  // ------------------------------------------------------------- tracks
  async getTracks(
    params: {
      q?: string
      artistId?: string
      albumId?: string
      skip?: number
      limit?: number
    } = {}
  ): Promise<Track[]> {
    const response = await this.client.get<Track[]>("/tracks", {
      params: {
        q: params.q,
        artist_id: params.artistId,
        album_id: params.albumId,
        skip: params.skip ?? 0,
        limit: params.limit ?? 50,
      },
    })
    return response.data
  }

  async getMostPlayed(limit = 10): Promise<Track[]> {
    const response = await this.client.get<Track[]>("/tracks/most-played", {
      params: { limit },
    })
    return response.data
  }

  async getTrack(id: string): Promise<Track> {
    const response = await this.client.get<Track>(`/tracks/${id}`)
    return response.data
  }

  async playTrack(id: string): Promise<Track> {
    const response = await this.client.post<Track>(`/tracks/${id}/play`)
    return response.data
  }

  async uploadHostedTrack(data: {
    title: string
    album_id: string
    duration?: number
    audio_url: string
    track_number?: number
    explicit?: boolean
  }): Promise<Track> {
    const response = await this.client.post<Track>("/tracks/hosted", data)
    return response.data
  }

  async uploadTrackFile(data: {
    title: string
    album_id: string
    duration?: number
    track_number?: number
    explicit?: boolean
    file: File
  }): Promise<Track> {
    const form = new FormData()
    form.append("title", data.title)
    form.append("album_id", data.album_id)
    form.append("duration", String(data.duration ?? 0))
    form.append("track_number", String(data.track_number ?? 1))
    form.append("explicit", String(data.explicit ?? false))
    form.append("file", data.file)
    const response = await this.client.post<Track>("/tracks", form)
    return response.data
  }

  async updateTrack(id: string, data: Partial<Track>): Promise<Track> {
    const response = await this.client.patch<Track>(`/tracks/${id}`, data)
    return response.data
  }

  async deleteTrack(id: string): Promise<void> {
    await this.client.delete(`/tracks/${id}`)
  }

  // ---------------------------------------------------------- playlists
  async getPlaylists(
    ownerId?: string,
    system = false,
    skip = 0,
    limit = 50
  ): Promise<Playlist[]> {
    const response = await this.client.get<Playlist[]>("/playlists", {
      params: { owner_id: ownerId, system, skip, limit },
    })
    return response.data
  }

  async getPlaylist(id: string): Promise<PlaylistDetail> {
    const response = await this.client.get<PlaylistDetail>(`/playlists/${id}`)
    return response.data
  }

  async createPlaylist(data: {
    name: string
    description?: string
    cover_url?: string
  }): Promise<Playlist> {
    const response = await this.client.post<Playlist>("/playlists", data)
    return response.data
  }

  async updatePlaylist(id: string, data: Partial<Playlist>): Promise<Playlist> {
    const response = await this.client.patch<Playlist>(`/playlists/${id}`, data)
    return response.data
  }

  async deletePlaylist(id: string): Promise<void> {
    await this.client.delete(`/playlists/${id}`)
  }

  async addTrackToPlaylist(
    playlistId: string,
    trackId: string
  ): Promise<PlaylistTrack> {
    const response = await this.client.post<PlaylistTrack>(
      `/playlists/${playlistId}/tracks`,
      { track_id: trackId }
    )
    return response.data
  }

  async reorderPlaylistTracks(
    playlistId: string,
    trackIds: string[]
  ): Promise<PlaylistTrack[]> {
    const response = await this.client.put<PlaylistTrack[]>(
      `/playlists/${playlistId}/tracks/reorder`,
      { track_ids: trackIds }
    )
    return response.data
  }

  async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    await this.client.delete(`/playlists/${playlistId}/tracks/${trackId}`)
  }

  async getPlaylistArtists(playlistId: string): Promise<Artist[]> {
    const response = await this.client.get<Artist[]>(
      `/playlists/${playlistId}/artists`
    )
    return response.data
  }

  // -------------------------------------------------------------- posts
  async getPosts(userId?: string, skip = 0, limit = 50): Promise<Post[]> {
    const response = await this.client.get<Post[]>("/posts", {
      params: { user_id: userId, skip, limit },
    })
    return response.data
  }

  async getPost(id: string): Promise<Post> {
    const response = await this.client.get<Post>(`/posts/${id}`)
    return response.data
  }

  async createPost(data: {
    content?: string | null
    image?: string | null
    video?: string | null
    track_id?: string | null
  }): Promise<Post> {
    const response = await this.client.post<Post>("/posts", data)
    return response.data
  }

  async updatePost(id: string, data: Partial<Post>): Promise<Post> {
    const response = await this.client.patch<Post>(`/posts/${id}`, data)
    return response.data
  }

  async deletePost(id: string): Promise<void> {
    await this.client.delete(`/posts/${id}`)
  }

  async likePost(id: string): Promise<Like> {
    const response = await this.client.post<Like>(`/posts/${id}/like`)
    return response.data
  }

  async unlikePost(id: string): Promise<void> {
    await this.client.delete(`/posts/${id}/like`)
  }

  async getLikes(postId: string): Promise<Like[]> {
    const response = await this.client.get<Like[]>(`/posts/${postId}/likes`)
    return response.data
  }

  async getComments(postId: string): Promise<PostComment[]> {
    const response = await this.client.get<PostComment[]>(
      `/posts/${postId}/comments`
    )
    return response.data
  }

  async addComment(postId: string, comment: string): Promise<PostComment> {
    const response = await this.client.post<PostComment>(
      `/posts/${postId}/comments`,
      { comment }
    )
    return response.data
  }

  async updateComment(
    postId: string,
    commentId: string,
    comment: string
  ): Promise<PostComment> {
    const response = await this.client.patch<PostComment>(
      `/posts/${postId}/comments/${commentId}`,
      { comment }
    )
    return response.data
  }

  async deleteComment(postId: string, commentId: string): Promise<void> {
    await this.client.delete(`/posts/${postId}/comments/${commentId}`)
  }

  async ratePost(postId: string, rating: number): Promise<PostRating> {
    const response = await this.client.post<PostRating>(
      `/posts/${postId}/rating`,
      { rating }
    )
    return response.data
  }

  async getMyRating(postId: string): Promise<PostRating | null> {
    const response = await this.client.get<PostRating | null>(
      `/posts/${postId}/rating`
    )
    return response.data
  }

  async removeRating(postId: string): Promise<void> {
    await this.client.delete(`/posts/${postId}/rating`)
  }

  async getRatingSummary(postId: string): Promise<RatingSummary> {
    const response = await this.client.get<RatingSummary>(
      `/posts/${postId}/ratings/summary`
    )
    return response.data
  }

  async repost(postId: string, content?: string | null): Promise<Post> {
    const response = await this.client.post<Post>(`/posts/${postId}/repost`, {
      content: content ?? null,
    })
    return response.data
  }

  // ----------------------------------------------------------- hashtags
  async getHashtags(limit = 50): Promise<Hashtag[]> {
    const response = await this.client.get<Hashtag[]>("/hashtags", {
      params: { limit },
    })
    return response.data
  }

  async getTrendingHashtags(limit = 10): Promise<Hashtag[]> {
    const response = await this.client.get<Hashtag[]>("/hashtags/trending", {
      params: { limit },
    })
    return response.data
  }

  async getHashtag(tag: string): Promise<Hashtag> {
    const response = await this.client.get<Hashtag>(`/hashtags/${tag}`)
    return response.data
  }

  async createHashtag(tag: string, usage = 1): Promise<Hashtag> {
    const response = await this.client.post<Hashtag>("/hashtags", { tag, usage })
    return response.data
  }

  async deleteHashtag(tag: string): Promise<void> {
    await this.client.delete(`/hashtags/${tag}`)
  }

  // ------------------------------------------------------ notifications
  async getNotifications(
    unreadOnly = false,
    skip = 0,
    limit = 50
  ): Promise<Notification[]> {
    const response = await this.client.get<Notification[]>("/notifications", {
      params: { unread_only: unreadOnly, skip, limit },
    })
    return response.data
  }

  async getUnreadCount(): Promise<{ count: number }> {
    const response = await this.client.get<{ count: number }>(
      "/notifications/unread-count"
    )
    return response.data
  }

  async markAsRead(id: string): Promise<Notification> {
    const response = await this.client.post<Notification>(
      `/notifications/${id}/read`
    )
    return response.data
  }

  async markAllAsRead(): Promise<{ updated: number }> {
    const response = await this.client.post<{ updated: number }>(
      "/notifications/read-all"
    )
    return response.data
  }

  async deleteNotification(id: string): Promise<void> {
    await this.client.delete(`/notifications/${id}`)
  }
}

export const api = new ApiClient()

/** TypeScript mirrors of the backend Pydantic schemas. */

export type Role = "user" | "artist" | "admin"

export interface BaseRead {
  id: string
  created_at: string
}

// ------------------------------------------------------------------- users
export interface User extends BaseRead {
  username: string
  email: string
  bio?: string | null
  contact_info?: string | null
  role: Role
  last_login?: string | null
  updated_at: string
}

export interface UserPublic extends BaseRead {
  username: string
  bio?: string | null
  contact_info?: string | null
  role: Role
  last_login?: string | null
  updated_at: string
}

export interface FollowCounts {
  followers: number
  followings: number
}

export interface FollowState {
  following: boolean
}

// ----------------------------------------------------------------- artists
export interface Artist extends BaseRead {
  user_id?: string | null
  name: string
  bio: string
  image_url: string
  monthly_listeners: number
  accent: string
  verified: boolean
  verified_at?: string | null
}

// ------------------------------------------------------------------ albums
export interface Album extends BaseRead {
  title: string
  artist_id: string
  cover_url: string
  release_year: number
  kind: string
  artist?: Artist | null
}

export interface AlbumDetail extends Album {
  tracks: Track[]
}

// ------------------------------------------------------------------ tracks
export interface Track extends BaseRead {
  title: string
  album_id: string
  artist_id: string
  duration: number
  audio_url: string
  track_number: number
  explicit: boolean
  plays: number
  artist?: Artist | null
  album?: Album | null
}

// --------------------------------------------------------------- playlists
export interface Playlist extends BaseRead {
  name: string
  description: string
  cover_url: string
  owner_id?: string | null
  is_system: boolean
}

export interface PlaylistTrack extends BaseRead {
  playlist_id: string
  track_id: string
  position: number
  track?: Track | null
}

export interface PlaylistDetail extends Playlist {
  entries: PlaylistTrack[]
}

// ------------------------------------------------------------------- posts
export interface Post extends BaseRead {
  user_id: string
  content?: string | null
  image?: string | null
  video?: string | null
  track_id?: string | null
  original_post_id?: string | null
  updated_at: string
  average_rating?: number | null
  rating_count: number
  likes_count: number
  comments_count: number
  user?: UserPublic | null
  track?: Track | null
}

export interface PostComment extends BaseRead {
  post_id: string
  user_id: string
  comment: string
  user?: UserPublic | null
}

export interface Like extends BaseRead {
  user_id: string
  post_id: string
  liked: boolean
  user?: UserPublic | null
}

export interface PostRating extends BaseRead {
  user_id: string
  post_id: string
  rating: number
}

export interface RatingSummary {
  average_rating: number | null
  rating_count: number
}

// ------------------------------------------------------------ notifications
export interface Notification extends BaseRead {
  user_id: string
  message: string
  status: "unread" | "read"
}

// ---------------------------------------------------------------- hashtags
export interface Hashtag extends BaseRead {
  tag: string
  usage: number
}

// ------------------------------------------------------------- profile data
export interface ProfileTrack extends BaseRead {
  user_id: string
  track_id: string
  position: number
}

export interface ProfilePicture extends BaseRead {
  user_id: string
  image_url: string
}

export interface CoverPhoto extends BaseRead {
  user_id: string
  image_url: string
}

export interface SocialLink extends BaseRead {
  user_id: string
  link: string
}

export interface PlayHistory extends BaseRead {
  user_id: string
  track_id: string
  played_at: string
}

export interface ProfileMusic {
  user: UserPublic
  profile_tracks: ProfileTrack[]
  favorites: { id: string; user_id: string; track_id: string }[]
  favorite_tracks: Track[]
  recently_played: Track[]
  most_played: Track[]
  playlists: Playlist[]
}

// -------------------------------------------------------------------- auth
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  bio?: string | null
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expiry_time: string
  user: User
}

// ------------------------------------------------------------------ errors
export interface ApiError {
  detail: string | { msg: string; loc: (string | number)[] }[]
}

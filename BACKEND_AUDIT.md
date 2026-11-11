# Npop Backend Audit - Stage 1

## Server Status
- Backend running on: http://127.0.0.1:5001
- Swagger docs: http://127.0.0.1:5001/docs
- Status: ✅ Running

## API Endpoints Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user
  - Request: username, email, password
  - Response: User object
- `POST /api/auth/login` - Login
  - Request: email, password
  - Response: access_token, token_type, expiry_time, user

### Users (`/api/users`)
- `GET /api/users` - List users (search by q)
- `GET /api/users/{id}` - Get user profile
- `PATCH /api/users/{id}` - Update user profile
- `DELETE /api/users/{id}` - Delete user
- `POST /api/users/{id}/follow` - Follow user
- `DELETE /api/users/{id}/follow` - Unfollow user
- `GET /api/users/{id}/followers` - List followers
- `GET /api/users/{id}/followings` - List followings
- `GET /api/users/{id}/follow-counts` - Get follower/following counts
- `GET /api/users/{id}/is-following/{target_id}` - Check follow status
- `GET /api/users/{id}/favorites` - List favorite tracks
- `POST /api/users/{id}/favorites/{track_id}` - Add favorite
- `DELETE /api/users/{id}/favorites/{track_id}` - Remove favorite
- `GET /api/users/{id}/profile-tracks` - List profile tracks
- `POST /api/users/{id}/profile-tracks` - Add profile track
- `PATCH /api/users/{id}/profile-tracks/reorder` - Reorder profile tracks
- `DELETE /api/users/{id}/profile-tracks/{track_id}` - Remove profile track
- `GET /api/users/{id}/history` - Play history
- `GET /api/users/{id}/recently-played` - Recently played tracks
- `GET /api/users/{id}/most-played` - User's most played tracks
- `GET /api/users/{id}/music` - Complete profile music view
- `GET /api/users/{id}/profile-pictures` - List profile pictures
- `POST /api/users/{id}/profile-picture` - Set profile picture
- `GET /api/users/{id}/cover-photos` - List cover photos
- `POST /api/users/{id}/cover-photo` - Set cover photo
- `GET /api/users/{id}/social-links` - List social links
- `PUT /api/users/{id}/social-links` - Replace social links

### Artists (`/api/artists`)
- `GET /api/artists` - List artists
- `POST /api/artists` - Create artist profile (artist-only)
- `GET /api/artists/{id}` - Get artist details
- `PATCH /api/artists/{id}` - Update artist profile (artist-only)
- `POST /api/artists/{id}/verify` - Verify artist (admin)

### Albums (`/api/albums`)
- `GET /api/albums` - List albums
- `POST /api/albums` - Create album (artist-only)
- `GET /api/albums/{id}` - Get album with tracks
- `PATCH /api/albums/{id}` - Update album (artist-only)
- `DELETE /api/albums/{id}` - Delete album (artist-only)
- `POST /api/albums/{id}/cover` - Upload album cover (artist-only)
- `GET /api/albums/{id}/tracks` - List album tracks

### Tracks (`/api/tracks`)
- `GET /api/tracks` - List tracks (search, filter by artist/album)
- `GET /api/tracks/most-played` - Most played tracks globally
- `POST /api/tracks` - Upload track (artist-only, multipart)
- `POST /api/tracks/hosted` - Upload hosted track (artist-only, JSON)
- `GET /api/tracks/{id}` - Get track details
- `PATCH /api/tracks/{id}` - Update track (artist-only)
- `DELETE /api/tracks/{id}` - Delete track (artist-only)
- `POST /api/tracks/{id}/play` - Play track (increments play count)

### Playlists (`/api/playlists`)
- `GET /api/playlists` - List playlists
- `POST /api/playlists` - Create playlist
- `GET /api/playlists/{id}` - Get playlist with tracks
- `PATCH /api/playlists/{id}` - Update playlist
- `DELETE /api/playlists/{id}` - Delete playlist
- `GET /api/playlists/{id}/tracks` - List playlist tracks
- `POST /api/playlists/{id}/tracks` - Add track to playlist
- `PUT /api/playlists/{id}/tracks/reorder` - Reorder playlist tracks
- `DELETE /api/playlists/{id}/tracks/{track_id}` - Remove track from playlist
- `GET /api/playlists/{id}/artists` - List distinct artists in playlist

### Posts (`/api/posts`)
- `GET /api/posts` - List posts
- `POST /api/posts` - Create post (with optional track_id)
- `GET /api/posts/{id}` - Get post with details
- `PATCH /api/posts/{id}` - Update post
- `DELETE /api/posts/{id}` - Delete post
- `POST /api/posts/{id}/like` - Like post
- `DELETE /api/posts/{id}/like` - Unlike post
- `GET /api/posts/{id}/comments` - List post comments
- `POST /api/posts/{id}/comments` - Add comment
- `PATCH /api/posts/{id}/comments/{comment_id}` - Update comment
- `DELETE /api/posts/{id}/comments/{comment_id}` - Delete comment
- `POST /api/posts/{id}/rating` - Rate post (1-5 stars)
- `DELETE /api/posts/{id}/rating` - Remove rating

### Hashtags (`/api/hashtags`)
- `GET /api/hashtags` - List hashtags
- `POST /api/hashtags` - Create hashtag

### Notifications (`/api/notifications`)
- `GET /api/notifications` - List user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `POST /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/stream` - SSE stream for live notifications
- `POST /api/notifications` - Create notification (admin only)
- `POST /api/notifications/{id}/read` - Mark as read
- `PATCH /api/notifications/{id}` - Update notification
- `DELETE /api/notifications/{id}` - Delete notification

## Authentication
- JWT Bearer tokens
- Token in Authorization header: `Bearer {token}`
- Protected routes require valid token
- Token expiry: 30 minutes (configurable)

## File Upload
- Uses Cloudinary for file storage
- Multipart form data for uploads
- Supported: tracks, album covers, profile pictures, cover photos
- Cloudinary credentials in environment

## SSE (Server-Sent Events)
- Not yet inspected - needs backend code review

## Database
- SQLite (configurable)
- SQLAlchemy ORM
- Models: User, Artist, Album, Track, Playlist, Post, etc.

## Next Steps
1. Complete SSE inspection
2. Map frontend features to backend endpoints
3. Create TypeScript interfaces for all schemas
4. Document unsupported features

# Npop Backend Integration Map

## Frontend Feature → Backend Endpoint Mapping

### Authentication
| Feature | Method | Endpoint | Auth Required |
|---------|--------|----------|---------------|
| Register | POST | `/api/auth/register` | No |
| Login | POST | `/api/auth/login` | No |
| Logout | - | Client-side (clear token) | - |
| Token Refresh | - | Not supported (re-login required) | - |

### Home / Discovery
| Feature | Method | Endpoint | Auth Required |
|---------|--------|----------|---------------|
| Most Played Tracks | GET | `/api/tracks/most-played` | No |
| New Albums | GET | `/api/albums` | No |
| Popular Artists | GET | `/api/artists` | No |
| Trending Hashtags | GET | `/api/hashtags` | No |
| Recent Posts | GET | `/api/posts` | No |
| Search Tracks | GET | `/api/tracks?q={query}` | No |
| Search Artists | GET | `/api/artists?q={query}` | Not supported (list only) |
| Search Albums | GET | `/api/albums?q={query}` | Not supported (list only) |
| Search Users | GET | `/api/users?q={query}` | No |
| Search Hashtags | GET | `/api/hashtags?q={query}` | Not supported (list only) |

### Music Player
| Feature | Method | Endpoint | Auth Required |
|---------|--------|----------|---------------|
| Play Track | POST | `/api/tracks/{id}/play` | No (optional for history) |
| Get Track Details | GET | `/api/tracks/{id}` | No |
| Get Album Tracks | GET | `/api/albums/{id}/tracks` | No |

### Social Feed
| Feature | Method | Endpoint | Auth Required |
|---------|--------|----------|---------------|
| Create Post | POST | `/api/posts` | Yes |
| Edit Post | PATCH | `/api/posts/{id}` | Yes (owner only) |
| Delete Post | DELETE | `/api/posts/{id}` | Yes (owner only) |
| Like Post | POST | `/api/posts/{id}/like` | Yes |
| Unlike Post | DELETE | `/api/posts/{id}/like` | Yes |
| Get Comments | GET | `/api/posts/{id}/comments` | No |
| Add Comment | POST | `/api/posts/{id}/comments` | Yes |
| Edit Comment | PATCH | `/api/posts/{id}/comments/{comment_id}` | Yes (owner only) |
| Delete Comment | DELETE | `/api/posts/{id}/comments/{comment_id}` | Yes (owner only) |
| Rate Post | POST | `/api/posts/{id}/rating` | Yes |
| Remove Rating | DELETE | `/api/posts/{id}/rating` | Yes |
| Repost | POST | `/api/posts` (with original_post_id) | Yes |

### Track Details
| Feature | Method | Endpoint | Auth Required |
|---------|--------|----------|---------------|
| Get Track | GET | `/api/tracks/{id}` | No |
| Add to Favorites | POST | `/api/users/{id}/favorites/{track_id}` | Yes (self only) |
| Remove from Favorites | DELETE | `/api/users/{id}/favorites/{track_id}` | Yes (self only) |
| Add to Playlist | POST | `/api/playlists/{id}/tracks` | Yes (owner only) |
| Get Artist | GET | `/api/artists/{id}` | No |
| Get Album | GET | `/api/albums/{id}` | No |

### Artists
| Feature | Method | Endpoint | Auth Required |
|---------|--------|----------|---------------|
| List Artists | GET | `/api/artists` | No |
| Get Artist | GET | `/api/artists/{id}` | No |
| Create Artist Profile | POST | `/api/artists` | Yes |
| Update Artist Profile | PATCH | `/api/artists/{id}` | Yes (artist only) |
| Get Artist Albums | GET | `/api/albums?artist_id={id}` | No |
| Get Artist Tracks | GET | `/api/tracks?artist_id={id}` | No |
| Follow Artist | POST | `/api/users/{id}/follow` | Yes |
| Unfollow Artist | DELETE | `/api/users/{id}/follow` | Yes |
| Get Followers | GET | `/api/users/{id}/followers` | No |
| Verify Artist | POST | `/api/artists/{id}/verify` | Yes (admin only) |

### Albums
| Feature | Method | Endpoint | Auth Required |
|---------|--------|----------|---------------|
| List Albums | GET | `/api/albums` | No |
| Get Album | GET | `/api/albums/{id}` | No |
| Create Album | POST | `/api/albums` | Yes (artist only) |
| Update Album | PATCH | `/api/albums/{id}` | Yes (artist only) |
| Delete Album | DELETE | `/api/albums/{id}` | Yes (artist only) |
| Upload Cover | POST | `/api/albums/{id}/cover` | Yes (artist only) |
| Get Album Tracks | GET | `/api/albums/{id}/tracks` | No |

### Playlists
| Feature | Method | Endpoint | Auth Required |
|---------|--------|----------|---------------|
| List Playlists | GET | `/api/playlists` | No |
| Get Playlist | GET | `/api/playlists/{id}` | No |
| Create Playlist | POST | `/api/playlists` | Yes |
| Update Playlist | PATCH | `/api/playlists/{id}` | Yes (owner only) |
| Delete Playlist | DELETE | `/api/playlists/{id}` | Yes (owner only) |
| Add Track | POST | `/api/playlists/{id}/tracks` | Yes (owner only) |
| Remove Track | DELETE | `/api/playlists/{id}/tracks/{track_id}` | Yes (owner only) |
| Reorder Tracks | PUT | `/api/playlists/{id}/tracks/reorder` | Yes (owner only) |
| Get Playlist Artists | GET | `/api/playlists/{id}/artists` | No |

### User Profiles
| Feature | Method | Endpoint | Auth Required |
|---------|--------|----------|---------------|
| Get User | GET | `/api/users/{id}` | No |
| Update Profile | PATCH | `/api/users/{id}` | Yes (self only) |
| Set Profile Picture | POST | `/api/users/{id}/profile-picture` | Yes (self only) |
| Set Cover Photo | POST | `/api/users/{id}/cover-photo` | Yes (self only) |
| Set Social Links | PUT | `/api/users/{id}/social-links` | Yes (self only) |
| Get Followers | GET | `/api/users/{id}/followers` | No |
| Get Following | GET | `/api/users/{id}/followings` | No |
| Follow User | POST | `/api/users/{id}/follow` | Yes |
| Unfollow User | DELETE | `/api/users/{id}/follow` | Yes |
| Get User Posts | GET | `/api/posts` (filter by user_id) | Not supported endpoint |
| Get User Playlists | GET | `/api/playlists?owner_id={id}` | No |
| Get Favorite Tracks | GET | `/api/users/{id}/favorites` | No |
| Get Listening History | GET | `/api/users/{id}/history` | No |
| Get Profile Music | GET | `/api/users/{id}/music` | No |
| Add Profile Track | POST | `/api/users/{id}/profile-tracks` | Yes (self only) |
| Remove Profile Track | DELETE | `/api/users/{id}/profile-tracks/{track_id}` | Yes (self only) |
| Reorder Profile Tracks | PATCH | `/api/users/{id}/profile-tracks/reorder` | Yes (self only) |

### Artist Dashboard
| Feature | Method | Endpoint | Auth Required |
|---------|--------|----------|---------------|
| Create Album | POST | `/api/albums` | Yes (artist only) |
| Update Album | PATCH | `/api/albums/{id}` | Yes (artist only) |
| Delete Album | DELETE | `/api/albums/{id}` | Yes (artist only) |
| Upload Track | POST | `/api/tracks` (multipart) | Yes (artist only) |
| Update Track | PATCH | `/api/tracks/{id}` | Yes (artist only) |
| Delete Track | DELETE | `/api/tracks/{id}` | Yes (artist only) |
| Upload Album Cover | POST | `/api/albums/{id}/cover` | Yes (artist only) |
| Update Artist Profile | PATCH | `/api/artists/{id}` | Yes (artist only) |
| Get Listening Stats | GET | `/api/tracks/most-played` (filter by artist) | Not supported endpoint |

### Notifications
| Feature | Method | Endpoint | Auth Required |
|---------|--------|----------|---------------|
| List Notifications | GET | `/api/notifications` | Yes |
| Get Unread Count | GET | `/api/notifications/unread-count` | Yes |
| Mark as Read | POST | `/api/notifications/{id}/read` | Yes |
| Mark All as Read | POST | `/api/notifications/read-all` | Yes |
| Delete Notification | DELETE | `/api/notifications/{id}` | Yes (owner only) |
| SSE Stream | GET | `/api/notifications/stream` | Yes |

### Search (Unified)
| Feature | Method | Endpoint | Auth Required |
|---------|--------|----------|---------------|
| Search Tracks | GET | `/api/tracks?q={query}` | No |
| Search Users | GET | `/api/users?q={query}` | No |
| Search Hashtags | GET | `/api/hashtags` (list all) | No |
| Search Artists | GET | `/api/artists` (list all) | No |
| Search Albums | GET | `/api/albums` (list all) | No |

## Unsupported / Limited Features

### Not Supported by Backend
1. **Unified Search** - No single search endpoint, must query each resource separately
2. **Artist Search** - No search by name, only list all
3. **Album Search** - No search by title, only list all
4. **Hashtag Search** - No search by name, only list all
5. **User Posts Filter** - Cannot filter posts by user_id, must fetch all and filter client-side
6. **Artist Listening Stats** - No endpoint for artist-specific play statistics
7. **Music Recommendations** - No recommendation algorithm endpoint
8. **Trending** - No dedicated trending endpoint, use most-played as proxy
9. **New Releases** - No endpoint for new releases, use sort by date
10. **Token Refresh** - No refresh token endpoint, must re-login

### Limited Features
1. **Post Editing** - Only content, image, video, track_id can be edited
2. **Comment Editing** - Limited fields
3. **Playlist Reordering** - Requires sending full ordered list of track IDs
4. **Profile Track Reordering** - Requires sending full ordered list of track IDs
5. **File Upload** - Only supports Cloudinary, no local storage option

## Authentication Flow
1. User registers → `/api/auth/register` → Returns user object
2. User logs in → `/api/auth/login` → Returns JWT token + user
3. Store token in localStorage/memory
4. Include token in Authorization header: `Bearer {token}`
5. Protected routes return 401 if token invalid/missing
6. Client handles 401 by redirecting to login

## File Upload Flow
1. Multipart form data with file field
2. Backend uploads to Cloudinary
3. Returns Cloudinary URL
4. Store URL in database record
5. Frontend displays using returned URL

## SSE Integration
1. Connect to `/api/notifications/stream` with auth header
2. Use EventSource with credentials
3. Receive real-time notifications
4. Format: `data: {message}\n\n`
5. Handle connection errors and reconnection

## TypeScript Interface Requirements
Need to create interfaces for:
- All request/response schemas from `app/schemas/`
- User, Artist, Album, Track, Playlist, Post models
- Notification, Like, Comment, Rating models
- API request/response types
- Error response types

## Next Steps for Frontend
1. Initialize React + TypeScript + Vite
2. Create TypeScript interfaces for all backend schemas
3. Implement centralized API client with Axios
4. Implement authentication context/state
5. Build layouts and routing
6. Implement features incrementally per stages

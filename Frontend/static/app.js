"use strict";

/* Npop frontend — vanilla JS SPA talking to the FastAPI /api layer. */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const state = {
  token: localStorage.getItem("npop_token") || null,
  user: null,
  view: "feed",
  trackCache: {},
  userCache: {},
  artistCache: {},
};

const VIEW_TITLES = {
  feed: "Feed",
  explore: "Explore",
  playlists: "Playlists",
  notifications: "Notifications",
  profile: "Profile",
  artist: "Artist",
  album: "Album",
  playlist: "Playlist",
};

/* --------------------------------------------------------------- helpers */
function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

let toastTimer = null;
function toast(message, isError = false) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.toggle("error", isError);
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 3200);
}

async function api(path, options = {}) {
  const headers = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const response = await fetch(`/api${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) return null;

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    let detail = data && data.detail ? data.detail : `Request failed (${response.status})`;
    if (Array.isArray(detail)) {
      detail = detail.map((item) => item.msg || JSON.stringify(item)).join(", ");
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

async function loadTrack(id) {
  if (state.trackCache[id]) return state.trackCache[id];
  const track = await api(`/tracks/${id}`);
  state.trackCache[id] = track;
  return track;
}

async function loadUser(id) {
  if (state.userCache[id]) return state.userCache[id];
  if (state.user && id === state.user.id) {
    state.userCache[id] = state.user;
    return state.user;
  }
  const user = await api(`/users/${id}`);
  state.userCache[id] = user;
  return user;
}

async function loadArtist(id) {
  if (state.artistCache[id]) return state.artistCache[id];
  const artist = await api(`/artists/${id}`);
  state.artistCache[id] = artist;
  return artist;
}

function formatDuration(seconds) {
  const total = Number(seconds) || 0;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------ auth flow */
function bindAuth() {
  $$("[data-auth-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$("[data-auth-tab]").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      $("#login-form").classList.toggle("hidden", tab.dataset.authTab !== "login");
      $("#register-form").classList.toggle("hidden", tab.dataset.authTab !== "register");
    });
  });

  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const result = await api("/auth/login", {
        method: "POST",
        body: {
          email: form.email.value.trim(),
          password: form.password.value,
        },
      });
      acceptSession(result);
    } catch (error) {
      toast(error.message, true);
    }
  });

  $("#register-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const result = await api("/auth/register", {
        method: "POST",
        body: {
          username: form.username.value.trim(),
          email: form.email.value.trim(),
          password: form.password.value,
          bio: form.bio.value.trim() || null,
        },
      });
      acceptSession(result);
    } catch (error) {
      toast(error.message, true);
    }
  });
}

function acceptSession(result) {
  state.token = result.access_token;
  state.user = result.user;
  localStorage.setItem("npop_token", state.token);
  enterApp();
}

async function logout() {
  try {
    await api("/auth/logout", { method: "POST" });
  } catch {
    /* token may already be invalid */
  }
  localStorage.removeItem("npop_token");
  state.token = null;
  state.user = null;
  state.trackCache = {};
  state.userCache = {};
  state.artistCache = {};
  $("#app-screen").classList.add("hidden");
  $("#auth-screen").classList.remove("hidden");
  $("#player").classList.add("hidden");
}

function enterApp() {
  $("#auth-screen").classList.add("hidden");
  $("#app-screen").classList.remove("hidden");
  $("#user-chip").textContent = `@${state.user.username}`;
  state.view = "feed";
  setActiveNav();
  renderView();
}

/* --------------------------------------------------------------- shell */
function bindShell() {
  $$(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      setActiveNav();
      renderView();
    });
  });

  $("#logout-btn").addEventListener("click", logout);

  $("#search-btn").addEventListener("click", runSearch);
  $("#global-search").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runSearch();
    }
  });

  $("#view").addEventListener("click", onViewClick);
}

function runSearch() {
  const query = $("#global-search").value.trim();
  state.view = "explore";
  setActiveNav();
  renderExplore(query);
}

function setActiveNav() {
  const mapped = ["artist", "album"].includes(state.view) ? "explore" : state.view;
  $$(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === mapped);
  });
  $("#view-title").textContent = VIEW_TITLES[state.view] || "Npop";
}

async function renderView() {
  const renderers = {
    feed: renderFeed,
    explore: () => renderExplore(""),
    playlists: renderPlaylists,
    notifications: renderNotifications,
    profile: renderProfile,
  };
  const renderer = renderers[state.view] || renderFeed;
  try {
    await renderer();
  } catch (error) {
    $("#view").innerHTML = `<div class="empty">${esc(error.message)}</div>`;
    toast(error.message, true);
  }
}

/* --------------------------------------------------------------- player */
async function playTrack(id) {
  try {
    const track = await loadTrack(id);
    try {
      await api(`/tracks/${id}/play`, { method: "POST" });
    } catch {
      /* play counting is best effort */
    }
    let artistName = "Unknown artist";
    try {
      const artist = await loadArtist(track.artist_id);
      artistName = artist.name;
    } catch {
      /* ignore */
    }
    $("#player").classList.remove("hidden");
    $("#player-info").textContent = `${track.title} — ${artistName}`;
    const audio = $("#audio");
    audio.src = track.audio_url || "";
    if (track.audio_url) audio.play().catch(() => undefined);
    toast(`Playing ${track.title}`);
  } catch (error) {
    toast(error.message, true);
  }
}

/* ------------------------------------------------------------ feed view */
async function renderFeed() {
  $("#view-title").textContent = "Feed";
  const [posts, tracks] = await Promise.all([
    api("/posts?limit=100"),
    api("/tracks?limit=100"),
  ]);
  tracks.forEach((track) => {
    state.trackCache[track.id] = track;
  });
  const authorIds = [...new Set(posts.map((post) => post.user_id))];
  await Promise.allSettled(authorIds.map((id) => loadUser(id)));

  const trackOptions = tracks
    .map((track) => `<option value="${esc(track.id)}">${esc(track.title)}</option>`)
    .join("");

  $("#view").innerHTML = `
    <form id="post-form" class="form-card">
      <label>Share something
        <textarea name="content" maxlength="1024" placeholder="What are you listening to?"></textarea>
      </label>
      <div class="inline-form">
        <label>Attach a song
          <select name="track_id"><option value="">No song</option>${trackOptions}</select>
        </label>
        <button class="primary" type="submit">Post</button>
      </div>
    </form>
    <div class="grid">
      ${posts.length ? posts.map(postCard).join("") : `<div class="empty">No posts yet. Share the first one.</div>`}
    </div>
  `;

  $("#post-form").addEventListener("submit", onCreatePost);
}

function postCard(post) {
  const author = state.userCache[post.user_id];
  const track = post.track_id ? state.trackCache[post.track_id] : null;
  const mine = state.user && post.user_id === state.user.id;
  const rating =
    post.average_rating === null || post.average_rating === undefined
      ? "No ratings"
      : `${post.average_rating}★ (${post.rating_count})`;

  return `
    <article class="card">
      <div class="post-head">
        <strong>@${esc(author ? author.username : post.user_id.slice(0, 8))}</strong>
        <span class="pill">${esc(formatDate(post.created_at))}</span>
      </div>
      ${post.content ? `<p>${esc(post.content)}</p>` : ""}
      ${post.image ? `<p><a href="${esc(post.image)}" target="_blank" rel="noreferrer">View image</a></p>` : ""}
      ${post.video ? `<p><a href="${esc(post.video)}" target="_blank" rel="noreferrer">View video</a></p>` : ""}
      ${post.original_post_id ? `<p class="muted">Reposted a post</p>` : ""}
      ${track ? `<div class="track-chip">♪ ${esc(track.title)} <button class="ghost" data-action="play-track" data-id="${esc(track.id)}">Play</button></div>` : ""}
      <p class="muted">${esc(rating)}</p>
      <div class="post-actions">
        <button data-action="like-post" data-id="${esc(post.id)}">♥ Like</button>
        <button data-action="comment-post" data-id="${esc(post.id)}">💬 Comment</button>
        <button data-action="rate-post" data-id="${esc(post.id)}">★ Rate</button>
        <button data-action="repost" data-id="${esc(post.id)}">↻ Repost</button>
        ${mine ? `<button class="danger" data-action="delete-post" data-id="${esc(post.id)}">Delete</button>` : ""}
      </div>
    </article>
  `;
}

async function onCreatePost(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const content = form.content.value.trim();
  const trackId = form.track_id.value || null;
  if (!content && !trackId) {
    toast("Add some text or attach a song", true);
    return;
  }
  try {
    await api("/posts", {
      method: "POST",
      body: { content: content || null, track_id: trackId },
    });
    toast("Posted");
    await renderFeed();
  } catch (error) {
    toast(error.message, true);
  }
}

/* ---------------------------------------------------------- explore view */
async function renderExplore(query = "") {
  $("#view-title").textContent = "Explore";
  const artistPath = query
    ? `/artists?q=${encodeURIComponent(query)}`
    : "/artists?limit=100";
  const trackPath = query
    ? `/tracks?q=${encodeURIComponent(query)}`
    : "/tracks?limit=100";

  const [artists, tracks] = await Promise.all([api(artistPath), api(trackPath)]);
  tracks.forEach((track) => {
    state.trackCache[track.id] = track;
  });
  artists.forEach((artist) => {
    state.artistCache[artist.id] = artist;
  });

  $("#view").innerHTML = `
    <div class="section-title">
      <h2>${query ? `Artists matching “${esc(query)}”` : "Artists"}</h2>
    </div>
    <div class="grid">
      ${artists.map(artistCard).join("") || `<div class="empty">No artists found.</div>`}
    </div>
    <div class="section-title">
      <h2>${query ? `Tracks matching “${esc(query)}”` : "Tracks"}</h2>
    </div>
    <div class="grid">
      ${tracks.map(trackCard).join("") || `<div class="empty">No tracks found.</div>`}
    </div>
  `;
}

function artistCard(artist) {
  return `
    <div class="card clickable" data-action="open-artist" data-id="${esc(artist.id)}">
      <div class="post-head">
        <h3>${esc(artist.name)}</h3>
        ${artist.verified ? `<span class="pill verified">✓ Verified</span>` : ""}
      </div>
      <p>${esc(artist.bio || "No bio yet.")}</p>
      <span class="pill">${esc(artist.monthly_listeners)} monthly listeners</span>
    </div>
  `;
}

function trackCard(track) {
  return `
    <div class="card">
      <div class="post-head">
        <h4>${esc(track.title)}</h4>
        <span class="pill">${esc(track.plays)} plays</span>
      </div>
      <p class="muted">${esc(formatDuration(track.duration))}${track.explicit ? " · Explicit" : ""}</p>
      <div class="row-actions">
        <button class="primary" data-action="play-track" data-id="${esc(track.id)}">Play</button>
        <button class="ghost" data-action="favorite" data-id="${esc(track.id)}">♥ Favourite</button>
      </div>
    </div>
  `;
}

async function renderArtist(id) {
  state.view = "artist";
  setActiveNav();
  const [artist, albums, tracks] = await Promise.all([
    loadArtist(id),
    api(`/artists/${id}/albums`),
    api(`/artists/${id}/tracks`),
  ]);
  tracks.forEach((track) => {
    state.trackCache[track.id] = track;
  });

  $("#view").innerHTML = `
    <div class="card">
      <div class="post-head">
        <h2>${esc(artist.name)} ${artist.verified ? `<span class="pill verified">✓ Verified</span>` : ""}</h2>
        <span class="pill">${esc(artist.monthly_listeners)} monthly listeners</span>
      </div>
      <p>${esc(artist.bio || "No bio yet.")}</p>
      ${
        artist.user_id && state.user && artist.user_id !== state.user.id
          ? `<div class="row-actions">
               <button class="ghost" data-action="follow" data-id="${esc(artist.user_id)}">Follow</button>
               <button class="ghost" data-action="unfollow" data-id="${esc(artist.user_id)}">Unfollow</button>
             </div>`
          : ""
      }
    </div>
    <div class="section-title"><h2>Albums</h2></div>
    <div class="grid">
      ${
        albums
          .map(
            (album) => `
              <div class="card clickable" data-action="open-album" data-id="${esc(album.id)}">
                <h3>${esc(album.title)}</h3>
                <p>${esc(album.release_year)} · ${esc(album.kind)}</p>
              </div>`
          )
          .join("") || `<div class="empty">No albums yet.</div>`
      }
    </div>
    <div class="section-title"><h2>Tracks</h2></div>
    <div class="grid">
      ${tracks.map(trackCard).join("") || `<div class="empty">No tracks yet.</div>`}
    </div>
  `;
}

async function renderAlbum(id) {
  state.view = "album";
  setActiveNav();
  const album = await api(`/albums/${id}`);
  (album.tracks || []).forEach((track) => {
    state.trackCache[track.id] = track;
  });

  $("#view").innerHTML = `
    <div class="card">
      <h2>${esc(album.title)}</h2>
      <p>${esc(album.release_year)} · ${esc(album.kind)}</p>
    </div>
    <div class="grid">
      ${(album.tracks || []).map(trackCard).join("") || `<div class="empty">No tracks on this album.</div>`}
    </div>
  `;
}

/* -------------------------------------------------------- playlists view */
async function renderPlaylists() {
  $("#view-title").textContent = "Playlists";
  const [playlists, tracks] = await Promise.all([
    api(`/playlists?owner_id=${encodeURIComponent(state.user.id)}`),
    api("/tracks?limit=100"),
  ]);
  tracks.forEach((track) => {
    state.trackCache[track.id] = track;
  });

  $("#view").innerHTML = `
    <form id="playlist-form" class="form-card">
      <div class="inline-form">
        <label>New playlist<input name="name" required maxlength="200" placeholder="Late night drive" /></label>
        <label>Description<input name="description" maxlength="500" placeholder="Optional" /></label>
        <button class="primary" type="submit">Create</button>
      </div>
    </form>
    <div class="grid">
      ${
        playlists
          .map(
            (playlist) => `
              <div class="card clickable" data-action="playlist-detail" data-id="${esc(playlist.id)}">
                <h3>${esc(playlist.name)}</h3>
                <p>${esc(playlist.description || "No description")}</p>
                <span class="pill">${playlist.is_system ? "System" : "Yours"}</span>
              </div>`
          )
          .join("") || `<div class="empty">No playlists yet. Create one above.</div>`
      }
    </div>
  `;

  $("#playlist-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await api("/playlists", {
        method: "POST",
        body: {
          name: form.name.value.trim(),
          description: form.description.value.trim(),
        },
      });
      toast("Playlist created");
      await renderPlaylists();
    } catch (error) {
      toast(error.message, true);
    }
  });
}

async function renderPlaylist(id) {
  state.view = "playlist";
  setActiveNav();
  const [playlist, tracks] = await Promise.all([
    api(`/playlists/${id}`),
    api("/tracks?limit=100"),
  ]);
  tracks.forEach((track) => {
    state.trackCache[track.id] = track;
  });

  const options = tracks
    .map((track) => `<option value="${esc(track.id)}">${esc(track.title)}</option>`)
    .join("");
  const entries = playlist.entries || [];

  $("#view").innerHTML = `
    <div class="card">
      <h2>${esc(playlist.name)}</h2>
      <p>${esc(playlist.description || "No description")}</p>
    </div>
    <form id="add-track-form" class="form-card">
      <div class="inline-form">
        <label>Add a track<select name="track_id">${options}</select></label>
        <button class="primary" type="submit">Add</button>
      </div>
    </form>
    <div class="grid">
      ${
        entries
          .map((entry) => {
            const track = entry.track || state.trackCache[entry.track_id];
            if (!track) return "";
            return `
              <div class="card">
                <div class="post-head">
                  <h4>${esc(track.title)}</h4>
                  <span class="pill">#${esc(entry.position)}</span>
                </div>
                <p class="muted">${esc(formatDuration(track.duration))}</p>
                <div class="row-actions">
                  <button class="primary" data-action="play-track" data-id="${esc(track.id)}">Play</button>
                  <button class="danger" data-action="remove-playlist-track" data-id="${esc(track.id)}" data-playlist="${esc(playlist.id)}">Remove</button>
                </div>
              </div>`;
          })
          .join("") || `<div class="empty">This playlist is empty.</div>`
      }
    </div>
  `;

  $("#add-track-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await api(`/playlists/${playlist.id}/tracks`, {
        method: "POST",
        body: { track_id: form.track_id.value },
      });
      toast("Track added");
      await renderPlaylist(playlist.id);
    } catch (error) {
      toast(error.message, true);
    }
  });
}

/* ---------------------------------------------------- notifications view */
async function renderNotifications() {
  $("#view-title").textContent = "Notifications";
  const [items, unread] = await Promise.all([
    api("/notifications?limit=100"),
    api("/notifications/unread-count"),
  ]);

  $("#view").innerHTML = `
    <div class="section-title">
      <h2>Inbox <span class="pill">${esc(unread.count)} unread</span></h2>
      <button class="ghost" data-action="read-all">Mark all read</button>
    </div>
    <div class="grid">
      ${
        items
          .map(
            (item) => `
              <div class="card">
                <p>${esc(item.message)}</p>
                <div class="post-head">
                  <span class="pill ${item.status === "unread" ? "verified" : ""}">${esc(item.status)}</span>
                  <span class="muted">${esc(formatDate(item.created_at))}</span>
                </div>
                ${
                  item.status === "unread"
                    ? `<button class="ghost" data-action="mark-read" data-id="${esc(item.id)}">Mark read</button>`
                    : ""
                }
              </div>`
          )
          .join("") || `<div class="empty">No notifications yet.</div>`
      }
    </div>
  `;
}

/* --------------------------------------------------------- profile view */
async function renderProfile() {
  $("#view-title").textContent = "Profile";
  const [me, music, artist, counts] = await Promise.all([
    api("/auth/me"),
    api(`/users/${state.user.id}/music`),
    api("/artists/me").catch(() => null),
    api(`/users/${state.user.id}/follow-counts`),
  ]);
  state.user = me;
  $("#user-chip").textContent = `@${me.username}`;

  const favoriteTracks = music.favorite_tracks || [];
  const mostPlayed = music.most_played || [];
  const recentlyPlayed = music.recently_played || [];
  [...favoriteTracks, ...mostPlayed, ...recentlyPlayed].forEach((track) => {
    state.trackCache[track.id] = track;
  });

  const pinnedTracks = (
    await Promise.all(
      (music.profile_tracks || []).map((entry) =>
        loadTrack(entry.track_id).catch(() => null)
      )
    )
  ).filter(Boolean);

  $("#view").innerHTML = `
    <div class="card">
      <div class="post-head">
        <h2>@${esc(me.username)} ${artist ? `<span class="pill verified">Artist${artist.verified ? " ✓" : ""}</span>` : ""}</h2>
        <span class="pill">${esc(me.role)}</span>
      </div>
      <p>${esc(me.bio || "No bio yet.")}</p>
      <p class="muted">${esc(counts.followers)} followers · ${esc(counts.followings)} following</p>
      ${
        artist
          ? `<div class="row-actions"><button class="ghost" data-action="open-artist" data-id="${esc(artist.id)}">Open artist page</button></div>`
          : ""
      }
    </div>

    <form id="profile-form" class="form-card">
      <label>Bio<textarea name="bio" maxlength="1024">${esc(me.bio || "")}</textarea></label>
      <label>Contact info<input name="contact_info" maxlength="15" value="${esc(me.contact_info || "")}" /></label>
      <div class="inline-form">
        <button class="primary" type="submit">Save profile</button>
      </div>
    </form>

    <form id="avatar-form" class="form-card">
      <div class="inline-form">
        <label>Profile picture URL<input name="image_url" maxlength="512" placeholder="https://…" /></label>
        <button class="ghost" type="submit">Set picture</button>
      </div>
    </form>

    ${
      artist
        ? ""
        : `<form id="artist-form" class="form-card">
             <label>Become an artist
               <input name="name" required maxlength="160" placeholder="Artist name" />
             </label>
             <label>Artist bio<input name="bio" maxlength="1024" placeholder="Optional" /></label>
             <button class="primary" type="submit">Create artist profile</button>
           </form>`
    }

    <div class="section-title"><h2>Favourites</h2></div>
    <div class="grid">${favoriteTracks.map(trackCard).join("") || `<div class="empty">No favourite tracks yet.</div>`}</div>

    <div class="section-title"><h2>Pinned to profile</h2></div>
    <div class="grid">${pinnedTracks.map(trackCard).join("") || `<div class="empty">No pinned tracks yet.</div>`}</div>

    <div class="section-title"><h2>Recently played</h2></div>
    <div class="grid">${recentlyPlayed.map(trackCard).join("") || `<div class="empty">Nothing played yet.</div>`}</div>

    <div class="section-title"><h2>Most played</h2></div>
    <div class="grid">${mostPlayed.map(trackCard).join("") || `<div class="empty">No listening history yet.</div>`}</div>
  `;

  $("#profile-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await api(`/users/${state.user.id}`, {
        method: "PATCH",
        body: {
          bio: form.bio.value.trim() || null,
          contact_info: form.contact_info.value.trim() || null,
        },
      });
      toast("Profile updated");
      await renderProfile();
    } catch (error) {
      toast(error.message, true);
    }
  });

  $("#avatar-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const imageUrl = form.image_url.value.trim();
    if (!imageUrl) {
      toast("Enter an image URL", true);
      return;
    }
    try {
      await api(`/users/${state.user.id}/profile-picture`, {
        method: "POST",
        body: { image_url: imageUrl },
      });
      toast("Profile picture saved");
      form.reset();
    } catch (error) {
      toast(error.message, true);
    }
  });

  const artistForm = $("#artist-form");
  if (artistForm) {
    artistForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      try {
        const created = await api("/artists", {
          method: "POST",
          body: {
            name: form.name.value.trim(),
            bio: form.bio.value.trim(),
          },
        });
        state.artistCache[created.id] = created;
        toast("Artist profile created");
        await renderProfile();
      } catch (error) {
        toast(error.message, true);
      }
    });
  }
}

/* ------------------------------------------------------- action handling */
async function onViewClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, id } = target.dataset;

  try {
    switch (action) {
      case "play-track":
        await playTrack(id);
        break;
      case "favorite":
        await api(`/users/${state.user.id}/favorites/${id}`, { method: "POST" });
        toast("Added to favourites");
        break;
      case "like-post":
        await api(`/posts/${id}/like`, { method: "POST" });
        toast("Liked");
        break;
      case "comment-post": {
        const comment = prompt("Write a comment:");
        if (comment && comment.trim()) {
          await api(`/posts/${id}/comments`, {
            method: "POST",
            body: { comment: comment.trim() },
          });
          toast("Comment added");
        }
        break;
      }
      case "rate-post": {
        const raw = prompt("Rating from 1 to 5:", "5");
        if (raw) {
          await api(`/posts/${id}/rating`, {
            method: "POST",
            body: { rating: Number(raw) },
          });
          toast("Rating saved");
        }
        break;
      }
      case "repost": {
        const text = prompt("Add a comment to your repost (optional):", "");
        await api(`/posts/${id}/repost`, {
          method: "POST",
          body: { content: text ? text.trim() : null },
        });
        toast("Reposted");
        await renderFeed();
        break;
      }
      case "delete-post":
        if (confirm("Delete this post?")) {
          await api(`/posts/${id}`, { method: "DELETE" });
          toast("Post deleted");
          await renderFeed();
        }
        break;
      case "follow":
        await api(`/users/${id}/follow`, { method: "POST" });
        toast("Following");
        break;
      case "unfollow":
        await api(`/users/${id}/follow`, { method: "DELETE" });
        toast("Unfollowed");
        break;
      case "open-artist":
        await renderArtist(id);
        break;
      case "open-album":
        await renderAlbum(id);
        break;
      case "playlist-detail":
        await renderPlaylist(id);
        break;
      case "remove-playlist-track":
        await api(`/playlists/${target.dataset.playlist}/tracks/${id}`, {
          method: "DELETE",
        });
        toast("Track removed");
        await renderPlaylist(target.dataset.playlist);
        break;
      case "mark-read":
        await api(`/notifications/${id}/read`, { method: "POST" });
        await renderNotifications();
        break;
      case "read-all":
        await api("/notifications/read-all", { method: "POST" });
        toast("All notifications read");
        await renderNotifications();
        break;
      default:
        break;
    }
  } catch (error) {
    toast(error.message, true);
  }
}

/* ---------------------------------------------------------------- boot */
async function boot() {
  bindAuth();
  bindShell();

  if (state.token) {
    try {
      state.user = await api("/auth/me");
      enterApp();
      return;
    } catch {
      localStorage.removeItem("npop_token");
      state.token = null;
    }
  }

  $("#auth-screen").classList.remove("hidden");
}

boot();

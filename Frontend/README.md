# Frontend

The production frontend is a React + TypeScript + Vite app in `src/`. FastAPI
serves its build output (`dist/`) at `/`; you do not run a separate frontend
server in production.

## Build and run

```bash
# from the repository root
cd Frontend
npm install
npm run build     # tsc && vite build -> dist/
cd ..
uv run python scripts/dev.py
```

Open <http://127.0.0.1:5001/>. The app calls `/api` on the same origin, so no
CORS or proxy configuration is needed.

## Development with hot reload

```bash
# from the repository root
uv run python scripts/dev.py --vite
```

- Backend: <http://127.0.0.1:5001/>
- Vite dev server: <http://127.0.0.1:5173/> (proxies `/api` to the backend)

Run `npm run build` after frontend changes before serving through FastAPI without
Vite.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint |

## Structure

```
src/
  audio/              Web Audio equalizer
  components/         UI kit, layout, music and social components
  context/            Auth, theme, toast and player providers
  hooks/              Async data, notifications, profile picture, equalizer
  layouts/            App shell and auth shell
  pages/              Route components (including legal pages and 404)
  services/           Axios API client
  types/              Shared TypeScript types
  utils/              Formatting, class names, URL sanitizing, queue order
  index.css           Design tokens and global styles
  main.tsx            React entry point
  App.tsx             Router and providers
```

## Design system

- Exactly three brand colors: Warm Beige `#E8DCC8` (warm surfaces and light
  background), Deep Red `#B3262D` (actions, active states and social accents)
  and Matte Black `#171717` (dark background, typography and structure).
  Supporting neutrals are derived from those three colors for both themes.
- Tokens are CSS variables holding RGB channel triples so Tailwind opacity
  modifiers work (`bg-brand-primary/10`). Action fills use `bg-brand-solid`
  with `text-brand-on`; red text on dark surfaces uses a lifted shade to keep
  WCAG-AA contrast.
- Page and section titles use the `font-display` serif stack for an editorial
  feel; body and UI text stay in Inter.
- Artwork placeholders use a deterministic set of red/black/beige gradients, so
  no random hues appear in the interface.
- Theme is persisted in `npop_theme`; the default follows the OS preference.
- `prefers-reduced-motion` disables non-essential animation.
- Focus styles, labels and contrast targets aim for WCAG AA.

## Player

The persistent player supports queue management, shuffle, repeat off/all/one,
play next, add to queue, volume persistence and a 10-band equalizer. Player
preferences are stored in `npop_shuffle`, `npop_repeat` and `npop_eq`.

The equalizer routes audio through the Web Audio API only when the media host
sends CORS headers. Otherwise the player falls back to a plain `<audio>` element
and disables the equalizer for that track instead of playing silence.

## Legacy fallback

`static/` contains the original no-build SPA. FastAPI only uses it when
`dist/index.html` is missing, so a fresh checkout still shows a UI before the
React build is created. Prefer the React app for all new work.

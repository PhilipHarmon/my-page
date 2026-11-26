# My Page

A single personal web page you design and keep redesigning. The page is
built from blocks — headings, paragraphs, photos, videos, quotes, link
buttons and dividers — that you add, arrange, resize (full / half /
third width), align, duplicate and delete. A style panel controls the
page title, background theme, accent color, type style, header style
and width, and four starter layouts (About Me, Photo Story, Journal,
Favorites) give you a scaffold to start from.

**Viewing is public** — anyone with the link sees the finished page.
**Editing is locked** behind an edit code that lives only in the API's
environment (`EDIT_CODE`). The website asks for the code once, keeps it
for the browser session, and sends it with each save; the API checks it
server-side. The code never appears in the client code or this repo.

## Layout

- `client/` — React + Vite single-page app (the page, both modes).
- `server/` — Node + Express + Mongoose API. One `Page` document holds
  everything. Endpoints:
  - `GET /api/health` — always answers, database or not.
  - `GET /api/page` — public, returns the page.
  - `PUT /api/page` — saves; requires the `x-edit-code` header to match
    `EDIT_CODE`.
- `render.yaml` — Render blueprint for both services.

## Local development

You need two terminals.

**API** (terminal 1):

```bash
cd server
cp .env.example .env   # then fill in your real values
npm install
npm start              # http://localhost:5000
```

**Client** (terminal 2):

```bash
cd client
cp .env.example .env   # VITE_API_URL defaults to the local API
npm install
npm run dev            # http://localhost:5173
```

Open the client, tap **✎ Design this page**, enter the edit code from
your server `.env`, and design away. Hit **Save** and reload — the page
persists in MongoDB.

## Photos & videos

## Photos & videos

Two ways in:

- **Upload from this device** — pick a file or drag-and-drop it onto the
  block editor. Uploads use Cloudinary with an unsigned preset — the
  same pattern as Photo Journal. Set `VITE_CLOUDINARY_CLOUD_NAME` and
  `VITE_CLOUDINARY_UPLOAD_PRESET` on the client to turn uploads on;
  leave them unset and uploads hide themselves while links keep
  working. On iPhone or Mac the file picker opens the Files app, so
  photos and videos living in iCloud Drive or the Google Drive app are
  reachable there — that's the route for iCloud, since iCloud share
  links can't be embedded on a web page.
- **Paste a link** — Google Drive share links are converted
  automatically (photos display directly, videos embed), Dropbox share
  links become direct files, YouTube and Vimeo links become embedded
  players, and direct image/video file links work as-is. iCloud share
  links are detected and explained in the editor rather than saved as
  broken embeds.

## Deploying

Deploys to Render from the blueprint in `render.yaml` — see the build
sheet that came with this project for the exact numbered steps,
including the environment variables each service needs.

⌛ Built by Stolen Hours Software — built after bedtime.

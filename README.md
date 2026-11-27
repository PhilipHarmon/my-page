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
  the page; uploaded media files live in a GridFS bucket in the same
  database. Endpoints:
  - `GET /api/health` — always answers, database or not.
  - `GET /api/page` — public, returns the page.
  - `PUT /api/page` — saves; requires the `x-edit-code` header to match
    `EDIT_CODE`.
  - `POST /api/media` — uploads one photo or video file (multipart field
    `file`); requires the same `x-edit-code` header. Images and videos
    only, up to **100 MB** per file.
  - `GET /api/media/:id` — public; streams a stored file with its
    content type and HTTP Range support, so videos play and seek.
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

Two ways in:

- **Upload from this device** — pick a file or drag-and-drop it onto the
  block editor. The file uploads to the page's own API and is stored in
  the same MongoDB as the page (GridFS) — no third-party storage, no
  extra accounts, and nothing to configure: if the page itself works,
  uploads work. Uploading asks for the edit code, like saving. On
  iPhone or Mac the file picker opens the Files app, so photos and
  videos living in iCloud Drive or the Google Drive app are reachable
  there — that's the route for iCloud, since iCloud share links can't
  be embedded on a web page.
- **Paste a link** — Google Drive share links are converted
  automatically (photos display directly, videos embed), Dropbox share
  links become direct files, YouTube and Vimeo links become embedded
  players, and direct image/video file links work as-is. iCloud share
  links are detected and explained in the editor rather than saved as
  broken embeds.

**Storage limits, honestly:** uploads are capped at **100 MB per
file**, and an Atlas free-tier cluster holds **512 MB in total** — so
database uploads suit photos and short clips. Long or large videos
belong on YouTube or Google Drive, added with paste-a-link above.

## Social preview card

When the page's link is shared (Facebook, texts, etc.), the preview
card comes from the Open Graph / Twitter tags in `client/index.html`.
The card image itself is served by the **API** at
`GET /og-card.png` (file: `server/assets/og-card.png`, design source:
`server/assets/og-card.svg`) — the API's address is known and stable,
so the tags never depend on the client site's own URL. There is
deliberately **no `og:url`**: the URL actually shared stays canonical.
After a redesign of the card, re-scrape once in Facebook's Sharing
Debugger to refresh its cache.

## Deploying

Deploys to Render from the blueprint in `render.yaml` — see the build
sheet that came with this project for the exact numbered steps,
including the environment variables each service needs.

⌛ Built by Stolen Hours Software — built after bedtime.

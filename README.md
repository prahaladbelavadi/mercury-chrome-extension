# Mercury

A Chrome extension + Cloudflare Worker pipeline for uploading documents and capturing web pages for async processing.

## Live

| Resource | URL |
|----------|-----|
| Worker | https://mercury-worker.belavadi.workers.dev |
| Dashboard | https://mercury-worker.belavadi.workers.dev/dashboard |
| Health check | https://mercury-worker.belavadi.workers.dev/health |
| GitHub | https://github.com/prahaladbelavadi/mercury-chrome-extension |
| R2 Bucket | `mercury-uploads` (Cloudflare, ENAM) |
| KV Namespace | `mercury-sessions` (OAuth session storage) |

---

## Structure

```
mercury-chrome-extension/
├── extension/              # Chrome extension (MV3)
│   ├── manifest.json
│   ├── popup.html/css/js   # Popup UI
│   ├── background.js       # Tab capture + screenshot
│   ├── content.js
│   └── icons/
└── worker/                 # Cloudflare Worker
    ├── src/
    │   ├── index.js        # Router + upload handler
    │   ├── auth.js         # GitHub OAuth + KV sessions
    │   ├── files.js        # R2 listing, content proxy, thumbnails
    │   └── dashboard.js    # Full dashboard HTML (served by the worker)
    ├── wrangler.toml
    ├── deploy.sh           # Injects GIT_COMMIT + GIT_DATE at deploy time
    └── package.json
```

---

## Extension

### Install (development)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** → select the `extension/` folder
4. Mercury appears in your toolbar

### Features

| Button | Action |
|--------|--------|
| **Ping** | Shows an alert — placeholder for future actions |
| **Drop zone** | Drag a file onto it to upload to the worker |
| **Browse file** | Opens a file picker, then uploads |
| **Capture tab** | Takes a real screenshot of the active tab + grabs HTML, uploads both |

The status dot in the header pings `/health` on load — green means the worker is reachable.

> **Note:** Tab capture is blocked on `chrome://` pages by design. Navigate to any regular website first.

---

## Dashboard

Live at **https://mercury-worker.belavadi.workers.dev/dashboard**

| Feature | Detail |
|---------|--------|
| **Version badge** | Header shows `v{version} · {git SHA}` — links to that commit on GitHub |
| **Stats bar** | Total files, storage used, tab captures vs file uploads |
| **File grid** | Lazy-loaded cards (IntersectionObserver); real screenshots for tab captures, direct preview for images, icon for others |
| **Preview modal** | Click any card — HTML/PDF in iframe, images full-screen, raw link for everything |
| **Activity log** | Right-side timeline with status dots (green = processed, yellow = pending) |
| **Search + filter** | Live search by filename/URL; filter by type; sort by date, size, name |
| **Smart polling** | Only polls when files are pending; pauses when tab is hidden; stops when all are processed |
| **GitHub OAuth** | Optional — set secrets to gate the dashboard behind login |

### Enable GitHub login (optional)

1. Go to **github.com/settings/developers → OAuth Apps → New OAuth App**
   - Homepage URL: `https://mercury-worker.belavadi.workers.dev`
   - Callback URL: `https://mercury-worker.belavadi.workers.dev/auth/github/callback`

2. Set secrets:
```bash
cd worker
echo "YOUR_CLIENT_ID"     | npx wrangler secret put GITHUB_CLIENT_ID
echo "YOUR_CLIENT_SECRET" | npx wrangler secret put GITHUB_CLIENT_SECRET
```

Once set, unauthenticated visitors are redirected to GitHub login.

---

## Worker

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | none | Liveness probe |
| `POST` | `/upload` | none | Upload file + optional screenshot thumbnail |
| `GET` | `/status/:id` | none | Job status by ID |
| `GET` | `/dashboard` | optional | Dashboard UI |
| `GET` | `/api/files` | session | List all R2 files with metadata |
| `GET` | `/api/stats` | session | Aggregate stats |
| `GET` | `/api/files/:id/content` | session | Proxy raw file from R2 |
| `GET` | `/api/files/:id/thumbnail` | session | JPEG screenshot or image preview |
| `GET` | `/auth/github` | — | Start OAuth flow |
| `GET` | `/auth/github/callback` | — | OAuth callback |
| `GET` | `/auth/logout` | — | Clear session |

### Upload request

```
POST /upload
Content-Type: multipart/form-data

file        — file blob (required)
source      — "file" | "tab"
filename    — original filename
tabUrl      — source URL (tab captures only)
tabTitle    — page title (tab captures only)
thumbnail   — JPEG screenshot blob (tab captures only)
```

### Upload response

```json
{
  "success": true,
  "jobId": "uuid-v4",
  "key": "uploads/<jobId>/<filename>",
  "message": "File received — processing started"
}
```

---

## Deploy

### Initial setup

```bash
cd worker
npm install
# First deploy (no git vars yet — that's fine)
CLOUDFLARE_ACCOUNT_ID=<your_id> npx wrangler deploy
```

### Subsequent deploys

```bash
cd worker
CLOUDFLARE_ACCOUNT_ID=<your_id> npm run deploy
# Runs deploy.sh which injects GIT_COMMIT + GIT_DATE automatically
```

The version badge in the dashboard header shows `v1.0.0 · <short SHA>` and links directly to that commit on GitHub.

### Local dev

```bash
cd worker
npx wrangler dev
```

Then point the extension at `http://localhost:8787` by editing `WORKER_URL` in `extension/popup.js`.

---

## Extending

- **Processing logic** — edit `processDocument()` in `worker/src/index.js`. Runs after response is sent via `ctx.waitUntil`. Add AI, OCR, webhooks, etc.
- **New action buttons** — add `.action-card` in `popup.html`, handle in `popup.js`
- **Job status tracking** — write status updates to KV from `processDocument()`, expose via `/status/:id`

---

## Regenerate icons

```bash
node extension/scripts/generate-icons.js
```

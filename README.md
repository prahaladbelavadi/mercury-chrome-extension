# Mercury

A Chrome extension + Cloudflare Worker pipeline for uploading documents and capturing web pages for async processing.

## Live

| Resource | URL |
|----------|-----|
| Worker | https://mercury-worker.belavadi.workers.dev |
| Health check | https://mercury-worker.belavadi.workers.dev/health |
| GitHub | https://github.com/prahaladbelavadi/mercury-chrome-extension |
| R2 Bucket | `mercury-uploads` (Cloudflare, ENAM) |

---

## Structure

```
mercury-chrome-extension/
├── extension/          # Chrome extension (MV3)
│   ├── manifest.json
│   ├── popup.html/css/js
│   ├── background.js
│   ├── content.js
│   └── icons/
└── worker/             # Cloudflare Worker
    ├── src/index.js
    └── wrangler.toml
```

---

## Extension

### Install (local / development)

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
| **Capture tab** | Grabs the active tab's full HTML and uploads it |

The status dot in the header pings `/health` on load — green means the worker is reachable.

---

## Worker

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe — returns `{ ok: true }` |
| `POST` | `/upload` | Upload a file (multipart); returns `{ success, jobId }` immediately, then processes async via `ctx.waitUntil` |
| `GET` | `/status/:id` | Check job status by job ID |

### Upload request

```
POST /upload
Content-Type: multipart/form-data

file      — the file blob (required)
source    — "file" | "tab"
filename  — original filename
tabUrl    — source URL (tab captures only)
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

### Deploy

```bash
cd worker
npm install
npx wrangler deploy
```

R2 bucket `mercury-uploads` must exist in your Cloudflare account before deploying (already provisioned).

### Local dev

```bash
cd worker
npx wrangler dev
```

Then point the extension at `http://localhost:8787` by editing `WORKER_URL` in `extension/popup.js`.

---

## Extending

- **Add processing logic** — edit `processDocument()` in `worker/src/index.js`. It runs after the HTTP response is already sent (`ctx.waitUntil`). Good place to call an AI API, run OCR, trigger a webhook, etc.
- **Add action buttons** — add a new `.action-card` in `popup.html`, handle it in `popup.js`.
- **Track job status** — add a KV namespace binding in `wrangler.toml` and write status updates from `processDocument()`.

---

## Regenerate icons

```bash
node extension/scripts/generate-icons.js
```

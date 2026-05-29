/**
 * Mercury Worker
 *
 * Endpoints:
 *   GET  /health       — liveness probe used by the extension
 *   POST /upload       — accept a file, store in R2, return job ID, process async
 *   GET  /status/:id   — check the status of a job (reads from KV if wired up)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/health' && request.method === 'GET') {
        return json({ ok: true, service: 'mercury-worker' });
      }

      if (url.pathname === '/upload' && request.method === 'POST') {
        return handleUpload(request, env, ctx);
      }

      if (url.pathname.startsWith('/status/') && request.method === 'GET') {
        const jobId = url.pathname.slice('/status/'.length);
        return handleStatus(jobId, env);
      }

      return json({ error: 'Not found' }, 404);
    } catch (err) {
      console.error('Unhandled error:', err);
      return json({ error: 'Internal server error' }, 500);
    }
  },
};

// ─── Upload handler ───────────────────────────────────────
async function handleUpload(request, env, ctx) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ success: false, error: 'Invalid multipart body' }, 400);
  }

  const file = formData.get('file');
  if (!file) return json({ success: false, error: 'No file provided' }, 400);

  const source   = formData.get('source')   || 'file';
  const filename = formData.get('filename') || file.name || 'upload';
  const tabUrl   = formData.get('tabUrl')   || null;

  const jobId = crypto.randomUUID();
  const key   = `uploads/${jobId}/${filename}`;

  // Store in R2 — returns the response immediately after this
  try {
    await env.MERCURY_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
      customMetadata: {
        jobId,
        source,
        filename,
        ...(tabUrl && { tabUrl }),
        uploadedAt: new Date().toISOString(),
        status: 'uploaded',
      },
    });
  } catch (err) {
    console.error('R2 put failed:', err);
    return json({ success: false, error: 'Storage error' }, 500);
  }

  // Fire-and-forget: process the document after response is sent
  ctx.waitUntil(processDocument(env, jobId, key, file.type, source));

  return json({
    success: true,
    jobId,
    key,
    message: 'File received — processing started',
  });
}

// ─── Status handler ───────────────────────────────────────
async function handleStatus(jobId, env) {
  if (!jobId) return json({ error: 'Missing job ID' }, 400);

  // If you add KV binding (MERCURY_KV), you can track status here.
  // For now, check if the R2 object exists as a basic existence check.
  try {
    const list = await env.MERCURY_BUCKET.list({ prefix: `uploads/${jobId}/` });
    if (list.objects.length === 0) {
      return json({ jobId, status: 'not_found' }, 404);
    }
    const obj = list.objects[0];
    return json({
      jobId,
      status: obj.customMetadata?.status || 'uploaded',
      filename: obj.customMetadata?.filename,
      uploadedAt: obj.customMetadata?.uploadedAt,
    });
  } catch (err) {
    console.error('Status check failed:', err);
    return json({ error: 'Could not fetch status' }, 500);
  }
}

// ─── Async document processing ────────────────────────────
// Runs in the background after the HTTP response is already sent.
// Extend this function to add: OCR, text extraction, AI summarization, etc.
async function processDocument(env, jobId, key, contentType, source) {
  console.log(`[mercury] processing job=${jobId} key=${key} source=${source}`);

  try {
    // Retrieve the stored object
    const obj = await env.MERCURY_BUCKET.get(key);
    if (!obj) {
      console.error(`[mercury] job=${jobId} object not found in R2`);
      return;
    }

    // ── Stub: add your processing logic here ──────────────
    // Examples:
    //   • Send to an AI API (Cloudflare AI, OpenAI, etc.)
    //   • Extract text with a parsing library via Workers AI
    //   • Store extracted text in D1 or KV
    //   • Trigger a downstream webhook
    // ──────────────────────────────────────────────────────

    const sizeBytes = obj.size;
    console.log(`[mercury] job=${jobId} ready — ${sizeBytes} bytes, type=${contentType}`);

    // Update the object's metadata to mark processing complete
    const existing = await env.MERCURY_BUCKET.get(key);
    if (existing) {
      const updatedMeta = {
        ...existing.customMetadata,
        status: 'processed',
        processedAt: new Date().toISOString(),
        sizeBytes: String(sizeBytes),
      };
      await env.MERCURY_BUCKET.put(key, existing.body, {
        httpMetadata: { contentType: contentType || 'application/octet-stream' },
        customMetadata: updatedMeta,
      });
    }

    console.log(`[mercury] job=${jobId} processing complete`);
  } catch (err) {
    console.error(`[mercury] job=${jobId} processing failed:`, err);
  }
}

// ─── Helpers ─────────────────────────────────────────────
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

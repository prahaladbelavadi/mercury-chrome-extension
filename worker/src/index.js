import { handleAuth, getSession, redirectToLogin } from './auth.js';
import { listFiles, getStats, proxyContent, proxyThumbnail } from './files.js';
import { renderDashboard }                          from './dashboard.js';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const url = new URL(request.url);

    // ── Auth routes (no session required) ────────────────
    const authResponse = await handleAuth(request, env);
    if (authResponse) return authResponse;

    // ── Public API ────────────────────────────────────────
    if (url.pathname === '/health')
      return json({ ok: true, service: 'mercury-worker' });

    if (url.pathname === '/upload' && request.method === 'POST')
      return handleUpload(request, env, ctx);

    if (url.pathname.startsWith('/status/'))
      return handleStatus(url.pathname.slice('/status/'.length), env);

    // ── Auth-gated routes ─────────────────────────────────
    const session = await getSession(request, env);

    if (url.pathname === '/dashboard') {
      // If GitHub creds not configured, render dashboard without auth
      if (env.GITHUB_CLIENT_ID && !session) return redirectToLogin(url.origin);
      const build = {
        version:  env.APP_VERSION  || '—',
        commit:   env.GIT_COMMIT   || '—',
        date:     env.GIT_DATE     || null,
      };
      return new Response(renderDashboard(session, build), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (url.pathname === '/api/me')
      return json(session || { error: 'Not authenticated' }, session ? 200 : 401);

    if (url.pathname === '/api/files' && request.method === 'GET') {
      if (env.GITHUB_CLIENT_ID && !session) return json({ error: 'Unauthorized' }, 401);
      return json(await listFiles(env));
    }

    if (url.pathname === '/api/stats' && request.method === 'GET') {
      if (env.GITHUB_CLIENT_ID && !session) return json({ error: 'Unauthorized' }, 401);
      return json(await getStats(env));
    }

    if (url.pathname.startsWith('/api/files/') && url.pathname.endsWith('/thumbnail')) {
      if (env.GITHUB_CLIENT_ID && !session) return json({ error: 'Unauthorized' }, 401);
      const jobId = url.pathname.split('/')[3];
      const res   = await proxyThumbnail(jobId, env);
      return res || new Response(null, { status: 404 });
    }

    if (url.pathname.startsWith('/api/files/') && url.pathname.endsWith('/content')) {
      if (env.GITHUB_CLIENT_ID && !session) return json({ error: 'Unauthorized' }, 401);
      const jobId = url.pathname.split('/')[3];
      const res   = await proxyContent(jobId, env);
      return res || json({ error: 'Not found' }, 404);
    }

    return json({ error: 'Not found' }, 404);
  },
};

// ── Upload handler ────────────────────────────────────────
async function handleUpload(request, env, ctx) {
  let form;
  try { form = await request.formData(); }
  catch { return json({ success: false, error: 'Invalid multipart body' }, 400); }

  const file     = form.get('file');
  if (!file) return json({ success: false, error: 'No file provided' }, 400);

  const source    = form.get('source')    || 'file';
  const filename  = form.get('filename')  || file.name || 'upload';
  const tabUrl    = form.get('tabUrl')    || null;
  const tabTitle  = form.get('tabTitle')  || null;
  const thumbnail = form.get('thumbnail') || null;
  const jobId     = crypto.randomUUID();
  const key       = `uploads/${jobId}/${filename}`;

  try {
    await env.MERCURY_BUCKET.put(key, file.stream(), {
      httpMetadata:   { contentType: file.type || 'application/octet-stream' },
      customMetadata: {
        jobId, source, filename,
        ...(tabUrl   && { tabUrl }),
        ...(tabTitle && { tabTitle }),
        hasThumbnail: thumbnail ? 'true' : 'false',
        uploadedAt: new Date().toISOString(),
        status: 'uploaded',
      },
    });

    // Store screenshot thumbnail if provided
    if (thumbnail) {
      await env.MERCURY_BUCKET.put(`uploads/${jobId}/thumbnail.jpg`, thumbnail.stream(), {
        httpMetadata:   { contentType: 'image/jpeg' },
        customMetadata: { jobId, type: 'thumbnail' },
      });
    }
  } catch (err) {
    console.error('R2 put failed:', err);
    return json({ success: false, error: 'Storage error' }, 500);
  }

  ctx.waitUntil(processDocument(env, jobId, key, file.type, source));
  return json({ success: true, jobId, key, message: 'File received — processing started' });
}

// ── Status handler ────────────────────────────────────────
async function handleStatus(jobId, env) {
  if (!jobId) return json({ error: 'Missing job ID' }, 400);
  try {
    const list = await env.MERCURY_BUCKET.list({ prefix: `uploads/${jobId}/` });
    if (!list.objects.length) return json({ jobId, status: 'not_found' }, 404);
    const o = list.objects[0];
    return json({
      jobId,
      status:     o.customMetadata?.status   || 'uploaded',
      filename:   o.customMetadata?.filename,
      uploadedAt: o.customMetadata?.uploadedAt,
    });
  } catch (err) {
    console.error('Status check failed:', err);
    return json({ error: 'Could not fetch status' }, 500);
  }
}

// ── Async document processing (post-response) ─────────────
async function processDocument(env, jobId, key, contentType, source) {
  console.log(`[mercury] processing job=${jobId} source=${source}`);
  try {
    const obj = await env.MERCURY_BUCKET.get(key);
    if (!obj) return;

    // ── Extend here: OCR, AI summarization, webhooks, etc. ──

    await env.MERCURY_BUCKET.put(key, obj.body, {
      httpMetadata:   { contentType: contentType || 'application/octet-stream' },
      customMetadata: {
        ...obj.customMetadata,
        status:      'processed',
        processedAt: new Date().toISOString(),
        sizeBytes:   String(obj.size),
      },
    });
    console.log(`[mercury] job=${jobId} done`);
  } catch (err) {
    console.error(`[mercury] job=${jobId} failed:`, err);
  }
}

// ── Helpers ───────────────────────────────────────────────
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

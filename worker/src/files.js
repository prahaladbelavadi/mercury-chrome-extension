export async function listFiles(env) {
  const result = await env.MERCURY_BUCKET.list({
    prefix: 'uploads/',
    include: ['customMetadata', 'httpMetadata'],
  });

  return result.objects
    .filter(o => o.customMetadata?.jobId)
    .map(o => ({
      key:         o.key,
      jobId:       o.customMetadata.jobId,
      filename:    o.customMetadata.filename || o.key.split('/').pop(),
      source:      o.customMetadata.source   || 'file',
      tabUrl:      o.customMetadata.tabUrl   || null,
      uploadedAt:  o.customMetadata.uploadedAt,
      processedAt: o.customMetadata.processedAt || null,
      status:       o.customMetadata.status   || 'uploaded',
      size:         o.size,
      contentType:  o.httpMetadata?.contentType || 'application/octet-stream',
      hasThumbnail: o.customMetadata.hasThumbnail === 'true',
      tabTitle:     o.customMetadata.tabTitle || null,
    }))
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

export async function getStats(env) {
  const files = await listFiles(env);
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  return {
    total:      files.length,
    totalSize,
    bySource:   groupBy(files, 'source'),
    byStatus:   groupBy(files, 'status'),
    byType:     typeBreakdown(files),
    recent:     files.slice(0, 20),
  };
}

export async function proxyThumbnail(jobId, env) {
  // 1. Explicit screenshot thumbnail (tab captures)
  const thumb = await env.MERCURY_BUCKET.get(`uploads/${jobId}/thumbnail.jpg`);
  if (thumb) {
    return new Response(thumb.body, {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' },
    });
  }

  // 2. Image files are their own thumbnail
  const list = await env.MERCURY_BUCKET.list({
    prefix: `uploads/${jobId}/`,
    include: ['httpMetadata'],
  });
  const main = list.objects.find(o => !o.key.endsWith('thumbnail.jpg'));
  if (main) {
    const ct = main.httpMetadata?.contentType || '';
    if (ct.startsWith('image/')) {
      const obj = await env.MERCURY_BUCKET.get(main.key);
      if (obj) return new Response(obj.body, {
        headers: { 'Content-Type': ct, 'Cache-Control': 'private, max-age=86400' },
      });
    }
  }

  return null; // no thumbnail available — dashboard shows icon fallback
}

export async function proxyContent(jobId, env) {
  const list = await env.MERCURY_BUCKET.list({
    prefix: `uploads/${jobId}/`,
    include: ['httpMetadata'],
  });
  if (!list.objects.length) return null;

  const obj = await env.MERCURY_BUCKET.get(list.objects[0].key);
  if (!obj) return null;

  const ct = obj.httpMetadata?.contentType || 'application/octet-stream';
  return new Response(obj.body, {
    headers: {
      'Content-Type': ct,
      'Cache-Control': 'private, max-age=3600',
      'X-Frame-Options': 'SAMEORIGIN',
      // Permissive CSP so captured HTML pages render their own styles/scripts
      'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;",
    },
  });
}

// ── Helpers ───────────────────────────────────────────────
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const v = item[key] || 'unknown';
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});
}

function typeBreakdown(files) {
  return files.reduce((acc, f) => {
    const ct = f.contentType || '';
    if (ct.startsWith('text/html'))  acc.html  = (acc.html  || 0) + 1;
    else if (ct.startsWith('image')) acc.image = (acc.image || 0) + 1;
    else if (ct === 'application/pdf') acc.pdf = (acc.pdf   || 0) + 1;
    else                             acc.other = (acc.other || 0) + 1;
    return acc;
  }, {});
}

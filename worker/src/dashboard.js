export function renderDashboard(user) {
  const userJson = JSON.stringify(user || null);
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mercury — Dashboard</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#09090e;--bg2:#11111a;--bg3:#181825;--bg4:#1f1f2e;
  --border:#252538;--border2:#2e2e45;
  --accent:#6366f1;--accent-dim:#4f46e5;--accent-glow:rgba(99,102,241,.15);
  --text:#e2e2f0;--text-dim:#7070a0;--text-faint:#454565;
  --success:#34d399;--error:#f87171;--warn:#fbbf24;--info:#60a5fa;
  --r:10px;--r-sm:6px;--r-xs:4px;
  --shadow:0 4px 24px rgba(0,0,0,.5);
}
html,body{height:100%;overflow:hidden}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
  font-size:13px;background:var(--bg);color:var(--text);line-height:1.5;
  display:flex;flex-direction:column}

/* ── scrollbar ── */
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}

/* ── header ── */
header{
  display:flex;align-items:center;gap:12px;
  padding:0 20px;height:52px;
  border-bottom:1px solid var(--border);
  flex-shrink:0;background:var(--bg2);
}
.logo{display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px;letter-spacing:-.01em}
.logo svg{color:var(--accent)}
.header-spacer{flex:1}
.stat-pill{
  display:flex;align-items:center;gap:6px;
  padding:4px 10px;border-radius:20px;
  background:var(--bg3);border:1px solid var(--border);
  font-size:11px;color:var(--text-dim);
}
.stat-pill strong{color:var(--text);font-weight:600}
.user-chip{
  display:flex;align-items:center;gap:8px;
  padding:4px 10px 4px 4px;
  border-radius:20px;background:var(--bg3);border:1px solid var(--border);
  cursor:default;
}
.user-avatar{width:24px;height:24px;border-radius:50%;object-fit:cover}
.user-name{font-size:12px;font-weight:500}
.btn-logout{
  padding:4px 10px;border-radius:var(--r-sm);
  border:1px solid var(--border);background:none;
  color:var(--text-dim);font-size:12px;cursor:pointer;transition:all .15s;
}
.btn-logout:hover{color:var(--error);border-color:var(--error)}
.btn-login{
  padding:5px 14px;border-radius:var(--r-sm);
  background:var(--accent);border:none;color:#fff;
  font-size:12px;font-weight:600;cursor:pointer;transition:background .15s;
}
.btn-login:hover{background:var(--accent-dim)}

/* ── stats bar ── */
.stats-bar{
  display:flex;gap:12px;padding:12px 20px;
  border-bottom:1px solid var(--border);
  flex-shrink:0;background:var(--bg2);overflow-x:auto;
}
.stat-card{
  display:flex;flex-direction:column;gap:2px;
  padding:10px 16px;border-radius:var(--r);
  background:var(--bg3);border:1px solid var(--border);
  min-width:120px;
}
.stat-label{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-dim)}
.stat-value{font-size:20px;font-weight:700;line-height:1.2}
.stat-sub{font-size:10px;color:var(--text-faint)}

/* ── main layout ── */
.layout{display:flex;flex:1;overflow:hidden}

/* ── toolbar ── */
.toolbar{
  display:flex;align-items:center;gap:8px;
  padding:10px 16px;border-bottom:1px solid var(--border);
  flex-shrink:0;background:var(--bg2);
}
.search-wrap{position:relative;flex:1;max-width:320px}
.search-icon{position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--text-faint);pointer-events:none}
.search-input{
  width:100%;padding:6px 10px 6px 30px;
  border-radius:var(--r-sm);border:1px solid var(--border);
  background:var(--bg3);color:var(--text);font-size:12px;outline:none;
  transition:border-color .15s;
}
.search-input:focus{border-color:var(--accent)}
.search-input::placeholder{color:var(--text-faint)}
select.filter-select{
  padding:5px 10px;border-radius:var(--r-sm);
  border:1px solid var(--border);background:var(--bg3);
  color:var(--text);font-size:12px;cursor:pointer;outline:none;
}
.toolbar-spacer{flex:1}
.file-count{font-size:11px;color:var(--text-dim)}

/* ── files panel ── */
.files-panel{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
.files-scroll{flex:1;overflow-y:auto;padding:16px}
.files-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(200px,1fr));
  gap:12px;
}

/* ── file card ── */
.file-card{
  background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);
  overflow:hidden;cursor:pointer;transition:border-color .2s,transform .15s,box-shadow .2s;
  display:flex;flex-direction:column;
}
.file-card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:var(--shadow)}
.file-card:active{transform:translateY(0)}

/* thumbnail area */
.card-thumb{
  position:relative;width:100%;aspect-ratio:16/10;
  background:var(--bg3);overflow:hidden;flex-shrink:0;
}
.card-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.card-thumb .thumb-icon{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:100%;gap:6px;color:var(--text-faint);
}
.thumb-icon svg{opacity:.5}
.thumb-icon span{font-size:10px;text-transform:uppercase;letter-spacing:.08em}
.card-thumb .thumb-loading{
  position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  background:var(--bg3);
}
.card-thumb .status-overlay{
  position:absolute;top:6px;right:6px;
  padding:2px 7px;border-radius:10px;font-size:9px;font-weight:600;
  text-transform:uppercase;letter-spacing:.06em;
}
.status-overlay.processed{background:rgba(52,211,153,.15);color:var(--success)}
.status-overlay.uploaded {background:rgba(251,191,36,.15);color:var(--warn)}
.status-overlay.error    {background:rgba(248,113,113,.15);color:var(--error)}

/* card footer */
.card-info{padding:8px 10px;display:flex;flex-direction:column;gap:3px}
.card-name{font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card-meta{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.badge{
  padding:1px 6px;border-radius:3px;font-size:10px;font-weight:600;
  text-transform:uppercase;letter-spacing:.05em;
}
.badge-tab {background:rgba(99,102,241,.18);color:var(--accent)}
.badge-file{background:rgba(96,165,250,.18);color:var(--info)}
.card-date{font-size:10px;color:var(--text-faint);margin-left:auto}
.card-size{font-size:10px;color:var(--text-faint)}

/* ── activity log ── */
.activity-panel{
  width:260px;flex-shrink:0;
  border-left:1px solid var(--border);
  display:flex;flex-direction:column;overflow:hidden;
  background:var(--bg2);
}
.activity-header{
  padding:10px 14px;border-bottom:1px solid var(--border);
  font-size:11px;font-weight:600;text-transform:uppercase;
  letter-spacing:.06em;color:var(--text-dim);flex-shrink:0;
}
.activity-scroll{flex:1;overflow-y:auto;padding:10px}
.activity-item{
  display:flex;gap:10px;padding:7px 0;
  border-bottom:1px solid var(--border);
}
.activity-item:last-child{border-bottom:none}
.activity-dot{
  width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px;
}
.dot-processed{background:var(--success);box-shadow:0 0 6px var(--success)}
.dot-uploaded {background:var(--warn)}
.dot-error    {background:var(--error)}
.activity-body{min-width:0;flex:1}
.activity-name{font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.activity-meta{display:flex;gap:5px;align-items:center;margin-top:2px}
.activity-time{font-size:10px;color:var(--text-faint)}
.activity-source{font-size:9px;padding:1px 5px;border-radius:3px;font-weight:600;text-transform:uppercase}

/* ── empty state ── */
.empty{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:100%;gap:10px;color:var(--text-faint);text-align:center;padding:40px;
}
.empty svg{opacity:.25}
.empty p{font-size:13px}
.empty small{font-size:11px;color:var(--text-faint)}

/* ── skeleton ── */
@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
.skeleton{
  background:linear-gradient(90deg,var(--bg3) 25%,var(--bg4) 50%,var(--bg3) 75%);
  background-size:400px 100%;animation:shimmer 1.4s infinite;border-radius:4px;
}
.skel-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);overflow:hidden}
.skel-thumb{width:100%;aspect-ratio:16/10}
.skel-line{height:10px;margin:8px 10px 4px}
.skel-line-sm{height:8px;width:60%;margin:0 10px 8px}

/* ── modal ── */
.modal-backdrop{
  position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:100;
  display:flex;align-items:center;justify-content:center;
  opacity:0;pointer-events:none;transition:opacity .2s;
}
.modal-backdrop.open{opacity:1;pointer-events:all}
.modal{
  background:var(--bg2);border:1px solid var(--border2);border-radius:14px;
  box-shadow:0 24px 80px rgba(0,0,0,.7);
  display:flex;flex-direction:column;
  width:min(900px,94vw);max-height:90vh;overflow:hidden;
  transform:scale(.95) translateY(10px);transition:transform .2s;
}
.modal-backdrop.open .modal{transform:scale(1) translateY(0)}
.modal-header{
  display:flex;align-items:center;gap:10px;padding:14px 18px;
  border-bottom:1px solid var(--border);flex-shrink:0;
}
.modal-title{font-size:13px;font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.modal-meta{display:flex;gap:6px;align-items:center}
.modal-close{
  width:28px;height:28px;border-radius:6px;border:none;
  background:var(--bg3);color:var(--text-dim);cursor:pointer;
  display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;
}
.modal-close:hover{background:var(--bg4);color:var(--text)}
.modal-body{flex:1;overflow:hidden;position:relative;min-height:400px}
.modal-body iframe,.modal-body img{width:100%;height:100%;border:none;object-fit:contain}
.modal-footer{
  padding:10px 18px;border-top:1px solid var(--border);
  font-size:11px;color:var(--text-dim);display:flex;gap:12px;align-items:center;flex-shrink:0;
}
.modal-footer a{color:var(--accent);text-decoration:none}
.modal-footer a:hover{text-decoration:underline}

/* ── spinner ── */
@keyframes spin{to{transform:rotate(360deg)}}
.spinner{
  width:20px;height:20px;border:2px solid var(--border);border-top-color:var(--accent);
  border-radius:50%;animation:spin .7s linear infinite;
}

/* ── login wall ── */
.login-wall{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:16px;
}
.login-box{
  background:var(--bg2);border:1px solid var(--border);border-radius:14px;
  padding:36px 40px;text-align:center;display:flex;flex-direction:column;gap:16px;
  max-width:340px;width:100%;
}
.login-box h2{font-size:18px;font-weight:700}
.login-box p{font-size:13px;color:var(--text-dim)}
.btn-github{
  display:flex;align-items:center;justify-content:center;gap:8px;
  padding:10px 20px;border-radius:var(--r-sm);
  background:var(--bg3);border:1px solid var(--border2);
  color:var(--text);font-size:13px;font-weight:600;cursor:pointer;
  text-decoration:none;transition:background .15s,border-color .15s;
}
.btn-github:hover{background:var(--bg4);border-color:var(--accent)}

@media(max-width:700px){
  .activity-panel{display:none}
  .stats-bar{gap:8px;padding:10px 12px}
}
</style>
</head>
<body>

<header>
  <div class="logo">
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="10" cy="10" r="3.5" fill="currentColor"/>
      <line x1="10" y1="1" x2="10" y2="4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
    Mercury
  </div>
  <div class="header-spacer"></div>
  <div id="headerUser"></div>
</header>

<div class="stats-bar" id="statsBar">
  ${[0,1,2,3].map(()=>`
  <div class="stat-card">
    <div class="stat-label skeleton" style="width:60px;height:9px"></div>
    <div class="stat-value skeleton" style="width:40px;height:20px;margin-top:4px"></div>
  </div>`).join('')}
</div>

<div class="layout">
  <div class="files-panel">
    <div class="toolbar">
      <div class="search-wrap">
        <svg class="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input class="search-input" id="searchInput" type="search" placeholder="Search files…" />
      </div>
      <select class="filter-select" id="filterType">
        <option value="">All types</option>
        <option value="text/html">HTML</option>
        <option value="image">Images</option>
        <option value="application/pdf">PDF</option>
      </select>
      <select class="filter-select" id="sortOrder">
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="largest">Largest</option>
        <option value="smallest">Smallest</option>
        <option value="name">Name A–Z</option>
      </select>
      <div class="toolbar-spacer"></div>
      <span class="file-count" id="fileCount"></span>
    </div>

    <div class="files-scroll">
      <div class="files-grid" id="filesGrid">
        ${Array(8).fill(0).map(()=>`
        <div class="skel-card">
          <div class="skel-thumb skeleton"></div>
          <div class="skel-line skeleton"></div>
          <div class="skel-line-sm skeleton"></div>
        </div>`).join('')}
      </div>
    </div>
  </div>

  <div class="activity-panel">
    <div class="activity-header">Activity</div>
    <div class="activity-scroll" id="activityLog">
      <div style="display:flex;justify-content:center;padding:20px">
        <div class="spinner"></div>
      </div>
    </div>
  </div>
</div>

<!-- Preview modal -->
<div class="modal-backdrop" id="modalBackdrop">
  <div class="modal" id="previewModal">
    <div class="modal-header">
      <span class="modal-title" id="modalTitle"></span>
      <div class="modal-meta" id="modalMeta"></div>
      <button class="modal-close" id="modalClose" aria-label="Close">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/>
        </svg>
      </button>
    </div>
    <div class="modal-body" id="modalBody">
      <div style="display:flex;align-items:center;justify-content:center;height:100%">
        <div class="spinner"></div>
      </div>
    </div>
    <div class="modal-footer" id="modalFooter"></div>
  </div>
</div>

<script>
const USER = ${userJson};
let allFiles = [];

// ── Relative time ──────────────────────────────────────────
function relTime(iso) {
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 60)    return 'just now';
  if (d < 3600)  return Math.floor(d/60) + 'm ago';
  if (d < 86400) return Math.floor(d/3600) + 'h ago';
  return Math.floor(d/86400) + 'd ago';
}

// ── Format bytes ───────────────────────────────────────────
function fmtBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(2) + ' MB';
}

// ── Header ─────────────────────────────────────────────────
function renderHeader() {
  const el = document.getElementById('headerUser');
  if (USER) {
    el.innerHTML = \`
      <div class="user-chip">
        <img class="user-avatar" src="\${USER.avatar}" alt="\${USER.login}">
        <span class="user-name">@\${USER.login}</span>
      </div>
      <a href="/auth/logout" class="btn-logout">Sign out</a>\`;
  } else {
    el.innerHTML = \`<a href="/auth/github" class="btn-login">Sign in with GitHub</a>\`;
  }
}

// ── Stats bar ──────────────────────────────────────────────
function renderStats(stats) {
  const bar = document.getElementById('statsBar');
  const cards = [
    { label: 'Total files',  value: stats.total,                 sub: 'uploads' },
    { label: 'Storage used', value: fmtBytes(stats.totalSize),   sub: 'in R2' },
    { label: 'Tab captures', value: stats.bySource?.tab   || 0,  sub: 'HTML pages' },
    { label: 'File uploads', value: stats.bySource?.file  || 0,  sub: 'from disk' },
  ];
  bar.innerHTML = cards.map(c => \`
    <div class="stat-card">
      <div class="stat-label">\${c.label}</div>
      <div class="stat-value">\${c.value}</div>
      <div class="stat-sub">\${c.sub}</div>
    </div>\`).join('');
}

// ── Thumbnail ──────────────────────────────────────────────
function thumbFor(file) {
  const ct = file.contentType || '';

  // Tab captures always have a real screenshot; image files serve themselves
  if (file.hasThumbnail || ct.startsWith('image/')) {
    const src = file.hasThumbnail
      ? \`/api/files/\${file.jobId}/thumbnail\`
      : \`/api/files/\${file.jobId}/content\`;
    return \`
      <img data-src="\${src}" alt="\${esc(file.tabTitle || file.filename)}"
           onerror="this.parentElement.innerHTML=iconThumb('${ct}')">
      <div class="thumb-loading"><div class="spinner"></div></div>\`;
  }

  // PDF / other: icon
  return iconThumb(ct);
}

function iconThumb(ct) {
  const label = ct === 'application/pdf' ? 'PDF' : ct.startsWith('text/') ? 'TXT' : 'FILE';
  return \`<div class="thumb-icon">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
    <span>\${label}</span>
  </div>\`;
}

function esc(s) { return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ── Status overlay ─────────────────────────────────────────
function statusOverlay(status) {
  const cls = status === 'processed' ? 'processed' : status === 'error' ? 'error' : 'uploaded';
  return \`<div class="status-overlay \${cls}">\${status}</div>\`;
}

// ── Badge ──────────────────────────────────────────────────
function sourceBadge(source) {
  return source === 'tab'
    ? \`<span class="badge badge-tab">tab</span>\`
    : \`<span class="badge badge-file">file</span>\`;
}

// ── File card ──────────────────────────────────────────────
function renderCard(file) {
  const div = document.createElement('div');
  div.className = 'file-card';
  div.dataset.jobId = file.jobId;
  div.innerHTML = \`
    <div class="card-thumb">
      \${thumbFor(file)}
      \${statusOverlay(file.status)}
    </div>
    <div class="card-info">
      <div class="card-name" title="\${file.filename}">\${file.filename}</div>
      <div class="card-meta">
        \${sourceBadge(file.source)}
        <span class="card-size">\${fmtBytes(file.size)}</span>
        <span class="card-date">\${relTime(file.uploadedAt)}</span>
      </div>
    </div>\`;
  div.addEventListener('click', () => openPreview(file));
  return div;
}

// ── Lazy loading ───────────────────────────────────────────
const thumbObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const card = entry.target;
    const img  = card.querySelector('img[data-src]');
    if (img) {
      img.src = img.dataset.src;
      delete img.dataset.src;
      img.addEventListener('load', () => {
        card.querySelector('.thumb-loading')?.remove();
      }, { once: true });
      img.addEventListener('error', () => {
        card.querySelector('.thumb-loading')?.remove();
      }, { once: true });
    }
    thumbObserver.unobserve(card);
  }
}, { rootMargin: '200px' });

// ── Render grid ────────────────────────────────────────────
function renderGrid(files) {
  const grid = document.getElementById('filesGrid');
  grid.innerHTML = '';
  document.getElementById('fileCount').textContent =
    files.length === allFiles.length ? \`\${files.length} files\` : \`\${files.length} / \${allFiles.length}\`;

  if (!files.length) {
    grid.innerHTML = \`<div class="empty" style="grid-column:1/-1">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <p>No files yet</p>
      <small>Drop a file or capture a tab using the Mercury extension</small>
    </div>\`;
    return;
  }

  for (const file of files) {
    const card = renderCard(file);
    grid.appendChild(card);
    thumbObserver.observe(card);
  }
}

// ── Activity log ───────────────────────────────────────────
function renderActivity(files) {
  const log = document.getElementById('activityLog');
  if (!files.length) {
    log.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-faint);font-size:12px">No activity yet</div>';
    return;
  }
  log.innerHTML = files.slice(0, 25).map(f => {
    const dotCls = f.status === 'processed' ? 'dot-processed' : f.status === 'error' ? 'dot-error' : 'dot-uploaded';
    const srcCls = f.source === 'tab' ? 'badge-tab' : 'badge-file';
    return \`<div class="activity-item">
      <div class="activity-dot \${dotCls}"></div>
      <div class="activity-body">
        <div class="activity-name" title="\${f.filename}">\${f.filename}</div>
        <div class="activity-meta">
          <span class="activity-source badge \${srcCls}">\${f.source}</span>
          <span class="activity-time">\${relTime(f.uploadedAt)}</span>
        </div>
      </div>
    </div>\`;
  }).join('');
}

// ── Filter + sort ──────────────────────────────────────────
function applyFilters() {
  const query  = document.getElementById('searchInput').value.toLowerCase();
  const type   = document.getElementById('filterType').value;
  const sort   = document.getElementById('sortOrder').value;

  let files = allFiles.filter(f => {
    if (query && !f.filename.toLowerCase().includes(query) &&
        !(f.tabUrl || '').toLowerCase().includes(query)) return false;
    if (type) {
      if (type === 'image' && !f.contentType.startsWith('image/')) return false;
      if (type !== 'image' && !f.contentType.startsWith(type)) return false;
    }
    return true;
  });

  files = files.slice().sort((a, b) => {
    if (sort === 'newest')   return new Date(b.uploadedAt) - new Date(a.uploadedAt);
    if (sort === 'oldest')   return new Date(a.uploadedAt) - new Date(b.uploadedAt);
    if (sort === 'largest')  return b.size - a.size;
    if (sort === 'smallest') return a.size - b.size;
    if (sort === 'name')     return a.filename.localeCompare(b.filename);
    return 0;
  });

  renderGrid(files);
}

// ── Preview modal ──────────────────────────────────────────
function openPreview(file) {
  const backdrop = document.getElementById('modalBackdrop');
  const ct = file.contentType || '';
  const src = \`/api/files/\${file.jobId}/content\`;

  document.getElementById('modalTitle').textContent = file.filename;
  document.getElementById('modalMeta').innerHTML = \`
    \${sourceBadge(file.source)}
    <span class="badge" style="background:var(--bg3);color:var(--text-dim)">\${fmtBytes(file.size)}</span>\`;

  const body = document.getElementById('modalBody');
  if (ct.startsWith('text/html')) {
    body.innerHTML = \`<iframe src="\${src}" sandbox="allow-same-origin allow-scripts allow-forms" title="\${file.filename}"></iframe>\`;
  } else if (ct.startsWith('image/')) {
    body.innerHTML = \`<img src="\${src}" alt="\${file.filename}" style="max-width:100%;max-height:100%;object-fit:contain;padding:16px">\`;
  } else if (ct === 'application/pdf') {
    body.innerHTML = \`<iframe src="\${src}" title="\${file.filename}" style="width:100%;height:100%;border:none"></iframe>\`;
  } else {
    body.innerHTML = \`<div style="padding:24px;font-size:13px;color:var(--text-dim)">
      <p>Preview not available for this file type.</p>
      <p style="margin-top:8px">Type: \${ct}</p>
      <a href="\${src}" target="_blank" style="color:var(--accent);margin-top:12px;display:inline-block">Open raw ↗</a>
    </div>\`;
  }

  const footer = document.getElementById('modalFooter');
  footer.innerHTML = \`
    <span>Uploaded \${relTime(file.uploadedAt)}</span>
    \${file.tabUrl ? \`<a href="\${file.tabUrl}" target="_blank" rel="noopener">Source: \${file.tabUrl}</a>\` : ''}
    <a href="\${src}" target="_blank" rel="noopener" style="margin-left:auto">Open raw ↗</a>\`;

  backdrop.classList.add('open');
  document.addEventListener('keydown', onEscape);
}

function closeModal() {
  const backdrop = document.getElementById('modalBackdrop');
  backdrop.classList.remove('open');
  setTimeout(() => { document.getElementById('modalBody').innerHTML = ''; }, 200);
  document.removeEventListener('keydown', onEscape);
}

function onEscape(e) { if (e.key === 'Escape') closeModal(); }

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalBackdrop').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

// ── Event listeners ────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('filterType').addEventListener('change', applyFilters);
document.getElementById('sortOrder').addEventListener('change', applyFilters);

// ── Boot ───────────────────────────────────────────────────
async function boot() {
  renderHeader();

  try {
    const [filesRes, statsRes] = await Promise.all([
      fetch('/api/files'),
      fetch('/api/stats'),
    ]);

    if (filesRes.status === 401) {
      // Show login wall in files area
      document.getElementById('filesGrid').innerHTML = \`
        <div class="empty" style="grid-column:1/-1">
          <p>Sign in to view your files</p>
          <a href="/auth/github" class="btn-login" style="margin-top:8px;display:inline-block;padding:8px 20px;background:var(--accent);color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Sign in with GitHub</a>
        </div>\`;
      document.getElementById('statsBar').innerHTML = '';
      document.getElementById('activityLog').innerHTML = '';
      return;
    }

    const [files, stats] = await Promise.all([filesRes.json(), statsRes.json()]);
    allFiles = files;
    renderStats(stats);
    renderGrid(files);
    renderActivity(files);
    // Only start polling if there's something still processing
    if (hasPending()) startPolling();
  } catch (err) {
    console.error('Boot failed:', err);
    document.getElementById('filesGrid').innerHTML =
      \`<div class="empty" style="grid-column:1/-1"><p>Failed to load files</p><small>\${err.message}</small></div>\`;
  }
}

boot();

// ── Smart poller — only runs while the tab is visible
//    and there are pending files; stops itself when done ────
let pollTimer = null;

function hasPending() {
  return allFiles.some(f => f.status === 'uploaded' || f.status === 'processing');
}

async function pollOnce() {
  try {
    const files = await fetch('/api/files').then(r => r.json());
    if (Array.isArray(files)) {
      allFiles = files;
      applyFilters();
      renderActivity(files);
    }
  } catch {}
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (!hasPending()) { stopPolling(); return; }
    pollOnce();
  }, 15_000);
}

function stopPolling() {
  clearInterval(pollTimer);
  pollTimer = null;
}

// Resume polling when tab becomes visible and there's still work
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && hasPending()) startPolling();
});
</script>
</body>
</html>`;
}

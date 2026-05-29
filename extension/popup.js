// Worker URL — update after deploying the Cloudflare Worker
const WORKER_URL = 'https://mercury-worker.belavadi.workers.dev';

// ─── DOM refs ────────────────────────────────────────────
const workerStatus  = document.getElementById('workerStatus');
const statusDot     = workerStatus.querySelector('.status-dot');

const alertBtn      = document.getElementById('alertBtn');

const dropZone      = document.getElementById('dropZone');
const fileInput     = document.getElementById('fileInput');
const pickFileBtn   = document.getElementById('pickFileBtn');
const captureTabBtn = document.getElementById('captureTabBtn');

const uploadStatus  = document.getElementById('uploadStatus');
const statusIcon    = document.getElementById('statusIcon');
const statusMsg     = document.getElementById('statusMsg');
const jobIdEl       = document.getElementById('jobId');
const resetBtn      = document.getElementById('resetBtn');

// ─── Worker health check ─────────────────────────────────
async function checkWorker() {
  statusDot.className = 'status-dot checking';
  try {
    const res = await fetch(`${WORKER_URL}/health`, { signal: AbortSignal.timeout(4000) });
    statusDot.className = res.ok ? 'status-dot ok' : 'status-dot err';
    workerStatus.title = res.ok ? 'Worker online' : `Worker error ${res.status}`;
  } catch {
    statusDot.className = 'status-dot err';
    workerStatus.title = 'Worker unreachable';
  }
}

// ─── Button 1: Alert ─────────────────────────────────────
alertBtn.addEventListener('click', () => {
  alert('Mercury says hello! 👋\nThis button will do something useful soon.');
});

// ─── Drop zone interactions ───────────────────────────────
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('over');
  const file = e.dataTransfer.files[0];
  if (file) uploadFile(file);
});
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') fileInput.click();
});

pickFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) uploadFile(file);
});

captureTabBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  await captureAndUpload();
});

resetBtn.addEventListener('click', () => {
  uploadStatus.hidden = true;
  dropZone.hidden = false;
  fileInput.value = '';
});

// ─── Upload a File object ─────────────────────────────────
async function uploadFile(file) {
  showUploadState('loading', `Uploading ${file.name}…`);

  const form = new FormData();
  form.append('file', file);
  form.append('source', 'file');
  form.append('filename', file.name);

  await sendToWorker(form);
}

// ─── Capture the active tab and upload ───────────────────
async function captureAndUpload() {
  showUploadState('loading', 'Capturing tab…');

  try {
    const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_TAB' });

    if (response.error) {
      showUploadState('error', response.error);
      return;
    }

    // response.html = page HTML, response.url = tab URL
    const blob = new Blob([response.html], { type: 'text/html' });
    const filename = `${new URL(response.url).hostname}-capture.html`;
    const file = new File([blob], filename, { type: 'text/html' });

    const form = new FormData();
    form.append('file', file);
    form.append('source', 'tab');
    form.append('filename', filename);
    form.append('tabUrl', response.url);

    await sendToWorker(form);
  } catch (err) {
    showUploadState('error', err.message || 'Capture failed');
  }
}

// ─── POST to the worker ───────────────────────────────────
async function sendToWorker(form) {
  try {
    const res = await fetch(`${WORKER_URL}/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(30_000),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showUploadState('success', 'Uploaded — processing started');
      if (data.jobId) {
        jobIdEl.textContent = `Job: ${data.jobId}`;
        jobIdEl.hidden = false;
      }
      statusDot.className = 'status-dot ok';
    } else {
      showUploadState('error', data.error || `Error ${res.status}`);
    }
  } catch (err) {
    const msg = err.name === 'TimeoutError'
      ? 'Request timed out'
      : (err.message || 'Network error');
    showUploadState('error', msg);
  }
}

// ─── UI state helpers ─────────────────────────────────────
function showUploadState(state, message) {
  dropZone.hidden = true;
  uploadStatus.hidden = false;
  jobIdEl.hidden = true;

  if (state === 'loading') {
    statusIcon.innerHTML = '<span class="spinner"></span>';
    statusMsg.textContent = message;
    statusMsg.style.color = '';
  } else if (state === 'success') {
    statusIcon.textContent = '✓';
    statusMsg.textContent = message;
    statusMsg.style.color = 'var(--success)';
  } else {
    statusIcon.textContent = '✕';
    statusMsg.textContent = message;
    statusMsg.style.color = 'var(--error)';
  }
}

// ─── Init ─────────────────────────────────────────────────
checkWorker();

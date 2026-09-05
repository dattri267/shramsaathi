// ---------------------------------------------------------
// Worker verification tab: list workers, open a worker,
// verify/unverify individual documents, set overall status.
// ---------------------------------------------------------

const workerGrid = document.getElementById('workerGrid');
const searchInput = document.getElementById('workerSearch');
const statusFilter = document.getElementById('statusFilter');
const modalOverlay = document.getElementById('workerModal');
const modalBody = document.getElementById('workerModalBody');

let currentWorkerId = null;
let searchDebounce = null;

function statusBadge(status) {
  return `<span class="status-badge status-${status}">${status.replace('_', ' ')}</span>`;
}

function docProgressLine(worker) {
  const allVerified =
    worker.documentsTotal > 0 &&
    worker.documentsVerified === worker.documentsTotal;

  const cls = worker.documentsTotal === 0
    ? ''
    : allVerified
      ? 'all-verified'
      : 'some-pending';

  return `<div class="doc-progress ${cls}">${worker.documentsVerified}/${worker.documentsTotal} documents verified</div>`;
}

function renderWorkerCard(worker) {
  const div = document.createElement('div');
  div.className = 'worker-card';
  div.innerHTML = `
    <div class="name-row">
      <div>
        <h3>${worker.fullName || 'Unnamed worker'}</h3>
        <p>${worker.phone || 'No phone on file'}</p>
      </div>
      ${statusBadge(worker.verificationStatus)}
    </div>
    <div class="meta-row">
      <span>⭐ ${worker.averageRating ?? '—'}</span>
      <span>${worker.completedJobs ?? 0} jobs done</span>
      <span>${worker.availability}</span>
    </div>
    ${docProgressLine(worker)}
  `;
  div.addEventListener('click', () => openWorkerModal(worker.workerId));
  return div;
}

async function loadWorkers() {
  workerGrid.innerHTML = '<div class="loading-state">Loading workers…</div>';

  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
  if (statusFilter.value) params.set('status', statusFilter.value);

  try {
    const res = await fetch(`${CONFIG.BACKEND_API_BASE}/admin/workers?${params.toString()}`);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const data = await res.json();

    workerGrid.innerHTML = '';

    if (!data.workers || data.workers.length === 0) {
      workerGrid.innerHTML = '<div class="empty-state">No workers match this filter.</div>';
      return;
    }

    data.workers.forEach((worker) => {
      workerGrid.appendChild(renderWorkerCard(worker));
    });
  } catch (err) {
    workerGrid.innerHTML = `<div class="empty-state">Could not load workers.<br>${err.message}<br>Is the backend running on ${CONFIG.BACKEND_API_BASE}?</div>`;
  }
}

function isPdf(url) {
  return typeof url === 'string' && url.toLowerCase().includes('.pdf');
}

function renderDocumentRow(doc) {
  const preview = isPdf(doc.url)
    ? `<div class="thumb" style="display:flex;align-items:center;justify-content:center;font-size:11px;color:#6b7280;">PDF</div>`
    : `<img class="thumb" src="${doc.url}" alt="${doc.title}" />`;

  return `
    <div class="document-row">
      ${preview}
      <div class="doc-info">
        <div class="title">${doc.title} <span style="color:#9ca3af;">(${doc.fileType.replace('_', ' ')})</span></div>
        <div class="meta">Uploaded ${new Date(doc.createdAt).toLocaleDateString()}</div>
        <a href="${doc.url}" target="_blank" rel="noopener">Open file ↗</a>
      </div>
      <button
        class="action-btn ${doc.verified ? 'success' : ''}"
        onclick="toggleDocumentVerified('${doc.id}', ${!doc.verified})"
      >
        ${doc.verified ? '✓ Verified' : 'Mark verified'}
      </button>
    </div>
  `;
}

async function openWorkerModal(workerId) {
  currentWorkerId = workerId;
  modalOverlay.classList.add('active');
  modalBody.innerHTML = '<div class="loading-state">Loading worker…</div>';

  try {
    const res = await fetch(`${CONFIG.BACKEND_API_BASE}/admin/workers/${workerId}`);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const { worker } = await res.json();

    const skillsHtml = worker.skills.length
      ? worker.skills.map((s) => `<span class="skill-chip">${s.name}${s.isPrimary ? ' ★' : ''}</span>`).join('')
      : '<p style="color:#9ca3af;font-size:13px;">No skills added yet.</p>';

    const documentsHtml = worker.documents.length
      ? worker.documents.map(renderDocumentRow).join('')
      : '<p style="color:#9ca3af;font-size:13px;">No documents uploaded yet.</p>';

    modalBody.innerHTML = `
      <div class="modal-header">
        <div>
          <h2>${worker.fullName || 'Unnamed worker'}</h2>
          <p>${worker.phone || 'No phone'} · Joined ${new Date(worker.createdAt).toLocaleDateString()}</p>
        </div>
        <button class="close-btn" id="closeModalBtnInner">✕</button>
      </div>

      <div>${statusBadge(worker.verificationStatus)}</div>

      <div class="section-title">Overall verification status</div>
      <div class="status-actions">
        <button class="action-btn success" onclick="setWorkerStatus('verified')">Approve worker</button>
        <button class="action-btn" onclick="setWorkerStatus('pending_verification')">Set pending</button>
        <button class="action-btn danger" onclick="setWorkerStatus('rejected')">Reject</button>
        <button class="action-btn danger" onclick="setWorkerStatus('suspended')">Suspend</button>
      </div>

      <div class="section-title">Skills</div>
      <div>${skillsHtml}</div>

      <div class="section-title">Documents (${worker.documents.filter((d) => d.verified).length}/${worker.documents.length} verified)</div>
      <div>${documentsHtml}</div>
    `;

    document
      .getElementById('closeModalBtnInner')
      .addEventListener('click', closeWorkerModal);
  } catch (err) {
    modalBody.innerHTML = `<div class="empty-state">Could not load this worker.<br>${err.message}</div>`;
  }
}

function closeWorkerModal() {
  modalOverlay.classList.remove('active');
  currentWorkerId = null;
}

async function toggleDocumentVerified(documentId, verified) {
  try {
    const res = await fetch(`${CONFIG.BACKEND_API_BASE}/admin/documents/${documentId}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified })
    });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);

    // Refresh the open modal and the underlying list so counts stay correct.
    if (currentWorkerId) await openWorkerModal(currentWorkerId);
    await loadWorkers();
  } catch (err) {
    alert(`Could not update document: ${err.message}`);
  }
}

async function setWorkerStatus(status) {
  if (!currentWorkerId) return;

  try {
    const res = await fetch(`${CONFIG.BACKEND_API_BASE}/admin/workers/${currentWorkerId}/verification-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);

    await openWorkerModal(currentWorkerId);
    await loadWorkers();
  } catch (err) {
    alert(`Could not update worker status: ${err.message}`);
  }
}

searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(loadWorkers, 350);
});
statusFilter.addEventListener('change', loadWorkers);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeWorkerModal();
});

loadWorkers();
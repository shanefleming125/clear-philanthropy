// dashboard.js — Clear Philanthropy

let allOrgs = [];
let sortKey = '';
let sortDir = 'asc';

renderDashboard();

async function renderDashboard() {
  try {
    allOrgs = await DB.listAssessments();
    updateStats(allOrgs);
    renderTable(allOrgs);
  } catch(e) {
    document.getElementById('loadingState').innerHTML = `<div class="empty-desc" style="color:#E8472A">Error loading: ${e.message}</div>`;
  }
}

function updateStats(orgs) {
  const real = orgs.filter(o => !o.is_sample);
  document.getElementById('statTotal').textContent = real.length;
  document.getElementById('statLow').textContent = real.filter(o => o.riskLevel === 'Low').length;
  document.getElementById('statMod').textContent = real.filter(o => o.riskLevel === 'Moderate').length;
  document.getElementById('statHigh').textContent = real.filter(o => o.riskLevel === 'High').length;
}

function truncate(str, max) {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function renderTable(orgs) {
  const loading = document.getElementById('loadingState');
  const empty = document.getElementById('emptyState');
  const noResults = document.getElementById('noResults');
  const table = document.getElementById('orgTable');
  const tbody = document.getElementById('orgTableBody');

  loading.style.display = 'none';

  if (!allOrgs.length) {
    empty.style.display = 'block';
    noResults.style.display = 'none';
    table.style.display = 'none';
    return;
  }

  if (!orgs.length) {
    empty.style.display = 'none';
    noResults.style.display = 'block';
    table.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  noResults.style.display = 'none';
  table.style.display = 'table';

  const recCls = {
    'Invite to Apply':    'rec-invite',
    'Request More Info':  'rec-info',
    'Decline':            'rec-decline',
    'Approved':           'rec-approved',
    'Full Due Diligence': 'rec-due',
    'Pending Review':     'rec-info'
  };
  const dotCls = { Low: 'dot-low', Moderate: 'dot-mod', High: 'dot-high' };
  const barColor = { Low: '#2EAD77', Moderate: '#D97706', High: '#E8472A' };

  tbody.innerHTML = orgs.map(o => {
    const isPending = o.recommendation === 'Pending Review' && o.status === 'submitted';
    const hasExtraction = !!o.extractedData;

    let actionCell = '';
    if (o.is_sample) {
      actionCell = '';
    } else if (isPending && !hasExtraction) {
      actionCell = `
        <button class="action-btn" style="background:#0B2545;color:white;border-color:#0B2545;margin-bottom:4px;display:block;width:100%" onclick="event.stopPropagation();runAutoFill('${o.id}', this)">Run Auto-Fill</button>
        <button class="action-btn" style="display:block;width:100%" onclick="event.stopPropagation();deleteOrg('${o.id}', this)">Delete</button>`;
    } else if (isPending && hasExtraction) {
      actionCell = `
        <button class="action-btn" style="background:#1A6EB5;color:white;border-color:#1A6EB5;margin-bottom:4px;display:block;width:100%" onclick="event.stopPropagation();reviewExtracted('${o.id}')">Review Data</button>
        <button class="action-btn" style="display:block;width:100%" onclick="event.stopPropagation();deleteOrg('${o.id}', this)">Delete</button>`;
    } else {
      actionCell = `<button class="action-btn" onclick="event.stopPropagation();deleteOrg('${o.id}', this)">Delete</button>`;
    }

    const pendingBadge = isPending
      ? `<span style="font-size:9px;font-weight:700;background:#FEF3C7;color:#B45309;padding:1px 5px;border-radius:8px;vertical-align:middle;margin-left:4px;white-space:nowrap">PENDING</span>`
      : '';

    const subLine = [
      o.fyEnd || '',
      o.status === 'submitted' ? '<span style="color:#1A6EB5">Self-reported</span>' : '',
      isPending && hasExtraction ? '<span style="color:#2EAD77">Auto-fill ready</span>' : '',
      isPending && !hasExtraction && (o.docs?.length || o.sourceNotes?.includes('documents uploaded')) ? '<span style="color:#9CA3AF">Awaiting auto-fill</span>' : ''
    ].filter(Boolean).join(' · ');

    const orgDisplay = truncate(o.orgName, 40);
    const recDisplay = truncate(o.recommendation, 22);
    const reviewerDisplay = truncate(o.reviewer || o.contactName, 18);
    const dateDisplay = (o.reviewDate || (o.created_at || '').split('T')[0] || '—').slice(0, 10);

    return `
    <tr onclick="window.location='/assessment?id=${o.id}'" style="cursor:pointer${o.is_sample ? ';opacity:0.85' : ''}">
      <td style="max-width:220px">
        <div class="org-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${o.orgName || ''}">
          ${orgDisplay}
          ${o.is_sample ? '<span style="font-size:9px;font-weight:700;background:#E6F1FB;color:#1A6EB5;padding:1px 5px;border-radius:8px;vertical-align:middle;margin-left:4px">SAMPLE</span>' : ''}
          ${pendingBadge}
        </div>
        ${subLine ? `<div class="org-fy" style="font-size:11px;margin-top:2px">${subLine}</div>` : ''}
      </td>
      <td style="width:80px">
        <div class="score-pill">
          <span style="font-weight:700">${o.score || '—'}</span>
          <span style="color:#9CA3AF;font-size:11px">${o.score ? '/100' : ''}</span>
        </div>
        ${o.score ? `<div class="score-bar-wrap"><div class="score-bar" style="width:${o.score}%;background:${barColor[o.riskLevel] || '#9CA3AF'}"></div></div>` : ''}
      </td>
      <td style="width:110px">
        <span style="display:flex;align-items:center;gap:5px;font-size:12px;white-space:nowrap">
          <span class="risk-dot ${dotCls[o.riskLevel] || 'dot-mod'}"></span>
          ${o.riskLevel || 'Pending'}
        </span>
      </td>
      <td style="width:140px">
        <span class="rec-badge ${recCls[o.recommendation] || 'rec-none'}" style="font-size:11px;white-space:nowrap" title="${o.recommendation || ''}">
          ${recDisplay || '—'}
        </span>
      </td>
      <td style="color:#6B7280;font-size:12px;max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${o.reviewer || o.contactName || ''}">
        ${reviewerDisplay}
      </td>
      <td style="color:#6B7280;font-size:12px;width:90px;white-space:nowrap">${dateDisplay}</td>
      <td style="width:120px;vertical-align:middle">${actionCell}</td>
    </tr>`;
  }).join('');

  document.querySelectorAll('.org-table th').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
  });
}

function filterTable() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  const filtered = query
    ? allOrgs.filter(o => (o.orgName || '').toLowerCase().includes(query))
    : allOrgs;
  renderTable(filtered);
}

function sortTable(key) {
  if (sortKey === key) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey = key;
    sortDir = 'asc';
  }

  const query = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
  let orgs = query ? allOrgs.filter(o => (o.orgName || '').toLowerCase().includes(query)) : [...allOrgs];

  orgs.sort((a, b) => {
    let aVal = a[key] ?? '';
    let bVal = b[key] ?? '';
    if (key === 'score') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  renderTable(orgs);

  const headers = document.querySelectorAll('.org-table th');
  const keyMap = ['orgName','score','riskLevel','recommendation','reviewer','reviewDate'];
  headers.forEach((th, i) => {
    th.classList.remove('sort-asc','sort-desc');
    if (keyMap[i] === key) th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
  });
}

async function deleteOrg(id, btn) {
  if (!confirm('Delete this assessment? This cannot be undone.')) return;
  await DB.deleteAssessment(id);
  localStorage.removeItem('cp:' + id);
  allOrgs = allOrgs.filter(o => o.id !== id);
  updateStats(allOrgs);
  filterTable();
}

function copyIntakeLink() {
  const url = `${window.location.origin}/intake.html`;
  navigator.clipboard.writeText(url).then(() => alert('Intake link copied!\n\nSend this to the nonprofit:\n' + url));
}

async function runAutoFill(id, btn) {
  const originalText = btn.textContent;
  btn.textContent = 'Reading docs...';
  btn.disabled = true;

  try {
    const res = await fetch('https://calm-forest-dfc5.shanefleming125.workers.dev/extract-stored', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId: id })
    });

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Auto-fill failed');

    const org = allOrgs.find(o => o.id === id);
    if (org) {
      org.extractedData = data;
      await DB.saveAssessment(org);
    }

    filterTable();
  } catch(e) {
    alert('Auto-fill failed: ' + e.message + '\n\nYou can still open this record and enter data manually.');
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

function reviewExtracted(id) {
  const org = allOrgs.find(o => o.id === id);
  if (!org || !org.extractedData) {
    window.location = `/assessment?id=${id}`;
    return;
  }
  sessionStorage.setItem('cp:extracted', JSON.stringify(org.extractedData));
  window.location = `/assessment?id=${id}&fromExtract=1`;
}

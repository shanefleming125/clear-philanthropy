// dashboard.js — Clear Philanthropy

let allOrgs = [];
let sortKey = '';
let sortDir = 'asc';

// Called directly after auth confirms session
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
  document.getElementById('statTotal').textContent = orgs.length;
  document.getElementById('statLow').textContent = orgs.filter(o => o.riskLevel === 'Low').length;
  document.getElementById('statMod').textContent = orgs.filter(o => o.riskLevel === 'Moderate').length;
  document.getElementById('statHigh').textContent = orgs.filter(o => o.riskLevel === 'High').length;
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
    'Invite to Apply': 'rec-invite',
    'Request More Info': 'rec-info',
    'Decline': 'rec-decline',
    'Approved': 'rec-approved',
    'Full Due Diligence': 'rec-due',
    'Pending Review': 'rec-info'
  };
  const dotCls = { Low: 'dot-low', Moderate: 'dot-mod', High: 'dot-high' };
  const barColor = { Low: '#2EAD77', Moderate: '#D97706', High: '#E8472A' };

  tbody.innerHTML = orgs.map(o => `
    <tr onclick="window.location='assessment.html?id=${o.id}'" style="cursor:pointer">
      <td>
        <div class="org-name">${o.orgName}</div>
        <div class="org-fy">${o.fyEnd || ''}${o.status === 'submitted' ? ' · <span style="color:#1A6EB5;font-size:11px">Self-reported</span>' : ''}</div>
      </td>
      <td>
        <div class="score-pill">
          <span style="font-weight:700">${o.score || '—'}</span>
          <span style="color:#9CA3AF;font-size:12px">${o.score ? '/100' : ''}</span>
        </div>
        ${o.score ? `<div class="score-bar-wrap"><div class="score-bar" style="width:${o.score}%;background:${barColor[o.riskLevel] || '#9CA3AF'}"></div></div>` : ''}
      </td>
      <td><span style="display:flex;align-items:center;gap:6px;font-size:13px"><span class="risk-dot ${dotCls[o.riskLevel] || 'dot-mod'}"></span>${o.riskLevel || 'Pending'} Risk</span></td>
      <td><span class="rec-badge ${recCls[o.recommendation] || 'rec-none'}">${o.recommendation || '—'}</span></td>
      <td style="color:#6B7280">${o.reviewer || o.contactName || '—'}</td>
      <td style="color:#6B7280">${o.reviewDate || (o.created_at || '').split('T')[0] || '—'}</td>
      <td><button class="action-btn" onclick="event.stopPropagation();deleteOrg('${o.id}', this)">Delete</button></td>
    </tr>`).join('');

  // Update sort indicators
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

  // Update header indicator
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

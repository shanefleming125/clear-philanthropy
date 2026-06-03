window.addEventListener('DOMContentLoaded', renderDashboard);

async function renderDashboard() {
  try {
    const orgs = await DB.listAssessments();
    document.getElementById('statTotal').textContent = orgs.length;
    document.getElementById('statLow').textContent = orgs.filter(o => o.riskLevel === 'Low').length;
    document.getElementById('statMod').textContent = orgs.filter(o => o.riskLevel === 'Moderate').length;
    document.getElementById('statHigh').textContent = orgs.filter(o => o.riskLevel === 'High').length;

    const loading = document.getElementById('loadingState');
    const empty = document.getElementById('emptyState');
    const table = document.getElementById('orgTable');
    const tbody = document.getElementById('orgTableBody');

    loading.style.display = 'none';
    if (!orgs.length) { empty.style.display = 'block'; table.style.display = 'none'; return; }
    empty.style.display = 'none'; table.style.display = 'table';

    const recCls = { 'Invite to Apply': 'rec-invite', 'Request More Info': 'rec-info', 'Decline': 'rec-decline', 'Approved': 'rec-approved', 'Full Due Diligence': 'rec-due', 'Pending Review': 'rec-info' };
    const dotCls = { Low: 'dot-low', Moderate: 'dot-mod', High: 'dot-high' };
    const barColor = { Low: '#2EAD77', Moderate: '#D97706', High: '#E8472A' };
    const intakeUrl = `${window.location.origin}/intake`;

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
        <td><button class="action-btn" style="background:#E6F1FB;border-color:#B5D4F4;color:#1A6EB5" onclick="event.stopPropagation();copyIntakeLink()">Copy intake link</button></td>
        <td><button class="action-btn" onclick="event.stopPropagation();deleteOrg('${o.id}', this)">Delete</button></td>
      </tr>`).join('');
  } catch(e) {
    document.getElementById('loadingState').innerHTML = `<div class="empty-desc" style="color:#E8472A">Error loading: ${e.message}</div>`;
  }
}

async function deleteOrg(id, btn) {
  if (!confirm('Delete this assessment? This cannot be undone.')) return;
  // Delete from both Supabase and localStorage
  await DB.deleteAssessment(id);
  // Also clear from localStorage directly
  localStorage.removeItem('cp:' + id);
  // Remove the row immediately from the UI
  btn.closest('tr').remove();
  // Update stats
  renderDashboard();
}

function copyIntakeLink() {
  const url = `${window.location.origin}/intake`;
  navigator.clipboard.writeText(url).then(() => alert('Intake link copied!\n\nSend this to the nonprofit:\n' + url));
}
function copyIntakeLink() {
  const url = `${window.location.origin}/intake`;
  navigator.clipboard.writeText(url).then(() => alert('Intake link copied!\n\nSend this to the nonprofit:\n' + url));
}

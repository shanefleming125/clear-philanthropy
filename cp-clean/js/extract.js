// extract.js — Clear Philanthropy
// "Create from Documents" — AI auto-fill via /extract endpoint

let extractFiles = [];

function openExtractModal() {
  extractFiles = [];
  document.getElementById('extractFileList').innerHTML = '';
  document.getElementById('extractResults').style.display = 'none';
  document.getElementById('extractUploadArea').style.display = '';
  document.getElementById('extractError').style.display = 'none';
  document.getElementById('extractRunBtn').disabled = true;
  document.getElementById('extractModal').style.display = 'flex';
}

function closeExtractModal() {
  document.getElementById('extractModal').style.display = 'none';
}

function extractFormatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function extractHandleSelect(e) { extractAddFiles(e.target.files); e.target.value = ''; }
function extractHandleDragOver(e) { e.preventDefault(); document.getElementById('extractUploadZone').classList.add('dragover'); }
function extractHandleDragLeave() { document.getElementById('extractUploadZone').classList.remove('dragover'); }
function extractHandleDrop(e) {
  e.preventDefault();
  document.getElementById('extractUploadZone').classList.remove('dragover');
  extractAddFiles(e.dataTransfer.files);
}

function extractAddFiles(files) {
  const maxSize = 10 * 1024 * 1024;
  Array.from(files).forEach(file => {
    if (file.type !== 'application/pdf') { alert(`${file.name} — only PDF files are supported for auto-fill.`); return; }
    if (file.size > maxSize) { alert(`${file.name} exceeds the 10MB limit.`); return; }
    if (extractFiles.length >= 5) { alert('Maximum 5 files.'); return; }
    if (!extractFiles.find(f => f.name === file.name && f.size === file.size)) {
      extractFiles.push(file);
    }
  });
  renderExtractFileList();
}

function extractRemoveFile(index) { extractFiles.splice(index, 1); renderExtractFileList(); }

function renderExtractFileList() {
  const list = document.getElementById('extractFileList');
  list.innerHTML = extractFiles.map((f, i) => `
    <div class="file-item">
      <div class="file-item-name">${f.name}</div>
      <div class="file-item-size">${extractFormatBytes(f.size)}</div>
      <button class="file-item-remove" onclick="extractRemoveFile(${i})" title="Remove">×</button>
    </div>
  `).join('');
  document.getElementById('extractRunBtn').disabled = extractFiles.length === 0;
}

async function runExtraction() {
  const btn = document.getElementById('extractRunBtn');
  const errorEl = document.getElementById('extractError');
  errorEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Reading documents...';

  try {
    const formData = new FormData();
    extractFiles.forEach(f => formData.append('files', f));

    const res = await fetch('https://calm-forest-dfc5.shanefleming125.workers.dev/extract', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Extraction failed');

    showExtractResults(data);
  } catch(e) {
    errorEl.textContent = 'Error: ' + e.message + '. You can still start a blank assessment and enter data manually.';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Extract Data';
  }
}

const METRIC_LABELS = {
  rev: 'Total Revenue', exp: 'Total Expenses', cash: 'Cash & Cash Equivalents',
  assets: 'Total Assets', liab: 'Total Liabilities', currassets: 'Current Assets',
  currliab: 'Current Liabilities', prog: 'Program Service Expenses',
  mgmt: 'Management & General Expenses', fund: 'Fundraising Expenses',
  contrib: 'Total Contributions (Donations)', toprev: 'Largest Single Revenue Source'
};

const DOCTYPE_LABELS = {
  audited: 'Audited Financial Statements',
  reviewed: 'Reviewed Financial Statements',
  '990': 'Form 990',
  internal: 'Internal Statements',
  other: 'Other Document'
};

const CONF_CLASS = { high: 'conf-high', medium: 'conf-medium', low: 'conf-low' };
const CONF_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

let extractResultData = null;

function showExtractResults(data) {
  extractResultData = data;
  document.getElementById('extractUploadArea').style.display = 'none';
  document.getElementById('extractResults').style.display = '';

  const org = data.orgInfo || {};
  document.getElementById('extractOrgSummary').innerHTML = `
    ${org.orgName ? `<div><strong>${org.orgName}</strong></div>` : ''}
    <div style="font-size:12px;color:#6B7280;margin-top:2px">
      ${org.ein ? `EIN: ${org.ein}` : ''}${org.ein && org.fyEnd ? ' · ' : ''}${org.fyEnd ? `FY End: ${org.fyEnd}` : ''}
    </div>
  `;

  const docs = data.documents || [];
  document.getElementById('extractDocsSummary').innerHTML = docs.map(d => `
    <div class="file-item uploaded">
      <div class="file-item-name">${d.filename}</div>
      <div class="file-item-size">${DOCTYPE_LABELS[d.docType] || d.docType}</div>
    </div>
  `).join('');

  const metrics = data.metrics || {};
  const rows = Object.keys(METRIC_LABELS).map(key => {
    const m = metrics[key];
    if (!m) return `<tr><td>${METRIC_LABELS[key]}</td><td colspan="3" style="color:#9CA3AF;font-size:12px">Not found — enter manually</td></tr>`;
    const years = [m.year0, m.year1, m.year2].map(v => v !== undefined ? '$' + Number(v).toLocaleString() : '—');
    const confCls = CONF_CLASS[m.confidence] || 'conf-medium';
    const confLbl = CONF_LABEL[m.confidence] || 'Medium';
    return `
      <tr>
        <td>
          ${METRIC_LABELS[key]}
          <div style="margin-top:3px">
            <span class="confidence-pill ${confCls}" style="display:inline-flex"><span class="conf-dot"></span>${confLbl} · ${m.source || ''}</span>
          </div>
          ${m.note ? `<div style="font-size:11px;color:#6B7280;margin-top:3px">${m.note}</div>` : ''}
        </td>
        <td style="text-align:right">${years[0]}</td>
        <td style="text-align:right">${years[1]}</td>
        <td style="text-align:right">${years[2]}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('extractMetricsTable').innerHTML = `
    <table class="ratio-table">
      <thead><tr><th>Metric</th><th style="text-align:right">Current Year</th><th style="text-align:right">Prior Year</th><th style="text-align:right">Two Years Ago</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function useExtractedData() {
  if (!extractResultData) return;
  sessionStorage.setItem('cp:extracted', JSON.stringify(extractResultData));
  window.location.href = 'assessment.html?fromExtract=1';
}

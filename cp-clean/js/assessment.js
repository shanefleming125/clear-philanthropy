// assessment.js — Clear Philanthropy

let editingId = null;
let formDirty = false;
let formSaving = false;

// ── Dirty tracking ───────────────────────────────────────────────────────────
function markDirty() { formDirty = true; }
function markClean() { formDirty = false; }

window.addEventListener('beforeunload', e => {
  if (formDirty && !formSaving) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Leave without saving?';
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const fromExtract = params.get('fromExtract');

  if (id && fromExtract) {
    loadFromDB(id).then(() => populateFromExtraction());
  } else if (id) {
    loadFromDB(id);
  } else if (fromExtract) {
    populateFromExtraction();
  }
  recalc();

  // Hook dirty tracking onto all inputs, selects, textareas
  setTimeout(() => {
    document.querySelectorAll('input, select, textarea').forEach(el => {
      el.addEventListener('input', markDirty);
      el.addEventListener('change', markDirty);
    });
  }, 500); // slight delay so populateForm doesn't immediately mark dirty on load
});

async function loadFromDB(id) {
  try {
    const data = await DB.getAssessment(id);
    if (data) { editingId = id; populateForm(data); }
  } catch(e) { console.error('Load error:', e); }
}

// ── Extraction (auto-fill from documents) ───────────────────────────────────
function populateFromExtraction() {
  const raw = sessionStorage.getItem('cp:extracted');
  if (!raw) return;
  sessionStorage.removeItem('cp:extracted');

  let data;
  try { data = JSON.parse(raw); } catch(e) { return; }

  const metrics = data.metrics || {};
  const org = data.orgInfo || {};

  if (org.orgName && !document.getElementById('orgName').value) document.getElementById('orgName').value = org.orgName;
  if (org.ein && !document.getElementById('ein').value) document.getElementById('ein').value = org.ein;
  if (org.fyEnd && !document.getElementById('fyEnd').value) document.getElementById('fyEnd').value = org.fyEnd;

  const docTypes = (data.documents || []).map(d => d.docType);
  let dataSource = '';
  if (docTypes.includes('audited')) dataSource = docTypes.length > 1 ? 'mixed' : 'audited';
  else if (docTypes.includes('reviewed')) dataSource = docTypes.length > 1 ? 'mixed' : 'reviewed';
  else if (docTypes.includes('990')) dataSource = docTypes.length > 1 ? 'mixed' : '990';
  else if (docTypes.includes('internal')) dataSource = 'internal';
  if (dataSource) {
    const el = document.getElementById('dataSource');
    if (el) { el.value = dataSource; updateConfidence(); }
  }

  const notes = [];
  (data.documents || []).forEach(d => {
    const label = { audited: 'Audited Financials', reviewed: 'Reviewed Financials', '990': 'Form 990', internal: 'Internal Statements', other: 'Document' }[d.docType] || d.docType;
    notes.push(`${label}: ${d.filename}${d.fiscalYearsCovered?.length ? ' (FY ' + d.fiscalYearsCovered.join(', ') + ')' : ''}`);
  });
  Object.values(metrics).forEach(m => { if (m.note) notes.push(m.note); });
  if (notes.length) {
    const el = document.getElementById('sourceNotes');
    if (el) {
      const existing = el.value?.trim();
      el.value = existing && !existing.startsWith('Submitted via self-report')
        ? existing + ' · ' + notes.join(' · ')
        : notes.join(' · ');
    }
  }

  const threeYear = ['rev', 'exp', 'cash'];
  Object.entries(metrics).forEach(([key, m]) => {
    if (threeYear.includes(key)) {
      if (m.year0 !== undefined) setFieldValue(key + '0', m.year0);
      if (m.year1 !== undefined) setFieldValue(key + '1', m.year1);
      if (m.year2 !== undefined) setFieldValue(key + '2', m.year2);
    } else {
      if (m.year0 !== undefined) setFieldValue(key + '0', m.year0);
    }
  });

  const toprevMeta = metrics.toprev;
  if (toprevMeta?.category) {
    const catEl = document.getElementById('toprevCategory');
    if (catEl) catEl.value = toprevMeta.category;
    if (toprevMeta.categoryReason) {
      const reasonEl = document.getElementById('toprevCategoryReason');
      if (reasonEl) reasonEl.textContent = toprevMeta.categoryReason;
    }
    updateToprevCategoryUI();
  }

  const docCheckMap = { audited: 'doc_audit', '990': 'doc_990' };
  (data.documents || []).forEach(d => {
    const checkboxId = docCheckMap[d.docType];
    if (checkboxId) {
      const el = document.getElementById(checkboxId);
      if (el) el.checked = true;
    }
  });

  recalc();
  if (typeof formatAllFields === 'function') formatAllFields();
  markDirty(); // extraction populated fields — reviewer needs to save
}

function setFieldValue(elId, value) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

// g() is overridden by currency.js to handle formatted values
function g(id) { return parseFloat(document.getElementById(id)?.value) || 0; }

// ── Revenue concentration category ──────────────────────────────────────────
function getToprevCategory() {
  return document.getElementById('toprevCategory')?.value || 'broad_base';
}

function isConcentrationRisk() {
  const cat = getToprevCategory();
  return cat === 'institutional' || cat === 'major_donor';
}

function updateToprevCategoryUI() {
  const cat = getToprevCategory();
  const hintEl = document.getElementById('toprevCategoryHint');
  const hints = {
    institutional: 'Treated as concentration risk — if this grant/contract ends, this revenue is lost.',
    major_donor: 'Treated as concentration risk, though relationship-based funding is often more durable than institutional contracts.',
    broad_base: 'Not treated as concentration risk — a broad base of individual donors reflects community support and funding flexibility.'
  };
  if (hintEl) hintEl.textContent = hints[cat] || '';
  recalc();
}

function rateBadge(k, v) {
  if (k === 'rc') {
    if (!isConcentrationRisk()) return 'g';
    return v<=40?'g':v<=60?'m':'p';
  }
  return { om: v>=7?'g':v>=0?'m':'p', cr: v>=1.5?'g':v>=1?'m':'p', mc: v>=3?'g':v>=1.5?'m':'p', da: v<=40?'g':v<=65?'m':'p', pe: v>=65?'g':v>=55?'m':'p', fe: v<=20?'g':v<=35?'m':'p', na: v>=0.25?'g':v>=0.1?'m':'p' }[k] || 'm';
}

function setBadge(id, r) {
  const cls = { g: 'bdg-g', m: 'bdg-m', p: 'bdg-p' }, lbl = { g: 'Good', m: 'Moderate', p: 'Poor' };
  document.getElementById(id).innerHTML = `<span class="bdg ${cls[r]}">${lbl[r]}</span>`;
  return r;
}

function setVal(id, val, pct) {
  const el = document.getElementById(id);
  if (isNaN(val) || !isFinite(val)) { el.textContent = '—'; return null; }
  el.textContent = pct ? val.toFixed(1) + '%' : val.toFixed(2);
  return val;
}

// ── Tooltip toggle ──────────────────────────────────────────────────────────
function toggleTip(id) {
  const bubble = document.getElementById(id);
  const icon = bubble.previousElementSibling;
  const isOpen = bubble.classList.contains('active');
  document.querySelectorAll('.tip-bubble.active').forEach(b => {
    b.classList.remove('active');
    b.previousElementSibling?.classList.remove('active');
  });
  if (!isOpen) {
    bubble.classList.add('active');
    icon?.classList.add('active');
  }
}

// ── Confidence indicator ────────────────────────────────────────────────────
function updateConfidence() {
  const source = document.getElementById('dataSource')?.value;
  const pill = document.getElementById('confidencePill');
  if (!pill) return;
  const config = {
    audited:  { label: 'High Confidence', cls: 'conf-high' },
    reviewed: { label: 'Medium Confidence', cls: 'conf-medium' },
    '990':    { label: 'Medium Confidence', cls: 'conf-medium' },
    internal: { label: 'Lower Confidence', cls: 'conf-low' },
    mixed:    { label: 'Mixed Sources', cls: 'conf-low' },
  };
  if (source && config[source]) {
    const { label, cls } = config[source];
    pill.style.display = 'inline-flex';
    pill.className = `confidence-pill ${cls}`;
    pill.innerHTML = `<span class="conf-dot"></span>${label}`;
  } else {
    pill.style.display = 'none';
    pill.innerHTML = '';
  }
}

// ── Recalc ──────────────────────────────────────────────────────────────────
function recalc() {
  const rev=g('rev0'), exp=g('exp0'), assets=g('assets0'), liab=g('liab0'), cash=g('cash0');
  const curra=g('currassets0'), currl=g('currliab0'), prog=g('prog0'), fund=g('fund0'), contrib=g('contrib0'), toprev=g('toprev0');
  const surplus=rev-exp, netassets=assets-liab;
  const vals = { om:rev?(surplus/rev*100):NaN, cr:currl?(curra/currl):NaN, mc:exp?(cash/(exp/12)):NaN, da:assets?(liab/assets*100):NaN, pe:exp?(prog/exp*100):NaN, fe:contrib?(fund/contrib*100):NaN, rc:rev?(toprev/rev*100):NaN, na:exp?(netassets/exp):NaN };
  const pctSet = new Set(['om','da','pe','fe','rc']);
  const scores = {};
  Object.entries(vals).forEach(([k,v]) => { const vv=setVal('r_'+k,v,pctSet.has(k)); if(vv!==null) scores[k]=setBadge('b_'+k,rateBadge(k,v)); });
  const w = { om:18, cr:12, mc:20, da:10, pe:15, fe:8, rc:10, na:7 };
  const totalW = Object.keys(scores).reduce((s,k) => s+w[k]*(scores[k]==='g'?1:scores[k]==='m'?0.5:0), 0);
  const maxW = Object.keys(scores).reduce((s,k) => s+w[k], 0);
  const score = maxW ? Math.round((totalW/maxW)*100) : 0;
  const scoreEl = document.getElementById('scoreDisplay');
  const badgeEl = document.getElementById('riskBadge');
  if (Object.keys(scores).length) {
    scoreEl.textContent = score;
    badgeEl.style.display = 'inline-block';
    if (score>=65) { badgeEl.className='risk-badge risk-low'; badgeEl.textContent='Low Risk'; }
    else if (score>=35) { badgeEl.className='risk-badge risk-mod'; badgeEl.textContent='Moderate Risk'; }
    else { badgeEl.className='risk-badge risk-high'; badgeEl.textContent='High Risk'; }
  } else { scoreEl.textContent='—'; badgeEl.style.display='none'; }
  updateFlags(vals); updateTrends();
  return { score, scores, vals };
}

function updateFlags({ om, cr, mc, da, pe, fe, rc }) {
  const flags=[], add=(ok,msg)=>flags.push({ok,msg});
  if(!isNaN(rc)) {
    if (isConcentrationRisk()) {
      add(rc<=40, rc>40?'Revenue concentration above 40% — diversification risk.':'Revenue sources are well-diversified.');
    } else {
      add(true, `Largest revenue source (${rc.toFixed(1)}% of total) reflects a broad base of individual donors — a sign of community support, not concentration risk.`);
    }
  }
  if(!isNaN(mc)) add(mc>=3, mc<3?'Months of cash below 3 — limited liquidity runway.':'Cash reserves meet the 3-month minimum.');
  if(!isNaN(om)) add(om>=0, om<0?'Operating deficit — expenses exceed revenue.':'Operating margin is positive.');
  if(!isNaN(da)) add(da<=65, da>65?'Debt load is high relative to total assets.':'Debt levels are within acceptable range.');
  if(!isNaN(pe)) add(pe>=65, pe<65?'Program expense ratio below 65% — review overhead.':'Program expense ratio is healthy.');
  if(!isNaN(fe)) add(fe<=35, fe>35?'Fundraising costs exceed 35% of contributions.':'Fundraising efficiency is strong.');
  const list = document.getElementById('flagsList');
  list.innerHTML = flags.length ? flags.map(f=>`<li><span class="fi ${f.ok?'fi-ok':'fi-warn'}">${f.ok?'✓':'⚠'}</span>${f.msg}</li>`).join('') : '<li class="flag-placeholder">Enter data to see financial health indicators.</li>';
}

function updateTrends() {
  const metrics = [{ label:'Total Revenue', ids:['rev0','rev1','rev2'] }, { label:'Total Expenses', ids:['exp0','exp1','exp2'] }, { label:'Cash & Equivalents', ids:['cash0','cash1','cash2'] }];
  const notes = { up:{ Revenue:'Growing — positive trend.', Expenses:'Rising costs — watch margin.', Equivalents:'Cash position improving.' }, down:{ Revenue:'Declining — investigate causes.', Expenses:'Costs decreasing.', Equivalents:'Cash declining — monitor closely.' }, flat:{ Revenue:'Revenue relatively stable.', Expenses:'Expenses stable.', Equivalents:'Cash holding steady.' } };
  const container = document.getElementById('trendRows');
  const hasData = metrics.some(m => m.ids.some(id => g(id)>0));
  if (!hasData) { container.innerHTML='<div class="flag-placeholder">Enter 3 years of data to see trends.</div>'; return; }
  container.innerHTML = metrics.map(m => {
    const [a,b,c] = m.ids.map(id => g(id));
    if (!a||!b||!c) return '';
    const dir = a>=b&&b>=c?'up':a<=b&&b<=c?'down':'flat';
    const arrow = { up:'↑', down:'↓', flat:'→' }, cls = { up:'tu', down:'td2', flat:'tf' };
    const key = m.label.split(' ').pop();
    return `<div class="trend-row"><span class="tl">${m.label}</span><span class="${cls[dir]}">${arrow[dir]}</span><span class="tn">${notes[dir][key]||''}</span></div>`;
  }).join('');
}

// ── Save ────────────────────────────────────────────────────────────────────
async function saveAssessment() {
  const required = [
    { id: 'orgName', label: 'Organization Name' },
    { id: 'ein', label: 'EIN' },
    { id: 'fyEnd', label: 'Fiscal Year End' },
    { id: 'reviewer', label: 'Reviewer Name' },
  ];
  const missing = required.filter(f => !document.getElementById(f.id)?.value?.trim());
  if (missing.length) {
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = 'Please fill in required fields: ' + missing.map(f => f.label).join(', ');
    errorMsg.style.display = 'inline';
    setTimeout(() => errorMsg.style.display = 'none', 4000);
    return;
  }

  const { score } = recalc();
  const badgeEl = document.getElementById('riskBadge');
  const riskLevel = badgeEl.textContent.replace(' Risk','') || 'Unknown';
  const aiText = document.getElementById('aiText')?.textContent?.trim() || '';
  const hasAI = aiText && aiText !== 'Writing assessment...';

  const data = {
    id: editingId || ('id_' + Date.now()),
    orgName: document.getElementById('orgName').value || 'Unnamed Organization',
    ein: document.getElementById('ein').value,
    fyEnd: document.getElementById('fyEnd').value,
    reviewer: document.getElementById('reviewer').value,
    reviewDate: document.getElementById('reviewDate').value,
    recommendation: document.getElementById('recommendation').value,
    impression: document.getElementById('impression').value,
    questions: document.getElementById('questions').value,
    aiNarrative: hasAI ? aiText : '',
    dataSource: document.getElementById('dataSource').value,
    sourceNotes: document.getElementById('sourceNotes').value,
    toprevCategory: getToprevCategory(),
    toprevCategoryReason: document.getElementById('toprevCategoryReason')?.textContent || '',
    score, riskLevel,
    rev:g('rev0'), exp:g('exp0'), assets:g('assets0'), liab:g('liab0'), cash:g('cash0'),
    currassets:g('currassets0'), currliab:g('currliab0'),
    prog:g('prog0'), mgmt:g('mgmt0'), fund:g('fund0'), contrib:g('contrib0'), toprev:g('toprev0'),
    rev1:g('rev1'), rev2:g('rev2'), exp1:g('exp1'), exp2:g('exp2'), cash1:g('cash1'), cash2:g('cash2'),
    docs: ['doc_990','doc_audit','doc_bs','doc_is','doc_cf','doc_budget','doc_minutes','doc_strategic'].filter(id => document.getElementById(id)?.checked),
    created_at: editingId ? undefined : new Date().toISOString(),
    savedAt: new Date().toISOString()
  };
  if (!data.created_at) delete data.created_at;

  const saveBtn = document.getElementById('saveBtn');
  const savedMsg = document.getElementById('savedMsg');
  const errorMsg = document.getElementById('errorMsg');

  formSaving = true;
  try {
    await DB.saveAssessment(data);
    editingId = data.id;
    markClean();
    document.getElementById('formTitle').textContent = 'Edit — ' + data.orgName;
    const url = new URL(window.location); url.searchParams.set('id', data.id); window.history.replaceState({}, '', url);

    const pending = typeof stagedFiles !== 'undefined' ? stagedFiles.filter(f => f.status === 'pending') : [];
    if (pending.length) {
      saveBtn.textContent = 'Uploading files...';
      saveBtn.disabled = true;
      await uploadStagedFiles(editingId);
    }

    savedMsg.style.display = 'inline'; errorMsg.style.display = 'none';
    setTimeout(() => savedMsg.style.display = 'none', 2500);
  } catch(e) {
    errorMsg.textContent = 'Save failed: ' + e.message; errorMsg.style.display = 'inline';
  } finally {
    formSaving = false;
    saveBtn.textContent = 'Save Assessment';
    saveBtn.disabled = false;
  }
}

// ── AI generation ───────────────────────────────────────────────────────────
async function generateSummary() {
  const rev=g('rev0'), exp=g('exp0'), cash=g('cash0'), prog=g('prog0'), assets=g('assets0'), liab=g('liab0'), contrib=g('contrib0'), fund=g('fund0'), toprev=g('toprev0');
  const surplus=rev-exp, netassets=assets-liab;
  const fmt = n => '$' + n.toLocaleString();
  const pct = (a,b) => b ? (a/b*100).toFixed(1)+'%' : 'N/A';
  const mc = exp ? (cash/(exp/12)).toFixed(1) : 'N/A';
  const score = document.getElementById('scoreDisplay').textContent;
  const org = document.getElementById('orgName').value || 'the organization';
  const fy = document.getElementById('fyEnd').value || 'current fiscal year';
  const rec = document.getElementById('recommendation').value || 'not selected';
  const notes = document.getElementById('impression').value || 'none';
  const qs = document.getElementById('questions').value || 'none';

  const sourceMap = {
    audited: 'Audited Financial Statements (high confidence)',
    reviewed: 'Reviewed Financial Statements (medium confidence)',
    '990': 'Form 990 (medium confidence)',
    internal: 'Internal Statements Only (lower confidence — unaudited)',
    mixed: 'Mixed Sources (see source notes)',
    '': 'Not specified'
  };
  const dataSource = document.getElementById('dataSource').value;
  const sourceNotes = document.getElementById('sourceNotes').value;
  const sourceContext = sourceMap[dataSource] || 'Not specified';

  const docMap = { 'doc_990':'Form 990', 'doc_audit':'Audited Financials', 'doc_bs':'Balance Sheet', 'doc_is':'Income Statement', 'doc_cf':'Cash Flow Statement', 'doc_budget':'Board Budget', 'doc_minutes':'Board Minutes', 'doc_strategic':'Strategic Plan' };
  const docs = Object.keys(docMap).filter(id => document.getElementById(id)?.checked).map(id => docMap[id]).join(', ') || 'none';

  const toprevCategory = getToprevCategory();
  const toprevCategoryLabels = {
    institutional: 'a single institutional grant or contract (genuine concentration risk — if this funder/contract ends, this revenue is lost)',
    major_donor: 'a single major individual donor or family foundation gift (relationship-based concentration risk, though often more durable than institutional contracts)',
    broad_base: 'an aggregate of contributions from a broad base of individual donors (NOT concentration risk — this reflects community support and funding flexibility, even though it represents a large share of revenue)'
  };
  const toprevContext = toprevCategoryLabels[toprevCategory] || toprevCategoryLabels.broad_base;
  const toprevReason = document.getElementById('toprevCategoryReason')?.textContent?.trim();

  const prompt = `Write a professional 3-paragraph nonprofit financial assessment as a formal grant reviewer narrative.

ORGANIZATION: ${org} | FISCAL YEAR: ${fy} | HEALTH SCORE: ${score}/100
Revenue: ${fmt(rev)} | Expenses: ${fmt(exp)} | Surplus/Deficit: ${fmt(surplus)} (${pct(surplus,rev)} margin)
Cash: ${fmt(cash)} (${mc} months) | Assets: ${fmt(assets)} | Liabilities: ${fmt(liab)} | Net Assets: ${fmt(netassets)}
Program Expense Ratio: ${pct(prog,exp)} | Fundraising Efficiency: ${pct(fund,contrib)}
Revenue Concentration: ${pct(toprev,rev)} | Debt to Assets: ${pct(liab,assets)}

LARGEST REVENUE SOURCE CONTEXT: The largest single revenue source (${pct(toprev,rev)} of total revenue) is ${toprevContext}.${toprevReason ? ' Additional context: ' + toprevReason : ''}
- If category is broad_base: Do NOT flag this as a risk. Describe it as a notable finding that warrants further inquiry into the composition and stability of the donor base. Good follow-up questions include: Is this broad base stable year-over-year? Are there documented donor retention rates? Is giving growing, flat, or declining? Frame this as due diligence, not concern.
- If category is institutional or major_donor: Flag as genuine concentration risk and explain what would happen if that source ended.

PRIMARY DATA SOURCE GUIDANCE: ${sourceContext}${sourceNotes ? ' | Source Notes: ' + sourceNotes : ''}
- If source is internal statements or cash-basis only with no balance sheet: NEVER say "the organization carries no liabilities" or similar. Instead say the full liability picture is unknown because no balance sheet was provided, and surface any known obligations mentioned in the documents (e.g., loans, outstanding payables).
- If no balance sheet is available, do not state or imply balance sheet figures as fact.

PROGRAM EXPENSE RATIO GUIDANCE: If the program expense ratio is based on estimated or allocated figures (especially from internal statements without functional expense breakdown), use language like "appears program-focused" or "estimated program expense ratio" — do not state it as a precise verified figure. Note that salaries, rent, and utilities are often mixed-use and without a formal functional allocation the ratio is an approximation.

FUNDRAISING EFFICIENCY GUIDANCE: A low fundraising expense ratio (e.g., 7%) means the organization spent a small amount to raise each dollar of contributed revenue — this is GOOD. Do not say "generates X dollars per $100 spent" (that is backwards). Instead say something like "spent approximately X cents to raise each dollar of contributed revenue" or "fundraising costs represent X% of total contributions received." Note if this ratio is likely understated because only direct event costs are captured and staff time is not allocated.

Documents Reviewed: ${docs} | Recommendation: ${rec}
Reviewer notes: ${notes} | Follow-up questions: ${qs}

Paragraph 1: Overall financial health and strengths with specific numbers. Use hedged language where data confidence is limited.
Paragraph 2: Key risks and concerns referencing specific ratios. Apply all guidance above correctly — liabilities, fundraising efficiency direction, program ratio confidence, and revenue concentration framing.
Paragraph 3: Summarize the overall financial picture and surface the most important questions the funder should ask before making a decision. Be specific about what additional documents or information would meaningfully improve confidence in the assessment.

IMPORTANT: Do NOT make a funding recommendation or state/imply whether this organization should or should not receive funding. CP's role is to surface what the financial data shows — the funding decision belongs entirely to the reviewer/funder. Stick to describing the financial picture, not prescribing an outcome.`;

  const btn = document.getElementById('aiBtn');
  const resultDiv = document.getElementById('aiResult');
  const textDiv = document.getElementById('aiText');
  btn.textContent = 'Generating...'; btn.disabled = true;
  resultDiv.style.display = 'block'; textDiv.textContent = 'Writing assessment...';

  try {
    const res = await fetch('https://calm-forest-dfc5.shanefleming125.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) throw new Error('API error ' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    textDiv.textContent = data.result;
    markDirty(); // narrative generated — prompt to save
  } catch(e) {
    textDiv.textContent = 'Error: ' + e.message;
  }
  btn.textContent = 'Generate AI Assessment'; btn.disabled = false;
}

function copyAssessment() {
  const text = document.getElementById('aiText').textContent;
  navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
}

// ── Populate form on load ───────────────────────────────────────────────────
function populateForm(d) {
  document.getElementById('formTitle').textContent = 'Edit — ' + d.orgName;
  ['orgName','ein','fyEnd','reviewer','reviewDate','recommendation','impression','questions'].forEach(id => {
    const el = document.getElementById(id); if (el && d[id] !== undefined) el.value = d[id];
  });

  if (d.dataSource) {
    const el = document.getElementById('dataSource');
    if (el) { el.value = d.dataSource; updateConfidence(); }
  }
  if (d.sourceNotes) {
    const el = document.getElementById('sourceNotes');
    if (el) el.value = d.sourceNotes;
  }

  if (d.toprevCategory) {
    const el = document.getElementById('toprevCategory');
    if (el) el.value = d.toprevCategory;
  }
  if (d.toprevCategoryReason) {
    const el = document.getElementById('toprevCategoryReason');
    if (el) el.textContent = d.toprevCategoryReason;
  }
  updateToprevCategoryUI();

  if (d.aiNarrative) {
    document.getElementById('aiResult').style.display = 'block';
    document.getElementById('aiText').textContent = d.aiNarrative;
  }

  const map = { rev0:'rev', exp0:'exp', assets0:'assets', liab0:'liab', cash0:'cash', currassets0:'currassets', currliab0:'currliab', prog0:'prog', mgmt0:'mgmt', fund0:'fund', contrib0:'contrib', toprev0:'toprev', rev1:'rev1', rev2:'rev2', exp1:'exp1', exp2:'exp2', cash1:'cash1', cash2:'cash2' };
  Object.entries(map).forEach(([elId,key]) => { const el=document.getElementById(elId); if(el && d[key]) el.value=d[key]; });
  ['doc_990','doc_audit','doc_bs','doc_is','doc_cf','doc_budget','doc_minutes','doc_strategic'].forEach(id => {
    const el = document.getElementById(id); if (el) el.checked = d.docs?.includes(id) || false;
  });
  recalc();
  if (typeof formatAllFields === 'function') formatAllFields();
  loadExistingFiles(d.id);
  // Mark clean after load completes — form is in sync with saved state
  setTimeout(markClean, 600);
}

async function loadExistingFiles(assessmentId) {
  if (!assessmentId) return;
  try {
    const token = await AUTH.getToken();
    if (!token) { console.warn('No auth token for file list'); return; }

    const files = await DB.listFiles(assessmentId);
    const list = document.getElementById('fileList');
    if (!files || !files.length) return;

    const existingHtml = await Promise.all(files.map(async f => {
      const displayName = f.name.replace(/^\d+_/, '');
      const path = `${assessmentId}/${f.name}`;
      const url = await DB.getFileUrl(path);
      const escapedPath = path.replace(/'/g, "\\'");
      return `
        <div class="file-item uploaded" id="file-${f.name}">
          <div class="file-item-name">${displayName}</div>
          <div class="file-item-size">${f.metadata?.size ? formatBytes(f.metadata.size) : ''}</div>
          <div class="file-status done">✓ On file</div>
          ${url ? `<a href="${url}" target="_blank" class="file-link">Open ↗</a>` : ''}
          <button class="file-item-remove" onclick="deleteFile('${escapedPath}', '${f.name}')" title="Delete file">×</button>
        </div>
      `;
    }));

    list.innerHTML = existingHtml.join('') + list.innerHTML;
  } catch(e) {
    console.warn('Could not load existing files:', e.message);
  }
}

async function deleteFile(path, filename) {
  if (!confirm(`Delete "${filename.replace(/^\d+_/, '')}"? This cannot be undone.`)) return;
  try {
    await DB.deleteFile(path);
    const el = document.getElementById(`file-${filename}`);
    if (el) el.remove();
  } catch(e) {
    alert('Could not delete file. Please try again.');
  }
}

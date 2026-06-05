// pdf-export.js — Clear Philanthropy
// Redesigned branded PDF report
 
async function exportToPDF() {
  const btn = document.getElementById('pdfBtn');
  if (btn) { btn.textContent = 'Generating PDF...'; btn.disabled = true; }
 
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
 
  const PW = 210, PH = 297, M = 14;
  const W = PW - 2 * M; // 182mm usable width
  let y = 0;
 
  // ── Brand colors ──
  const NAVY   = [11, 37, 69];
  const BLUE   = [26, 110, 181];
  const SKY    = [77, 166, 232];
  const GREEN  = [46, 173, 119];
  const RED    = [232, 71, 42];
  const AMBER  = [217, 119, 6];
  const LIGHT  = [243, 246, 250];
  const BORDER = [229, 231, 235];
  const MUTED  = [107, 114, 128];
  const TEXT   = [17, 24, 39];
  const WHITE  = [255, 255, 255];
 
  // ── Helpers ──
  const sf = (style = 'normal', size = 10, color = TEXT) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const fill = (x, y, w, h, color) => {
    doc.setFillColor(...color);
    doc.rect(x, y, w, h, 'F');
  };
  const box = (x, y, w, h, color, radius = 0) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    if (radius) doc.roundedRect(x, y, w, h, radius, radius, 'S');
    else doc.rect(x, y, w, h, 'S');
  };
  const fillBox = (x, y, w, h, fillColor, strokeColor, radius = 0) => {
    doc.setFillColor(...fillColor);
    doc.setDrawColor(...strokeColor);
    doc.setLineWidth(0.3);
    if (radius) doc.roundedRect(x, y, w, h, radius, radius, 'FD');
    else doc.rect(x, y, w, h, 'FD');
  };
  const pill = (x, y, text, bg, fg, radius = 2) => {
    const tw = doc.getTextWidth(text);
    const pw = tw + 6, ph = 5;
    doc.setFillColor(...bg);
    doc.roundedRect(x, y - 3.5, pw, ph, radius, radius, 'F');
    doc.setTextColor(...fg);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(text, x + 3, y + 0.2);
    return pw;
  };
  const ratingStyle = r => ({
    'Good':     { bg: [220,252,231], fg: [22,101,52] },
    'Moderate': { bg: [254,243,199], fg: [146,64,14] },
    'Poor':     { bg: [254,226,226], fg: [153,27,27] },
  })[r] || { bg: LIGHT, fg: MUTED };
 
  // ── Gather data ──
  const val = id => document.getElementById(id)?.value || '';
  const txt = id => document.getElementById(id)?.textContent?.trim() || '—';
  const chk = id => document.getElementById(id)?.checked || false;
 
  const orgName    = val('orgName') || 'Organization';
  const fyEnd      = val('fyEnd');
  const ein        = val('ein');
  const reviewer   = val('reviewer');
  const revDate    = val('reviewDate');
  const rec        = val('recommendation');
  const impression = val('impression');
  const questions  = val('questions');
  const score      = txt('scoreDisplay');
  const risk       = document.getElementById('riskBadge')?.textContent?.trim() || '';
 
  const ratios = [
    ['Operating Margin',       'r_om','b_om'],
    ['Current Ratio',          'r_cr','b_cr'],
    ['Months of Cash',         'r_mc','b_mc'],
    ['Debt to Assets',         'r_da','b_da'],
    ['Program Expense Ratio',  'r_pe','b_pe'],
    ['Fundraising Efficiency', 'r_fe','b_fe'],
    ['Revenue Concentration',  'r_rc','b_rc'],
    ['Net Asset Ratio',        'r_na','b_na'],
  ].map(([label, vid, bid]) => ({
    label,
    value: txt(vid),
    rating: document.getElementById(bid)?.querySelector('.bdg')?.textContent?.trim() || '',
  }));
 
  const flags = Array.from(document.querySelectorAll('#flagsList li'))
    .map(li => ({
      ok: !!li.querySelector('.fi-ok'),
      text: li.textContent.replace(/[✓⚠]/g, '').trim(),
    }))
    .filter(f => f.text && !f.text.includes('Enter data'));
 
  const docLabels = {
    doc_990:'Form 990', doc_audit:'Audited Financials', doc_bs:'Balance Sheet',
    doc_is:'Income Statement', doc_cf:'Cash Flow Statement',
    doc_budget:'Board Budget', doc_minutes:'Board Minutes', doc_strategic:'Strategic Plan',
  };
  const docs = Object.keys(docLabels).filter(id => chk(id)).map(id => docLabels[id]);
  const aiText = document.getElementById('aiText')?.textContent?.trim() || '';
  const hasAI  = aiText && aiText !== 'Writing assessment...';
 
  // Score color
  const scoreNum = parseInt(score);
  const scoreColor = scoreNum >= 65 ? [74,222,128] : scoreNum >= 35 ? [251,191,36] : [248,113,113];
  const riskFg = risk.includes('Low') ? [22,101,52] : risk.includes('High') ? [153,27,27] : [146,64,14];
 
  // ════════════════════════════════
  // PAGE 1
  // ════════════════════════════════
 
  // ── Header band ──
  fill(0, 0, PW, 14, NAVY);
  sf('bold', 13, WHITE);
  doc.text('Clear ', M, 9.5);
  const clearW = doc.getTextWidth('Clear ');
  doc.setTextColor(...SKY);
  doc.text('Philanthropy', M + clearW, 9.5);
  sf('bold', 10, [160,196,232]);
  doc.text('Financial Health Assessment Report', PW - M, 9.5, { align: 'right' });
 
  y = 16;
 
  // ── Org strip ──
  fill(M, y, W, 14, LIGHT);
  box(M, y, W, 14, BORDER);
  sf('bold', 13, NAVY);
  doc.text(orgName, M + 4, y + 9);
 
  const metaParts = [];
  if (fyEnd) metaParts.push(`FY End: ${fyEnd}`);
  if (reviewer) metaParts.push(`Reviewer: ${reviewer}`);
  if (revDate) metaParts.push(`Date: ${revDate}`);
  if (ein) metaParts.push(`EIN: ${ein}`);
  sf('normal', 7.5, MUTED);
  doc.text(metaParts.join('   ·   '), PW - M - 2, y + 5, { align: 'right' });
  y += 16;
 
  // ── Score strip ──
  fill(M, y, W, 16, LIGHT);
  box(M, y, W, 16, BORDER);
  // Dividers
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(M + W * 0.25, y, M + W * 0.25, y + 16);
  doc.line(M + W * 0.65, y, M + W * 0.65, y + 16);
  // Health Score label
  sf('bold', 7.5, MUTED);
  doc.text('HEALTH SCORE', M + W * 0.125, y + 7, { align: 'center' });
  // Score number
  sf('bold', 28, scoreColor);
  const scoreW = doc.getTextWidth(score);
  const scoreStartX = M + W * 0.45 - (scoreW + 10) / 2;
  doc.text(score, scoreStartX, y + 12);
  sf('normal', 9, MUTED);
  doc.text('/ 100', scoreStartX + scoreW + 1.5, y + 10);
  // Risk label
  sf('bold', 9, riskFg);
  doc.text(risk, M + W * 0.65 + W * 0.175, y + 10, { align: 'center' });
  y += 20;
 
  // ── Section label helper ──
  const secLabel = (label, yy) => {
    fill(M, yy, W, 7, BLUE);
    sf('bold', 7.5, WHITE);
    doc.text(label.toUpperCase(), M + 4, yy + 5);
    return yy + 9;
  };
 
  // ── Key Financial Ratios ──
  y = secLabel('Key Financial Ratios', y);
  const colW = (W - 4) / 2;
  ratios.forEach(({ label, value, rating }, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const rx = M + col * (colW + 4);
    const ry = y + row * 12;
    if (row % 2 === 0) fill(rx, ry, colW, 12, [249,250,251]);
    sf('normal', 7.5, MUTED);
    doc.text(label, rx + 3, ry + 4.5);
    sf('bold', 9.5, NAVY);
    doc.text(value, rx + 3, ry + 10);
    if (rating) {
      const rs = ratingStyle(rating);
      pill(rx + colW - 22, ry + 7, rating, rs.bg, rs.fg);
    }
  });
  y += Math.ceil(ratios.length / 2) * 12 + 4;
 
  // ── Financial Health Indicators ──
  y = secLabel('Financial Health Indicators', y);
  const flagColW = W / 2;
  flags.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const fx = M + col * flagColW;
    const fy = y + row * 7;
    doc.setFillColor(...(f.ok ? GREEN : AMBER));
    doc.circle(fx + 3, fy + 3, 1.8, 'F');
    sf('normal', 8, TEXT);
    doc.text(f.text, fx + 7, fy + 4.5);
  });
  y += Math.ceil(flags.length / 2) * 7 + 4;
 
  // ── Documents + Recommendation ──
  const leftW = W * 0.52;
  const rightW = W * 0.48;
  const drH = 14;
 
  if (docs.length) {
    fill(M, y, leftW, drH, LIGHT);
    box(M, y, leftW, drH, BORDER);
    sf('bold', 7, MUTED);
    doc.text('DOCUMENTS RECEIVED', M + 3, y + 4.5);
    sf('normal', 7.5, TEXT);
    const docStr = docs.join('   ·   ');
    const docLines = doc.splitTextToSize(docStr, leftW - 6);
    doc.text(docLines, M + 3, y + 9);
  }
 
  if (rec) {
    const recStyles = {
      'Invite to Apply':    { bg:[232,245,240], fg:[15,110,86] },
      'Approved':           { bg:[234,243,222], fg:[39,80,10]  },
      'Decline':            { bg:[254,226,226], fg:[153,27,27] },
      'Request More Info':  { bg:[230,241,251], fg:[12,68,124] },
      'Full Due Diligence': { bg:[254,243,199], fg:[146,64,14] },
    };
    const rs = recStyles[rec] || { bg: LIGHT, fg: MUTED };
    const rx = M + leftW + 2;
    fill(rx, y, rightW - 2, drH, rs.bg);
    box(rx, y, rightW - 2, drH, BORDER);
    sf('bold', 7, MUTED);
    doc.text('RECOMMENDATION', rx + (rightW - 2) / 2, y + 4.5, { align: 'center' });
    sf('bold', 10, rs.fg);
    doc.text(rec, rx + (rightW - 2) / 2, y + 11, { align: 'center' });
  }
  y += drH + 4;
 
  // ── Overall Impression ──
  if (impression) {
    fill(M, y, W, 3, LIGHT);
    box(M, y, W, 3, BORDER);
    sf('bold', 7, MUTED);
    doc.text('OVERALL IMPRESSION', M + 3, y + 2.5);
    y += 5;
    fill(M, y, W, 1, LIGHT);
    sf('normal', 8, TEXT);
    const impLines = doc.splitTextToSize(impression, W - 6);
    const impH = impLines.length * 4.5 + 4;
    fill(M, y, W, impH, WHITE);
    box(M, y - 5, W, impH + 5, BORDER);
    doc.text(impLines, M + 3, y + 4);
    y += impH + 2;
  }
 
  // ── Key Questions ──
  if (questions) {
    sf('bold', 7, MUTED);
    fill(M, y, W, 5, LIGHT);
    box(M, y, W, 5, BORDER);
    doc.text('KEY QUESTIONS FOR FOLLOW-UP', M + 3, y + 3.5);
    y += 7;
    sf('normal', 8, TEXT);
    const qLines = doc.splitTextToSize(questions, W - 6);
    const qH = qLines.length * 4.5 + 4;
    fill(M, y - 2, W, qH, WHITE);
    box(M, y - 7, W, qH + 7, BORDER);
    doc.text(qLines, M + 3, y + 3);
    y += qH + 2;
  }
 
  // ── Footer ──
  const addFooter = (pageNum, total) => {
    fill(0, PH - 8, PW, 8, NAVY);
    sf('normal', 6.5, [160,196,232]);
    doc.text('Clear Philanthropy  ·  clearphilanthropy.com  ·  Financial clarity for every grant decision.', M, PH - 3);
    doc.text(`Page ${pageNum} of ${total}  ·  ${new Date().toLocaleDateString()}`, PW - M, PH - 3, { align: 'right' });
  };
  addFooter(1, hasAI ? 2 : 1);
 
  // ════════════════════════════════
  // PAGE 2 — AI Narrative
  // ════════════════════════════════
  if (hasAI) {
    doc.addPage();
    // Header
    fill(0, 0, PW, 16, NAVY);
    sf('bold', 12, WHITE);
    doc.text('AI-Generated Assessment Narrative', M, 10.5);
    sf('normal', 7.5, [160,196,232]);
    doc.text(`${orgName}   ·   ${fyEnd}`, PW - M, 10.5, { align: 'right' });
    // Blue rule
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(1);
    doc.line(M, 18, PW - M, 18);
 
    // AI text
    let ay = 24;
    sf('normal', 9.5, TEXT);
    const cleanAI = aiText.replace(/#{1,6}\s+/g, '').replace(/\*\*(.+?)\*\*/g, '$1').trim();
    const paragraphs = cleanAI.split('\n').filter(p => p.trim());
    paragraphs.forEach(para => {
      const lines = doc.splitTextToSize(para.trim(), W);
      lines.forEach(line => {
        if (ay > PH - 14) { doc.addPage(); addFooter(3, 3); ay = 20; }
        doc.text(line, M, ay);
        ay += 5.5;
      });
      ay += 4;
    });
 
    addFooter(2, 2);
  }
 
  // ── Save ──
  const fname = `${orgName.replace(/[^a-z0-9]/gi, '_')}_Assessment_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fname);
  if (btn) { btn.textContent = 'Download PDF Report'; btn.disabled = false; }
}
 
function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

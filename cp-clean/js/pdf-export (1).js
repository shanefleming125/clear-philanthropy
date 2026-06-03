// pdf-export.js — Clear Philanthropy branded PDF report

async function exportToPDF() {
  const btn = document.getElementById('pdfBtn');
  if (btn) { btn.textContent = 'Generating PDF...'; btn.disabled = true; }

  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210, M = 18;
  let y = 0;

  // ── Color palette ──
  const C = {
    navy:     [11,  37,  69],
    blue:     [26,  110, 181],
    sky:      [77,  166, 232],
    green:    [46,  173, 119],
    red:      [232, 71,  42],
    amber:    [217, 119, 6],
    lightbg:  [243, 246, 250],
    border:   [229, 231, 235],
    muted:    [107, 114, 128],
    dark:     [17,  24,  39],
    white:    [255, 255, 255],
  };

  // ── Helpers ──
  const sf  = (style='normal', size=10, color=C.dark) => { doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color); };
  const fill = (x, y, w, h, color) => { doc.setFillColor(...color); doc.rect(x, y, w, h, 'F'); };
  const hline = (yy, color=C.border) => { doc.setDrawColor(...color); doc.setLineWidth(0.2); doc.line(M, yy, W-M, yy); };

  const pill = (x, yy, text, bg, fg) => {
    const tw = doc.getTextWidth(text);
    const pw = tw + 7, ph = 5.5;
    doc.setFillColor(...bg);
    doc.roundedRect(x, yy - 4, pw, ph, 1.2, 1.2, 'F');
    doc.setTextColor(...fg);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(text, x + 3.5, yy - 0.2);
    return pw;
  };

  const ratingStyle = r => ({
    'Good':     { bg:[220,252,231], fg:[22,101,52]  },
    'Moderate': { bg:[254,243,199], fg:[146,64,14]  },
    'Poor':     { bg:[254,226,226], fg:[153,27,27]  },
  })[r] || { bg:C.lightbg, fg:C.muted };

  // ── Gather data ──
  const val = id => document.getElementById(id)?.value || '';
  const txt = id => document.getElementById(id)?.textContent?.trim() || '—';
  const chk = id => document.getElementById(id)?.checked || false;

  const orgName   = val('orgName') || 'Organization';
  const fyEnd     = val('fyEnd');
  const reviewer  = val('reviewer');
  const revDate   = val('reviewDate');
  const rec       = val('recommendation');
  const impression= val('impression');
  const questions = val('questions');
  const score     = txt('scoreDisplay');
  const risk      = document.getElementById('riskBadge')?.textContent?.trim() || '';

  const ratios = [
    ['Operating Margin',      'r_om','b_om'],
    ['Current Ratio',         'r_cr','b_cr'],
    ['Months of Cash',        'r_mc','b_mc'],
    ['Debt to Assets',        'r_da','b_da'],
    ['Program Expense Ratio', 'r_pe','b_pe'],
    ['Fundraising Efficiency','r_fe','b_fe'],
    ['Revenue Concentration', 'r_rc','b_rc'],
    ['Net Asset Ratio',       'r_na','b_na'],
  ].map(([label, vid, bid]) => ({
    label,
    value: txt(vid),
    rating: document.getElementById(bid)?.querySelector('.bdg')?.textContent?.trim() || '',
  }));

  const flags = Array.from(document.querySelectorAll('#flagsList li'))
    .map(li => ({
      ok: !!li.querySelector('.fi-ok'),
      text: li.textContent.replace(/[✓⚠]/g,'').trim(),
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

  // ════════════════════════════════════
  // PAGE 1
  // ════════════════════════════════════

  // ── Header band ──
  fill(0, 0, W, 46, C.navy);

  // Logo mark
  doc.setFillColor(...C.blue);
  doc.roundedRect(M, 9, 13, 13, 2, 2, 'F');
  doc.setDrawColor(255,255,255);
  doc.setLineWidth(1.5);
  doc.line(M+3, M+2,   M+5.5, M+4.5);
  doc.line(M+5.5, M+4.5, M+10, M-0.5);

  sf('bold', 15, C.white);
  doc.text('Clear ', M+17, 17);
  const cw = doc.getTextWidth('Clear ');
  doc.setTextColor(...C.sky);
  doc.text('Philanthropy', M+17+cw, 17);
  sf('normal', 8, [160,185,215]);
  doc.text('Financial Health Assessment Report', M+17, 23);

  // Score box
  const sx = W - M - 32;
  sf('normal', 7.5, [160,185,215]);
  doc.text('HEALTH SCORE', sx + 16, 13, { align:'center' });
  sf('bold', 26, [74,222,128]);
  doc.text(score, sx + 13, 26, { align:'center' });
  sf('normal', 10, [160,185,215]);
  doc.text('/ 100', sx + 22, 26);

  if (risk) {
    const riskC = risk.includes('Low') ? {bg:[220,252,231],fg:[22,101,52]}
                : risk.includes('High')? {bg:[254,226,226],fg:[153,27,27]}
                :                        {bg:[254,243,199],fg:[146,64,14]};
    const rw = doc.getTextWidth(risk) + 8;
    doc.setFillColor(...riskC.bg);
    doc.roundedRect(sx+16 - rw/2, 29, rw, 6, 1.5, 1.5, 'F');
    doc.setTextColor(...riskC.fg);
    doc.setFontSize(7.5); doc.setFont('helvetica','bold');
    doc.text(risk, sx+16, 33.8, { align:'center' });
  }

  y = 54;

  // ── Org info row ──
  fill(M, y, W-M*2, 20, C.lightbg);
  doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
  doc.rect(M, y, W-M*2, 20);
  sf('bold', 12, C.navy);
  doc.text(orgName, M+5, y+8);
  sf('normal', 8, C.muted);
  const meta = [fyEnd && `FY End: ${fyEnd}`, reviewer && `Reviewer: ${reviewer}`, revDate && `Date: ${revDate}`].filter(Boolean).join('   ·   ');
  doc.text(meta, M+5, y+15);
  y += 26;

  // ── Key Financial Ratios ──
  sf('bold', 8.5, C.navy);
  doc.text('KEY FINANCIAL RATIOS', M, y);
  y += 4; hline(y); y += 5;

  const col = (W - M*2 - 6) / 2;
  ratios.forEach(({ label, value, rating }, i) => {
    const x  = M + (i%2) * (col+6);
    const ry = y + Math.floor(i/2) * 14;
    // Row bg
    if (Math.floor(i/2) % 2 === 0) fill(x, ry-4, col, 13, [249,250,251]);
    sf('normal', 8, C.muted);
    doc.text(label, x+3, ry+4);
    sf('bold', 9, C.dark);
    doc.text(value, x + col - 28, ry+4);
    if (rating) {
      const rs = ratingStyle(rating);
      pill(x + col - 20, ry+4, rating, rs.bg, rs.fg);
    }
  });
  y += Math.ceil(ratios.length/2) * 14 + 6;

  // ── Risk Flags ──
  if (flags.length) {
    sf('bold', 8.5, C.navy);
    doc.text('RISK FLAGS', M, y);
    y += 4; hline(y); y += 5;

    flags.forEach(f => {
      const dotColor = f.ok ? C.green : C.amber;
      doc.setFillColor(...dotColor);
      doc.circle(M+3, y+2, 2.2, 'F');
      // Draw symbol as text inside dot
      doc.setTextColor(255,255,255);
      doc.setFontSize(6.5); doc.setFont('helvetica','bold');
      doc.text(f.ok ? '+' : '!', M+2.1, y+3);
      sf('normal', 8, C.dark);
      const wrapped = doc.splitTextToSize(f.text, W - M*2 - 10);
      doc.text(wrapped, M+8, y+3);
      y += wrapped.length * 5 + 2;
    });
    y += 3;
  }

  // ── Documents ──
  if (docs.length) {
    sf('bold', 8.5, C.navy);
    doc.text('DOCUMENTS RECEIVED', M, y);
    y += 4; hline(y); y += 5;
    fill(M, y, W-M*2, 10, C.lightbg);
    sf('normal', 8, C.dark);
    doc.text(docs.join('   ·   '), M+4, y+6);
    y += 16;
  }

  // ── Recommendation ──
  if (rec) {
    sf('bold', 8.5, C.navy);
    doc.text('RECOMMENDATION', M, y);
    y += 4; hline(y); y += 6;
    const recStyles = {
      'Invite to Apply':    {bg:[232,245,240],fg:[15,110,86]},
      'Approved':           {bg:[234,243,222],fg:[39,80,10]},
      'Decline':            {bg:[254,226,226],fg:[153,27,27]},
      'Request More Info':  {bg:[230,241,251],fg:[12,68,124]},
      'Full Due Diligence': {bg:[254,243,199],fg:[146,64,14]},
    };
    const rs = recStyles[rec] || {bg:C.lightbg, fg:C.muted};
    pill(M, y, rec, rs.bg, rs.fg);
    y += 12;
  }

  // ── Impression ──
  if (impression) {
    sf('bold', 8.5, C.navy);
    doc.text('OVERALL IMPRESSION', M, y);
    y += 4; hline(y); y += 5;
    sf('normal', 8.5, C.dark);
    const lines = doc.splitTextToSize(impression, W-M*2);
    lines.forEach(l => {
      if (y > 268) { doc.addPage(); addPageHeader(); y = 28; }
      doc.text(l, M, y); y += 5;
    });
    y += 4;
  }

  // ── Follow-up Questions ──
  if (questions) {
    sf('bold', 8.5, C.navy);
    doc.text('KEY QUESTIONS FOR FOLLOW-UP', M, y);
    y += 4; hline(y); y += 5;
    sf('normal', 8.5, C.dark);
    const lines = doc.splitTextToSize(questions, W-M*2);
    lines.forEach(l => {
      if (y > 268) { doc.addPage(); addPageHeader(); y = 28; }
      doc.text(l, M, y); y += 5;
    });
    y += 4;
  }

  // ── AI Narrative ──
  if (hasAI) {
    doc.addPage();
    addPageHeader();
    y = 28;

    sf('bold', 13, C.navy);
    doc.text('AI-Generated Assessment Narrative', M, y);
    y += 5; hline(y, C.blue); y += 7;

    sf('normal', 9, C.dark);
    const cleanAI = aiText.replace(/#{1,6}\s+/g,"").replace(/\*\*(.+?)\*\*/g,"$1").replace(/\*(.+?)\*/g,"$1").replace(/`(.+?)`/g,"$1").trim();
    const aiLines = doc.splitTextToSize(cleanAI, W-M*2);
    aiLines.forEach(l => {
      if (y > 272) { doc.addPage(); addPageHeader(); y = 28; }
      doc.text(l, M, y); y += 5.2;
    });
  }

  // ── Footer on every page ──
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    fill(0, 285, W, 12, C.navy);
    sf('normal', 7, [160,185,215]);
    doc.text('Clear Philanthropy  ·  Financial Health Assessment', M, 292);
    doc.text(`Page ${i} of ${pages}  ·  ${new Date().toLocaleDateString()}`, W-M, 292, { align:'right' });
  }

  // Save
  const fname = `${orgName.replace(/[^a-z0-9]/gi,'_')}_Assessment_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fname);
  if (btn) { btn.textContent = 'Download PDF Report'; btn.disabled = false; }

  function addPageHeader() {
    fill(0, 0, W, 14, C.navy);
    sf('bold', 9, C.white);
    doc.text('Clear Philanthropy  ·  Financial Health Assessment', M, 9);
    sf('normal', 8, [160,185,215]);
    doc.text(orgName, W-M, 9, { align:'right' });
  }
}

function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

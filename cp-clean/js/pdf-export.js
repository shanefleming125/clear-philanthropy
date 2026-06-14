// pdf-export.js — Clear Philanthropy
// Redesigned branded PDF report — flowing layout, KPI cards, hero score

async function exportToPDF() {
  const btn = document.getElementById('pdfBtn');
  if (btn) { btn.textContent = 'Generating PDF...'; btn.disabled = true; }

  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PW = 210, PH = 297, M = 16;
  const W = PW - 2 * M;
  const HEADER_H = 14;
  const FOOTER_H = 10;
  const CONTENT_TOP = 22;
  const CONTENT_BOTTOM = PH - FOOTER_H - 4;

  // ── Brand colors ──
  const NAVY   = [11, 37, 69];
  const BLUE   = [26, 110, 181];
  const SKY    = [77, 166, 232];
  const GREEN  = [46, 173, 119];
  const RED    = [220, 38, 38];
  const AMBER  = [217, 119, 6];
  const LIGHT  = [247, 249, 252];
  const BORDER = [229, 231, 235];
  const MUTED  = [107, 114, 128];
  const TEXT   = [17, 24, 39];
  const WHITE  = [255, 255, 255];

  let page = 1;
  let y = CONTENT_TOP;

  // ── Helpers ──
  const sf = (style = 'normal', size = 10, color = TEXT) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const fill = (x, yy, w, h, color, radius = 0) => {
    doc.setFillColor(...color);
    if (radius) doc.roundedRect(x, yy, w, h, radius, radius, 'F');
    else doc.rect(x, yy, w, h, 'F');
  };
  const box = (x, yy, w, h, color, radius = 0) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    if (radius) doc.roundedRect(x, yy, w, h, radius, radius, 'S');
    else doc.rect(x, yy, w, h, 'S');
  };
  const fillBox = (x, yy, w, h, fillColor, strokeColor, radius = 0) => {
    doc.setFillColor(...fillColor);
    doc.setDrawColor(...strokeColor);
    doc.setLineWidth(0.3);
    if (radius) doc.roundedRect(x, yy, w, h, radius, radius, 'FD');
    else doc.rect(x, yy, w, h, 'FD');
  };
  const pill = (x, yy, text, bg, fg) => {
    sf('bold', 7.5);
    const tw = doc.getTextWidth(text);
    const pw = tw + 6, ph = 5;
    doc.setFillColor(...bg);
    doc.roundedRect(x, yy - 3.6, pw, ph, 2, 2, 'F');
    doc.setTextColor(...fg);
    doc.text(text, x + 3, yy + 0.1);
    return pw;
  };
  const ratingStyle = r => ({
    'Good':     { bg: [220,252,231], fg: [22,101,52] },
    'Moderate': { bg: [254,243,199], fg: [146,64,14] },
    'Poor':     { bg: [254,226,226], fg: [153,27,27] },
  })[r] || { bg: LIGHT, fg: MUTED };

  // ── Page header/footer ──
  const drawHeader = () => {
    fill(0, 0, PW, HEADER_H, NAVY);
    sf('bold', 11, WHITE);
    doc.text('Clear ', M, 9);
    const clearW = doc.getTextWidth('Clear ');
    doc.setTextColor(...SKY);
    doc.text('Philanthropy', M + clearW, 9);
    sf('normal', 8, [160,196,232]);
    doc.text('Financial Health Assessment Report', PW - M, 9, { align: 'right' });
  };
  const drawFooter = () => {
    fill(0, PH - FOOTER_H, PW, FOOTER_H, NAVY);
    sf('normal', 6.5, [160,196,232]);
    doc.text('Clear Philanthropy  ·  clearphilanthropy.com', M, PH - 3.5);
    doc.text(`Page ${page}`, PW - M, PH - 3.5, { align: 'right' });
  };

  const ensureSpace = (neededH) => {
    if (y + neededH > CONTENT_BOTTOM) {
      drawFooter();
      doc.addPage();
      page++;
      drawHeader();
      y = CONTENT_TOP;
    }
  };

  const sectionLabel = (label, minContentH = 0) => {
    ensureSpace(11 + minContentH);
    fill(M, y, W, 7, BLUE, 1);
    sf('bold', 8, WHITE);
    doc.text(label.toUpperCase(), M + 4, y + 5);
    y += 11;
  };

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
  const dataSource = document.getElementById('dataSource')?.value || '';
  const sourceNotes = document.getElementById('sourceNotes')?.value || '';

  const sourceLabels = {
    audited: 'Audited Financial Statements',
    reviewed: 'Reviewed Financial Statements',
    '990': 'Form 990',
    internal: 'Internal Statements Only',
    mixed: 'Mixed Sources',
  };
  const confidenceLabels = {
    audited: { label: 'High Confidence', color: GREEN },
    reviewed: { label: 'Medium Confidence', color: BLUE },
    '990': { label: 'Medium Confidence', color: BLUE },
    internal: { label: 'Lower Confidence', color: MUTED },
    mixed: { label: 'Mixed Sources', color: MUTED },
  };

  const ratios = [
    ['Operating Margin',       'r_om','b_om', 'Surplus / Revenue'],
    ['Current Ratio',          'r_cr','b_cr', 'Current Assets / Current Liabilities'],
    ['Months of Cash',         'r_mc','b_mc', 'Cash / (Expenses / 12)'],
    ['Debt to Assets',         'r_da','b_da', 'Liabilities / Assets'],
    ['Program Expense Ratio',  'r_pe','b_pe', 'Program Exp / Total Exp'],
    ['Fundraising Efficiency', 'r_fe','b_fe', 'Fundraising / Contributions'],
    ['Revenue Concentration',  'r_rc','b_rc', 'Top Source / Revenue'],
    ['Net Asset Ratio',        'r_na','b_na', 'Net Assets / Expenses'],
  ].map(([label, vid, bid, formula]) => ({
    label, formula,
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

  const scoreNum = parseInt(score) || 0;
  const scoreColor = scoreNum >= 65 ? GREEN : scoreNum >= 35 ? AMBER : RED;
  const riskStyle = risk.includes('Low') ? { bg:[220,252,231], fg:[22,101,52] }
    : risk.includes('High') ? { bg:[254,226,226], fg:[153,27,27] }
    : { bg:[254,243,199], fg:[146,64,14] };

  // ════════════════════════════════
  // PAGE 1 — Header + Hero
  // ════════════════════════════════
  drawHeader();
  y = CONTENT_TOP;

  // ── Hero block: org name wraps if needed, score right-docked ──
  const scoreBlockW = 52;
  const nameBlockW = W - scoreBlockW - 6;

  // Measure org name — wrap if needed
  sf('bold', 15, NAVY);
  const nameLines = doc.splitTextToSize(orgName, nameBlockW - 8);
  const nameLineH = 7;
  const nameBlockH = Math.max(nameLines.length * nameLineH + 14, 30);
  const heroH = nameBlockH + 4;

  fillBox(M, y, W, heroH, LIGHT, BORDER, 2);

  // Org name (left side, wrapping)
  sf('bold', 15, NAVY);
  nameLines.forEach((line, i) => {
    doc.text(line, M + 6, y + 10 + i * nameLineH);
  });

  // Meta row below org name
  const metaY = y + 10 + nameLines.length * nameLineH + 3;
  const metaParts = [];
  if (ein) metaParts.push(`EIN: ${ein}`);
  if (fyEnd) metaParts.push(`FY End: ${fyEnd}`);
  if (reviewer) metaParts.push(`Reviewer: ${reviewer}`);
  if (revDate) metaParts.push(`Date: ${revDate}`);
  sf('normal', 7.5, MUTED);
  // Wrap meta if needed
  const metaStr = metaParts.join('   ·   ');
  const metaLines = doc.splitTextToSize(metaStr, nameBlockW - 8);
  metaLines.forEach((line, i) => {
    doc.text(line, M + 6, metaY + i * 4.5);
  });

  // Score block (right side)
  const scoreX = M + W - scoreBlockW;
  sf('bold', 7, MUTED);
  doc.text('HEALTH SCORE', scoreX + scoreBlockW / 2, y + 8, { align: 'center' });

  sf('bold', 28, scoreColor);
  const scoreW = doc.getTextWidth(score);
  const denomW = 8;
  const totalSW = scoreW + denomW;
  const sX = scoreX + scoreBlockW / 2 - totalSW / 2;
  doc.text(score, sX, y + 20);
  sf('normal', 8, MUTED);
  doc.text('/100', sX + scoreW + 1, y + 18);

  if (risk) {
    sf('bold', 7.5);
    const rtw = doc.getTextWidth(risk) + 8;
    pill(scoreX + scoreBlockW / 2 - rtw / 2 + 4, y + 26, risk, riskStyle.bg, riskStyle.fg);
  }

  y += heroH + 6;

  // ── Data source / confidence strip ──
  if (dataSource) {
    const conf = confidenceLabels[dataSource];
    let noteLines = [];
    if (sourceNotes) {
      sf('normal', 7.5);
      noteLines = doc.splitTextToSize(`Note: ${sourceNotes}`, W - 8);
    }
    const baseH = 12;
    const noteH = noteLines.length ? noteLines.length * 4 + 2 : 0;
    const sourceH = baseH + noteH;

    fillBox(M, y, W, sourceH, WHITE, BORDER, 1.5);
    sf('bold', 7.5, MUTED);
    doc.text('DATA SOURCE', M + 4, y + 5);
    sf('bold', 9, NAVY);
    doc.text(sourceLabels[dataSource] || dataSource, M + 4, y + 9.5);

    if (conf) {
      sf('bold', 8);
      const ctw = doc.getTextWidth(conf.label) + 6;
      doc.setFillColor(...conf.color);
      doc.circle(M + W - ctw - 6, y + 6.3, 1.3, 'F');
      doc.setTextColor(...conf.color);
      doc.text(conf.label, M + W - ctw - 2, y + 7.3);
    }

    if (noteLines.length) {
      sf('normal', 7.5, MUTED);
      doc.text(noteLines, M + 4, y + baseH + 1);
    }
    y += sourceH + 5;
  }

  // ════════════════════════════════
  // Key Financial Ratios — KPI cards
  // ════════════════════════════════
  sectionLabel('Key Financial Ratios');

  const cardGap = 4;
  const cardW = (W - cardGap) / 2;
  const cardH = 19;

  ratios.forEach(({ label, value, rating, formula }, i) => {
    const col = i % 2;
    if (col === 0) ensureSpace(cardH + 3);
    const cx = M + col * (cardW + cardGap);
    const cy = y;

    fillBox(cx, cy, cardW, cardH, WHITE, BORDER, 1.5);

    sf('bold', 8.5, NAVY);
    doc.text(label, cx + 4, cy + 6.5);
    sf('normal', 6.5, MUTED);
    doc.text(formula, cx + 4, cy + 11);

    sf('bold', 13, TEXT);
    doc.text(value, cx + 4, cy + 16.5);

    if (rating) {
      const rs = ratingStyle(rating);
      sf('bold', 7.5);
      const rtw = doc.getTextWidth(rating) + 6;
      pill(cx + cardW - rtw - 4, cy + 15.5, rating, rs.bg, rs.fg);
    }

    // Advance y after every second card (end of row)
    if (col === 1 || i === ratios.length - 1) {
      y += cardH + 3;
    }
  });
  y += 2;

  // ════════════════════════════════
  // Financial Trends (3-year)
  // ════════════════════════════════
  const gv = id => parseFloat(document.getElementById(id)?.value) || 0;
  const rv  = [gv('rev0'),  gv('rev1'),  gv('rev2')];
  const ex  = [gv('exp0'),  gv('exp1'),  gv('exp2')];
  const ca  = [gv('cash0'), gv('cash1'), gv('cash2')];
  const pr  = [gv('prog0'), gv('prog1'), gv('prog2')];
  const mrg = rv.map((r,i) => r ? ((r - ex[i]) / r * 100) : NaN);
  const moc = ex.map((e,i) => e ? (ca[i] / (e / 12)) : NaN);
  const pe  = ex.map((e,i) => e ? (pr[i] / e * 100) : NaN);

  const fmtM = n => isNaN(n) ? '—' : '$' + Math.round(n).toLocaleString();
  const fmtP = n => isNaN(n) ? '—' : n.toFixed(1) + '%';
  const fmtX = n => isNaN(n) ? '—' : n.toFixed(1) + 'mo';

  function trendDir(a, b, c) {
    if (!isNaN(a) && !isNaN(b) && !isNaN(c)) return a >= b && b >= c ? 'up' : a <= b && b <= c ? 'down' : 'mixed';
    if (!isNaN(a) && !isNaN(b)) return a > b*1.02 ? 'up' : a < b*0.98 ? 'down' : 'flat';
    return null;
  }

  const trendRows = [
    { label:'Total Revenue',        vals: rv.map(fmtM),  dir: trendDir(rv[0],rv[1],rv[2]),  goodUp: true },
    { label:'Total Expenses',       vals: ex.map(fmtM),  dir: trendDir(ex[0],ex[1],ex[2]),  goodUp: false },
    { label:'Operating Margin',     vals: mrg.map(fmtP), dir: trendDir(mrg[0],mrg[1],mrg[2]), goodUp: true },
    { label:'Months of Cash',       vals: moc.map(fmtX), dir: trendDir(moc[0],moc[1],moc[2]), goodUp: true },
    { label:'Program Expense Ratio',vals: pe.map(fmtP),  dir: trendDir(pe[0],pe[1],pe[2]),  goodUp: true },
  ].filter(r => r.dir !== null && r.vals[0] !== '—');

  if (trendRows.length >= 2) {
    // Only show if we have at least 2 years of data for most metrics
    const hasTwoYears = trendRows.filter(r => r.vals[0] !== '—' && r.vals[1] !== '—').length >= 2;
    if (!hasTwoYears) {
      // Skip trends section entirely — not enough data to be meaningful
    } else {
    sectionLabel('Financial Trends');

    // Determine how many year columns to show
    const hasThreeYears = trendRows.some(r => r.vals[2] !== '—');

    // Get fiscal year labels from fyEnd
    const fyYear = fyEnd ? parseInt(fyEnd.split('/').pop()) : new Date().getFullYear();
    const yrLabels = hasThreeYears
      ? [`FY ${fyYear}`, `FY ${fyYear-1}`, `FY ${fyYear-2}`]
      : [`FY ${fyYear}`, `FY ${fyYear-1}`];

    const colW = hasThreeYears
      ? [W * 0.34, W * 0.2, W * 0.2, W * 0.2, W * 0.06]
      : [W * 0.44, W * 0.25, W * 0.25, W * 0.06];
    const colX = colW.reduce((acc, w, i) => {
      acc.push(i === 0 ? M : acc[i-1] + colW[i-1]);
      return acc;
    }, []);

    const rowH = 9;
    ensureSpace(rowH * (trendRows.length + 1) + 6);

    // Header row
    fill(M, y, W, rowH, NAVY, 1);
    sf('bold', 7, WHITE);
    doc.text('Metric', colX[0] + 3, y + 6);
    doc.text(yrLabels[0], colX[1] + colW[1]/2, y + 6, { align: 'center' });
    doc.text(yrLabels[1], colX[2] + colW[2]/2, y + 6, { align: 'center' });
    if (hasThreeYears) doc.text(yrLabels[2], colX[3] + colW[3]/2, y + 6, { align: 'center' });
    doc.text('Trend', colX[hasThreeYears ? 4 : 3] + colW[hasThreeYears ? 4 : 3]/2, y + 6, { align: 'center' });
    y += rowH;

    trendRows.forEach((row, i) => {
      const rowBg = i % 2 === 0 ? WHITE : LIGHT;
      fill(M, y, W, rowH, rowBg);
      box(M, y, W, rowH, BORDER);

      sf('normal', 8, TEXT);
      doc.text(row.label, colX[0] + 3, y + 6);

      sf('bold', 8, TEXT);
      doc.text(row.vals[0] !== '—' ? row.vals[0] : '—', colX[1] + colW[1]/2, y + 6, { align: 'center' });

      sf('normal', 8, MUTED);
      doc.text(row.vals[1] !== '—' ? row.vals[1] : '—', colX[2] + colW[2]/2, y + 6, { align: 'center' });
      if (hasThreeYears) doc.text(row.vals[2] !== '—' ? row.vals[2] : '—', colX[3] + colW[3]/2, y + 6, { align: 'center' });

      // Trend arrow
      const arrowMap = { up:'↑', down:'↓', mixed:'↔', flat:'→' };
      const arrow = arrowMap[row.dir] || '—';
      const isGood = (row.goodUp && row.dir === 'up') || (!row.goodUp && row.dir === 'down');
      const isBad  = (row.goodUp && row.dir === 'down') || (!row.goodUp && row.dir === 'up');
      const arrowColor = isGood ? GREEN : isBad ? RED : MUTED;
      sf('bold', 10, arrowColor);
      const arrowColIdx = hasThreeYears ? 4 : 3;
      doc.text(arrow, colX[arrowColIdx] + colW[arrowColIdx]/2, y + 6.5, { align: 'center' });

      y += rowH;
    });
    y += 5;
    } // end hasTwoYears block
  }
  if (flags.length) {
    sectionLabel('Financial Health Indicators');
    flags.forEach(f => {
      const lines = doc.splitTextToSize(f.text, W - 10);
      const rowH = lines.length * 4.5 + 2;
      ensureSpace(rowH);
      doc.setFillColor(...(f.ok ? GREEN : AMBER));
      doc.circle(M + 2.5, y + 2.3, 1.6, 'F');
      sf('normal', 8.5, TEXT);
      doc.text(lines, M + 7, y + 3);
      y += rowH;
    });
    y += 3;
  }

  // ════════════════════════════════
  // Recommendation
  // ════════════════════════════════
  if (rec) {
    const recStyles = {
      'Invite to Apply':    { bg:[232,245,240], fg:[15,110,86],  border:[167,221,201] },
      'Approved':           { bg:[234,243,222], fg:[39,80,10],   border:[200,224,168] },
      'Decline':            { bg:[254,226,226], fg:[153,27,27],  border:[248,180,180] },
      'Request More Info':  { bg:[230,241,251], fg:[12,68,124],  border:[179,213,242] },
      'Full Due Diligence': { bg:[254,243,199], fg:[146,64,14],  border:[250,213,140] },
    };
    const rs = recStyles[rec] || { bg: LIGHT, fg: MUTED, border: BORDER };
    const recH = 16;
    ensureSpace(recH + 3);
    fillBox(M, y, W, recH, rs.bg, rs.border, 2);
    sf('bold', 7.5, rs.fg);
    doc.text('RECOMMENDATION', M + 5, y + 6);
    sf('bold', 13, rs.fg);
    doc.text(rec, M + 5, y + 12.5);
    y += recH + 5;
  }

  // ════════════════════════════════
  // Documents Received
  // ════════════════════════════════
  if (docs.length) {
    sectionLabel('Documents Received');
    const docStr = docs.join('   ·   ');
    const docLines = doc.splitTextToSize(docStr, W - 8);
    const docH = docLines.length * 5 + 6;
    ensureSpace(docH);
    fillBox(M, y, W, docH, LIGHT, BORDER, 1.5);
    sf('normal', 8.5, TEXT);
    doc.text(docLines, M + 4, y + 5.5);
    y += docH + 5;
  }

  // ════════════════════════════════
  // Overall Impression
  // ════════════════════════════════
  if (impression) {
    sectionLabel('Overall Impression', 14);
    const impLines = doc.splitTextToSize(impression, W - 4);
    const lineH = 5;
    impLines.forEach(line => {
      ensureSpace(lineH + 2);
      sf('normal', 9, TEXT);
      doc.text(line, M, y + lineH - 1);
      y += lineH;
    });
    y += 4;
  }

  // ════════════════════════════════
  // Key Questions
  // ════════════════════════════════
  if (questions) {
    sectionLabel('Key Questions for Follow-Up', 14);
    const qLines = doc.splitTextToSize(questions, W - 4);
    const lineH = 5;
    qLines.forEach(line => {
      ensureSpace(lineH + 2);
      sf('normal', 9, TEXT);
      doc.text(line, M, y + lineH - 1);
      y += lineH;
    });
    y += 4;
  }

  // ════════════════════════════════
  // AI-Generated Narrative
  // ════════════════════════════════
  if (hasAI) {
    sectionLabel('Assessment Narrative', 14);
    const cleanAI = aiText.replace(/#{1,6}\s+/g, '').replace(/\*\*(.+?)\*\*/g, '$1').trim();
    const paragraphs = cleanAI.split('\n').filter(p => p.trim());
    const lineH = 5.5;
    paragraphs.forEach(para => {
      const lines = doc.splitTextToSize(para.trim(), W - 4);
      lines.forEach(line => {
        ensureSpace(lineH + 2);
        sf('normal', 9.5, TEXT);
        doc.text(line, M, y + lineH - 1.5);
        y += lineH;
      });
      y += 4;
    });
  }

  // ── Final footer ──
  drawFooter();

  // ── Re-stamp page numbers with total count ──
  const totalPages = page;
  if (totalPages > 1) {
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      fill(0, PH - FOOTER_H, PW, FOOTER_H, NAVY);
      sf('normal', 6.5, [160,196,232]);
      doc.text('Clear Philanthropy  ·  clearphilanthropy.com', M, PH - 3.5);
      doc.text(`Page ${p} of ${totalPages}`, PW - M, PH - 3.5, { align: 'right' });
    }
  }

  // ── Save ──
  const fname = `${orgName.replace(/[^a-z0-9]/gi, '_').slice(0, 50)}_Assessment_${new Date().toISOString().split('T')[0]}.pdf`;
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

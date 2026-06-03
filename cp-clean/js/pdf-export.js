// pdf-export.js — generates a branded Clear Philanthropy PDF report

async function exportToPDF() {
  const btn = document.getElementById('pdfBtn');
  if (btn) { btn.textContent = 'Generating PDF...'; btn.disabled = true; }

  // Load jsPDF from CDN
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210, margin = 20;
  let y = 0;

  // Colors
  const navy = [11, 37, 69];
  const blue = [26, 110, 181];
  const green = [46, 173, 119];
  const red = [232, 71, 42];
  const amber = [217, 119, 6];
  const lightGray = [243, 246, 250];
  const midGray = [107, 114, 128];
  const darkText = [17, 24, 39];
  const white = [255, 255, 255];

  // Helper functions
  function setFont(style = 'normal', size = 10, color = darkText) {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  }

  function rect(x, xw, yy, h, color) {
    doc.setFillColor(...color);
    doc.rect(x, yy, xw, h, 'F');
  }

  function line(yy, color = [229, 231, 235]) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.2);
    doc.line(margin, yy, W - margin, yy);
  }

  function badge(x, yy, text, bgColor, textColor) {
    const w = doc.getTextWidth(text) + 6;
    doc.setFillColor(...bgColor);
    doc.roundedRect(x, yy - 3.5, w, 5.5, 1, 1, 'F');
    doc.setTextColor(...textColor);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(text, x + 3, yy + 0.5);
    return w;
  }

  function ratingColors(r) {
    if (r === 'Good') return { bg: [220, 252, 231], text: [22, 101, 52] };
    if (r === 'Moderate') return { bg: [254, 243, 199], text: [146, 64, 14] };
    return { bg: [254, 226, 226], text: [153, 27, 27] };
  }

  // Gather data
  const orgName = document.getElementById('orgName')?.value || 'Organization';
  const fyEnd = document.getElementById('fyEnd')?.value || '';
  const reviewer = document.getElementById('reviewer')?.value || '';
  const reviewDate = document.getElementById('reviewDate')?.value || '';
  const recommendation = document.getElementById('recommendation')?.value || '';
  const impression = document.getElementById('impression')?.value || '';
  const questions = document.getElementById('questions')?.value || '';
  const scoreEl = document.getElementById('scoreDisplay');
  const score = scoreEl?.textContent || '—';
  const riskEl = document.getElementById('riskBadge');
  const risk = riskEl?.textContent || '';

  const ratios = [
    { label: 'Operating Margin', id: 'r_om', badge: 'b_om' },
    { label: 'Current Ratio', id: 'r_cr', badge: 'b_cr' },
    { label: 'Months of Cash', id: 'r_mc', badge: 'b_mc' },
    { label: 'Debt to Assets', id: 'r_da', badge: 'b_da' },
    { label: 'Program Expense Ratio', id: 'r_pe', badge: 'b_pe' },
    { label: 'Fundraising Efficiency', id: 'r_fe', badge: 'b_fe' },
    { label: 'Revenue Concentration', id: 'r_rc', badge: 'b_rc' },
    { label: 'Net Asset Ratio', id: 'r_na', badge: 'b_na' },
  ];

  const flags = Array.from(document.querySelectorAll('#flagsList li')).map(li => ({
    text: li.textContent.trim(),
    ok: li.querySelector('.fi-ok') !== null
  })).filter(f => f.text && !f.text.includes('Enter data'));

  const docMap = { doc_990: 'Form 990', doc_audit: 'Audited Financials', doc_bs: 'Balance Sheet', doc_is: 'Income Statement', doc_cf: 'Cash Flow Statement', doc_budget: 'Board Budget', doc_minutes: 'Board Minutes', doc_strategic: 'Strategic Plan' };
  const docs = Object.keys(docMap).filter(id => document.getElementById(id)?.checked).map(id => docMap[id]);

  const aiText = document.getElementById('aiText')?.textContent || '';

  // ─── HEADER ───
  rect(0, W, 0, 42, navy);
  // Logo mark
  doc.setFillColor(...blue);
  doc.roundedRect(margin, 10, 12, 12, 2, 2, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.2);
  doc.line(margin + 2.5, margin + 2, margin + 5, margin + 4.5);
  doc.line(margin + 5, margin + 4.5, margin + 9.5, margin - 0.5);

  setFont('bold', 14, white);
  doc.text('Clear ', margin + 15, 18);
  const clearW = doc.getTextWidth('Clear ');
  doc.setTextColor(77, 166, 232);
  doc.text('Philanthropy', margin + 15 + clearW, 18);

  setFont('normal', 8, [180, 200, 220]);
  doc.text('Financial Health Assessment Report', margin + 15, 24);

  // Score box
  const scoreBoxX = W - margin - 35;
  doc.setFillColor(255, 255, 255, 0.1);
  doc.setTextColor(...white);
  setFont('normal', 8, [180, 200, 220]);
  doc.text('HEALTH SCORE', scoreBoxX, 14, { align: 'center' });
  setFont('bold', 22, [74, 222, 128]);
  doc.text(score, scoreBoxX, 26, { align: 'center' });
  setFont('normal', 9, [180, 200, 220]);
  doc.text('/ 100', scoreBoxX + 8, 26);

  // Risk badge in header
  if (risk) {
    const riskColor = risk.includes('Low') ? [220, 252, 231] : risk.includes('High') ? [254, 226, 226] : [254, 243, 199];
    const riskText = risk.includes('Low') ? [22, 101, 52] : risk.includes('High') ? [153, 27, 27] : [146, 64, 14];
    const riskW = doc.getTextWidth(risk) + 8;
    doc.setFillColor(...riskColor);
    doc.roundedRect(scoreBoxX - riskW / 2, 29, riskW, 6, 1.5, 1.5, 'F');
    doc.setTextColor(...riskText);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(risk, scoreBoxX, 33.5, { align: 'center' });
  }

  y = 50;

  // ─── ORG INFO ───
  rect(margin, W - margin * 2, y, 18, lightGray);
  setFont('bold', 11, darkText);
  doc.text(orgName, margin + 4, y + 7);
  setFont('normal', 8, midGray);
  const infoItems = [
    fyEnd ? `Fiscal Year End: ${fyEnd}` : null,
    reviewer ? `Reviewer: ${reviewer}` : null,
    reviewDate ? `Date: ${reviewDate}` : null,
  ].filter(Boolean);
  doc.text(infoItems.join('   ·   '), margin + 4, y + 13);
  y += 24;

  // ─── FINANCIAL RATIOS ───
  setFont('bold', 9, navy);
  doc.text('KEY FINANCIAL RATIOS', margin, y);
  y += 5;
  line(y); y += 4;

  const colW = (W - margin * 2) / 2 - 3;
  ratios.forEach((r, i) => {
    const x = margin + (i % 2) * (colW + 6);
    const rowY = y + Math.floor(i / 2) * 10;
    const val = document.getElementById(r.id)?.textContent || '—';
    const badgeEl = document.getElementById(r.badge)?.querySelector('.bdg');
    const rating = badgeEl?.textContent || '';
    const rc = ratingColors(rating);

    setFont('normal', 8, midGray);
    doc.text(r.label, x, rowY + 4);
    setFont('bold', 9, darkText);
    doc.text(val, x + colW - 25, rowY + 4);
    if (rating) badge(x + colW - 18, rowY + 4, rating, rc.bg, rc.text);
  });
  y += Math.ceil(ratios.length / 2) * 10 + 4;

  // ─── RISK FLAGS ───
  if (flags.length) {
    setFont('bold', 9, navy);
    doc.text('RISK FLAGS', margin, y);
    y += 5;
    line(y); y += 4;

    flags.forEach(f => {
      const color = f.ok ? green : amber;
      const symbol = f.ok ? '✓' : '!';
      doc.setFillColor(...color);
      doc.circle(margin + 2, y + 2, 1.8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text(symbol, margin + 1.3, y + 2.8);
      setFont('normal', 8, darkText);
      doc.text(f.text, margin + 6, y + 3.5);
      y += 7;
    });
    y += 2;
  }

  // ─── DOCUMENTS ───
  if (docs.length) {
    setFont('bold', 9, navy);
    doc.text('DOCUMENTS RECEIVED', margin, y);
    y += 5;
    line(y); y += 4;
    setFont('normal', 8, darkText);
    doc.text(docs.join('  ·  '), margin, y + 3);
    y += 10;
  }

  // ─── RECOMMENDATION ───
  if (recommendation) {
    setFont('bold', 9, navy);
    doc.text('RECOMMENDATION', margin, y);
    y += 5;
    line(y); y += 4;
    const recColors = {
      'Invite to Apply': { bg: [232, 245, 240], text: [15, 110, 86] },
      'Approved': { bg: [234, 243, 222], text: [39, 80, 10] },
      'Decline': { bg: [254, 226, 226], text: [153, 27, 27] },
      'Request More Info': { bg: [230, 241, 251], text: [12, 68, 124] },
      'Full Due Diligence': { bg: [254, 243, 199], text: [146, 64, 14] },
    };
    const rc = recColors[recommendation] || { bg: lightGray, text: midGray };
    badge(margin, y + 4, recommendation, rc.bg, rc.text);
    y += 12;
  }

  // ─── REVIEWER NOTES ───
  if (impression) {
    setFont('bold', 9, navy);
    doc.text('OVERALL IMPRESSION', margin, y);
    y += 5;
    line(y); y += 4;
    setFont('normal', 8, darkText);
    const lines = doc.splitTextToSize(impression, W - margin * 2);
    doc.text(lines, margin, y + 3);
    y += lines.length * 4.5 + 6;
  }

  if (questions) {
    setFont('bold', 9, navy);
    doc.text('KEY QUESTIONS FOR FOLLOW-UP', margin, y);
    y += 5;
    line(y); y += 4;
    setFont('normal', 8, darkText);
    const lines = doc.splitTextToSize(questions, W - margin * 2);
    doc.text(lines, margin, y + 3);
    y += lines.length * 4.5 + 6;
  }

  // ─── AI ASSESSMENT ───
  if (aiText && aiText !== 'Writing assessment...') {
    // New page for AI assessment
    doc.addPage();
    y = 20;

    rect(0, W, 0, 12, navy);
    setFont('bold', 10, white);
    doc.text('Clear Philanthropy  ·  AI Assessment Narrative', margin, 8);
    setFont('normal', 8, [180, 200, 220]);
    doc.text(orgName, W - margin, 8, { align: 'right' });

    y = 24;
    setFont('bold', 12, navy);
    doc.text('AI-Generated Assessment', margin, y);
    y += 6;
    line(y, blue); y += 6;

    setFont('normal', 9, darkText);
    const aiLines = doc.splitTextToSize(aiText, W - margin * 2);
    // Handle page overflow
    aiLines.forEach(l => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(l, margin, y);
      y += 5;
    });
  }

  // ─── FOOTER on all pages ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    rect(0, W, 285, 12, navy);
    setFont('normal', 7, [180, 200, 220]);
    doc.text('Clear Philanthropy  ·  Financial Health Assessment', margin, 292);
    doc.text(`Page ${i} of ${pageCount}  ·  Generated ${new Date().toLocaleDateString()}`, W - margin, 292, { align: 'right' });
  }

  // Save
  const filename = `${orgName.replace(/[^a-z0-9]/gi, '_')}_Assessment_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  if (btn) { btn.textContent = 'Download PDF Report'; btn.disabled = false; }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

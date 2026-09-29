// PDF and JSON export utilities

export async function exportJSON(analysisData) {
  const json = JSON.stringify(analysisData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const name = analysisData.repo
    ? `${analysisData.repo.owner}-${analysisData.repo.name}-insight.json`
    : `${(analysisData.topic || 'topic').replace(/\s+/g, '-')}-insight.json`;
  downloadBlob(blob, name);
}

export async function exportPDF(analysisData) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Helper functions
  const checkPage = (needed = 15) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addTitle = (text, size = 16, color = [99, 102, 241]) => {
    checkPage(size + 8);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin, y);
    y += size * 0.5 + 4;
  };

  const addText = (text, size = 10, color = [50, 50, 60]) => {
    checkPage(size + 4);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentW);
    doc.text(lines, margin, y);
    y += lines.length * (size * 0.45) + 3;
  };

  const addBullet = (text, size = 10, indent = 5) => {
    checkPage(size + 4);
    doc.setFontSize(size);
    doc.setTextColor(50, 50, 60);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(`• ${text}`, contentW - indent);
    doc.text(lines, margin + indent, y);
    y += lines.length * (size * 0.45) + 2;
  };

  const addHRule = () => {
    checkPage(8);
    doc.setDrawColor(200, 200, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  };

  const addScoreBadge = (label, score, max = 10) => {
    checkPage(18);
    const pct = Math.min((score / max) * 100, 100);
    const color = pct >= 75 ? [16, 185, 129] : pct >= 50 ? [245, 158, 11] : [239, 68, 68];
    doc.setFillColor(...color);
    doc.roundedRect(margin, y, 60, 12, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}: ${score}/${max}`, margin + 5, y + 8);
    y += 16;
    doc.setTextColor(50, 50, 60);
  };

  // ── COVER PAGE ─────────────────────────────────────────────────────────
  // Background gradient simulation
  doc.setFillColor(15, 15, 26);
  doc.rect(0, 0, pageW, pageH, 'F');

  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageW, 60, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('GitHub Insight Engine', pageW / 2, 25, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  const subtitle = analysisData.repo
    ? `${analysisData.repo.owner} / ${analysisData.repo.name}`
    : analysisData.topic || 'Topic Analysis';
  doc.text(subtitle, pageW / 2, 40, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageW / 2, 55, { align: 'center' });

  // Score summary on cover (white on dark)
  const ai = analysisData.aiInsights || {};
  if (ai.overall_rating) {
    doc.setFillColor(30, 30, 50);
    doc.roundedRect(margin, 75, contentW, 50, 5, 5, 'F');

    doc.setTextColor(230, 230, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Analysis Summary', margin + 10, 88);

    const scores = [
      [`Overall Rating`, `${ai.overall_rating}/10`],
      [`Complexity`, ai.complexity_level || 'N/A'],
      [`Portfolio Value`, `${ai.portfolio_value_score || 0}/10`],
      [`Beginner Score`, `${ai.beginner_friendly_score || 0}/10`],
    ];
    scores.forEach(([label, val], i) => {
      const col = i < 2 ? margin + 10 : margin + contentW / 2;
      const row = i % 2 === 0 ? 100 : 112;
      doc.setTextColor(160, 160, 220);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(label, col, row);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(val, col, row + 7);
    });
  }

  // Reset to white background for content pages
  doc.addPage();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, 'F');
  y = margin;

  // ── REPOSITORY OVERVIEW ──────────────────────────────────────────────
  if (analysisData.repo) {
    const repo = analysisData.repo;
    addTitle('📦 Repository Overview', 18, [99, 102, 241]);
    addHRule();

    addText(`${repo.description || 'No description provided.'}`, 11, [60, 60, 70]);
    y += 3;

    const stats = [
      `⭐ Stars: ${(repo.stars || 0).toLocaleString()}`,
      `🍴 Forks: ${(repo.forks || 0).toLocaleString()}`,
      `👁 Watchers: ${(repo.watchers || 0).toLocaleString()}`,
      `🐛 Open Issues: ${(repo.open_issues || 0).toLocaleString()}`,
    ];
    stats.forEach(s => addText(s, 10));
    y += 4;

    if (repo.license) addText(`📄 License: ${repo.license}`, 10);
    if (repo.created_at) addText(`📅 Created: ${new Date(repo.created_at).toLocaleDateString()}`, 10);
    if (repo.updated_at) addText(`🔄 Updated: ${new Date(repo.updated_at).toLocaleDateString()}`, 10);
    y += 5;
  }

  // ── LANGUAGES ────────────────────────────────────────────────────────
  if (analysisData.languages && Object.keys(analysisData.languages).length > 0) {
    checkPage(30);
    addTitle('💻 Language Distribution', 16, [99, 102, 241]);
    addHRule();
    Object.entries(analysisData.languages).slice(0, 8).forEach(([lang, pct]) => {
      addText(`${lang}: ${typeof pct === 'number' ? pct.toFixed(1) : pct}%`, 10);
    });
    y += 4;
  }

  // ── AI INSIGHTS ──────────────────────────────────────────────────────
  if (ai.project_summary) {
    checkPage(40);
    addTitle('🤖 AI Insights', 16, [99, 102, 241]);
    addHRule();

    if (ai.project_summary) {
      addTitle('Project Summary', 12, [80, 80, 200]);
      addText(ai.project_summary, 10);
      y += 3;
    }
    if (ai.architecture_assessment) {
      addTitle('Architecture', 12, [80, 80, 200]);
      addText(ai.architecture_assessment, 10);
      y += 3;
    }

    // Scores
    if (ai.overall_rating) addScoreBadge('Overall Rating', ai.overall_rating);
    if (ai.doc_quality_score) addScoreBadge('Documentation', ai.doc_quality_score);
    if (ai.code_quality_score) addScoreBadge('Code Quality', ai.code_quality_score);
    y += 3;

    if (ai.strengths?.length) {
      addTitle('✅ Strengths', 12, [16, 185, 129]);
      ai.strengths.forEach(s => addBullet(s));
      y += 3;
    }
    if (ai.weaknesses?.length) {
      addTitle('⚠️ Areas to Improve', 12, [245, 158, 11]);
      ai.weaknesses.forEach(w => addBullet(w));
      y += 3;
    }
    if (ai.improvement_suggestions?.length) {
      addTitle('💡 Suggestions', 12, [99, 102, 241]);
      ai.improvement_suggestions.forEach(s => addBullet(s));
    }
  }

  // ── TECHNOLOGIES ─────────────────────────────────────────────────────
  if (ai.detected_technologies?.length) {
    checkPage(25);
    addTitle('🔧 Detected Technologies', 16, [99, 102, 241]);
    addHRule();
    addText(ai.detected_technologies.join(' · '), 11, [60, 60, 70]);
    y += 4;
  }

  // ── FOOTER ───────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 170);
    doc.text(
      `GitHub Insight Engine | Page ${i} of ${totalPages}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' }
    );
  }

  const filename = analysisData.repo
    ? `${analysisData.repo.owner}-${analysisData.repo.name}-report.pdf`
    : `${(analysisData.topic || 'topic').replace(/\s+/g, '-')}-report.pdf`;
  doc.save(filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

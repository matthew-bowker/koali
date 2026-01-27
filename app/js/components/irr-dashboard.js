import { cohensKappa, percentAgreement, disagreementReport } from '../utils/irr.js';
import { downloadCSV } from '../utils/export.js';

export function initIRRDashboard(state) {
  const container = document.getElementById('irr-dashboard');

  function render() {
    const codings = state.get('codings') || {};
    const codes = (state.get('codebook.codes') || []).filter(c => !c.deleted);
    const sources = state.get('sources.manifest') || [];

    // Collect all unique coders
    const coderSet = new Set();
    for (const coding of Object.values(codings)) {
      for (const seg of (coding.segments || [])) {
        if (seg.createdBy) coderSet.add(seg.createdBy);
      }
    }
    const coders = Array.from(coderSet);

    // Get user display names from sync log or user state
    const currentUser = state.get('user');

    container.innerHTML = `
      <h2 style="margin-bottom:16px;">Inter-Rater Reliability</h2>

      ${coders.length < 2 ? `
        <p style="color:var(--text-muted);">IRR requires coding from at least two different users. Currently ${coders.length} coder(s) found.</p>
      ` : `
        <div class="form-row" style="margin-bottom:16px;">
          <div class="form-group" style="flex:1">
            <label>Coder 1</label>
            <select id="irr-coder1">
              ${coders.map(c => `<option value="${c}">${c === currentUser?.id ? currentUser.displayName || c : c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="flex:1">
            <label>Coder 2</label>
            <select id="irr-coder2">
              ${coders.map((c, i) => `<option value="${c}" ${i === 1 ? 'selected' : ''}>${c === currentUser?.id ? currentUser.displayName || c : c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="flex:1">
            <label>Document</label>
            <select id="irr-source">
              <option value="">All documents</option>
              ${sources.map(s => `<option value="${s.id}">${escapeHtml(s.title)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="flex:0;display:flex;align-items:flex-end;">
            <button class="btn btn-primary" id="irr-calculate">Calculate</button>
          </div>
        </div>

        <div id="irr-results"></div>
      `}
    `;

    if (coders.length >= 2) {
      document.getElementById('irr-calculate').addEventListener('click', () => calculate(codings, codes, sources));
    }
  }

  function calculate(codings, codes, sources) {
    const coder1 = document.getElementById('irr-coder1').value;
    const coder2 = document.getElementById('irr-coder2').value;
    const sourceFilter = document.getElementById('irr-source').value;
    const resultsEl = document.getElementById('irr-results');

    if (coder1 === coder2) {
      resultsEl.innerHTML = '<p style="color:var(--danger)">Select two different coders.</p>';
      return;
    }

    const codeIds = codes.map(c => c.id);
    const sourcesToCheck = sourceFilter
      ? Object.entries(codings).filter(([id]) => id === sourceFilter)
      : Object.entries(codings);

    // Collect segments per coder across selected sources
    const seg1 = [], seg2 = [];
    let totalLength = 0;

    for (const [sourceId, coding] of sourcesToCheck) {
      const src = sources.find(s => s.id === sourceId);
      // Estimate doc length from max segment offset
      let maxOffset = 0;
      for (const seg of (coding.segments || [])) {
        const end = seg.end?.offset || 0;
        if (end > maxOffset) maxOffset = end;
        if (seg.createdBy === coder1) seg1.push(seg);
        else if (seg.createdBy === coder2) seg2.push(seg);
      }
      totalLength += maxOffset || 1000; // fallback estimate
    }

    if (seg1.length === 0 && seg2.length === 0) {
      resultsEl.innerHTML = '<p style="color:var(--text-muted)">No segments found for selected coders.</p>';
      return;
    }

    // Overall stats
    const kappa = cohensKappa(seg1, seg2, codeIds, totalLength);
    const pctAgree = percentAgreement(seg1, seg2, codeIds, totalLength);

    // Per-code stats
    const perCode = codes.map(c => {
      const k = cohensKappa(seg1, seg2, [c.id], totalLength);
      const p = percentAgreement(seg1, seg2, [c.id], totalLength);
      const c1Count = seg1.filter(s => s.codeId === c.id).length;
      const c2Count = seg2.filter(s => s.codeId === c.id).length;
      return { code: c, kappa: k, agreement: p, c1Count, c2Count };
    }).filter(r => r.c1Count > 0 || r.c2Count > 0);

    // Disagreements
    const disagreements = disagreementReport(seg1, seg2, codeIds, codes, totalLength);

    resultsEl.innerHTML = `
      <div style="display:flex;gap:24px;margin-bottom:24px;">
        <div style="text-align:center;padding:16px;background:var(--bg-secondary);border-radius:var(--radius);flex:1;">
          <div style="font-size:32px;font-weight:700;">${kappa.toFixed(3)}</div>
          <div style="font-size:13px;color:var(--text-secondary);">Cohen's Kappa</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${kappaInterpretation(kappa)}</div>
        </div>
        <div style="text-align:center;padding:16px;background:var(--bg-secondary);border-radius:var(--radius);flex:1;">
          <div style="font-size:32px;font-weight:700;">${(pctAgree * 100).toFixed(1)}%</div>
          <div style="font-size:13px;color:var(--text-secondary);">Percent Agreement</div>
        </div>
        <div style="text-align:center;padding:16px;background:var(--bg-secondary);border-radius:var(--radius);flex:1;">
          <div style="font-size:32px;font-weight:700;">${disagreements.length}</div>
          <div style="font-size:13px;color:var(--text-secondary);">Disagreements</div>
        </div>
      </div>

      ${perCode.length > 0 ? `
        <h3 style="margin-bottom:8px;">Per-Code Reliability</h3>
        <table style="margin-bottom:24px;">
          <thead><tr><th>Code</th><th>Kappa</th><th>Agreement</th><th>Coder 1</th><th>Coder 2</th></tr></thead>
          <tbody>
            ${perCode.map(r => `
              <tr>
                <td><span class="code-color" style="background:${r.code.color};display:inline-block;"></span> ${escapeHtml(r.code.name)}</td>
                <td>${r.kappa.toFixed(3)}</td>
                <td>${(r.agreement * 100).toFixed(1)}%</td>
                <td>${r.c1Count}</td>
                <td>${r.c2Count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${disagreements.length > 0 ? `
        <h3 style="margin-bottom:8px;">Disagreement Details (first 50)</h3>
        <button class="btn btn-small" id="irr-export" style="margin-bottom:8px;">Export Disagreements CSV</button>
        <table>
          <thead><tr><th>Code</th><th>Location</th><th>Coder 1</th><th>Coder 2</th></tr></thead>
          <tbody>
            ${disagreements.slice(0, 50).map(d => `
              <tr>
                <td>${escapeHtml(d.codeName)}</td>
                <td>Chars ${d.offsetStart}-${d.offsetEnd}</td>
                <td>${d.coder1Applied ? 'Applied' : '-'}</td>
                <td>${d.coder2Applied ? 'Applied' : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    `;

    // Full report export button
    const fullExportHtml = '<button class="btn btn-small" id="irr-full-export" style="margin:8px 0;">Export Full Report (CSV)</button>';
    resultsEl.insertAdjacentHTML('afterbegin', fullExportHtml);
    document.getElementById('irr-full-export').addEventListener('click', () => {
      const lines = [];
      lines.push('=== IRR Full Report ===');
      lines.push(`Generated,${new Date().toISOString()}`);
      lines.push(`Coder 1,${document.getElementById('irr-coder1').value}`);
      lines.push(`Coder 2,${document.getElementById('irr-coder2').value}`);
      lines.push('');
      lines.push('=== Overall ===');
      lines.push(`Cohen's Kappa,${kappa.toFixed(4)}`);
      lines.push(`Percent Agreement,${(pctAgree * 100).toFixed(2)}%`);
      lines.push(`Interpretation,${kappaInterpretation(kappa)}`);
      lines.push(`Total Disagreements,${disagreements.length}`);
      lines.push('');
      lines.push('=== Per-Code ===');
      lines.push('Code,Kappa,Agreement,Coder 1 Segments,Coder 2 Segments');
      for (const r of perCode) {
        lines.push(`"${r.code.name}",${r.kappa.toFixed(4)},${(r.agreement * 100).toFixed(2)}%,${r.c1Count},${r.c2Count}`);
      }
      lines.push('');
      lines.push('=== Disagreements ===');
      lines.push('Code,Location Start,Location End,Coder 1 Applied,Coder 2 Applied');
      for (const d of disagreements) {
        lines.push(`"${d.codeName}",${d.offsetStart},${d.offsetEnd},${d.coder1Applied},${d.coder2Applied}`);
      }
      downloadCSV(lines.join('\n'), 'irr-full-report.csv');
    });

    const exportBtn = document.getElementById('irr-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const header = 'Code,Location Start,Location End,Coder 1 Applied,Coder 2 Applied';
        const rows = disagreements.map(d =>
          `${d.codeName},${d.offsetStart},${d.offsetEnd},${d.coder1Applied},${d.coder2Applied}`
        );
        downloadCSV([header, ...rows].join('\n'), 'irr-disagreements.csv');
      });
    }
  }

  function kappaInterpretation(k) {
    if (k < 0) return 'Poor';
    if (k < 0.21) return 'Slight';
    if (k < 0.41) return 'Fair';
    if (k < 0.61) return 'Moderate';
    if (k < 0.81) return 'Substantial';
    return 'Almost Perfect';
  }

  state.subscribe('ui.activeTab', (tab) => {
    if (tab === 'irr') render();
  });

  render();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

import { countSegmentsByCode } from '../models/coding.js';
import { codesToTree } from '../models/codebook.js';
import { getThemeSegments } from '../models/theme.js';
import { downloadDataURL } from '../utils/export.js';

export function initVisualizations(state) {
  const container = document.getElementById('visualizations');
  let chartInstance = null;

  function render() {
    const codes = (state.get('codebook.codes') || []).filter(c => !c.deleted);
    const codings = state.get('codings') || {};
    const sources = state.get('sources.manifest') || [];
    const counts = countSegmentsByCode(codings);
    const themes = (state.get('themes.themes') || []).filter(t => !t.deleted);

    container.innerHTML = `
      <h2 style="margin-bottom:16px;">Visualizations</h2>
      <div class="viz-tabs">
        <button class="btn btn-small active" data-viz="frequency">Code Frequency</button>
        <button class="btn btn-small" data-viz="hierarchy">Code Hierarchy</button>
        <button class="btn btn-small" data-viz="heatmap">Code x Document</button>
        <button class="btn btn-small" data-viz="wordfreq">Word Frequency</button>
        ${themes.length > 0 ? `
          <button class="btn btn-small" data-viz="theme-freq">Theme Frequency</button>
          <button class="btn btn-small" data-viz="theme-heatmap">Theme x Document</button>
          <button class="btn btn-small" data-viz="theme-summary">Theme Summary</button>
        ` : ''}
      </div>
      <div id="viz-content" class="chart-container"></div>
      <div style="margin-top:8px;"><button class="btn btn-small" id="viz-export-png" style="display:none;">Export Chart PNG</button></div>
    `;

    container.querySelectorAll('.viz-tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.viz-tabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderViz(btn.dataset.viz, codes, codings, sources, counts, themes);
      });
    });

    document.getElementById('viz-export-png').addEventListener('click', () => {
      if (!chartInstance) return;
      downloadDataURL(chartInstance.toBase64Image(), 'chart.png');
    });

    renderViz('frequency', codes, codings, sources, counts, themes);
  }

  function renderViz(type, codes, codings, sources, counts, themes) {
    const el = document.getElementById('viz-content');
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

    const exportBtn = document.getElementById('viz-export-png');

    switch (type) {
      case 'frequency': renderFrequency(el, codes, counts); break;
      case 'hierarchy': renderHierarchy(el, codes); break;
      case 'heatmap': renderHeatmap(el, codes, codings, sources); break;
      case 'wordfreq': renderWordFrequency(el, codings); break;
      case 'theme-freq': renderThemeFrequency(el, themes, codings); break;
      case 'theme-heatmap': renderThemeHeatmap(el, themes, codings, sources); break;
      case 'theme-summary': renderThemeSummary(el, themes, codings, codes, sources); break;
    }
    if (exportBtn) exportBtn.style.display = chartInstance ? 'inline-block' : 'none';
  }

  function renderFrequency(el, codes, counts) {
    const sorted = codes.filter(c => counts[c.id]).sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));

    if (sorted.length === 0) {
      el.innerHTML = '<p style="color:var(--text-muted)">No coded segments yet.</p>';
      return;
    }

    if (window.Chart) {
      el.innerHTML = '<canvas id="freq-chart" width="800" height="400"></canvas>';
      const canvas = document.getElementById('freq-chart');
      chartInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: sorted.map(c => c.name),
          datasets: [{
            label: 'Segment Count',
            data: sorted.map(c => counts[c.id] || 0),
            backgroundColor: sorted.map(c => c.color || '#2563eb')
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      });
    } else {
      // Fallback: simple HTML bars
      const maxCount = Math.max(...sorted.map(c => counts[c.id] || 0));
      el.innerHTML = sorted.map(c => {
        const count = counts[c.id] || 0;
        const pct = maxCount > 0 ? (count / maxCount * 100) : 0;
        return `<div style="margin-bottom:6px;display:flex;align-items:center;gap:8px;">
          <span style="width:140px;font-size:13px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(c.name)}</span>
          <div style="flex:1;background:var(--bg-secondary);border-radius:4px;height:20px;">
            <div style="width:${pct}%;background:${c.color};height:100%;border-radius:4px;"></div>
          </div>
          <span style="font-size:12px;color:var(--text-muted);width:30px;">${count}</span>
        </div>`;
      }).join('');
    }
  }

  function renderHierarchy(el, codes) {
    const tree = codesToTree(codes);
    if (tree.length === 0) {
      el.innerHTML = '<p style="color:var(--text-muted)">No codes defined yet.</p>';
      return;
    }

    function renderTreeNode(node, depth) {
      const indent = depth * 24;
      let html = `<div style="padding:4px 0;padding-left:${indent}px;display:flex;align-items:center;gap:6px;">
        <span class="code-color" style="background:${node.color}"></span>
        <span style="font-size:13px;">${escapeHtml(node.name)}</span>
      </div>`;
      for (const child of (node.childNodes || [])) {
        html += renderTreeNode(child, depth + 1);
      }
      return html;
    }

    el.innerHTML = tree.map(n => renderTreeNode(n, 0)).join('');
  }

  function renderHeatmap(el, codes, codings, sources) {
    if (codes.length === 0 || sources.length === 0) {
      el.innerHTML = '<p style="color:var(--text-muted)">Need codes and documents to generate heatmap.</p>';
      return;
    }

    // Build matrix: codes x sources
    const matrix = {};
    for (const code of codes) {
      matrix[code.id] = {};
      for (const src of sources) {
        const coding = codings[src.id];
        const count = coding ? coding.segments.filter(s => s.codeId === code.id).length : 0;
        matrix[code.id][src.id] = count;
      }
    }

    const maxVal = Math.max(1, ...codes.flatMap(c => sources.map(s => matrix[c.id][s.id])));

    el.innerHTML = `
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th></th>
              ${sources.map(s => `<th style="font-size:11px;writing-mode:vertical-rl;text-orientation:mixed;height:100px;">${escapeHtml(s.title)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${codes.map(c => `
              <tr>
                <td style="white-space:nowrap;">
                  <span class="code-color" style="background:${c.color};display:inline-block;"></span>
                  ${escapeHtml(c.name)}
                </td>
                ${sources.map(s => {
                  const val = matrix[c.id][s.id];
                  const intensity = maxVal > 0 ? val / maxVal : 0;
                  const bg = `rgba(37,99,235,${intensity * 0.8})`;
                  const textColor = intensity > 0.5 ? 'white' : 'var(--text)';
                  return `<td class="heatmap-cell" data-code-id="${c.id}" data-source-id="${s.id}" style="background:${bg};color:${textColor};cursor:${val ? 'pointer' : 'default'};">${val || ''}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div id="heatmap-drilldown"></div>
    `;

    el.querySelectorAll('.heatmap-cell[data-code-id]').forEach(cell => {
      cell.addEventListener('click', () => {
        const codeId = cell.dataset.codeId;
        const sourceId = cell.dataset.sourceId;
        const coding = codings[sourceId];
        if (!coding) return;
        const segs = coding.segments.filter(s => s.codeId === codeId);
        if (segs.length === 0) return;
        const code = codes.find(c => c.id === codeId);
        const src = sources.find(s => s.id === sourceId);
        const dd = el.querySelector('#heatmap-drilldown');
        dd.innerHTML = `
          <div style="margin-top:12px;padding:12px;border:1px solid var(--border);border-radius:var(--radius);">
            <h4>${escapeHtml(code?.name || '')} in ${escapeHtml(src?.title || '')} (${segs.length})</h4>
            <ul style="margin-top:8px;font-size:13px;">
              ${segs.map(s => `<li style="margin-bottom:4px;">"${escapeHtml((s.text || '').slice(0, 120))}${(s.text || '').length > 120 ? '...' : ''}"</li>`).join('')}
            </ul>
          </div>`;
      });
    });
  }

  let wordFreqScope = 'all'; // 'all' | 'coded' | codeId
  let wordFreqMinFreq = 3;

  function renderWordFrequency(el, codings) {
    const codes = (state.get('codebook.codes') || []).filter(c => !c.deleted);

    el.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">
        <label style="font-size:13px;">Scope:</label>
        <select id="wf-scope">
          <option value="all" ${wordFreqScope === 'all' ? 'selected' : ''}>All coded text</option>
          ${codes.map(c => `<option value="${c.id}" ${wordFreqScope === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
        </select>
        <label style="font-size:13px;">Min freq:</label>
        <input type="number" id="wf-min" value="${wordFreqMinFreq}" min="1" max="100" style="width:60px;" />
      </div>
      <div id="wf-cloud"></div>
    `;

    document.getElementById('wf-scope').addEventListener('change', (e) => {
      wordFreqScope = e.target.value;
      updateWordCloud(codings);
    });
    document.getElementById('wf-min').addEventListener('input', (e) => {
      wordFreqMinFreq = parseInt(e.target.value) || 1;
      updateWordCloud(codings);
    });

    updateWordCloud(codings);
  }

  function updateWordCloud(codings) {
    const cloudEl = document.getElementById('wf-cloud');
    if (!cloudEl) return;

    const allText = [];
    for (const coding of Object.values(codings)) {
      for (const seg of (coding.segments || [])) {
        if (!seg.text) continue;
        if (wordFreqScope !== 'all' && seg.codeId !== wordFreqScope) continue;
        allText.push(seg.text);
      }
    }

    if (allText.length === 0) {
      cloudEl.innerHTML = '<p style="color:var(--text-muted)">No coded text to analyze.</p>';
      return;
    }

    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall',
      'that', 'this', 'it', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'its', 'our', 'their', 'not', 'no', 'so', 'if', 'as', 'just', 'about',
      'than', 'then', 'also', 'very', 'too', 'all', 'any', 'some', 'more', 'other', 'into', 'out',
      'up', 'down', 'from', 'what', 'which', 'who', 'when', 'where', 'how', 'why', 'there', 'here']);

    const words = allText.join(' ').toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
    const freq = {};
    for (const w of words) freq[w] = (freq[w] || 0) + 1;

    const sorted = Object.entries(freq).filter(([, c]) => c >= wordFreqMinFreq).sort((a, b) => b[1] - a[1]).slice(0, 50);
    const maxFreq = sorted[0]?.[1] || 1;

    cloudEl.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:8px;padding:16px;">
        ${sorted.map(([word, count]) => {
          const size = 12 + Math.round((count / maxFreq) * 24);
          const opacity = 0.4 + (count / maxFreq) * 0.6;
          return `<span style="font-size:${size}px;opacity:${opacity};cursor:default;" title="${count} occurrences">${word}</span>`;
        }).join('')}
      </div>
    `;
  }

  function renderThemeFrequency(el, themes, codings) {
    if (!themes || themes.length === 0) {
      el.innerHTML = '<p style="color:var(--text-muted)">No themes defined yet.</p>';
      return;
    }

    const data = themes.map(t => ({
      name: t.name,
      color: t.color,
      count: getThemeSegments(t, codings).length
    })).sort((a, b) => b.count - a.count);

    if (window.Chart) {
      el.innerHTML = '<canvas id="theme-freq-chart" width="800" height="400"></canvas>';
      chartInstance = new Chart(document.getElementById('theme-freq-chart').getContext('2d'), {
        type: 'bar',
        data: {
          labels: data.map(d => d.name),
          datasets: [{
            label: 'Segment Count',
            data: data.map(d => d.count),
            backgroundColor: data.map(d => d.color)
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      });
    } else {
      const maxCount = Math.max(1, ...data.map(d => d.count));
      el.innerHTML = data.map(d => {
        const pct = d.count / maxCount * 100;
        return `<div style="margin-bottom:6px;display:flex;align-items:center;gap:8px;">
          <span style="width:160px;font-size:13px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(d.name)}</span>
          <div style="flex:1;background:var(--bg-secondary);border-radius:4px;height:20px;">
            <div style="width:${pct}%;background:${d.color};height:100%;border-radius:4px;"></div>
          </div>
          <span style="font-size:12px;color:var(--text-muted);width:30px;">${d.count}</span>
        </div>`;
      }).join('');
    }
  }

  function renderThemeHeatmap(el, themes, codings, sources) {
    if (!themes || themes.length === 0 || sources.length === 0) {
      el.innerHTML = '<p style="color:var(--text-muted)">Need themes and documents.</p>';
      return;
    }

    const matrix = {};
    for (const theme of themes) {
      matrix[theme.id] = {};
      const segs = getThemeSegments(theme, codings);
      for (const src of sources) {
        matrix[theme.id][src.id] = segs.filter(s => s.sourceId === src.id).length;
      }
    }
    const maxVal = Math.max(1, ...themes.flatMap(t => sources.map(s => matrix[t.id][s.id])));

    el.innerHTML = `
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Theme</th>
              ${sources.map(s => `<th style="font-size:11px;writing-mode:vertical-rl;text-orientation:mixed;height:100px;">${escapeHtml(s.title)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${themes.map(t => `
              <tr>
                <td style="white-space:nowrap;">
                  <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${t.color};"></span>
                  ${escapeHtml(t.name)}
                </td>
                ${sources.map(s => {
                  const val = matrix[t.id][s.id];
                  const intensity = val / maxVal;
                  const bg = `rgba(37,99,235,${intensity * 0.8})`;
                  const textColor = intensity > 0.5 ? 'white' : 'var(--text)';
                  return `<td class="heatmap-cell" style="background:${bg};color:${textColor};">${val || ''}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderThemeSummary(el, themes, codings, codes, sources) {
    if (!themes || themes.length === 0) {
      el.innerHTML = '<p style="color:var(--text-muted)">No themes defined yet.</p>';
      return;
    }

    el.innerHTML = themes.map(theme => {
      const segs = getThemeSegments(theme, codings);
      const docsSet = new Set(segs.map(s => s.sourceId));
      const themeCodes = codes.filter(c => theme.codeIds.includes(c.id));
      const codeSegCounts = {};
      for (const seg of segs) {
        codeSegCounts[seg.codeId] = (codeSegCounts[seg.codeId] || 0) + 1;
      }
      const sortedCodes = themeCodes.sort((a, b) => (codeSegCounts[b.id] || 0) - (codeSegCounts[a.id] || 0));

      return `
        <div style="border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:16px;border-left:4px solid ${theme.color};">
          <h3 style="margin-bottom:4px;">${escapeHtml(theme.name)}</h3>
          ${theme.description ? `<p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">${escapeHtml(theme.description)}</p>` : ''}
          <div style="display:flex;gap:20px;font-size:13px;color:var(--text-muted);margin-bottom:8px;">
            <span><strong>${segs.length}</strong> segments</span>
            <span><strong>${docsSet.size}</strong> documents</span>
            <span><strong>${themeCodes.length}</strong> codes</span>
          </div>
          <div style="font-size:12px;">
            <strong style="color:var(--text-secondary);">Codes by frequency:</strong>
            ${sortedCodes.map(c => `
              <span style="display:inline-flex;align-items:center;gap:3px;margin:2px 6px 2px 0;">
                <span class="code-color" style="background:${c.color}"></span>
                ${escapeHtml(c.name)} (${codeSegCounts[c.id] || 0})
              </span>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  state.subscribe('ui.activeTab', (tab) => {
    if (tab === 'visualizations') render();
  });

  render();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

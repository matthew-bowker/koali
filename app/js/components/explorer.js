import { countSegmentsByCode } from '../models/coding.js';

export function initExplorer(state) {
  const codeListEl = document.getElementById('explorer-code-list');
  const filterEl = document.getElementById('explorer-code-filter');
  const contentEl = document.getElementById('explorer-content');
  const toolbarEl = document.getElementById('explorer-toolbar');
  const selectedCodeIds = new Set();
  let sortBy = 'source';

  // ── Toolbar ──
  toolbarEl.innerHTML = `
    <label style="font-size:12px;color:var(--text-muted);">Sort by:</label>
    <select class="explorer-sort-select">
      <option value="source">Source</option>
      <option value="date">Date created</option>
      <option value="code">Code</option>
    </select>
  `;

  const sortSelect = toolbarEl.querySelector('.explorer-sort-select');
  sortSelect.addEventListener('change', () => {
    sortBy = sortSelect.value;
    renderContent();
  });

  // ── Code List ──
  function renderCodeList() {
    const codes = (state.get('codebook.codes') || []).filter(c => !c.deleted);
    const counts = countSegmentsByCode(state.get('codings') || {});
    const filter = (filterEl.value || '').trim().toLowerCase();

    codeListEl.innerHTML = '';
    for (const code of codes) {
      if (filter && !code.name.toLowerCase().includes(filter)) continue;
      const count = counts[code.id] || 0;

      const item = document.createElement('div');
      item.className = 'explorer-code-item' + (selectedCodeIds.has(code.id) ? ' selected' : '');
      item.innerHTML = `
        <span class="code-color" style="background:${code.color || '#999'}"></span>
        <span class="code-name">${code.name}</span>
        <span class="code-count">${count}</span>
      `;
      item.addEventListener('click', () => {
        if (selectedCodeIds.has(code.id)) {
          selectedCodeIds.delete(code.id);
        } else {
          selectedCodeIds.add(code.id);
        }
        renderCodeList();
        renderContent();
      });
      codeListEl.appendChild(item);
    }

    if (codes.length === 0) {
      codeListEl.innerHTML = '<div class="empty-state" style="padding:16px;font-size:13px;">No codes yet.</div>';
    }
  }

  // ── Content (segments for selected codes) ──
  function renderContent() {
    if (selectedCodeIds.size === 0) {
      contentEl.innerHTML = '<div class="empty-state">Select one or more codes from the left to explore segments.</div>';
      return;
    }

    const codes = (state.get('codebook.codes') || []).filter(c => !c.deleted);
    const codeMap = {};
    for (const c of codes) codeMap[c.id] = c;

    const allCodings = state.get('codings') || {};
    const sources = state.get('sources.manifest') || [];
    const sourceMap = {};
    for (const s of sources) sourceMap[s.id] = s;

    // Collect matching segments
    const segments = [];
    for (const [sourceId, coding] of Object.entries(allCodings)) {
      for (const seg of (coding.segments || [])) {
        if (selectedCodeIds.has(seg.codeId)) {
          segments.push({ ...seg, sourceId, sourceName: sourceMap[sourceId]?.name || sourceId });
        }
      }
    }

    // Sort
    if (sortBy === 'date') {
      segments.sort((a, b) => (b.created || 0) - (a.created || 0));
    } else if (sortBy === 'code') {
      segments.sort((a, b) => (codeMap[a.codeId]?.name || '').localeCompare(codeMap[b.codeId]?.name || ''));
    } else {
      segments.sort((a, b) => a.sourceName.localeCompare(b.sourceName) || (a.start?.offset || 0) - (b.start?.offset || 0));
    }

    if (segments.length === 0) {
      contentEl.innerHTML = '<div class="empty-state">No segments found for the selected codes.</div>';
      return;
    }

    contentEl.innerHTML = '';
    for (const seg of segments) {
      const code = codeMap[seg.codeId];
      const card = document.createElement('div');
      card.className = 'explorer-segment-card';
      card.innerHTML = `
        <div class="explorer-segment-meta">
          <span class="explorer-segment-source">${seg.sourceName}</span>
          ${seg.speaker ? `<span class="explorer-segment-speaker">${seg.speaker}</span>` : ''}
        </div>
        <div class="explorer-segment-text">${escapeHtml(seg.text || '')}</div>
        <div>
          <span class="explorer-segment-code-chip" style="background:${code?.color || '#999'}20;color:${code?.color || '#999'};border:1px solid ${code?.color || '#999'}40;">
            ${code?.name || 'Unknown'}
          </span>
        </div>
      `;
      contentEl.appendChild(card);
    }
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ── Event Bindings ──
  filterEl.addEventListener('input', renderCodeList);

  state.subscribe('codebook.codes', renderCodeList);
  state.subscribe('codings', () => {
    renderCodeList();
    renderContent();
  });

  // Initial render
  renderCodeList();
}

// Explorer module version — kept in sync with koali.js bundled version.
// The app loads koali.js directly; this file exists for the ES module build path.
import { countSegmentsByCode } from '../models/coding.js';
import { createTheme } from '../models/theme.js';

export function initExplorer(state) {
  const codeListEl = document.getElementById('explorer-code-list');
  const filterEl = document.getElementById('explorer-code-filter');
  const contentEl = document.getElementById('explorer-content');
  const toolbarEl = document.getElementById('explorer-toolbar');
  const selectedCodeIds = new Set();
  let sortBy = 'source';
  let mode = 'browse';

  function renderToolbar() {
    toolbarEl.innerHTML = `
      <button class="mode-btn ${mode === 'browse' ? 'active' : ''}" data-mode="browse">Browse</button>
      <button class="mode-btn ${mode === 'group' ? 'active' : ''}" data-mode="group">Group into Themes</button>
      <div class="explorer-sep"></div>
      <label style="font-size:12px;color:var(--text-muted);">Sort:</label>
      <select class="explorer-sort-select">
        <option value="source" ${sortBy === 'source' ? 'selected' : ''}>Source</option>
        <option value="date" ${sortBy === 'date' ? 'selected' : ''}>Date</option>
        <option value="code" ${sortBy === 'code' ? 'selected' : ''}>Code</option>
      </select>
    `;
    toolbarEl.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        mode = btn.dataset.mode;
        renderToolbar();
        renderCodeList();
        renderContent();
      });
    });
    toolbarEl.querySelector('.explorer-sort-select').addEventListener('change', (e) => {
      sortBy = e.target.value;
      renderContent();
    });
  }

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
      if (mode === 'group') {
        item.draggable = true;
        item.dataset.codeId = code.id;
      }
      item.innerHTML = `
        <span class="code-color" style="background:${code.color || '#999'}"></span>
        <span class="code-name">${code.name}</span>
        <span class="code-count">${count}</span>
      `;
      item.addEventListener('click', () => {
        if (mode === 'browse') {
          if (selectedCodeIds.has(code.id)) {
            selectedCodeIds.delete(code.id);
          } else {
            selectedCodeIds.add(code.id);
          }
          renderCodeList();
          renderContent();
        }
      });
      if (mode === 'group') {
        item.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', code.id);
        });
      }
      codeListEl.appendChild(item);
    }

    if (codes.length === 0) {
      codeListEl.innerHTML = '<div class="empty-state" style="padding:16px;font-size:13px;">No codes yet.</div>';
    }
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function getSegments() {
    const codes = (state.get('codebook.codes') || []).filter(c => !c.deleted);
    const codeMap = {};
    for (const c of codes) codeMap[c.id] = c;

    const allCodings = state.get('codings') || {};
    const sources = state.get('sources.manifest') || [];
    const sourceMap = {};
    for (const s of sources) sourceMap[s.id] = s;

    const segments = [];
    for (const [sourceId, coding] of Object.entries(allCodings)) {
      for (const seg of (coding.segments || [])) {
        if (selectedCodeIds.has(seg.codeId)) {
          const src = sourceMap[sourceId];
          segments.push({ ...seg, sourceId, sourceName: src?.title || src?.originalName || src?.filename || sourceId });
        }
      }
    }

    if (sortBy === 'date') {
      segments.sort((a, b) => (b.created || 0) - (a.created || 0));
    } else if (sortBy === 'code') {
      segments.sort((a, b) => (codeMap[a.codeId]?.name || '').localeCompare(codeMap[b.codeId]?.name || ''));
    } else {
      segments.sort((a, b) => a.sourceName.localeCompare(b.sourceName) || (a.start?.offset || 0) - (b.start?.offset || 0));
    }
    return { segments, codeMap };
  }

  function renderBrowse() {
    if (selectedCodeIds.size === 0) {
      contentEl.innerHTML = '<div class="empty-state">Select one or more codes from the left to explore segments.</div>';
      return;
    }
    const { segments, codeMap } = getSegments();
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
          <span class="explorer-segment-source">${escapeHtml(seg.sourceName)}</span>
          ${seg.speaker ? `<span class="explorer-segment-speaker">${escapeHtml(seg.speaker)}</span>` : ''}
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

  function renderGroup() {
    const codes = (state.get('codebook.codes') || []).filter(c => !c.deleted);
    const codeMap = {};
    for (const c of codes) codeMap[c.id] = c;
    const existingThemes = (state.get('themes.themes') || []).filter(t => !t.deleted);

    contentEl.innerHTML = '';
    for (const theme of existingThemes) {
      contentEl.appendChild(renderGroupZone(theme, codeMap));
    }

    const newZone = document.createElement('div');
    newZone.className = 'explorer-group-zone';
    newZone.innerHTML = '<span class="explorer-group-zone-label">Drop codes here to create a new theme...</span>';
    newZone.addEventListener('dragover', (e) => { e.preventDefault(); newZone.classList.add('drag-over'); });
    newZone.addEventListener('dragleave', () => newZone.classList.remove('drag-over'));
    newZone.addEventListener('drop', (e) => {
      e.preventDefault();
      newZone.classList.remove('drag-over');
      const codeId = e.dataTransfer.getData('text/plain');
      if (!codeId || !codeMap[codeId]) return;
      const name = prompt('Theme name:');
      if (!name) return;
      const theme = createTheme(name, '', null, [codeId], state.get('user.id'));
      const themes = [...(state.get('themes.themes') || []), theme];
      state.set('themes.themes', themes);
      renderContent();
    });
    contentEl.appendChild(newZone);

    const stats = document.createElement('div');
    stats.className = 'explorer-stats';
    const assignedCount = new Set(existingThemes.flatMap(t => t.codeIds)).size;
    stats.textContent = `${existingThemes.length} themes \u00B7 ${assignedCount} of ${codes.length} codes assigned`;
    contentEl.appendChild(stats);
  }

  function renderGroupZone(theme, codeMap) {
    const zone = document.createElement('div');
    zone.className = 'explorer-group-zone';
    zone.style.borderColor = theme.color || 'var(--border)';

    const header = document.createElement('div');
    header.style.cssText = 'width:100%;display:flex;align-items:center;gap:6px;margin-bottom:4px;';
    header.innerHTML = `<span style="width:10px;height:10px;border-radius:3px;background:${theme.color || '#999'};flex-shrink:0;"></span>
      <strong style="font-size:13px;">${escapeHtml(theme.name)}</strong>`;
    zone.appendChild(header);

    for (const codeId of (theme.codeIds || [])) {
      const code = codeMap[codeId];
      if (!code) continue;
      const chip = document.createElement('span');
      chip.className = 'explorer-group-chip';
      chip.innerHTML = `<span class="code-color" style="background:${code.color || '#999'};width:8px;height:8px;border-radius:2px;"></span>
        ${escapeHtml(code.name)}
        <span class="remove" title="Remove from theme">\u00D7</span>`;
      chip.querySelector('.remove').addEventListener('click', () => {
        const themes = state.get('themes.themes') || [];
        const t = themes.find(th => th.id === theme.id);
        if (t) {
          t.codeIds = t.codeIds.filter(id => id !== codeId);
          t.modified = new Date().toISOString();
          state.set('themes.themes', [...themes]);
          renderContent();
        }
      });
      zone.appendChild(chip);
    }

    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const codeId = e.dataTransfer.getData('text/plain');
      if (!codeId) return;
      const themes = state.get('themes.themes') || [];
      const t = themes.find(th => th.id === theme.id);
      if (t && !t.codeIds.includes(codeId)) {
        t.codeIds.push(codeId);
        t.modified = new Date().toISOString();
        state.set('themes.themes', [...themes]);
        renderContent();
      }
    });
    return zone;
  }

  function renderContent() {
    if (mode === 'group') {
      renderGroup();
    } else {
      renderBrowse();
    }
  }

  filterEl.addEventListener('input', renderCodeList);
  state.subscribe('codebook.codes', () => { renderCodeList(); renderContent(); });
  state.subscribe('codings', () => { renderCodeList(); renderContent(); });
  state.subscribe('themes.themes', () => { if (mode === 'group') renderContent(); });
  renderToolbar();
  renderCodeList();
}

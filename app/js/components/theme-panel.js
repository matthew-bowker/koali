import { createTheme, updateTheme, deleteTheme, addCodesToTheme, removeCodesFromTheme, getThemeSegments, getThemesForCode } from '../models/theme.js';

export function initThemePanel(state, storage) {
  const container = document.getElementById('themes-panel');
  if (!container) return;
  const expandedThemes = new Set();

  function render() {
    const themes = (state.get('themes.themes') || []).filter(t => !t.deleted);
    const codes = (state.get('codebook.codes') || []).filter(c => !c.deleted);
    const codings = state.get('codings') || {};
    const sources = state.get('sources.manifest') || [];
    const sourceMap = {};
    for (const s of sources) sourceMap[s.id] = s;

    container.innerHTML = `
      <div class="themes-toolbar">
        <button id="btn-new-theme" class="btn btn-small btn-primary">+ New Theme</button>
      </div>
      <div class="themes-list">
        ${themes.length === 0 ? '<div class="empty-state" style="height:80px;font-size:13px;">No themes yet. Create a theme to group codes into higher-order patterns.</div>' : ''}
        ${themes.map(theme => {
          const segments = getThemeSegments(theme, codings);
          const themeCodes = codes.filter(c => theme.codeIds.includes(c.id));
          const isExpanded = expandedThemes.has(theme.id);
          const codeMap = {};
          for (const c of themeCodes) codeMap[c.id] = c;

          // Group segments by code for expanded view
          let segmentsHTML = '';
          if (isExpanded && segments.length > 0) {
            const groupedByCode = {};
            for (const seg of segments) {
              if (!groupedByCode[seg.codeId]) groupedByCode[seg.codeId] = [];
              groupedByCode[seg.codeId].push(seg);
            }
            segmentsHTML = Object.entries(groupedByCode).map(([codeId, segs]) => {
              const code = codeMap[codeId];
              if (!code) return '';
              return `
                <div class="theme-segment-group" style="border-left-color:${code.color}">
                  <div class="theme-segment-group-header">
                    <span class="code-color" style="background:${code.color}"></span>
                    ${escapeHtml(code.name)} <span class="theme-segment-count">(${segs.length})</span>
                  </div>
                  ${segs.map(seg => {
                    const src = sourceMap[seg.sourceId];
                    const text = (seg.text || '').slice(0, 150) + ((seg.text || '').length > 150 ? '...' : '');
                    return `
                      <div class="theme-segment-item" data-source-id="${seg.sourceId}" data-code-id="${seg.codeId}">
                        <div class="theme-segment-text">&ldquo;${escapeHtml(text)}&rdquo;</div>
                        <div class="theme-segment-meta">
                          ${seg.speaker ? `<span class="theme-segment-speaker">${escapeHtml(seg.speaker)}</span> &middot; ` : ''}
                          <span class="theme-segment-source">${escapeHtml(src?.title || 'Unknown source')}</span>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `;
            }).join('');
          }

          return `
            <div class="theme-card${isExpanded ? ' expanded' : ''}" data-theme-id="${theme.id}">
              <div class="theme-card-header">
                <span class="theme-color-swatch" style="background:${theme.color}"></span>
                <span class="theme-name">${escapeHtml(theme.name)}</span>
                <span class="theme-stats">${themeCodes.length} codes &middot; ${segments.length} segments</span>
                ${segments.length > 0 ? `<button class="theme-expand-btn" data-theme-id="${theme.id}" title="${isExpanded ? 'Collapse' : 'Explore segments'}">${isExpanded ? '&#9650;' : '&#9660;'}</button>` : ''}
              </div>
              ${theme.description ? `<div class="theme-description">${escapeHtml(theme.description)}</div>` : ''}
              <div class="theme-codes-list">
                ${themeCodes.map(c => `
                  <span class="theme-code-chip" data-code-id="${c.id}">
                    <span class="code-color" style="background:${c.color}"></span>
                    ${escapeHtml(c.name)}
                    <span class="theme-code-remove" data-theme-id="${theme.id}" data-code-id="${c.id}" title="Remove from theme">&times;</span>
                  </span>
                `).join('')}
                <button class="theme-add-code-btn btn btn-small" data-theme-id="${theme.id}">+ Add Code</button>
              </div>
              ${isExpanded ? `<div class="theme-segments">${segmentsHTML}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    // New theme button
    container.querySelector('#btn-new-theme')?.addEventListener('click', () => showThemeDialog());

    // Theme card context menus
    container.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showThemeContextMenu(e, card.dataset.themeId);
      });
    });

    // Add code buttons
    container.querySelectorAll('.theme-add-code-btn').forEach(btn => {
      btn.addEventListener('click', () => showAddCodeDialog(btn.dataset.themeId));
    });

    // Remove code buttons
    container.querySelectorAll('.theme-code-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.pushUndo();
        const themes = removeCodesFromTheme(
          state.get('themes.themes'),
          btn.dataset.themeId,
          [btn.dataset.codeId],
          state.get('user.id')
        );
        state.set('themes.themes', themes);
      });
    });

    // Drag-drop support: allow dropping codes onto theme cards
    container.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        card.classList.add('drag-over');
      });
      card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-over');
        const codeId = e.dataTransfer.getData('text/plain');
        if (codeId) {
          state.pushUndo();
          const themes = addCodesToTheme(
            state.get('themes.themes'),
            card.dataset.themeId,
            [codeId],
            state.get('user.id')
          );
          state.set('themes.themes', themes);
        }
      });
    });

    // Expand/collapse buttons
    container.querySelectorAll('.theme-expand-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.themeId;
        if (expandedThemes.has(id)) {
          expandedThemes.delete(id);
        } else {
          expandedThemes.add(id);
        }
        render();
      });
    });

    // Segment click → navigate to source and code
    container.querySelectorAll('.theme-segment-item').forEach(item => {
      item.addEventListener('click', () => {
        const sourceId = item.dataset.sourceId;
        const codeId = item.dataset.codeId;
        // Switch to coding tab and open source
        document.querySelector('[data-tab="coding"]')?.click();
        state.set('sources.activeSourceId', sourceId, { trackDirty: false });
        state.set('ui.activeCodeId', codeId, { trackDirty: false });
      });
    });
  }

  function showThemeDialog(existingTheme = null) {
    const codes = (state.get('codebook.codes') || []).filter(c => !c.deleted);
    const isEdit = !!existingTheme;
    const selectedCodeIds = new Set(existingTheme?.codeIds || []);

    const modal = document.getElementById('modal-content');
    modal.innerHTML = `
      <div class="modal-header">
        <h2>${isEdit ? 'Edit Theme' : 'New Theme'}</h2>
        <button class="modal-close" id="theme-modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Theme Name</label>
          <input type="text" id="theme-name-input" value="${escapeHtml(existingTheme?.name || '')}" placeholder="e.g., Systemic Barriers" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="theme-desc-input" rows="3" placeholder="Describe the pattern this theme represents...">${escapeHtml(existingTheme?.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Color</label>
          <div class="color-picker-grid" id="theme-color-picker">
            ${['#8B5CF6','#EC4899','#14B8A6','#F59E0B','#6366F1','#EF4444','#10B981','#3B82F6','#F97316','#84CC16','#E63946','#457B9D','#2A9D8F','#E9C46A','#264653','#6A4C93'].map(c => `
              <span class="color-swatch${c === (existingTheme?.color || '#8B5CF6') ? ' selected' : ''}" data-color="${c}" style="background:${c}"></span>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Associated Codes</label>
          <div class="theme-code-selector" id="theme-code-selector">
            ${codes.map(c => `
              <label class="theme-code-option">
                <input type="checkbox" value="${c.id}" ${selectedCodeIds.has(c.id) ? 'checked' : ''} />
                <span class="code-color" style="background:${c.color}"></span>
                ${escapeHtml(c.name)}
              </label>
            `).join('')}
            ${codes.length === 0 ? '<div style="color:var(--text-muted);font-size:13px;">No codes created yet.</div>' : ''}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="theme-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="theme-save-btn">${isEdit ? 'Save Changes' : 'Create Theme'}</button>
      </div>
    `;

    state.set('ui.modal', 'theme-editor', { trackDirty: false });

    let selectedColor = existingTheme?.color || '#8B5CF6';

    modal.querySelectorAll('.color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        modal.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        selectedColor = sw.dataset.color;
      });
    });

    modal.querySelector('#theme-modal-close').addEventListener('click', () => {
      state.set('ui.modal', null, { trackDirty: false });
    });

    modal.querySelector('#theme-cancel-btn').addEventListener('click', () => {
      state.set('ui.modal', null, { trackDirty: false });
    });

    modal.querySelector('#theme-save-btn').addEventListener('click', () => {
      const name = modal.querySelector('#theme-name-input').value.trim();
      if (!name) { alert('Please enter a theme name.'); return; }
      const description = modal.querySelector('#theme-desc-input').value.trim();
      const checkedCodes = [...modal.querySelectorAll('#theme-code-selector input:checked')].map(cb => cb.value);

      state.pushUndo();

      if (isEdit) {
        const themes = updateTheme(state.get('themes.themes'), existingTheme.id, {
          name, description, color: selectedColor, codeIds: checkedCodes
        }, state.get('user.id'));
        state.set('themes.themes', themes);
      } else {
        const theme = createTheme(name, description, selectedColor, checkedCodes, state.get('user.id'));
        const themes = [...(state.get('themes.themes') || []), theme];
        state.set('themes.themes', themes);
      }

      state.set('ui.modal', null, { trackDirty: false });
    });
  }

  function showAddCodeDialog(themeId) {
    const themes = state.get('themes.themes') || [];
    const theme = themes.find(t => t.id === themeId);
    if (!theme) return;

    const codes = (state.get('codebook.codes') || []).filter(c => !c.deleted && !theme.codeIds.includes(c.id));
    if (codes.length === 0) { alert('All codes are already in this theme.'); return; }

    const name = prompt('Add code to theme. Enter code name:\n' + codes.map(c => `  - ${c.name}`).join('\n'));
    if (!name) return;
    const code = codes.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!code) { alert('Code not found.'); return; }

    state.pushUndo();
    const updated = addCodesToTheme(themes, themeId, [code.id], state.get('user.id'));
    state.set('themes.themes', updated);
  }

  function showThemeContextMenu(e, themeId) {
    const menu = document.getElementById('context-menu');
    menu.innerHTML = `
      <div class="context-menu-item" data-action="edit">Edit Theme</div>
      <div class="context-menu-sep"></div>
      <div class="context-menu-item danger" data-action="delete">Delete Theme</div>
    `;
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.classList.remove('hidden');

    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        menu.classList.add('hidden');
        const themes = state.get('themes.themes') || [];
        const theme = themes.find(t => t.id === themeId);
        if (!theme) return;

        if (item.dataset.action === 'edit') {
          showThemeDialog(theme);
        } else if (item.dataset.action === 'delete') {
          if (!confirm(`Delete theme "${theme.name}"? This will not delete the associated codes.`)) return;
          state.pushUndo();
          state.set('themes.themes', deleteTheme(themes, themeId));
        }
      }, { once: true });
    });
  }

  // Subscribe to state changes
  state.subscribe('themes', render);
  state.subscribe('codebook.codes', render);
  state.subscribe('codings', render);

  render();
}

/**
 * Render theme badges on a code node (called from code-panel).
 */
export function getThemeBadgesForCode(themes, codeId) {
  return getThemesForCode(themes || [], codeId);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

import { createCode, addCodeToList, updateCode, deleteCode, moveCode, mergeCodes, codesToTree, codesToCSV } from '../models/codebook.js';
import { createSegment, removeSegment, countSegmentsByCode, remapCode } from '../models/coding.js';
import { getThemesForCode } from '../models/theme.js';
import { printCodebookPDF } from '../utils/export.js';

export function initCodePanel(state, storage) {
  const treeEl = document.getElementById('code-tree');
  const searchEl = document.getElementById('code-search');
  const btnNewCode = document.getElementById('btn-new-code');
  const selectionCtx = document.getElementById('selection-context');
  const selectionText = document.getElementById('selection-text');
  const quickSearch = document.getElementById('quick-code-search');
  const quickList = document.getElementById('quick-code-list');
  const expandedNodes = new Set();

  // ── Render Code Tree ──
  function renderTree() {
    const codes = state.get('codebook.codes') || [];
    const filter = searchEl.value.trim().toLowerCase();
    const tree = codesToTree(codes);
    const counts = countSegmentsByCode(state.get('codings') || {});
    const activeCodeId = state.get('ui.activeCodeId');

    treeEl.innerHTML = '';
    for (const node of tree) {
      if (filter && !matchesFilter(node, filter)) continue;
      treeEl.appendChild(renderNode(node, 0, counts, activeCodeId, filter));
    }

    if (tree.length === 0) {
      treeEl.innerHTML = '<div class="empty-state" style="height:80px;font-size:13px;">No codes yet. Click + New Code to start.</div>';
    }
  }

  function matchesFilter(node, filter) {
    if (node.name.toLowerCase().includes(filter)) return true;
    return (node.childNodes || []).some(child => matchesFilter(child, filter));
  }

  function renderNode(node, depth, counts, activeCodeId, filter) {
    if (filter && !matchesFilter(node, filter)) return document.createDocumentFragment();

    const div = document.createElement('div');
    div.className = 'code-node';
    div.dataset.codeId = node.id;

    const row = document.createElement('div');
    row.className = 'code-node-row' + (node.id === activeCodeId ? ' active' : '');
    row.style.paddingLeft = (8 + depth * 16) + 'px';

    const hasChildren = node.childNodes && node.childNodes.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    // Expander
    const expander = document.createElement('span');
    expander.className = 'code-expander';
    expander.textContent = hasChildren ? (isExpanded ? '\u25BC' : '\u25B6') : '';
    expander.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isExpanded) expandedNodes.delete(node.id);
      else expandedNodes.add(node.id);
      renderTree();
    });

    // Color dot
    const colorDot = document.createElement('span');
    colorDot.className = 'code-color';
    colorDot.style.backgroundColor = node.color || '#999';

    // Name
    const name = document.createElement('span');
    name.className = 'code-name';
    name.textContent = node.name;

    // Count
    const count = document.createElement('span');
    count.className = 'code-count';
    count.textContent = counts[node.id] || 0;

    // Theme badges
    const themes = getThemesForCode(state.get('themes.themes') || [], node.id);
    const themeBadges = document.createElement('span');
    themeBadges.className = 'code-theme-badges';
    for (const theme of themes) {
      const badge = document.createElement('span');
      badge.className = 'code-theme-badge';
      badge.style.backgroundColor = theme.color + '30';
      badge.style.color = theme.color;
      badge.textContent = theme.name.length > 8 ? theme.name.slice(0, 8) + '\u2026' : theme.name;
      badge.title = theme.name;
      themeBadges.appendChild(badge);
    }

    row.appendChild(expander);
    row.appendChild(colorDot);
    row.appendChild(name);
    row.appendChild(themeBadges);
    row.appendChild(count);

    // Click to select / apply
    row.addEventListener('click', () => {
      const sel = state.get('ui.selectedText');
      if (sel) {
        applyCode(node.id);
      } else {
        state.set('ui.activeCodeId', node.id, { trackDirty: false });
        renderTree();
      }
    });

    // Double-click to edit
    row.addEventListener('dblclick', () => editCodeDialog(node.id));

    // Context menu
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showCodeContextMenu(e, node.id);
    });

    // Drag & drop
    row.draggable = true;
    row.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', node.id);
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => row.classList.remove('dragging'));
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.classList.remove('drag-over');
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId && draggedId !== node.id) {
        state.pushUndo();
        const codes = moveCode(state.get('codebook.codes'), draggedId, node.id);
        state.set('codebook.codes', codes);
      }
    });

    div.appendChild(row);

    // Children
    if (hasChildren) {
      const childContainer = document.createElement('div');
      childContainer.className = 'code-children' + (isExpanded ? '' : ' collapsed');
      for (const child of node.childNodes) {
        childContainer.appendChild(renderNode(child, depth + 1, counts, activeCodeId, filter));
      }
      div.appendChild(childContainer);
    }

    return div;
  }

  // ── Apply Code ──
  function applyCode(codeId) {
    const sel = state.get('ui.selectedText');
    if (!sel) return;

    state.pushUndo();
    const segment = createSegment(codeId, sel.start, sel.end, sel.text, state.get('user.id'), sel.speaker);
    const coding = state.get(`codings.${sel.sourceId}`) || { sourceId: sel.sourceId, version: 0, segments: [] };
    coding.segments = [...coding.segments, segment];
    coding.version++;
    coding.modified = new Date().toISOString();
    state.set(`codings.${sel.sourceId}`, { ...coding });

    // Clear selection
    window.getSelection()?.removeAllRanges();
    state.set('ui.selectedText', null, { trackDirty: false });
  }

  // Listen for apply-code events from keyboard shortcuts
  window.addEventListener('koali-apply-code', (e) => {
    applyCode(e.detail.codeId);
  });

  // ── Selection Add Note ──
  document.getElementById('selection-add-note').addEventListener('click', () => {
    const sel = state.get('ui.selectedText');
    if (!sel) return;
    window.dispatchEvent(new CustomEvent('koali-new-note', {
      detail: { sourceId: sel.sourceId, segmentText: sel.text }
    }));
  });

  // ── Selection Context ──
  state.subscribe('ui.selectedText', (sel) => {
    if (sel) {
      selectionCtx.classList.remove('hidden');
      selectionText.textContent = sel.text.length > 200 ? sel.text.slice(0, 200) + '...' : sel.text;
      renderQuickCodeList('');
    } else {
      selectionCtx.classList.add('hidden');
      quickSearch.value = '';
    }
  });

  let quickSelectedIndex = -1;

  quickSearch.addEventListener('input', () => {
    quickSelectedIndex = -1;
    renderQuickCodeList(quickSearch.value.trim().toLowerCase());
  });

  quickSearch.addEventListener('keydown', (e) => {
    const items = quickList.querySelectorAll('.quick-code-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      quickSelectedIndex = Math.min(quickSelectedIndex + 1, items.length - 1);
      updateQuickSelection(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      quickSelectedIndex = Math.max(quickSelectedIndex - 1, 0);
      updateQuickSelection(items);
    } else if (e.key === 'Enter' && quickSelectedIndex >= 0 && items[quickSelectedIndex]) {
      e.preventDefault();
      applyCode(items[quickSelectedIndex].dataset.codeId);
    }
  });

  function updateQuickSelection(items) {
    items.forEach((el, i) => el.classList.toggle('quick-code-selected', i === quickSelectedIndex));
  }

  function renderQuickCodeList(filter) {
    const codes = (state.get('codebook.codes') || []).filter(c => !c.deleted);
    const codings = state.get('codings') || {};

    // Sort by usage frequency
    const usageCounts = {};
    for (const coding of Object.values(codings)) {
      for (const seg of (coding.segments || [])) {
        usageCounts[seg.codeId] = (usageCounts[seg.codeId] || 0) + 1;
      }
    }

    let filtered = filter ? codes.filter(c => c.name.toLowerCase().includes(filter)) : codes;
    filtered = filtered.sort((a, b) => (usageCounts[b.id] || 0) - (usageCounts[a.id] || 0));

    quickList.innerHTML = filtered.slice(0, 15).map(c => `
      <div class="quick-code-item" data-code-id="${c.id}">
        <span class="code-color" style="background:${c.color}"></span>
        <span>${escapeHtml(c.name)}</span>
        <span style="font-size:10px;color:var(--text-muted);margin-left:auto;">${usageCounts[c.id] || 0}</span>
      </div>
    `).join('');

    quickList.querySelectorAll('.quick-code-item').forEach(el => {
      el.addEventListener('click', () => applyCode(el.dataset.codeId));
    });
  }

  // ── New Code ──
  btnNewCode.addEventListener('click', () => newCodeDialog());
  window.addEventListener('koali-new-code', () => newCodeDialog());

  const DESCRIPTION_TEMPLATES = {
    'none': '',
    'inductive': 'Definition:\n\nWhen to use:\n\nWhen not to use:\n\nExample:',
    'deductive': 'Theoretical basis:\n\nDefinition:\n\nIndicators:\n\nExample:',
    'in-vivo': 'Participant quote:\n\nMeaning in context:\n\nRelated concepts:'
  };

  function showCodeFormDialog(options = {}) {
    const { title, nameVal, descVal, onSave } = options;
    const modal = document.getElementById('modal-content');
    modal.innerHTML = `
      <div class="modal-header"><h2>${title || 'New Code'}</h2><button class="modal-close" id="code-form-close">&times;</button></div>
      <div class="modal-body">
        <div class="form-group"><label>Code Name</label><input type="text" id="code-form-name" value="${escapeHtml(nameVal || '')}" placeholder="Enter code name" /></div>
        <div class="form-group">
          <label>Description Template</label>
          <select id="code-form-template" style="margin-bottom:6px;">
            <option value="none">None</option>
            <option value="inductive">Inductive</option>
            <option value="deductive">Deductive</option>
            <option value="in-vivo">In Vivo</option>
          </select>
        </div>
        <div class="form-group"><label>Description</label><textarea id="code-form-desc" rows="5" placeholder="Describe this code...">${escapeHtml(descVal || '')}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="code-form-cancel">Cancel</button>
        <button class="btn btn-primary" id="code-form-save">Save</button>
      </div>
    `;

    state.set('ui.modal', 'code-form', { trackDirty: false });

    const descField = modal.querySelector('#code-form-desc');
    modal.querySelector('#code-form-template').addEventListener('change', (e) => {
      const tmpl = DESCRIPTION_TEMPLATES[e.target.value];
      if (tmpl && !descField.value.trim()) descField.value = tmpl;
    });

    modal.querySelector('#code-form-close').addEventListener('click', () => state.set('ui.modal', null, { trackDirty: false }));
    modal.querySelector('#code-form-cancel').addEventListener('click', () => state.set('ui.modal', null, { trackDirty: false }));
    modal.querySelector('#code-form-save').addEventListener('click', () => {
      const name = modal.querySelector('#code-form-name').value.trim();
      if (!name) { alert('Please enter a code name.'); return; }
      const description = descField.value.trim();
      state.set('ui.modal', null, { trackDirty: false });
      onSave(name, description);
    });

    // Auto-focus name field
    setTimeout(() => modal.querySelector('#code-form-name')?.focus(), 50);
  }

  function newCodeDialog(parentId = null) {
    showCodeFormDialog({
      title: 'New Code',
      onSave: (name, description) => {
        state.pushUndo();
        const code = createCode(name, description, null, parentId, state.get('user.id'));
        const codes = addCodeToList(state.get('codebook.codes') || [], code);
        state.set('codebook.codes', codes);
        if (parentId) expandedNodes.add(parentId);
      }
    });
  }

  // ── Edit Code ──
  function editCodeDialog(codeId) {
    const codes = state.get('codebook.codes') || [];
    const code = codes.find(c => c.id === codeId);
    if (!code) return;

    showCodeFormDialog({
      title: 'Edit Code',
      nameVal: code.name,
      descVal: code.description,
      onSave: (name, description) => {
        state.pushUndo();
        const updated = updateCode(codes, codeId, { name, description }, state.get('user.id'));
        state.set('codebook.codes', updated);
      }
    });
  }

  // ── Context Menu ──
  function showCodeContextMenu(e, codeId) {
    const menu = document.getElementById('context-menu');
    menu.innerHTML = `
      <div class="context-menu-item" data-action="edit">Edit</div>
      <div class="context-menu-item" data-action="add-child">Add Child Code</div>
      <div class="context-menu-item" data-action="merge">Merge Into...</div>
      <div class="context-menu-sep"></div>
      <div class="context-menu-item" data-action="export">Export Codebook (CSV)</div>
      <div class="context-menu-item" data-action="export-pdf">Export Codebook (PDF)</div>
      <div class="context-menu-sep"></div>
      <div class="context-menu-item danger" data-action="delete">Delete</div>
    `;
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.classList.remove('hidden');

    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        menu.classList.add('hidden');
        handleCodeAction(item.dataset.action, codeId);
      }, { once: true });
    });
  }

  function handleCodeAction(action, codeId) {
    const codes = state.get('codebook.codes') || [];
    const code = codes.find(c => c.id === codeId);
    if (!code) return;

    switch (action) {
      case 'edit':
        editCodeDialog(codeId);
        break;

      case 'add-child':
        newCodeDialog(codeId);
        break;

      case 'merge': {
        const targets = codes.filter(c => c.id !== codeId && !c.deleted);
        const targetName = prompt('Merge into which code? Enter name:\n' + targets.map(c => `  - ${c.name}`).join('\n'));
        if (!targetName) return;
        const target = targets.find(c => c.name.toLowerCase() === targetName.toLowerCase());
        if (!target) { alert('Code not found.'); return; }

        state.pushUndo();
        const result = mergeCodes(codes, codeId, target.id);
        state.set('codebook.codes', result.codes);
        // Remap codings
        const codings = state.get('codings');
        for (const [srcId, coding] of Object.entries(codings)) {
          coding.segments = remapCode(coding.segments, codeId, target.id);
          state.set(`codings.${srcId}`, { ...coding });
        }
        break;
      }

      case 'delete':
        if (!confirm(`Delete code "${code.name}"? This will remove all associated coded segments.`)) return;
        state.pushUndo();
        const updated = deleteCode(codes, codeId);
        state.set('codebook.codes', updated);
        break;

      case 'export': {
        const counts = countSegmentsByCode(state.get('codings') || {});
        const csv = codesToCSV(codes, counts);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'codebook.csv';
        a.click();
        URL.revokeObjectURL(url);
        break;
      }

      case 'export-pdf': {
        const counts = countSegmentsByCode(state.get('codings') || {});
        printCodebookPDF(codes, counts);
        break;
      }
    }
  }

  // ── Search ──
  searchEl.addEventListener('input', renderTree);

  // ── Subscribe ──
  state.subscribe('codebook.codes', renderTree);
  state.subscribe('codings', renderTree);

  // Allow dropping codes to root (panel body)
  treeEl.addEventListener('dragover', (e) => e.preventDefault());
  treeEl.addEventListener('drop', (e) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && e.target === treeEl) {
      state.pushUndo();
      const codes = moveCode(state.get('codebook.codes'), draggedId, null);
      state.set('codebook.codes', codes);
    }
  });

  renderTree();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

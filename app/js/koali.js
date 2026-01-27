(function() {
"use strict";

// ── Dialog Helpers & Utilities ──

// ── Dialog Helpers & Utilities ──

// ── Dialog Helpers & Utilities ──

// ── Dialog Helpers & Utilities ──

// ── Dialog Helpers & Utilities ──

// ── Dialog Helpers & Utilities ──

// ── Dialog Helpers & Utilities ──

function uuid() {
  return crypto.randomUUID();
}

function shortId() {
  return uuid().split('-')[0];
}

// ── Modal dialog helpers (replace browser alert/confirm/prompt) ──

function _showDialog(html) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = html;
    overlay.classList.remove('hidden');

    // Prevent the global click-to-close from firing immediately
    const stopClose = (e) => e.stopPropagation();
    content.addEventListener('click', stopClose);

    function close(value) {
      content.removeEventListener('click', stopClose);
      overlay.classList.add('hidden');
      content.innerHTML = '';
      resolve(value);
    }

    // Expose close for button handlers inside the dialog
    content._dialogClose = close;
  });
}

function koaliAlert(message) {
  return _showDialog(`
    <div class="modal-header">
      <h2>Notice</h2>
    </div>
    <div class="modal-body">
      <p>${escapeHtml(message)}</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" id="_dlg-ok">OK</button>
    </div>
  `).then((v) => v).finally(() => {});
  // Wire button after DOM insert — handled below
}
// Re-define with proper wiring:
koaliAlert = function(message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = `
      <div class="modal-header"><h2>Notice</h2></div>
      <div class="modal-body"><p>${escapeHtml(message)}</p></div>
      <div class="modal-footer"><button class="btn btn-primary" id="_dlg-ok">OK</button></div>
    `;
    overlay.classList.remove('hidden');
    const close = () => { overlay.classList.add('hidden'); content.innerHTML = ''; resolve(); };
    document.getElementById('_dlg-ok').addEventListener('click', close);
  });
};

function koaliConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = `
      <div class="modal-header"><h2>Confirm</h2></div>
      <div class="modal-body"><p>${escapeHtml(message)}</p></div>
      <div class="modal-footer">
        <button class="btn" id="_dlg-cancel">Cancel</button>
        <button class="btn btn-primary" id="_dlg-ok">OK</button>
      </div>
    `;
    overlay.classList.remove('hidden');
    const close = (val) => { overlay.classList.add('hidden'); content.innerHTML = ''; resolve(val); };
    document.getElementById('_dlg-ok').addEventListener('click', () => close(true));
    document.getElementById('_dlg-cancel').addEventListener('click', () => close(false));
  });
}

function koaliPrompt(message, defaultValue) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = `
      <div class="modal-header"><h2>Input</h2></div>
      <div class="modal-body">
        <p>${escapeHtml(message)}</p>
        <input type="text" id="_dlg-input" value="${escapeAttr(defaultValue || '')}" style="margin-top:8px;" />
      </div>
      <div class="modal-footer">
        <button class="btn" id="_dlg-cancel">Cancel</button>
        <button class="btn btn-primary" id="_dlg-ok">OK</button>
      </div>
    `;
    overlay.classList.remove('hidden');
    const input = document.getElementById('_dlg-input');
    input.focus();
    input.select();
    const close = (val) => { overlay.classList.add('hidden'); content.innerHTML = ''; resolve(val); };
    document.getElementById('_dlg-ok').addEventListener('click', () => close(input.value));
    document.getElementById('_dlg-cancel').addEventListener('click', () => close(null));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') close(input.value);
      if (e.key === 'Escape') close(null);
    });
  });
}

// ── Modal helpers (replace browser alert/prompt/confirm) ──

function koaliAlert(message, title = 'Notice') {
  return new Promise(resolve => {
    const modal = document.getElementById('modal-content');
    const state = window._koaliState;
    modal.innerHTML = `
      <div class="modal-header">
        <h2>${escapeHtml(title)}</h2>
        <button class="modal-close" id="kalert-close">&times;</button>
      </div>
      <div class="modal-body"><p>${escapeHtml(message)}</p></div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="kalert-ok">OK</button>
      </div>
    `;
    state.set('ui.modal', 'alert', { trackDirty: false });
    const close = () => { state.set('ui.modal', null, { trackDirty: false }); resolve(); };
    modal.querySelector('#kalert-ok').addEventListener('click', close);
    modal.querySelector('#kalert-close').addEventListener('click', close);
  });
}

function koaliConfirm(message, title = 'Confirm', { ok = 'OK', cancel = 'Cancel', danger = false } = {}) {
  return new Promise(resolve => {
    const modal = document.getElementById('modal-content');
    const state = window._koaliState;
    modal.innerHTML = `
      <div class="modal-header">
        <h2>${escapeHtml(title)}</h2>
        <button class="modal-close" id="kconfirm-close">&times;</button>
      </div>
      <div class="modal-body"><p>${escapeHtml(message)}</p></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="kconfirm-cancel">${escapeHtml(cancel)}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="kconfirm-ok">${escapeHtml(ok)}</button>
      </div>
    `;
    state.set('ui.modal', 'confirm', { trackDirty: false });
    const done = (val) => { state.set('ui.modal', null, { trackDirty: false }); resolve(val); };
    modal.querySelector('#kconfirm-ok').addEventListener('click', () => done(true));
    modal.querySelector('#kconfirm-cancel').addEventListener('click', () => done(false));
    modal.querySelector('#kconfirm-close').addEventListener('click', () => done(false));
  });
}

function koaliPrompt(message, title = '', { defaultValue = '', placeholder = '' } = {}) {
  return new Promise(resolve => {
    const modal = document.getElementById('modal-content');
    const state = window._koaliState;
    modal.innerHTML = `
      <div class="modal-header">
        <h2>${escapeHtml(title || 'Input')}</h2>
        <button class="modal-close" id="kprompt-close">&times;</button>
      </div>
      <div class="modal-body">
        <p style="margin-bottom:10px">${escapeHtml(message)}</p>
        <input type="text" id="kprompt-input" value="${escapeHtml(defaultValue)}" placeholder="${escapeHtml(placeholder)}" />
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="kprompt-cancel">Cancel</button>
        <button class="btn btn-primary" id="kprompt-ok">OK</button>
      </div>
    `;
    state.set('ui.modal', 'prompt', { trackDirty: false });
    const input = modal.querySelector('#kprompt-input');
    setTimeout(() => { input.focus(); input.select(); }, 50);
    const done = (val) => { state.set('ui.modal', null, { trackDirty: false }); resolve(val); };
    modal.querySelector('#kprompt-ok').addEventListener('click', () => done(input.value));
    modal.querySelector('#kprompt-cancel').addEventListener('click', () => done(null));
    modal.querySelector('#kprompt-close').addEventListener('click', () => done(null));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') done(input.value);
      if (e.key === 'Escape') done(null);
    });
  });
}

function koaliSelect(message, options, title = 'Select') {
  return new Promise(resolve => {
    const modal = document.getElementById('modal-content');
    const state = window._koaliState;
    modal.innerHTML = `
      <div class="modal-header">
        <h2>${escapeHtml(title)}</h2>
        <button class="modal-close" id="kselect-close">&times;</button>
      </div>
      <div class="modal-body">
        <p style="margin-bottom:10px">${escapeHtml(message)}</p>
        <div class="kselect-options" style="max-height:240px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm);padding:4px 0">
          ${options.map((opt, i) => `
            <div class="kselect-option" data-index="${i}" style="padding:6px 12px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:6px;transition:background 0.1s">
              ${opt.color ? `<span style="width:10px;height:10px;border-radius:3px;background:${opt.color};flex-shrink:0"></span>` : ''}
              ${escapeHtml(opt.label || opt)}
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="kselect-cancel">Cancel</button>
      </div>
    `;
    state.set('ui.modal', 'select', { trackDirty: false });
    const done = (val) => { state.set('ui.modal', null, { trackDirty: false }); resolve(val); };
    modal.querySelector('#kselect-close').addEventListener('click', () => done(null));
    modal.querySelector('#kselect-cancel').addEventListener('click', () => done(null));
    modal.querySelectorAll('.kselect-option').forEach(el => {
      el.addEventListener('mouseenter', () => el.style.background = 'var(--bg-hover)');
      el.addEventListener('mouseleave', () => el.style.background = '');
      el.addEventListener('click', () => done(options[parseInt(el.dataset.index)]));
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function escapeAttr(text) {
  return (text || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function csvEscape(str) {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * KoaliState — path-based pub/sub state container.
 * Components subscribe to dot-separated paths (e.g. 'codebook.codes').
 * Mutations via set() notify all matching subscribers.
 */

// ── js/utils/uuid.js ──



// ── js/models/source.js ──

const TYPE_MAP = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.doc': 'doc',
  '.txt': 'text',
  '.vtt': 'transcript-vtt',
  '.srt': 'transcript-srt',
  '.json': 'transcript-zoom-json'
};

const ICON_MAP = {
  'pdf': '\u{1F4C4}',
  'docx': '\u{1F4C4}',
  'doc': '\u{1F4C4}',
  'text': '\u{1F4DD}',
  'transcript-vtt': '\u{1F399}',
  'transcript-srt': '\u{1F399}',
  'transcript-zoom-json': '\u{1F399}',
  'transcript-teams-docx': '\u{1F399}'
};

function detectSourceType(filename) {
  const ext = '.' + filename.split('.').pop().toLowerCase();
  return TYPE_MAP[ext] || 'text';
}

function getSourceIcon(type) {
  return ICON_MAP[type] || '\u{1F4C4}';
}

function createSourceEntry(filename, originalName, type, userId, extra = {}) {
  return {
    id: uuid(),
    filename,
    originalName: originalName || filename,
    title: originalName || filename,
    type,
    imported: new Date().toISOString(),
    importedBy: userId,
    size: extra.size || 0,
    pageCount: extra.pageCount || null,
    duration: extra.duration || null,
    speakers: extra.speakers || [],
    attributes: extra.attributes || {}
  };
}

function isTranscriptType(type) {
  return type.startsWith('transcript-');
}

// ── js/models/codebook.js ──

const DEFAULT_COLORS = [
  '#E63946', '#457B9D', '#2A9D8F', '#E9C46A', '#F4A261',
  '#264653', '#6A4C93', '#1982C4', '#8AC926', '#FF595E',
  '#FFCA3A', '#6A0572', '#AB83A1', '#F15BB5', '#00BBF9',
  '#00F5D4', '#9B5DE5', '#FEE440', '#F72585', '#4CC9F0'
];

let colorIndex = 0;

function nextColor() {
  const color = DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length];
  colorIndex++;
  return color;
}

function createCode(name, description, color, parentId, userId) {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    name: name || 'New Code',
    description: description || '',
    color: color || nextColor(),
    parentId: parentId || null,
    created: now,
    createdBy: userId,
    modified: now,
    modifiedBy: userId,
    children: [],
    deleted: false
  };
}

function addCodeToList(codes, newCode) {
  const updated = [...codes, newCode];
  if (newCode.parentId) {
    const parent = updated.find(c => c.id === newCode.parentId);
    if (parent && !parent.children.includes(newCode.id)) {
      parent.children = [...parent.children, newCode.id];
    }
  }
  return updated;
}

function updateCode(codes, codeId, changes, userId) {
  return codes.map(c => {
    if (c.id === codeId) {
      return { ...c, ...changes, modified: new Date().toISOString(), modifiedBy: userId };
    }
    return c;
  });
}

function deleteCode(codes, codeId) {
  // Mark as deleted, remove from parent's children
  let updated = codes.map(c => {
    if (c.id === codeId) return { ...c, deleted: true };
    if (c.children.includes(codeId)) {
      return { ...c, children: c.children.filter(id => id !== codeId) };
    }
    return c;
  });
  // Also mark child codes as deleted (recursive)
  const toDelete = [codeId];
  let found = true;
  while (found) {
    found = false;
    for (const c of updated) {
      if (!c.deleted && toDelete.includes(c.parentId)) {
        toDelete.push(c.id);
        found = true;
      }
    }
  }
  return updated.map(c => toDelete.includes(c.id) ? { ...c, deleted: true } : c);
}

function moveCode(codes, codeId, newParentId) {
  return codes.map(c => {
    // Remove from old parent
    if (c.children.includes(codeId) && c.id !== newParentId) {
      return { ...c, children: c.children.filter(id => id !== codeId) };
    }
    // Add to new parent
    if (c.id === newParentId && !c.children.includes(codeId)) {
      return { ...c, children: [...c.children, codeId] };
    }
    // Update the code itself
    if (c.id === codeId) {
      return { ...c, parentId: newParentId || null };
    }
    return c;
  });
}

function mergeCodes(codes, sourceCodeId, targetCodeId) {
  // All references to sourceCodeId become targetCodeId
  const updated = codes.map(c => {
    if (c.id === sourceCodeId) return { ...c, deleted: true };
    if (c.children.includes(sourceCodeId)) {
      return { ...c, children: c.children.filter(id => id !== sourceCodeId) };
    }
    if (c.parentId === sourceCodeId) {
      return { ...c, parentId: targetCodeId };
    }
    return c;
  });
  return { codes: updated, remapping: { [sourceCodeId]: targetCodeId } };
}

function codesToTree(codes) {
  const active = codes.filter(c => !c.deleted);
  const roots = active.filter(c => !c.parentId);
  function buildNode(code) {
    const children = active.filter(c => c.parentId === code.id);
    return { ...code, childNodes: children.map(buildNode) };
  }
  return roots.map(buildNode);
}

function codesToCSV(codes, segmentCounts = {}) {
  const header = 'Code ID,Code Name,Parent,Description,Color,Created,Created By,Segment Count';
  const rows = codes.filter(c => !c.deleted).map(c => {
    const parent = c.parentId ? (codes.find(p => p.id === c.parentId)?.name || '') : '';
    const count = segmentCounts[c.id] || 0;
    return [c.id, csvEscape(c.name), csvEscape(parent), csvEscape(c.description), c.color, c.created, c.createdBy, count].join(',');
  });
  return [header, ...rows].join('\n');
}

// ── js/models/coding.js ──

function createSegment(codeId, start, end, text, userId, speaker = null) {
  return {
    id: uuid(),
    codeId,
    start,
    end,
    text,
    speaker,
    created: new Date().toISOString(),
    createdBy: userId,
    noteId: null
  };
}

function removeSegment(segments, segmentId) {
  return segments.filter(s => s.id !== segmentId);
}

function getSegmentsForCode(allCodings, codeId, includeChildren = false, codes = []) {
  const codeIds = new Set([codeId]);
  if (includeChildren) {
    // Collect all descendant code IDs
    let found = true;
    while (found) {
      found = false;
      for (const c of codes) {
        if (c.parentId && codeIds.has(c.parentId) && !codeIds.has(c.id) && !c.deleted) {
          codeIds.add(c.id);
          found = true;
        }
      }
    }
  }

  const results = [];
  for (const [sourceId, coding] of Object.entries(allCodings)) {
    for (const seg of (coding.segments || [])) {
      if (codeIds.has(seg.codeId)) {
        results.push({ sourceId, segment: seg });
      }
    }
  }
  return results;
}

function remapCode(segments, oldCodeId, newCodeId) {
  return segments.map(s => {
    if (s.codeId === oldCodeId) return { ...s, codeId: newCodeId };
    return s;
  });
}

function countSegmentsByCode(allCodings) {
  const counts = {};
  for (const coding of Object.values(allCodings)) {
    for (const seg of (coding.segments || [])) {
      counts[seg.codeId] = (counts[seg.codeId] || 0) + 1;
    }
  }
  return counts;
}

// ── js/models/note.js ──

function createNote(title, type, linkedTo, userId) {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    type: type || 'analytic',
    title: title || 'Untitled Note',
    content: '',
    linkedTo: linkedTo || null, // { type: 'code'|'source'|'segment'|null, id: string }
    created: now,
    createdBy: userId,
    modified: now,
    modifiedBy: userId,
    tags: [],
    linkedNotes: []
  };
}

const NOTE_TYPES = [
  { value: 'analytic', label: 'Analytic' },
  { value: 'reflexive', label: 'Reflexive' },
  { value: 'procedural', label: 'Procedural' },
  { value: 'theoretical', label: 'Theoretical' },
  { value: 'other', label: 'Other' }
];

// ── js/models/theme.js ──

const THEME_COLORS = [
  '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1',
  '#EF4444', '#10B981', '#3B82F6', '#F97316', '#84CC16'
];

let themeColorIndex = 0;

function nextThemeColor() {
  const color = THEME_COLORS[themeColorIndex % THEME_COLORS.length];
  themeColorIndex++;
  return color;
}

function createTheme(name, description, color, codeIds, userId) {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    name: name || 'New Theme',
    description: description || '',
    color: color || nextThemeColor(),
    codeIds: codeIds || [],
    created: now,
    createdBy: userId,
    modified: now,
    modifiedBy: userId,
    noteId: null,
    deleted: false
  };
}

function updateTheme(themes, themeId, changes, userId) {
  return themes.map(t => {
    if (t.id === themeId) {
      return { ...t, ...changes, modified: new Date().toISOString(), modifiedBy: userId };
    }
    return t;
  });
}

function deleteTheme(themes, themeId) {
  return themes.map(t => t.id === themeId ? { ...t, deleted: true } : t);
}

function addCodesToTheme(themes, themeId, codeIds, userId) {
  return themes.map(t => {
    if (t.id === themeId) {
      const merged = [...new Set([...t.codeIds, ...codeIds])];
      return { ...t, codeIds: merged, modified: new Date().toISOString(), modifiedBy: userId };
    }
    return t;
  });
}

function removeCodesFromTheme(themes, themeId, codeIds, userId) {
  return themes.map(t => {
    if (t.id === themeId) {
      return {
        ...t,
        codeIds: t.codeIds.filter(id => !codeIds.includes(id)),
        modified: new Date().toISOString(),
        modifiedBy: userId
      };
    }
    return t;
  });
}

/**
 * Get all coded segments that belong to any code in this theme.
 */
function getThemeSegments(theme, codings, codes) {
  const codeIdSet = new Set(theme.codeIds);
  const segments = [];
  for (const [sourceId, coding] of Object.entries(codings)) {
    for (const seg of (coding.segments || [])) {
      if (codeIdSet.has(seg.codeId)) {
        segments.push({ ...seg, sourceId });
      }
    }
  }
  return segments;
}

/**
 * Get segment count per theme.
 */
function countSegmentsByTheme(themes, codings) {
  const counts = {};
  for (const theme of themes) {
    if (theme.deleted) continue;
    counts[theme.id] = getThemeSegments(theme, codings).length;
  }
  return counts;
}

/**
 * Find which themes a code belongs to.
 */
function getThemesForCode(themes, codeId) {
  return themes.filter(t => !t.deleted && t.codeIds.includes(codeId));
}

// ── js/models/query.js ──

/**
 * Execute a boolean code query across all codings.
 * query = { codes: [codeId,...], operator: 'AND'|'OR'|'NOT', documentFilter?: [sourceId,...] }
 *
 * OR:  segments with ANY of the specified codes
 * AND: segments in the same source where ALL codes are present (co-occurrence at source level)
 * NOT: segments with first code but NOT any of the others
 */
function executeQuery(allCodings, codebook, query) {
  const { codes: codeIds, operator, documentFilter } = query;
  if (!codeIds || codeIds.length === 0) return [];

  const results = [];
  const codeMap = {};
  for (const c of (codebook.codes || [])) codeMap[c.id] = c;

  const sourcesToSearch = documentFilter && documentFilter.length > 0
    ? Object.entries(allCodings).filter(([id]) => documentFilter.includes(id))
    : Object.entries(allCodings);

  switch (operator) {
    case 'OR': {
      const codeSet = new Set(codeIds);
      for (const [sourceId, coding] of sourcesToSearch) {
        for (const seg of (coding.segments || [])) {
          if (codeSet.has(seg.codeId)) {
            results.push({ sourceId, segment: seg, code: codeMap[seg.codeId] });
          }
        }
      }
      break;
    }

    case 'AND': {
      // Find sources where ALL codes are present, return all matching segments
      for (const [sourceId, coding] of sourcesToSearch) {
        const segs = coding.segments || [];
        const presentCodes = new Set(segs.map(s => s.codeId));
        if (codeIds.every(id => presentCodes.has(id))) {
          for (const seg of segs) {
            if (codeIds.includes(seg.codeId)) {
              results.push({ sourceId, segment: seg, code: codeMap[seg.codeId] });
            }
          }
        }
      }
      break;
    }

    case 'COOCCUR': {
      // Segments where multiple selected codes overlap the same text range
      const codeSet = new Set(codeIds);
      for (const [sourceId, coding] of sourcesToSearch) {
        const segs = (coding.segments || []).filter(s => codeSet.has(s.codeId));
        for (let a = 0; a < segs.length; a++) {
          const sa = segs[a];
          const aStart = sa.start?.offset || 0;
          const aEnd = sa.end?.offset || 0;
          for (let b = a + 1; b < segs.length; b++) {
            const sb = segs[b];
            if (sa.codeId === sb.codeId) continue;
            const bStart = sb.start?.offset || 0;
            const bEnd = sb.end?.offset || 0;
            if (aStart < bEnd && aEnd > bStart) {
              results.push({ sourceId, segment: sa, code: codeMap[sa.codeId], overlaps: sb });
              break;
            }
          }
        }
      }
      break;
    }

    case 'PROXIMITY': {
      const distance = query.proximityDistance || 500;
      const codeSet = new Set(codeIds);
      for (const [sourceId, coding] of sourcesToSearch) {
        const segs = (coding.segments || []).filter(s => codeSet.has(s.codeId));
        for (let a = 0; a < segs.length; a++) {
          const sa = segs[a];
          const aEnd = sa.end?.offset || 0;
          for (let b = a + 1; b < segs.length; b++) {
            const sb = segs[b];
            if (sa.codeId === sb.codeId) continue;
            const bStart = sb.start?.offset || 0;
            const gap = Math.abs(bStart - aEnd);
            if (gap <= distance) {
              results.push({ sourceId, segment: sa, code: codeMap[sa.codeId], nearby: sb });
              break;
            }
          }
        }
      }
      break;
    }

    case 'NOT': {
      const primaryCode = codeIds[0];
      const excludeSet = new Set(codeIds.slice(1));
      for (const [sourceId, coding] of sourcesToSearch) {
        const segs = coding.segments || [];
        // Get all offsets covered by excluded codes
        const excludedRanges = segs
          .filter(s => excludeSet.has(s.codeId))
          .map(s => ({ start: s.start?.offset || 0, end: s.end?.offset || 0 }));

        for (const seg of segs) {
          if (seg.codeId === primaryCode) {
            const segStart = seg.start?.offset || 0;
            const segEnd = seg.end?.offset || 0;
            const overlaps = excludedRanges.some(r =>
              segStart < r.end && segEnd > r.start
            );
            if (!overlaps) {
              results.push({ sourceId, segment: seg, code: codeMap[seg.codeId] });
            }
          }
        }
      }
      break;
    }
  }

  return results;
}

function createSavedQuery(name, query) {
  return {
    id: uuid(),
    name: name || 'Untitled Query',
    query,
    created: new Date().toISOString()
  };
}

// ── js/models/project.js ──

function createProject(name, description, userId) {
  const now = new Date().toISOString();
  return {
    koaliVersion: '1.0',
    projectId: uuid(),
    name: name || 'Untitled Project',
    description: description || '',
    created: now,
    modified: now,
    creators: [userId],
    settings: {
      defaultLanguage: 'en',
      timestampFormat: 'ISO8601'
    }
  };
}

function validateProject(data) {
  const errors = [];
  if (!data) { errors.push('No data'); return { valid: false, errors }; }
  if (!data.koaliVersion) errors.push('Missing koaliVersion');
  if (!data.projectId) errors.push('Missing projectId');
  if (!data.name) errors.push('Missing name');
  return { valid: errors.length === 0, errors };
}

// ── js/parsers/text.js ──

async function parseText(file) {
  const text = await file.text();
  return {
    type: 'text',
    text,
    pages: [{ pageNum: 1, text }]
  };
}

// ── js/parsers/vtt.js ──

/**
 * Parse WebVTT files (Zoom, Teams, generic).
 * Returns { type, cues[], speakers[] }
 */
async function parseVTT(file) {
  const text = typeof file === 'string' ? file : await file.text();
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const cues = [];
  const speakerSet = new Set();

  let i = 0;
  // Skip WEBVTT header
  if (lines[i] && lines[i].startsWith('WEBVTT')) {
    i++;
    while (i < lines.length && lines[i].trim() !== '') i++;
    i++;
  }

  while (i < lines.length) {
    // Skip blank lines
    while (i < lines.length && lines[i].trim() === '') i++;
    if (i >= lines.length) break;

    // Optional cue identifier (number or text)
    let cueId = null;
    if (i + 1 < lines.length && lines[i + 1].includes('-->')) {
      cueId = lines[i].trim();
      i++;
    }

    // Timestamp line: 00:00:05.000 --> 00:00:08.500
    if (!lines[i] || !lines[i].includes('-->')) {
      i++;
      continue;
    }

    const tsMatch = lines[i].match(
      /(\d{1,2}:?\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{1,2}:?\d{2}:\d{2}[.,]\d{3})/
    );
    if (!tsMatch) { i++; continue; }

    const startTime = normalizeTimestamp(tsMatch[1]);
    const endTime = normalizeTimestamp(tsMatch[2]);
    i++;

    // Cue text (possibly multiple lines until blank line)
    const textLines = [];
    while (i < lines.length && lines[i].trim() !== '') {
      textLines.push(lines[i]);
      i++;
    }

    const rawText = textLines.join(' ');
    // Extract speaker from Teams <v> tags BEFORE stripping HTML
    const { speaker, text: cueText } = extractSpeaker(rawText);
    if (speaker) speakerSet.add(speaker);

    cues.push({
      index: cues.length,
      cueId,
      startTime,
      endTime,
      speaker: speaker || null,
      text: cueText
    });
  }

  return {
    type: 'transcript-vtt',
    cues,
    speakers: Array.from(speakerSet),
    text: cues.map(c => c.text).join('\n')
  };
}

function extractSpeaker(text) {
  // Teams format: <v Speaker Name>text</v>
  const vMatch = text.match(/^<v\s+([^>]+)>(.+?)(?:<\/v>)?$/s);
  if (vMatch) {
    return { speaker: vMatch[1].trim(), text: stripHtml(vMatch[2]).trim() };
  }
  // Standard format: "Speaker Name: text"
  const cleaned = stripHtml(text);
  const match = cleaned.match(/^([^:]{1,50}):\s*(.+)$/s);
  if (match) {
    return { speaker: match[1].trim(), text: match[2].trim() };
  }
  return { speaker: null, text: cleaned.trim() };
}

function stripHtml(text) {
  return text.replace(/<[^>]*>/g, '');
}

function normalizeTimestamp(ts) {
  // Ensure HH:MM:SS.mmm format
  const parts = ts.replace(',', '.').split(':');
  if (parts.length === 2) {
    return '00:' + parts.join(':');
  }
  return parts.join(':');
}

// ── js/parsers/srt.js ──

/**
 * Parse SRT subtitle files.
 * Returns { type, cues[], speakers[] }
 */
async function parseSRT(file) {
  const text = typeof file === 'string' ? file : await file.text();
  const blocks = text.replace(/\r\n/g, '\n').trim().split(/\n\s*\n/);
  const cues = [];
  const speakerSet = new Set();

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    // Line 1: sequence number
    // Line 2: timestamp
    const tsMatch = lines[1].match(
      /(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/
    );
    if (!tsMatch) continue;

    const startTime = tsMatch[1].replace(',', '.');
    const endTime = tsMatch[2].replace(',', '.');
    const rawText = lines.slice(2).join(' ').replace(/<[^>]*>/g, '');

    const { speaker, text: cueText } = extractSpeaker(rawText);
    if (speaker) speakerSet.add(speaker);

    cues.push({
      index: cues.length,
      startTime,
      endTime,
      speaker: speaker || null,
      text: cueText
    });
  }

  return {
    type: 'transcript-srt',
    cues,
    speakers: Array.from(speakerSet),
    text: cues.map(c => c.text).join('\n')
  };
}

function extractSpeaker(text) {
  const match = text.match(/^([^:]{1,50}):\s*(.+)$/s);
  if (match) {
    return { speaker: match[1].trim(), text: match[2].trim() };
  }
  return { speaker: null, text: text.trim() };
}

// ── js/parsers/zoom-json.js ──

/**
 * Parse Zoom JSON transcript format.
 * Returns { type, cues[], speakers[], meetingTopic }
 */
async function parseZoomJSON(file) {
  const text = typeof file === 'string' ? file : await file.text();
  const data = JSON.parse(text);
  const speakerSet = new Set();
  const cues = [];

  const timeline = data.timeline || data.segments || data.results || [];

  for (let i = 0; i < timeline.length; i++) {
    const entry = timeline[i];
    const speaker = entry.speaker_name || entry.speaker || entry.username || null;
    if (speaker) speakerSet.add(speaker);

    const startMs = entry.start_time || entry.start || entry.startTime || 0;
    const endMs = entry.end_time || entry.end || entry.endTime || 0;

    cues.push({
      index: i,
      startTime: msToTimestamp(startMs),
      endTime: msToTimestamp(endMs),
      speaker,
      text: (entry.text || entry.content || '').trim()
    });
  }

  return {
    type: 'transcript-zoom-json',
    cues,
    speakers: Array.from(speakerSet),
    meetingTopic: data.meeting_topic || data.topic || '',
    text: cues.map(c => c.text).join('\n')
  };
}

function msToTimestamp(ms) {
  const totalSec = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSec % 60).padStart(2, '0');
  const millis = String(ms % 1000).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${millis}`;
}

// ── js/parsers/docx.js ──

/**
 * Parse DOCX files using Mammoth.js.
 * Returns { type, html, text, messages }
 */
async function parseDOCX(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const textResult = await mammoth.extractRawText({ arrayBuffer });

  // Detect Teams transcript format (lines with timestamps like "0:0:5.0 --> 0:0:8.5")
  const text = textResult.value;
  if (isTeamsTranscript(text)) {
    return parseTeamsTranscript(text);
  }

  return {
    type: 'docx',
    html: result.value,
    text,
    messages: result.messages,
    pages: [{ pageNum: 1, text }]
  };
}

/**
 * Detect if raw text from DOCX is a Teams transcript.
 * Teams transcripts have timestamp lines like "0:0:5.0 --> 0:0:8.5"
 * followed by a speaker name line and text.
 */
function isTeamsTranscript(text) {
  const lines = text.split('\n').slice(0, 20);
  const tsPattern = /^\d+:\d+:\d+\.\d+\s*-->\s*\d+:\d+:\d+\.\d+/;
  return lines.some(l => tsPattern.test(l.trim()));
}

/**
 * Parse Teams DOCX transcript into cue-based format.
 */
function parseTeamsTranscript(text) {
  const lines = text.split('\n');
  const cues = [];
  const speakerSet = new Set();
  const tsPattern = /^(\d+:\d+:\d+\.\d+)\s*-->\s*(\d+:\d+:\d+\.\d+)/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    const tsMatch = line.match(tsPattern);
    if (!tsMatch) { i++; continue; }

    const startTime = normalizeTeamsTimestamp(tsMatch[1]);
    const endTime = normalizeTeamsTimestamp(tsMatch[2]);
    i++;

    // Next non-empty line is speaker
    while (i < lines.length && !lines[i].trim()) i++;
    const speaker = (i < lines.length) ? lines[i].trim() : '';
    if (speaker) speakerSet.add(speaker);
    i++;

    // Collect text lines until next timestamp or blank
    const textLines = [];
    while (i < lines.length) {
      const nextLine = lines[i].trim();
      if (!nextLine || tsPattern.test(nextLine)) break;
      textLines.push(nextLine);
      i++;
    }

    cues.push({
      index: cues.length,
      startTime,
      endTime,
      speaker: speaker || null,
      text: textLines.join(' ')
    });
  }

  return {
    type: 'transcript-teams-docx',
    cues,
    speakers: Array.from(speakerSet),
    text: cues.map(c => c.text).join('\n')
  };
}

function normalizeTeamsTimestamp(ts) {
  // Convert "0:0:5.0" to "00:00:05.000"
  const parts = ts.split(':');
  while (parts.length < 3) parts.unshift('0');
  const [h, m, sAndMs] = parts;
  const [sec, ms] = sAndMs.split('.');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${sec.padStart(2, '0')}.${(ms || '0').padEnd(3, '0')}`;
}

// ── js/parsers/pdf.js ──

/**
 * Parse PDF files using PDF.js.
 * Returns { type, pages[], text, pageCount }
 */
async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer();

  // PDF.js must be loaded globally
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error('PDF.js library not loaded');

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  const allText = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    const items = textContent.items.map(item => ({
      str: item.str,
      x: item.transform[4],
      y: viewport.height - item.transform[5],
      width: item.width,
      height: item.height,
      fontName: item.fontName
    }));

    const pageText = textContent.items.map(item => item.str).join(' ');
    allText.push(pageText);

    pages.push({
      pageNum: i,
      text: pageText,
      items,
      width: viewport.width,
      height: viewport.height
    });
  }

  return {
    type: 'pdf',
    pages,
    text: allText.join('\n\n'),
    pageCount: pdf.numPages
  };
}

// ── js/utils/irr.js ──

/**
 * Inter-Rater Reliability calculations.
 *
 * Approach: divide document text into fixed-size character units.
 * For each unit, record which codes each coder applied.
 * Calculate agreement from the resulting contingency matrix.
 */

/**
 * Cohen's Kappa for two coders.
 * @param {Object[]} coder1Segments - segments from coder 1: [{codeId, start:{offset}, end:{offset}}]
 * @param {Object[]} coder2Segments - segments from coder 2
 * @param {string[]} codeIds - the code IDs to evaluate
 * @param {number} docLength - total document character length
 * @param {number} unitSize - size of each unit in characters (default 50)
 * @returns {number} kappa value (-1 to 1)
 */
function cohensKappa(coder1Segments, coder2Segments, codeIds, docLength, unitSize = 50) {
  const numUnits = Math.ceil(docLength / unitSize);
  if (numUnits === 0) return 1;

  // For each code, build binary vectors for each coder
  let totalPo = 0;
  let totalPe = 0;
  let numCategories = 0;

  for (const codeId of codeIds) {
    const c1 = buildCodingVector(coder1Segments, codeId, numUnits, unitSize);
    const c2 = buildCodingVector(coder2Segments, codeId, numUnits, unitSize);

    let a = 0, b = 0, c = 0, d = 0; // a=both yes, b=c1 yes c2 no, c=c1 no c2 yes, d=both no
    for (let i = 0; i < numUnits; i++) {
      if (c1[i] && c2[i]) a++;
      else if (c1[i] && !c2[i]) b++;
      else if (!c1[i] && c2[i]) c++;
      else d++;
    }

    const po = (a + d) / numUnits;
    const pe = ((a + b) / numUnits) * ((a + c) / numUnits) +
               ((c + d) / numUnits) * ((b + d) / numUnits);

    totalPo += po;
    totalPe += pe;
    numCategories++;
  }

  if (numCategories === 0) return 1;
  const avgPo = totalPo / numCategories;
  const avgPe = totalPe / numCategories;

  if (avgPe === 1) return 1;
  return (avgPo - avgPe) / (1 - avgPe);
}

/**
 * Simple percent agreement between two coders.
 */
function percentAgreement(coder1Segments, coder2Segments, codeIds, docLength, unitSize = 50) {
  const numUnits = Math.ceil(docLength / unitSize);
  if (numUnits === 0) return 1;

  let totalAgree = 0;
  let totalUnits = 0;

  for (const codeId of codeIds) {
    const c1 = buildCodingVector(coder1Segments, codeId, numUnits, unitSize);
    const c2 = buildCodingVector(coder2Segments, codeId, numUnits, unitSize);

    for (let i = 0; i < numUnits; i++) {
      if (c1[i] === c2[i]) totalAgree++;
      totalUnits++;
    }
  }

  return totalUnits > 0 ? totalAgree / totalUnits : 1;
}

/**
 * Generate disagreement report.
 */
function disagreementReport(coder1Segments, coder2Segments, codeIds, codes, docLength, unitSize = 50) {
  const numUnits = Math.ceil(docLength / unitSize);
  const codeMap = {};
  for (const c of codes) codeMap[c.id] = c;
  const disagreements = [];

  for (const codeId of codeIds) {
    const c1 = buildCodingVector(coder1Segments, codeId, numUnits, unitSize);
    const c2 = buildCodingVector(coder2Segments, codeId, numUnits, unitSize);

    for (let i = 0; i < numUnits; i++) {
      if (c1[i] !== c2[i]) {
        const offset = i * unitSize;
        disagreements.push({
          codeId,
          codeName: codeMap[codeId]?.name || codeId,
          unitIndex: i,
          offsetStart: offset,
          offsetEnd: Math.min(offset + unitSize, docLength),
          coder1Applied: c1[i],
          coder2Applied: c2[i]
        });
      }
    }
  }

  return disagreements;
}

function buildCodingVector(segments, codeId, numUnits, unitSize) {
  const vector = new Uint8Array(numUnits);
  for (const seg of segments) {
    if (seg.codeId !== codeId) continue;
    const start = seg.start?.offset || 0;
    const end = seg.end?.offset || 0;
    const startUnit = Math.floor(start / unitSize);
    const endUnit = Math.min(Math.ceil(end / unitSize), numUnits);
    for (let i = startUnit; i < endUnit; i++) {
      vector[i] = 1;
    }
  }
  return vector;
}

// ── js/utils/merge.js ──

/**
 * Collaboration merge logic.
 * Merges data from multiple users working on the same project folder.
 */

/**
 * Merge two codebooks (by code ID).
 * Returns { merged, conflicts }
 */
function mergeCodebooks(local, remote) {
  const conflicts = [];
  const localMap = new Map(local.codes.map(c => [c.id, c]));
  const remoteMap = new Map(remote.codes.map(c => [c.id, c]));
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
  const mergedCodes = [];

  for (const id of allIds) {
    const l = localMap.get(id);
    const r = remoteMap.get(id);

    if (l && !r) {
      mergedCodes.push(l);
    } else if (!l && r) {
      mergedCodes.push(r);
    } else if (l && r) {
      // Both exist — check for conflicts
      if (l.deleted && r.deleted) {
        mergedCodes.push(l);
      } else if (l.deleted && !r.deleted) {
        // Conflict: one deleted, other modified
        conflicts.push({
          type: 'code-deleted',
          itemId: id,
          versions: [
            { action: 'deleted', by: l.modifiedBy, at: l.modified },
            { value: r.name, by: r.modifiedBy, at: r.modified }
          ]
        });
        mergedCodes.push(r); // Preserve by default
      } else if (!l.deleted && r.deleted) {
        conflicts.push({
          type: 'code-deleted',
          itemId: id,
          versions: [
            { value: l.name, by: l.modifiedBy, at: l.modified },
            { action: 'deleted', by: r.modifiedBy, at: r.modified }
          ]
        });
        mergedCodes.push(l);
      } else {
        // Both exist and not deleted — check for rename conflict
        if (l.name !== r.name && l.modifiedBy !== r.modifiedBy) {
          conflicts.push({
            type: 'code-rename',
            itemId: id,
            versions: [
              { value: l.name, by: l.modifiedBy, at: l.modified },
              { value: r.name, by: r.modifiedBy, at: r.modified }
            ]
          });
        }
        // Use the most recently modified version
        const winner = new Date(l.modified) >= new Date(r.modified) ? l : r;
        mergedCodes.push(winner);
      }
    }
  }

  return {
    merged: { ...local, codes: mergedCodes, version: Math.max(local.version || 0, remote.version || 0) + 1 },
    conflicts
  };
}

/**
 * Merge coding data (additive — keep all segments from both).
 * Duplicate segment IDs are deduplicated by keeping the newer version.
 */
function mergeCodings(local, remote) {
  const conflicts = [];
  const segMap = new Map();

  for (const seg of (local.segments || [])) {
    segMap.set(seg.id, seg);
  }

  for (const seg of (remote.segments || [])) {
    if (segMap.has(seg.id)) {
      const existing = segMap.get(seg.id);
      // Same ID, check if different
      if (existing.codeId !== seg.codeId && existing.createdBy !== seg.createdBy) {
        conflicts.push({
          type: 'segment-conflict',
          itemId: seg.id,
          versions: [
            { codeId: existing.codeId, by: existing.createdBy, at: existing.created },
            { codeId: seg.codeId, by: seg.createdBy, at: seg.created }
          ]
        });
      }
      // Keep newer
      if (new Date(seg.created) > new Date(existing.created)) {
        segMap.set(seg.id, seg);
      }
    } else {
      segMap.set(seg.id, seg);
    }
  }

  return {
    merged: {
      sourceId: local.sourceId,
      version: Math.max(local.version || 0, remote.version || 0) + 1,
      modified: new Date().toISOString(),
      segments: Array.from(segMap.values())
    },
    conflicts
  };
}

/**
 * Merge note manifests and items (additive).
 */
function mergeNotes(localManifest, localItems, remoteManifest, remoteItems) {
  const conflicts = [];
  const allIds = new Set([
    ...localManifest.map(m => m.id),
    ...remoteManifest.map(m => m.id)
  ]);

  const mergedManifest = [];
  const mergedItems = {};

  for (const id of allIds) {
    mergedManifest.push({ id });
    const l = localItems[id];
    const r = remoteItems[id];

    if (l && !r) {
      mergedItems[id] = l;
    } else if (!l && r) {
      mergedItems[id] = r;
    } else if (l && r) {
      // Both exist — check content conflict
      if (l.content !== r.content && l.modifiedBy !== r.modifiedBy) {
        conflicts.push({
          type: 'note-content',
          itemId: id,
          title: l.title || r.title,
          versions: [
            { content: l.content, by: l.modifiedBy, at: l.modified },
            { content: r.content, by: r.modifiedBy, at: r.modified }
          ]
        });
      }
      // Keep newer
      mergedItems[id] = new Date(l.modified) >= new Date(r.modified) ? l : r;
    }
  }

  return { mergedManifest, mergedItems, conflicts };
}

/**
 * Merge theme data from two users.
 * Returns { merged, conflicts }
 */
function mergeThemes(local, remote) {
  const conflicts = [];
  const localMap = new Map((local.themes || []).map(t => [t.id, t]));
  const remoteMap = new Map((remote.themes || []).map(t => [t.id, t]));
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
  const mergedThemes = [];

  for (const id of allIds) {
    const l = localMap.get(id);
    const r = remoteMap.get(id);

    if (l && !r) {
      mergedThemes.push(l);
    } else if (!l && r) {
      mergedThemes.push(r);
    } else if (l && r) {
      if (l.deleted && r.deleted) {
        mergedThemes.push(l);
      } else if (l.name !== r.name && l.modifiedBy !== r.modifiedBy && !l.deleted && !r.deleted) {
        conflicts.push({
          type: 'theme-rename',
          itemId: id,
          versions: [
            { value: l.name, by: l.modifiedBy, at: l.modified },
            { value: r.name, by: r.modifiedBy, at: r.modified }
          ]
        });
      }
      // Keep newer, merge codeIds additively
      const winner = new Date(l.modified) >= new Date(r.modified) ? { ...l } : { ...r };
      winner.codeIds = [...new Set([...(l.codeIds || []), ...(r.codeIds || [])])];
      mergedThemes.push(winner);
    }
  }

  return {
    merged: { version: Math.max(local.version || 0, remote.version || 0) + 1, themes: mergedThemes },
    conflicts
  };
}

// ── js/utils/export.js ──

function queryResultsToCSV(results, query, sources) {
  const sourceMap = {};
  for (const s of (sources || [])) sourceMap[s.id] = s;

  const header = 'Segment ID,Document,Location,Speaker,Text,Code,Coded By,Coded At';
  const rows = results.map(r => {
    const src = sourceMap[r.sourceId];
    const docName = src ? src.title : r.sourceId;
    const location = r.segment.start?.page ? `Page ${r.segment.start.page}` :
                     r.segment.start?.cueIndex != null ? `Cue ${r.segment.start.cueIndex}` :
                     `Offset ${r.segment.start?.offset || 0}`;
    return [
      r.segment.id,
      csvEscape(docName),
      csvEscape(location),
      csvEscape(r.segment.speaker || ''),
      csvEscape(r.segment.text),
      csvEscape(r.code?.name || ''),
      r.segment.createdBy,
      r.segment.created
    ].join(',');
  });

  return [header, ...rows].join('\n');
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

function downloadCSV(csvString, filename) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

function downloadDataURL(dataURL, filename) {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Generate a printable HTML codebook and open browser print dialog.
 */
function printCodebookPDF(codes, segmentCounts = {}) {
  const active = codes.filter(c => !c.deleted);
  const codeMap = {};
  for (const c of active) codeMap[c.id] = c;

  function renderCodeRow(code, depth) {
    const parent = code.parentId ? (codeMap[code.parentId]?.name || '') : '';
    const count = segmentCounts[code.id] || 0;
    const indent = depth * 20;
    return `
      <tr>
        <td style="padding-left:${indent + 8}px;">
          <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${code.color};margin-right:6px;vertical-align:middle;"></span>
          <strong>${esc(code.name)}</strong>
        </td>
        <td>${esc(parent)}</td>
        <td>${esc(code.description)}</td>
        <td style="text-align:center;">${count}</td>
      </tr>
    `;
  }

  function buildTree(codes) {
    const roots = codes.filter(c => !c.parentId);
    function children(parentId) {
      return codes.filter(c => c.parentId === parentId);
    }
    function renderNode(code, depth) {
      let html = renderCodeRow(code, depth);
      for (const child of children(code.id)) {
        html += renderNode(child, depth + 1);
      }
      return html;
    }
    return roots.map(c => renderNode(c, 0)).join('');
  }

  const html = `<!DOCTYPE html><html><head><title>Codebook</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; padding: 24px; }
      h1 { font-size: 20px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; font-size: 11px; text-transform: uppercase; color: #666; padding: 6px 8px; border-bottom: 2px solid #ddd; }
      td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: top; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <h1>Codebook</h1>
    <p style="color:#666;margin-bottom:16px;">Generated ${new Date().toLocaleDateString()} &mdash; ${active.length} codes</p>
    <table>
      <thead><tr><th>Code</th><th>Parent</th><th>Description</th><th>Segments</th></tr></thead>
      <tbody>${buildTree(active)}</tbody>
    </table>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}

function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── js/state.js ──

/**
 * KoaliState — path-based pub/sub state container.
 * Components subscribe to dot-separated paths (e.g. 'codebook.codes').
 * Mutations via set() notify all matching subscribers.
 */
class KoaliState {
  constructor() {
    this._data = {
      user: { id: null, displayName: '', color: '#2196F3' },
      project: null,
      codebook: { version: 1, modified: null, modifiedBy: null, codes: [] },
      sources: { manifest: [], activeSourceId: null, groups: [] },
      codings: {},
      notes: { manifest: [], items: {} },
      themes: { version: 1, themes: [] },
      queries: { saved: [] },
      activityLog: [],
      conflicts: [],
      ui: {
        view: 'home',
        panels: { left: true, right: true },
        selectedText: null,
        activeCodeId: null,
        modal: null,
        status: '',
        activeTab: 'sources'
      }
    };
    this._subscribers = new Map();
    this._dirty = new Set();
    this._undoStack = [];
    this._redoStack = [];
  }

  get(path) {
    if (!path) return this._data;
    const parts = path.split('.');
    let current = this._data;
    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }
    return current;
  }

  set(path, value, { silent = false, trackDirty = true } = {}) {
    const parts = path.split('.');
    let current = this._data;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] == null) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    const lastKey = parts[parts.length - 1];
    const oldValue = current[lastKey];
    current[lastKey] = value;

    if (trackDirty && !path.startsWith('ui.')) {
      this._markDirty(path);
    }

    if (!silent) {
      this._notify(path, value, oldValue);
    }
  }

  subscribe(path, callback) {
    if (!this._subscribers.has(path)) {
      this._subscribers.set(path, new Set());
    }
    this._subscribers.get(path).add(callback);
    return () => this.unsubscribe(path, callback);
  }

  unsubscribe(path, callback) {
    const subs = this._subscribers.get(path);
    if (subs) subs.delete(callback);
  }

  _notify(changedPath, newValue, oldValue) {
    for (const [subPath, callbacks] of this._subscribers) {
      if (changedPath.startsWith(subPath) || subPath.startsWith(changedPath)) {
        for (const cb of callbacks) {
          try {
            cb(this.get(subPath), oldValue, changedPath);
          } catch (e) {
            console.error(`State subscriber error for path "${subPath}":`, e);
          }
        }
      }
    }
  }

  _markDirty(path) {
    const root = path.split('.')[0];
    this._dirty.add(root);
    if (path.startsWith('codings.')) {
      const sourceId = path.split('.')[1];
      this._dirty.add(`codings.${sourceId}`);
    }
  }

  getDirtyPaths() {
    return new Set(this._dirty);
  }

  clearDirty() {
    this._dirty.clear();
  }

  get isDirty() {
    return this._dirty.size > 0;
  }

  logActivity(action, summary) {
    const log = this._data.activityLog || [];
    log.push({
      timestamp: new Date().toISOString(),
      userId: this._data.user?.id || null,
      action,
      summary
    });
    if (log.length > 500) log.splice(0, log.length - 500);
    this._data.activityLog = log;
  }

  canEdit() {
    const project = this._data.project;
    if (!project || !project.members || project.members.length === 0) return true;
    const userId = this._data.user?.id;
    const member = project.members.find(m => m.userId === userId);
    if (!member) return true; // not in members list = owner/legacy
    return member.role !== 'viewer';
  }

  snapshot() {
    return JSON.parse(JSON.stringify(this._data));
  }

  restore(snapshot) {
    this._data = snapshot;
    this._notify('', this._data, null);
  }

  pushUndo() {
    this._undoStack.push(this.snapshot());
    if (this._undoStack.length > 50) this._undoStack.shift();
    this._redoStack = [];
  }

  undo() {
    if (this._undoStack.length === 0) return false;
    this._redoStack.push(this.snapshot());
    this.restore(this._undoStack.pop());
    return true;
  }

  redo() {
    if (this._redoStack.length === 0) return false;
    this._undoStack.push(this.snapshot());
    this.restore(this._redoStack.pop());
    return true;
  }
}

// ── js/storage.js ──

/**
 * KoaliStorage — File System Access API + IndexedDB persistence.
 */
class KoaliStorage {
  constructor(state) {
    this.state = state;
    this.dirHandle = null;
    this._autosaveTimer = null;
    this._db = null;
  }

  get hasFileSystemAccess() {
    return 'showDirectoryPicker' in window;
  }

  // ── File System Access API ──

  async pickFolder() {
    this.dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    return this.dirHandle;
  }

  async ensureDir(parentHandle, name) {
    return parentHandle.getDirectoryHandle(name, { create: true });
  }

  async writeJSON(relativePath, data) {
    const parts = relativePath.split('/');
    let dir = this.dirHandle;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await this.ensureDir(dir, parts[i]);
    }
    const fileName = parts[parts.length - 1];
    const fileHandle = await dir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  }

  async readJSON(relativePath) {
    try {
      const parts = relativePath.split('/');
      let dir = this.dirHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        dir = await dir.getDirectoryHandle(parts[i]);
      }
      const fileName = parts[parts.length - 1];
      const fileHandle = await dir.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch (e) {
      if (e.name === 'NotFoundError') return null;
      throw e;
    }
  }

  async readFile(relativePath) {
    const parts = relativePath.split('/');
    let dir = this.dirHandle;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]);
    }
    const fileName = parts[parts.length - 1];
    const fileHandle = await dir.getFileHandle(fileName);
    return fileHandle.getFile();
  }

  async fileExists(relativePath) {
    try {
      const parts = relativePath.split('/');
      let dir = this.dirHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        dir = await dir.getDirectoryHandle(parts[i]);
      }
      await dir.getFileHandle(parts[parts.length - 1]);
      return true;
    } catch {
      return false;
    }
  }

  async listFiles(subdirPath) {
    let dir = this.dirHandle;
    if (subdirPath) {
      for (const part of subdirPath.split('/')) {
        dir = await dir.getDirectoryHandle(part);
      }
    }
    const files = [];
    for await (const [name, handle] of dir) {
      files.push({ name, kind: handle.kind });
    }
    return files;
  }

  async deleteFile(relativePath) {
    const parts = relativePath.split('/');
    let dir = this.dirHandle;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]);
    }
    await dir.removeEntry(parts[parts.length - 1]);
  }

  // ── Project Operations ──

  async createProject(manifest) {
    await this.writeJSON('koali.json', manifest);
    await this.writeJSON('settings.json', { users: {} });
    await this.writeJSON('codebook.json', { version: 1, modified: manifest.created, modifiedBy: manifest.creators[0], codes: [] });
    await this.ensureDir(this.dirHandle, 'sources');
    await this.writeJSON('sources/manifest.json', { sources: [] });
    await this.ensureDir(this.dirHandle, 'coding');
    await this.ensureDir(this.dirHandle, 'notes');
    await this.writeJSON('notes/manifest.json', { notes: [] });
    await this.ensureDir(this.dirHandle, 'queries');
    await this.writeJSON('queries/saved-queries.json', { queries: [] });
    await this.writeJSON('themes.json', { version: 1, themes: [] });
    const koaliDir = await this.ensureDir(this.dirHandle, '.koali');
    await this.writeJSON('.koali/sync-log.json', {
      lastSync: manifest.created,
      users: {},
      pendingConflicts: []
    });
  }

  async openProject() {
    const manifest = await this.readJSON('koali.json');
    if (!manifest) throw new Error('Not a Koali project (missing koali.json)');

    const codebook = await this.readJSON('codebook.json') || { version: 1, codes: [] };
    const sourcesManifest = await this.readJSON('sources/manifest.json') || { sources: [] };
    const notesManifest = await this.readJSON('notes/manifest.json') || { notes: [] };
    const savedQueries = await this.readJSON('queries/saved-queries.json') || { queries: [] };
    const themesData = await this.readJSON('themes.json') || { version: 1, themes: [] };
    const syncLog = await this.readJSON('.koali/sync-log.json') || { lastSync: null, users: {}, pendingConflicts: [] };

    // Load all coding files
    const codings = {};
    for (const source of sourcesManifest.sources) {
      const codingFile = `coding/${source.id}.coding.json`;
      const data = await this.readJSON(codingFile);
      if (data) {
        codings[source.id] = data;
      } else {
        codings[source.id] = { sourceId: source.id, version: 0, modified: null, segments: [] };
      }
    }

    // Load all notes
    const noteItems = {};
    for (const noteRef of notesManifest.notes) {
      const data = await this.readJSON(`notes/${noteRef.id}.json`);
      if (data) noteItems[noteRef.id] = data;
    }

    return {
      project: manifest,
      codebook,
      sources: { manifest: sourcesManifest.sources, activeSourceId: null },
      codings,
      notes: { manifest: notesManifest.notes, items: noteItems },
      themes: themesData,
      queries: { saved: savedQueries.queries },
      conflicts: syncLog.pendingConflicts || []
    };
  }

  async importSourceFile(file) {
    const sourcesDir = await this.ensureDir(this.dirHandle, 'sources');
    const fileHandle = await sourcesDir.getFileHandle(file.name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(await file.arrayBuffer());
    await writable.close();
  }

  async removeSourceFile(filename) {
    try {
      const sourcesDir = await this.dirHandle.getDirectoryHandle('sources');
      await sourcesDir.removeEntry(filename);
    } catch (e) {
      console.warn('Could not remove source file:', filename, e);
    }
  }

  // ── Autosave ──

  startAutosave(intervalMs = 2000) {
    if (this._autosaveTimer) clearInterval(this._autosaveTimer);
    this._autosaveTimer = setInterval(() => this.saveIfDirty(), intervalMs);
  }

  stopAutosave() {
    if (this._autosaveTimer) {
      clearInterval(this._autosaveTimer);
      this._autosaveTimer = null;
    }
  }

  async saveIfDirty() {
    if (!this.state.isDirty || !this.dirHandle) return;
    const dirty = this.state.getDirtyPaths();
    this.state.clearDirty();

    try {
      const promises = [];

      if (dirty.has('project')) {
        promises.push(this.writeJSON('koali.json', this.state.get('project')));
      }
      if (dirty.has('codebook')) {
        promises.push(this.writeJSON('codebook.json', this.state.get('codebook')));
      }
      if (dirty.has('sources')) {
        promises.push(this.writeJSON('sources/manifest.json', { sources: this.state.get('sources.manifest') }));
      }
      if (dirty.has('notes')) {
        promises.push(this.writeJSON('notes/manifest.json', { notes: this.state.get('notes.manifest') }));
        for (const [id, note] of Object.entries(this.state.get('notes.items') || {})) {
          promises.push(this.writeJSON(`notes/${id}.json`, note));
        }
      }
      if (dirty.has('themes')) {
        promises.push(this.writeJSON('themes.json', this.state.get('themes')));
      }
      if (dirty.has('queries')) {
        promises.push(this.writeJSON('queries/saved-queries.json', { queries: this.state.get('queries.saved') }));
      }

      // Save individual coding files
      for (const path of dirty) {
        if (path.startsWith('codings.')) {
          const sourceId = path.split('.')[1];
          if (sourceId) {
            const data = this.state.get(`codings.${sourceId}`);
            if (data) {
              promises.push(this.writeJSON(`coding/${sourceId}.coding.json`, data));
            }
          }
        }
      }

      await Promise.all(promises);
      this.state.set('ui.status', 'Saved', { trackDirty: false });
    } catch (e) {
      console.error('Autosave failed:', e);
      this.state.set('ui.status', 'Save failed!', { trackDirty: false });
      // Re-mark as dirty so we retry
      for (const p of dirty) this.state._dirty.add(p);
    }
  }

  async saveAll() {
    // Force all paths dirty then save
    for (const key of ['project', 'codebook', 'sources', 'codings', 'notes', 'themes', 'queries']) {
      this.state._dirty.add(key);
    }
    for (const sourceId of Object.keys(this.state.get('codings') || {})) {
      this.state._dirty.add(`codings.${sourceId}`);
    }
    await this.saveIfDirty();
  }

  // ── Backup ──

  async backupProject() {
    const backup = {
      _format: 'koali-backup',
      _version: 1,
      _created: new Date().toISOString(),
      project: this.state.get('project'),
      codebook: this.state.get('codebook'),
      sources: { manifest: this.state.get('sources.manifest'), groups: this.state.get('sources.groups') },
      codings: this.state.get('codings'),
      notes: { manifest: this.state.get('notes.manifest'), items: this.state.get('notes.items') },
      themes: this.state.get('themes'),
      queries: { saved: this.state.get('queries.saved') },
      activityLog: this.state.get('activityLog') || []
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(this.state.get('project.name') || 'koali-project')}.koali-backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── IndexedDB Cache ──

  async _openDB() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('koali-cache', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('parsed-documents')) {
          db.createObjectStore('parsed-documents');
        }
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences');
        }
      };
      req.onsuccess = () => { this._db = req.result; resolve(this._db); };
      req.onerror = () => reject(req.error);
    });
  }

  async getCached(key) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('parsed-documents', 'readonly');
      const req = tx.objectStore('parsed-documents').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async setCached(key, value) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('parsed-documents', 'readwrite');
      tx.objectStore('parsed-documents').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearCache() {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('parsed-documents', 'readwrite');
      tx.objectStore('parsed-documents').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// ── js/components/source-panel.js ──

const parserMap = {
  'text': parseText,
  'transcript-vtt': parseVTT,
  'transcript-srt': parseSRT,
  'transcript-zoom-json': parseZoomJSON,
  'docx': parseDOCX,
  'pdf': parsePDF,
};

function initSourcePanel(state, storage) {
  const listEl = document.getElementById('source-list');
  const noteListEl = document.getElementById('note-list');
  const btnImport = document.getElementById('btn-import');
  const btnNewNote = document.getElementById('btn-new-note');

  // ── Source Search ──
  let sourceSearchQuery = '';

  // ── Render sources ──
  function renderSources() {
    const sources = state.get('sources.manifest') || [];
    const activeId = state.get('sources.activeSourceId');
    const groups = state.get('sources.groups') || [];

    if (sources.length === 0 && !sourceSearchQuery) {
      listEl.innerHTML = '<div class="empty-state" style="height:80px;font-size:13px;">No sources yet. Click Import to add documents.</div>';
      return;
    }

    // Filter by search
    const filtered = sourceSearchQuery
      ? sources.filter(s => s.title.toLowerCase().includes(sourceSearchQuery))
      : sources;

    // Group sources
    const groupedSourceIds = new Set(groups.flatMap(g => g.sourceIds));
    const ungrouped = filtered.filter(s => !groupedSourceIds.has(s.id));

    let html = '';

    // Search input
    html += `<div style="padding:4px 8px;"><input type="search" id="source-search-input" placeholder="Search sources..." class="search-input" value="${escapeHtml(sourceSearchQuery)}" /></div>`;

    // Render groups
    for (const group of groups) {
      const groupSources = filtered.filter(s => group.sourceIds.includes(s.id));
      if (groupSources.length === 0 && sourceSearchQuery) continue;
      html += `<div class="source-group-header" data-group-id="${group.id}">
        <span>\u25BC ${escapeHtml(group.name)} (${groupSources.length})</span>
      </div>`;
      html += groupSources.map(s => renderSourceItem(s, activeId)).join('');
    }

    // Ungrouped
    if (ungrouped.length > 0 || (!sourceSearchQuery && groups.length > 0)) {
      if (groups.length > 0) {
        html += `<div class="source-group-header"><span>Ungrouped (${ungrouped.length})</span></div>`;
      }
      html += ungrouped.map(s => renderSourceItem(s, activeId)).join('');
    }

    listEl.innerHTML = html;

    // Search input handler
    const searchInput = listEl.querySelector('#source-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        sourceSearchQuery = e.target.value.trim().toLowerCase();
        renderSources();
      });
    }

    listEl.querySelectorAll('.source-item').forEach(el => {
      el.addEventListener('click', () => {
        state.set('sources.activeSourceId', el.dataset.id, { trackDirty: false });
      });
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showSourceContextMenu(e, el.dataset.id);
      });
    });
  }

  function renderSourceItem(s, activeId) {
    return `<div class="source-item ${s.id === activeId ? 'active' : ''}" data-id="${s.id}">
      <span class="source-icon">${getSourceIcon(s.type)}</span>
      <span class="source-name" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</span>
    </div>`;
  }

  // ── Render notes ──
  let noteSearchQuery = '';

  function renderNotes() {
    const notes = state.get('notes.manifest') || [];
    const items = state.get('notes.items') || {};

    if (notes.length === 0 && !noteSearchQuery) {
      noteListEl.innerHTML = '<div class="empty-state" style="height:60px;font-size:13px;">No notes yet.</div>';
      return;
    }

    const allNotes = notes.map(ref => items[ref.id]).filter(Boolean);
    const filtered = noteSearchQuery
      ? allNotes.filter(m => m.title.toLowerCase().includes(noteSearchQuery) || (m.tags || []).some(t => t.toLowerCase().includes(noteSearchQuery)))
      : allNotes;

    let html = `<div style="padding:4px 8px;"><input type="search" id="note-search-input" placeholder="Search notes..." class="search-input" value="${escapeHtml(noteSearchQuery)}" /></div>`;

    html += filtered.map(note => {
      const date = note.modified ? new Date(note.modified).toLocaleDateString() : '';
      const author = note.createdBy || '';
      const meta = [date, author].filter(Boolean).join(' · ');
      return `<div class="note-item" data-id="${note.id}">
        <div>\u{1F4DD} ${escapeHtml(note.title)}</div>
        ${meta ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">${escapeHtml(meta)}</div>` : ''}
      </div>`;
    }).join('');

    noteListEl.innerHTML = html;

    const searchInput = noteListEl.querySelector('#note-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        noteSearchQuery = e.target.value.trim().toLowerCase();
        renderNotes();
      });
    }

    noteListEl.querySelectorAll('.note-item').forEach(el => {
      el.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('koali-edit-note', { detail: { noteId: el.dataset.id } }));
      });
    });
  }

  state.subscribe('sources', renderSources);
  state.subscribe('notes', renderNotes);

  // ── Import ──
  btnImport.addEventListener('click', async () => {
    try {
      const fileHandles = await window.showOpenFilePicker({
        multiple: true,
        types: [
          {
            description: 'Documents',
            accept: {
              'application/pdf': ['.pdf'],
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
              'text/plain': ['.txt'],
              'text/vtt': ['.vtt'],
              'application/x-subrip': ['.srt'],
              'application/json': ['.json']
            }
          }
        ]
      });

      for (const handle of fileHandles) {
        await importFile(handle);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('Import failed:', e);
        alert('Import failed: ' + e.message);
      }
    }
  });

  async function importFile(handle) {
    const file = await handle.getFile();
    const type = detectSourceType(file.name);

    state.set('ui.status', `Importing ${file.name}...`, { trackDirty: false });

    // Parse
    const parser = parserMap[type];
    if (!parser) {
      alert(`Unsupported file type: ${file.name}`);
      return;
    }

    let parsed;
    try {
      parsed = await parser(file);
    } catch (e) {
      console.error('Parse error:', e);
      alert(`Failed to parse ${file.name}: ${e.message}`);
      return;
    }

    // Use the parser's detected type (e.g., DOCX may detect as Teams transcript)
    const actualType = parsed.type || type;

    // Create source entry
    const entry = createSourceEntry(file.name, file.name, actualType, state.get('user.id'), {
      size: file.size,
      pageCount: parsed.pageCount || parsed.pages?.length || null,
      speakers: parsed.speakers || [],
    });

    // Copy file to sources/
    await storage.importSourceFile(file);

    // Cache parsed content
    await storage.setCached(`parsed-${entry.id}`, parsed);

    // Update state
    const manifest = [...(state.get('sources.manifest') || []), entry];
    state.set('sources.manifest', manifest);

    // Init empty coding file
    state.set(`codings.${entry.id}`, {
      sourceId: entry.id,
      version: 0,
      modified: null,
      segments: []
    });

    state.set('ui.status', `Imported ${file.name}`, { trackDirty: false });
  }

  // ── Context Menu ──
  function showSourceContextMenu(e, sourceId) {
    const menu = document.getElementById('context-menu');
    const sources = state.get('sources.manifest') || [];
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    const groups = state.get('sources.groups') || [];
    menu.innerHTML = `
      <div class="context-menu-item" data-action="rename">Rename</div>
      <div class="context-menu-item" data-action="metadata">Edit Metadata</div>
      <div class="context-menu-sep"></div>
      ${groups.length > 0 ? groups.map(g => `<div class="context-menu-item" data-action="add-to-group" data-group-id="${g.id}">Add to "${escapeHtml(g.name)}"</div>`).join('') : ''}
      <div class="context-menu-item" data-action="new-group">Create Group...</div>
      <div class="context-menu-sep"></div>
      <div class="context-menu-item danger" data-action="delete">Delete</div>
    `;
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.classList.remove('hidden');

    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        menu.classList.add('hidden');
        const action = item.dataset.action;

        if (action === 'rename') {
          const newTitle = prompt('Rename document:', source.title);
          if (newTitle && newTitle !== source.title) {
            source.title = newTitle;
            state.set('sources.manifest', [...sources]);
          }
        } else if (action === 'metadata') {
          showMetadataDialog(source);
        } else if (action === 'add-to-group') {
          const groupId = item.dataset.groupId;
          const groups = state.get('sources.groups') || [];
          const group = groups.find(g => g.id === groupId);
          if (group && !group.sourceIds.includes(sourceId)) {
            group.sourceIds.push(sourceId);
            state.set('sources.groups', [...groups]);
          }
        } else if (action === 'new-group') {
          const name = prompt('Group name:');
          if (!name) return;
          const groups = state.get('sources.groups') || [];
          groups.push({ id: crypto.randomUUID(), name, sourceIds: [sourceId] });
          state.set('sources.groups', groups);
        } else if (action === 'delete') {
          if (confirm(`Delete "${source.title}"? This cannot be undone.`)) {
            state.pushUndo();
            const filtered = sources.filter(s => s.id !== sourceId);
            state.set('sources.manifest', filtered);
            if (state.get('sources.activeSourceId') === sourceId) {
              state.set('sources.activeSourceId', null, { trackDirty: false });
            }
            const codings = state.get('codings');
            delete codings[sourceId];
            state.set('codings', codings);
            storage.removeSourceFile(source.filename).catch(() => {});
          }
        }
      }, { once: true });
    });
  }

  // ── Metadata Dialog ──
  function showMetadataDialog(source) {
    const modal = document.getElementById('modal-content');
    const attrs = source.attributes || {};
    const attrRows = Object.entries(attrs).map(([k, v]) =>
      `<div class="form-row" style="margin-bottom:6px;"><input type="text" class="attr-key" value="${escapeHtml(k)}" placeholder="Key" style="flex:1" /><input type="text" class="attr-val" value="${escapeHtml(v)}" placeholder="Value" style="flex:1" /></div>`
    ).join('');

    modal.innerHTML = `
      <div class="modal-header"><h2>Edit Metadata</h2><button class="modal-close" id="meta-close">&times;</button></div>
      <div class="modal-body">
        <div class="form-group"><label>Title</label><input type="text" id="meta-title" value="${escapeHtml(source.title)}" /></div>
        <div class="form-group"><label>Description</label><textarea id="meta-desc" rows="2">${escapeHtml(source.description || '')}</textarea></div>
        <div class="form-group"><label>Custom Attributes</label>
          <div id="meta-attrs">${attrRows}</div>
          <button class="btn btn-small" id="meta-add-attr" style="margin-top:6px;">+ Add Attribute</button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="meta-cancel">Cancel</button>
        <button class="btn btn-primary" id="meta-save">Save</button>
      </div>
    `;

    state.set('ui.modal', 'metadata', { trackDirty: false });

    modal.querySelector('#meta-close').addEventListener('click', () => state.set('ui.modal', null, { trackDirty: false }));
    modal.querySelector('#meta-cancel').addEventListener('click', () => state.set('ui.modal', null, { trackDirty: false }));
    modal.querySelector('#meta-add-attr').addEventListener('click', () => {
      const div = document.createElement('div');
      div.className = 'form-row';
      div.style.marginBottom = '6px';
      div.innerHTML = '<input type="text" class="attr-key" placeholder="Key" style="flex:1" /><input type="text" class="attr-val" placeholder="Value" style="flex:1" />';
      modal.querySelector('#meta-attrs').appendChild(div);
    });

    modal.querySelector('#meta-save').addEventListener('click', () => {
      source.title = modal.querySelector('#meta-title').value.trim() || source.title;
      source.description = modal.querySelector('#meta-desc').value.trim();
      const newAttrs = {};
      const keys = modal.querySelectorAll('.attr-key');
      const vals = modal.querySelectorAll('.attr-val');
      keys.forEach((k, i) => {
        const key = k.value.trim();
        if (key) newAttrs[key] = vals[i]?.value || '';
      });
      source.attributes = newAttrs;
      state.set('sources.manifest', [...(state.get('sources.manifest') || [])]);
      state.set('ui.modal', null, { trackDirty: false });
    });
  }

  // ── New Note Button ──
  btnNewNote.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('koali-new-note'));
  });

  // Initial render
  renderSources();
  renderNotes();
}

// ── js/components/document-viewer.js ──

const _viewerParserMap = {
  'text': parseText,
  'transcript-vtt': parseVTT,
  'transcript-srt': parseSRT,
  'transcript-zoom-json': parseZoomJSON,
  'docx': parseDOCX,
  'pdf': parsePDF,
};

function initDocumentViewer(state, storage) {
  const viewer = document.getElementById('document-viewer');
  const toolbar = document.getElementById('document-toolbar');
  const titleEl = document.getElementById('doc-title');
  const searchEl = document.getElementById('doc-search');
  let currentParsed = null;
  let currentSourceId = null;
  let contentRoot = null;

  state.subscribe('sources.activeSourceId', async (sourceId) => {
    if (!sourceId) {
      viewer.innerHTML = '<div class="empty-state">Select a document from the left panel to begin coding.</div>';
      toolbar.classList.add('hidden');
      currentParsed = null;
      currentSourceId = null;
      return;
    }

    const sources = state.get('sources.manifest') || [];
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    currentSourceId = sourceId;
    toolbar.classList.remove('hidden');
    titleEl.textContent = source.title;
    viewer.innerHTML = '<div class="empty-state">Loading...</div>';

    // Try cache first
    let parsed = await storage.getCached(`parsed-${sourceId}`);
    if (!parsed) {
      // Re-parse from file
      try {
        const file = await storage.readFile(`sources/${source.filename}`);
        const parser = _viewerParserMap[source.type];
        if (!parser) {
          viewer.innerHTML = `<div class="empty-state">Unsupported file type: ${source.type}</div>`;
          return;
        }
        parsed = await parser(file);
        await storage.setCached(`parsed-${sourceId}`, parsed);
      } catch (e) {
        console.error('Failed to load document:', e);
        viewer.innerHTML = `<div class="empty-state">Failed to load document: ${e.message}</div>`;
        return;
      }
    }

    currentParsed = parsed;
    renderDocument(parsed, source);
  });

  // Re-render highlights when codings change
  state.subscribe('codings', () => {
    if (currentSourceId && contentRoot) {
      renderHighlights();
    }
  });

  function renderDocument(parsed, source) {
    viewer.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'doc-content';
    contentRoot = container;

    if (isTranscriptType(source.type) || parsed.cues) {
      renderTranscript(container, parsed);
    } else if (parsed.html) {
      renderHTML(container, parsed);
    } else if (parsed.pages && parsed.pages.length > 1) {
      renderPages(container, parsed);
    } else {
      renderPlainText(container, parsed);
    }

    viewer.appendChild(container);
    setupSelectionHandler();
    renderHighlights();
  }

  function renderTranscript(container, parsed) {
    const cues = parsed.cues || [];
    for (const cue of cues) {
      const row = document.createElement('div');
      row.className = 'transcript-cue';
      row.dataset.cueIndex = cue.index;

      const timeEl = document.createElement('span');
      timeEl.className = 'cue-time';
      timeEl.textContent = cue.startTime || '';

      const speakerEl = document.createElement('span');
      speakerEl.className = 'cue-speaker';
      speakerEl.textContent = cue.speaker || '';

      const textEl = document.createElement('span');
      textEl.className = 'cue-text';
      textEl.textContent = cue.text;

      row.appendChild(timeEl);
      row.appendChild(speakerEl);
      row.appendChild(textEl);
      container.appendChild(row);
    }
  }

  function renderHTML(container, parsed) {
    const div = document.createElement('div');
    div.className = 'doc-html-content';
    div.innerHTML = parsed.html;
    container.appendChild(div);
  }

  function renderPages(container, parsed) {
    for (const page of parsed.pages) {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'doc-page';
      pageDiv.dataset.page = page.pageNum;

      const numEl = document.createElement('div');
      numEl.className = 'doc-page-num';
      numEl.textContent = `Page ${page.pageNum}`;

      const textEl = document.createElement('div');
      textEl.className = 'doc-page-text';
      textEl.textContent = page.text;

      pageDiv.appendChild(numEl);
      pageDiv.appendChild(textEl);
      container.appendChild(pageDiv);
    }
  }

  function renderPlainText(container, parsed) {
    const pre = document.createElement('div');
    pre.className = 'doc-plain-text';
    pre.style.whiteSpace = 'pre-wrap';
    pre.textContent = parsed.text || '';
    container.appendChild(pre);
  }

  // ── Text Selection ──
  function setupSelectionHandler() {
    viewer.addEventListener('mouseup', handleSelection);
  }

  function handleSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !contentRoot) {
      return;
    }

    // Ensure selection is within our content
    if (!contentRoot.contains(sel.anchorNode) || !contentRoot.contains(sel.focusNode)) {
      return;
    }

    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if (!text) return;

    const startOffset = computeOffset(contentRoot, range.startContainer, range.startOffset);
    const endOffset = computeOffset(contentRoot, range.endContainer, range.endOffset);

    // For transcripts, also capture cue info
    let cueInfo = null;
    const startCue = range.startContainer.parentElement?.closest('.transcript-cue');
    const endCue = range.endContainer.parentElement?.closest('.transcript-cue');
    if (startCue) {
      cueInfo = {
        startCueIndex: parseInt(startCue.dataset.cueIndex),
        endCueIndex: endCue ? parseInt(endCue.dataset.cueIndex) : parseInt(startCue.dataset.cueIndex)
      };
    }

    // For pages, capture page info
    let pageInfo = null;
    const startPage = range.startContainer.parentElement?.closest('.doc-page');
    if (startPage) {
      pageInfo = { page: parseInt(startPage.dataset.page) };
    }

    // Get speaker if transcript
    let speaker = null;
    if (startCue) {
      const speakerEl = startCue.querySelector('.cue-speaker');
      if (speakerEl) speaker = speakerEl.textContent;
    }

    state.set('ui.selectedText', {
      sourceId: currentSourceId,
      start: { offset: startOffset, ...pageInfo, ...(cueInfo ? { cueIndex: cueInfo.startCueIndex } : {}) },
      end: { offset: endOffset, ...(cueInfo ? { cueIndex: cueInfo.endCueIndex } : {}) },
      text,
      speaker
    }, { trackDirty: false });
  }

  function computeOffset(root, node, offset) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let charCount = 0;
    while (walker.nextNode()) {
      if (walker.currentNode === node) {
        return charCount + offset;
      }
      charCount += walker.currentNode.textContent.length;
    }
    return charCount;
  }

  // ── Highlight Rendering ──
  function renderHighlights() {
    // Remove existing highlights
    contentRoot.querySelectorAll('.code-highlight').forEach(el => {
      const parent = el.parentNode;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    });
    contentRoot.querySelectorAll('.highlight-tag').forEach(el => el.remove());

    const codings = state.get(`codings.${currentSourceId}`);
    if (!codings || !codings.segments || codings.segments.length === 0) return;

    const codes = state.get('codebook.codes') || [];
    const codeMap = {};
    for (const c of codes) codeMap[c.id] = c;

    // Sort segments by start offset descending (apply from end to avoid offset shifts)
    const sortedSegments = [...codings.segments].sort((a, b) => {
      return (b.start?.offset || 0) - (a.start?.offset || 0);
    });

    for (const segment of sortedSegments) {
      const code = codeMap[segment.codeId];
      if (!code) continue;

      try {
        const range = offsetToRange(contentRoot, segment.start.offset, segment.end.offset);
        if (!range) continue;

        const mark = document.createElement('mark');
        mark.className = 'code-highlight';
        mark.style.backgroundColor = hexToRGBA(code.color || '#FFD700', 0.3);
        mark.dataset.segmentId = segment.id;
        mark.dataset.codeId = segment.codeId;
        mark.title = code.name;

        mark.addEventListener('click', (e) => {
          e.stopPropagation();
          state.set('ui.activeCodeId', segment.codeId, { trackDirty: false });
        });

        // Right-click to uncode
        mark.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          showSegmentPopover(e, segment, code);
        });

        highlightRange(range, mark);
      } catch (e) {
        console.warn('Could not highlight segment:', segment.id, e.message);
      }
    }
  }

  function highlightRange(range, mark) {
    try {
      range.surroundContents(mark);
      return;
    } catch (_) {
      // Range spans multiple nodes — wrap each text node individually
    }

    const doc = range.startContainer.ownerDocument;
    const walker = doc.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    const textNodes = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (range.intersectsNode(node)) {
        textNodes.push(node);
      }
    }

    for (const node of textNodes) {
      const clone = mark.cloneNode(false);
      let target = node;

      if (node === range.startContainer && range.startOffset > 0) {
        target = node.splitText(range.startOffset);
      }
      if (target === range.endContainer && range.endOffset < target.textContent.length) {
        target.splitText(range.endOffset);
      } else if (node === range.endContainer && range.endOffset < node.textContent.length) {
        node.splitText(range.endOffset);
        target = node;
      }

      target.parentNode.insertBefore(clone, target);
      clone.appendChild(target);
    }
  }

  function offsetToRange(root, startOffset, endOffset) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let charCount = 0;
    let startNode = null, startOff = 0;
    let endNode = null, endOff = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const len = node.textContent.length;

      if (!startNode && charCount + len > startOffset) {
        startNode = node;
        startOff = startOffset - charCount;
      }
      if (!endNode && charCount + len >= endOffset) {
        endNode = node;
        endOff = endOffset - charCount;
        break;
      }
      charCount += len;
    }

    if (!startNode || !endNode) return null;

    const range = document.createRange();
    range.setStart(startNode, startOff);
    range.setEnd(endNode, endOff);
    return range;
  }

  // ── Segment Popover (Uncode) ──
  function showSegmentPopover(e, segment, code) {
    // Remove any existing popover
    document.querySelectorAll('.segment-popover').forEach(el => el.remove());

    const popover = document.createElement('div');
    popover.className = 'segment-popover';
    popover.style.left = e.clientX + 'px';
    popover.style.top = e.clientY + 'px';
    popover.innerHTML = `
      <div class="segment-popover-header">
        <span class="code-color" style="background:${code.color}"></span>
        <strong>${code.name}</strong>
      </div>
      <div class="segment-popover-text">${(segment.text || '').slice(0, 80)}${(segment.text || '').length > 80 ? '...' : ''}</div>
      <button class="btn btn-small btn-danger segment-uncode-btn">Remove Code</button>
    `;

    document.body.appendChild(popover);

    popover.querySelector('.segment-uncode-btn').addEventListener('click', () => {
      state.pushUndo();
      const coding = state.get(`codings.${currentSourceId}`);
      if (coding) {
        coding.segments = coding.segments.filter(s => s.id !== segment.id);
        coding.version++;
        coding.modified = new Date().toISOString();
        state.set(`codings.${currentSourceId}`, { ...coding });
      }
      popover.remove();
    });

    // Close on outside click
    const closeHandler = (ev) => {
      if (!popover.contains(ev.target)) {
        popover.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
  }

  // ── Search ──
  searchEl.addEventListener('input', () => {
    const query = searchEl.value.trim().toLowerCase();
    if (!query || !contentRoot) return;

    // Simple text search: find and scroll to first match
    const walker = document.createTreeWalker(contentRoot, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const idx = walker.currentNode.textContent.toLowerCase().indexOf(query);
      if (idx !== -1) {
        const range = document.createRange();
        range.setStart(walker.currentNode, idx);
        range.setEnd(walker.currentNode, idx + query.length);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        walker.currentNode.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
  });
}

function hexToRGBA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── js/components/code-panel.js ──

function initCodePanel(state, storage) {
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

// ── js/components/note-editor.js ──

function initNoteEditor(state, storage) {
  // Listen for note events
  window.addEventListener('koali-new-note', () => openNoteModal());
  window.addEventListener('koali-edit-note', (e) => openNoteModal(e.detail.noteId));

  function openNoteModal(noteId = null) {
    const modal = document.getElementById('modal-content');
    const existing = noteId ? state.get(`notes.items.${noteId}`) : null;

    const codes = (state.get('codebook.codes') || []).filter(c => !c.deleted);
    const sources = state.get('sources.manifest') || [];
    const allNoteItems = state.get('notes.items') || {};
    const allNotes = (state.get('notes.manifest') || []).map(r => allNoteItems[r.id]).filter(Boolean);

    modal.innerHTML = `
      <div class="modal-header">
        <h2>${existing ? 'Edit Note' : 'New Note'}</h2>
        <button class="modal-close" id="note-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="note-title" value="${escapeAttr(existing?.title || '')}" placeholder="Note title..." />
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:1">
            <label>Type</label>
            <select id="note-type">
              ${NOTE_TYPES.map(t => `<option value="${t.value}" ${existing?.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="flex:1">
            <label>Linked To</label>
            <select id="note-link-type">
              <option value="">Standalone</option>
              <option value="code" ${existing?.linkedTo?.type === 'code' ? 'selected' : ''}>Code</option>
              <option value="source" ${existing?.linkedTo?.type === 'source' ? 'selected' : ''}>Document</option>
            </select>
          </div>
          <div class="form-group" style="flex:1" id="note-link-target-group">
            <label>Target</label>
            <select id="note-link-target">
              <option value="">None</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Tags (comma-separated)</label>
          <input type="text" id="note-tags" value="${escapeAttr(existing?.tags?.join(', ') || '')}" placeholder="tag1, tag2..." />
        </div>
        <div class="form-group">
          <label>Linked Notes</label>
          <select id="note-linked-notes" multiple style="height:80px;">
            ${allNotes.filter(m => m.id !== noteId).map(m => `<option value="${m.id}" ${(existing?.linkedNotes || []).includes(m.id) ? 'selected' : ''}>${escapeHtml(m.title)}</option>`).join('')}
          </select>
          <small style="color:var(--text-secondary);font-size:11px;">Ctrl/Cmd+click to select multiple</small>
        </div>
        <div class="form-group">
          <label>Content</label>
          <div id="note-editor-quill" style="height:200px;"></div>
        </div>
      </div>
      <div class="modal-footer">
        ${existing ? '<button class="btn btn-danger" id="note-delete">Delete</button>' : ''}
        <button class="btn" id="note-cancel">Cancel</button>
        <button class="btn btn-primary" id="note-save">Save</button>
      </div>
    `;

    document.getElementById('modal-overlay').classList.remove('hidden');

    // Initialize Quill if available
    let quill = null;
    const editorEl = document.getElementById('note-editor-quill');
    if (window.Quill) {
      quill = new Quill(editorEl, {
        theme: 'snow',
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['clean']
          ]
        }
      });
      if (existing?.content) {
        quill.root.innerHTML = existing.content;
      }
    } else {
      // Fallback: plain textarea
      editorEl.innerHTML = `<textarea id="note-textarea" style="width:100%;height:200px;font-family:inherit;padding:8px;">${escapeHtml(existing?.content || '')}</textarea>`;
    }

    // Update link target options based on link type
    const linkTypeEl = document.getElementById('note-link-type');
    const linkTargetEl = document.getElementById('note-link-target');
    function updateLinkTargets() {
      const type = linkTypeEl.value;
      if (type === 'code') {
        linkTargetEl.innerHTML = '<option value="">Select code...</option>' +
          codes.map(c => `<option value="${c.id}" ${existing?.linkedTo?.id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
      } else if (type === 'source') {
        linkTargetEl.innerHTML = '<option value="">Select document...</option>' +
          sources.map(s => `<option value="${s.id}" ${existing?.linkedTo?.id === s.id ? 'selected' : ''}>${escapeHtml(s.title)}</option>`).join('');
      } else {
        linkTargetEl.innerHTML = '<option value="">None</option>';
      }
    }
    linkTypeEl.addEventListener('change', updateLinkTargets);
    updateLinkTargets();

    // Close
    const close = () => {
      document.getElementById('modal-overlay').classList.add('hidden');
      modal.innerHTML = '';
    };
    document.getElementById('note-close').addEventListener('click', close);
    document.getElementById('note-cancel').addEventListener('click', close);

    // Save
    document.getElementById('note-save').addEventListener('click', () => {
      const title = document.getElementById('note-title').value.trim() || 'Untitled Note';
      const type = document.getElementById('note-type').value;
      const tags = document.getElementById('note-tags').value.split(',').map(t => t.trim()).filter(Boolean);
      const linkType = linkTypeEl.value;
      const linkTarget = linkTargetEl.value;
      const content = quill ? quill.root.innerHTML : document.getElementById('note-textarea')?.value || '';

      const linkedTo = linkType && linkTarget ? { type: linkType, id: linkTarget } : null;
      const linkedNotes = Array.from(document.getElementById('note-linked-notes').selectedOptions).map(o => o.value);

      if (existing) {
        // Update existing note
        const updated = {
          ...existing,
          title, type, content, linkedTo, tags, linkedNotes,
          modified: new Date().toISOString(),
          modifiedBy: state.get('user.id')
        };
        const items = { ...state.get('notes.items'), [noteId]: updated };
        state.set('notes.items', items);
      } else {
        // Create new note
        const note = createNote(title, type, linkedTo, state.get('user.id'));
        note.content = content;
        note.tags = tags;
        note.linkedNotes = linkedNotes;
        const manifest = [...(state.get('notes.manifest') || []), { id: note.id }];
        const items = { ...state.get('notes.items'), [note.id]: note };
        state.set('notes.manifest', manifest);
        state.set('notes.items', items);
      }

      close();
    });

    // Delete
    if (existing) {
      document.getElementById('note-delete').addEventListener('click', () => {
        if (!confirm('Delete this note?')) return;
        const manifest = (state.get('notes.manifest') || []).filter(m => m.id !== noteId);
        const items = { ...state.get('notes.items') };
        delete items[noteId];
        state.set('notes.manifest', manifest);
        state.set('notes.items', items);
        close();
      });
    }
  }
}

// ── js/components/query-builder.js ──

function initQueryBuilder(state, storage) {
  const container = document.getElementById('query-builder');

  function render() {
    const codes = (state.get('codebook.codes') || []).filter(c => !c.deleted);
    const sources = state.get('sources.manifest') || [];
    const savedQueries = state.get('queries.saved') || [];
    const themes = (state.get('themes.themes') || []).filter(t => !t.deleted);

    container.innerHTML = `
      <h2 style="margin-bottom:16px;">Query Builder</h2>

      ${themes.length > 0 ? `
        <div style="margin-bottom:12px;">
          <label style="font-size:13px;color:var(--text-secondary);display:block;margin-bottom:4px;">Quick: Select by Theme</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${themes.map(t => `
              <button class="btn btn-small theme-select-btn" data-theme-id="${t.id}" style="border-left:3px solid ${t.color}">
                ${escapeHtml(t.name)} (${t.codeIds.length})
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="form-row" style="margin-bottom:16px;">
        <div class="form-group" style="flex:2">
          <label>Select Codes</label>
          <select id="query-codes" multiple size="6" style="width:100%">
            ${codes.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
          </select>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Hold Ctrl/Cmd to select multiple</div>
        </div>
        <div class="form-group" style="flex:1">
          <label>Operator</label>
          <select id="query-operator">
            <option value="OR">OR (any of selected)</option>
            <option value="AND">AND (all in same document)</option>
            <option value="NOT">NOT (first minus others)</option>
            <option value="COOCCUR">CO-OCCUR (overlapping ranges)</option>
            <option value="PROXIMITY">PROXIMITY (near each other)</option>
          </select>
          <div id="proximity-opts" style="margin-top:6px;display:none;">
            <label style="font-size:12px;">Max distance (chars)</label>
            <input type="number" id="query-proximity-dist" value="500" min="1" max="10000" style="width:100px;" />
          </div>
        </div>
        <div class="form-group" style="flex:1">
          <label>Filter Documents</label>
          <select id="query-docs" multiple size="6">
            <option value="" selected>All documents</option>
            ${sources.map(s => `<option value="${s.id}">${escapeHtml(s.title)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="margin-bottom:16px;display:flex;gap:8px;">
        <button class="btn btn-primary" id="query-run">Run Query</button>
        <button class="btn" id="query-save">Save Query</button>
        <button class="btn" id="query-export" disabled>Export CSV</button>
      </div>

      ${savedQueries.length > 0 ? `
        <div style="margin-bottom:16px;">
          <label style="font-size:13px;color:var(--text-secondary);">Saved Queries</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">
            ${savedQueries.map(sq => `
              <span style="display:inline-flex;align-items:center;gap:2px;">
                <button class="btn btn-small saved-query-btn" data-query-id="${sq.id}">${escapeHtml(sq.name)}</button>
                <button class="btn btn-small saved-query-rename" data-query-id="${sq.id}" title="Rename" style="padding:2px 4px;">&#9998;</button>
                <button class="btn btn-small btn-danger saved-query-delete" data-query-id="${sq.id}" title="Delete" style="padding:2px 4px;">&times;</button>
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div id="query-results"></div>
    `;

    // Run query
    document.getElementById('query-run').addEventListener('click', runQuery);
    document.getElementById('query-save').addEventListener('click', saveQuery);
    document.getElementById('query-export').addEventListener('click', exportResults);

    // Theme quick-select buttons
    container.querySelectorAll('.theme-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = themes.find(t => t.id === btn.dataset.themeId);
        if (!theme) return;
        const codesEl = document.getElementById('query-codes');
        const codeIdSet = new Set(theme.codeIds);
        Array.from(codesEl.options).forEach(o => o.selected = codeIdSet.has(o.value));
      });
    });

    // Proximity toggle
    const opEl = document.getElementById('query-operator');
    const proxOpts = document.getElementById('proximity-opts');
    opEl.addEventListener('change', () => {
      proxOpts.style.display = opEl.value === 'PROXIMITY' ? 'block' : 'none';
    });

    // Saved query buttons
    container.querySelectorAll('.saved-query-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sq = savedQueries.find(q => q.id === btn.dataset.queryId);
        if (sq) {
          applyQuery(sq.query);
          runQuery();
        }
      });
    });
    container.querySelectorAll('.saved-query-rename').forEach(btn => {
      btn.addEventListener('click', () => {
        const sq = savedQueries.find(q => q.id === btn.dataset.queryId);
        if (!sq) return;
        const name = prompt('Rename query:', sq.name);
        if (name && name !== sq.name) {
          sq.name = name;
          state.set('queries.saved', [...savedQueries]);
        }
      });
    });
    container.querySelectorAll('.saved-query-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this saved query?')) return;
        const filtered = savedQueries.filter(q => q.id !== btn.dataset.queryId);
        state.set('queries.saved', filtered);
      });
    });
  }

  let lastResults = null;
  let lastQuery = null;

  function getQuery() {
    const codesEl = document.getElementById('query-codes');
    const codeIds = Array.from(codesEl.selectedOptions).map(o => o.value);
    const operator = document.getElementById('query-operator').value;
    const docsEl = document.getElementById('query-docs');
    const docFilter = Array.from(docsEl.selectedOptions).map(o => o.value).filter(Boolean);

    const proximityDistance = operator === 'PROXIMITY' ? parseInt(document.getElementById('query-proximity-dist')?.value || '500') : undefined;
    return { codes: codeIds, operator, documentFilter: docFilter.length > 0 ? docFilter : null, proximityDistance };
  }

  function applyQuery(query) {
    const codesEl = document.getElementById('query-codes');
    Array.from(codesEl.options).forEach(o => o.selected = query.codes.includes(o.value));
    document.getElementById('query-operator').value = query.operator;
  }

  function runQuery() {
    const query = getQuery();
    if (query.codes.length === 0) {
      document.getElementById('query-results').innerHTML = '<p style="color:var(--text-muted)">Select at least one code.</p>';
      return;
    }

    lastQuery = query;
    lastResults = executeQuery(state.get('codings') || {}, state.get('codebook') || {}, query);
    document.getElementById('query-export').disabled = lastResults.length === 0;

    renderResults(lastResults);
  }

  function renderResults(results) {
    const el = document.getElementById('query-results');
    const sources = state.get('sources.manifest') || [];
    const sourceMap = {};
    for (const s of sources) sourceMap[s.id] = s;

    if (results.length === 0) {
      el.innerHTML = '<p style="color:var(--text-muted)">No results found.</p>';
      return;
    }

    el.innerHTML = `
      <h3 style="margin-bottom:8px;">${results.length} result(s)</h3>
      <table>
        <thead>
          <tr><th>Document</th><th>Code</th><th>Speaker</th><th>Text</th></tr>
        </thead>
        <tbody>
          ${results.map(r => {
            const src = sourceMap[r.sourceId];
            return `<tr>
              <td>${escapeHtml(src?.title || r.sourceId)}</td>
              <td><span class="code-color" style="background:${r.code?.color || '#999'};display:inline-block;width:8px;height:8px;border-radius:50;"></span> ${escapeHtml(r.code?.name || '')}</td>
              <td>${escapeHtml(r.segment.speaker || '')}</td>
              <td>${escapeHtml(r.segment.text?.slice(0, 200) || '')}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function saveQuery() {
    const query = getQuery();
    if (query.codes.length === 0) { alert('Select codes first.'); return; }
    const name = prompt('Query name:');
    if (!name) return;
    const saved = createSavedQuery(name, query);
    const list = [...(state.get('queries.saved') || []), saved];
    state.set('queries.saved', list);
    render();
  }

  function exportResults() {
    if (!lastResults || lastResults.length === 0) return;
    const sources = state.get('sources.manifest') || [];
    const csv = queryResultsToCSV(lastResults, lastQuery, sources);
    downloadCSV(csv, 'query-results.csv');
  }

  // Re-render when switching to queries tab
  state.subscribe('ui.activeTab', (tab) => {
    if (tab === 'queries') render();
  });

  render();
}

// ── js/components/visualizations.js ──

function initVisualizations(state) {
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

// ── js/components/irr-dashboard.js ──

function initIRRDashboard(state) {
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

// ── js/components/conflict-resolver.js ──

function initConflictResolver(container, state, storage) {
  const conflicts = state.get('conflicts') || [];
  if (conflicts.length === 0) {
    container.innerHTML = '<p>No conflicts to resolve.</p>';
    return;
  }

  let currentIndex = 0;

  function render() {
    if (currentIndex >= conflicts.length) {
      // All resolved
      state.set('conflicts', []);
      state.set('ui.modal', null, { trackDirty: false });
      return;
    }

    const conflict = conflicts[currentIndex];
    container.innerHTML = `
      <div class="modal-header">
        <h2>Conflicts Detected</h2>
        <button class="modal-close" id="conflict-close">&times;</button>
      </div>
      <div class="modal-body">
        <p style="color:var(--text-secondary);margin-bottom:12px;">
          Conflict ${currentIndex + 1} of ${conflicts.length}
        </p>
        ${renderConflict(conflict)}
      </div>
      <div class="modal-footer">
        <button class="btn" id="conflict-skip">Skip for now</button>
        <button class="btn btn-primary" id="conflict-apply">Apply & Continue</button>
      </div>
    `;

    document.getElementById('conflict-close').addEventListener('click', () => {
      state.set('ui.modal', null, { trackDirty: false });
    });

    document.getElementById('conflict-skip').addEventListener('click', () => {
      currentIndex++;
      render();
    });

    document.getElementById('conflict-apply').addEventListener('click', () => {
      applyResolution(conflict);
      currentIndex++;
      render();
    });
  }

  function renderConflict(conflict) {
    switch (conflict.type) {
      case 'code-rename':
        return `
          <p>Code <strong>${conflict.itemId}</strong> was renamed by multiple users:</p>
          <div style="margin:12px 0;">
            ${conflict.versions.map((v, i) => `
              <label style="display:block;padding:8px;background:var(--bg-secondary);border-radius:var(--radius-sm);margin-bottom:6px;cursor:pointer;">
                <input type="radio" name="conflict-choice" value="${i}" ${i === 0 ? 'checked' : ''} />
                "${escapeHtml(v.value)}" <span style="color:var(--text-muted);">(by ${v.by}, ${new Date(v.at).toLocaleString()})</span>
              </label>
            `).join('')}
            <label style="display:block;padding:8px;">
              <input type="radio" name="conflict-choice" value="custom" />
              Custom: <input type="text" id="conflict-custom" style="width:200px;margin-left:8px;" />
            </label>
          </div>
        `;

      case 'code-deleted':
        return `
          <p>Code was modified by one user and deleted by another:</p>
          <div style="margin:12px 0;">
            ${conflict.versions.map((v, i) => `
              <label style="display:block;padding:8px;background:var(--bg-secondary);border-radius:var(--radius-sm);margin-bottom:6px;cursor:pointer;">
                <input type="radio" name="conflict-choice" value="${i}" ${i === 0 ? 'checked' : ''} />
                ${v.action === 'deleted' ? 'Delete' : `Keep "${escapeHtml(v.value)}"`}
                <span style="color:var(--text-muted);">(by ${v.by})</span>
              </label>
            `).join('')}
          </div>
        `;

      case 'note-content':
        return `
          <p>Note "${escapeHtml(conflict.title)}" was edited by multiple users:</p>
          <div style="margin:12px 0;">
            ${conflict.versions.map((v, i) => `
              <label style="display:block;padding:8px;background:var(--bg-secondary);border-radius:var(--radius-sm);margin-bottom:6px;cursor:pointer;">
                <input type="radio" name="conflict-choice" value="${i}" ${i === 0 ? 'checked' : ''} />
                Version by ${v.by} (${new Date(v.at).toLocaleString()})
                <div style="font-size:12px;color:var(--text-muted);margin-top:4px;max-height:100px;overflow:auto;">${v.content?.slice(0, 300) || ''}</div>
              </label>
            `).join('')}
          </div>
        `;

      default:
        return `<p>Unknown conflict type: ${conflict.type}</p>`;
    }
  }

  function applyResolution(conflict) {
    const selected = container.querySelector('input[name="conflict-choice"]:checked');
    if (!selected) return;

    const value = selected.value;

    switch (conflict.type) {
      case 'code-rename': {
        const codes = state.get('codebook.codes') || [];
        const code = codes.find(c => c.id === conflict.itemId);
        if (!code) break;
        let newName;
        if (value === 'custom') {
          newName = document.getElementById('conflict-custom').value.trim();
        } else {
          newName = conflict.versions[parseInt(value)].value;
        }
        if (newName) {
          code.name = newName;
          state.set('codebook.codes', [...codes]);
        }
        break;
      }

      case 'code-deleted': {
        const codes = state.get('codebook.codes') || [];
        const version = conflict.versions[parseInt(value)];
        if (version.action === 'deleted') {
          // Confirm deletion
          const code = codes.find(c => c.id === conflict.itemId);
          if (code) {
            code.deleted = true;
            state.set('codebook.codes', [...codes]);
          }
        }
        // Otherwise keep as-is (already preserved in merge)
        break;
      }

      case 'note-content': {
        const idx = parseInt(value);
        const version = conflict.versions[idx];
        const note = state.get(`notes.items.${conflict.itemId}`);
        if (note && version) {
          note.content = version.content;
          note.modified = version.at;
          note.modifiedBy = version.by;
          state.set(`notes.items.${conflict.itemId}`, { ...note });
        }
        break;
      }
    }
  }

  render();
}

// ── js/components/settings.js ──

function initSettings(state, storage) {
  // Listen for settings modal
  const origSubscribe = state.subscribe('ui.modal', (modal) => {
    if (modal === 'settings') {
      openSettings();
    }
  });

  function openSettings() {
    const modal = document.getElementById('modal-content');
    const user = state.get('user') || {};
    const project = state.get('project') || {};

    const colors = ['#2196F3', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#795548', '#607D8B'];

    modal.innerHTML = `
      <div class="modal-header">
        <h2>Settings</h2>
        <button class="modal-close" id="settings-close">&times;</button>
      </div>
      <div class="modal-body">
        <h3 style="margin-bottom:12px;">User Profile</h3>
        <div class="form-group">
          <label>Display Name</label>
          <input type="text" id="settings-name" value="${escapeAttr(user.displayName)}" />
        </div>
        <div class="form-group">
          <label>Color</label>
          <div class="color-picker-grid">
            ${colors.map(c => `
              <div class="color-swatch ${c === user.color ? 'selected' : ''}" style="background:${c}" data-color="${c}"></div>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>User ID</label>
          <input type="text" value="${user.id || ''}" disabled style="background:var(--bg-secondary);color:var(--text-muted);font-size:11px;" />
        </div>

        <hr style="margin:16px 0;border:none;border-top:1px solid var(--border);" />

        <h3 style="margin-bottom:12px;">Project</h3>
        <div class="form-group">
          <label>Project Name</label>
          <input type="text" id="settings-project-name" value="${escapeAttr(project.name)}" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="settings-project-desc" rows="3">${escapeHtml(project.description)}</textarea>
        </div>

        <hr style="margin:16px 0;border:none;border-top:1px solid var(--border);" />

        <h3 style="margin-bottom:12px;">Team Members</h3>
        <div id="settings-members">
          ${renderMembers(project)}
        </div>
        <div style="margin-top:8px;display:flex;gap:6px;">
          <input type="text" id="settings-add-member-id" placeholder="User ID" style="flex:1;" />
          <select id="settings-add-member-role"><option value="editor">Editor</option><option value="viewer">Viewer</option></select>
          <button class="btn btn-small" id="settings-add-member">Add</button>
        </div>

        <hr style="margin:16px 0;border:none;border-top:1px solid var(--border);" />

        <h3 style="margin-bottom:12px;">Activity Log</h3>
        <div style="max-height:200px;overflow-y:auto;font-size:12px;border:1px solid var(--border);border-radius:var(--radius);padding:8px;">
          ${(state.get('activityLog') || []).slice(-50).reverse().map(e =>
            `<div style="margin-bottom:4px;"><span style="color:var(--text-muted);">${new Date(e.timestamp).toLocaleString()}</span> <strong>${escapeHtml(e.action)}</strong> ${escapeHtml(e.summary || '')}</div>`
          ).join('') || '<div style="color:var(--text-muted);">No activity yet.</div>'}
        </div>

        <hr style="margin:16px 0;border:none;border-top:1px solid var(--border);" />

        <h3 style="margin-bottom:12px;">Actions</h3>
        <div style="display:flex;gap:8px;">
          <button class="btn" id="settings-save-all">Save All Now</button>
          <button class="btn" id="settings-export-codebook">Export Codebook (CSV)</button>
          <button class="btn" id="settings-backup">Backup Project (JSON)</button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" id="settings-cancel">Cancel</button>
        <button class="btn btn-primary" id="settings-save">Save Settings</button>
      </div>
    `;

    document.getElementById('modal-overlay').classList.remove('hidden');

    let selectedColor = user.color;

    modal.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        modal.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        selectedColor = swatch.dataset.color;
      });
    });

    const close = () => {
      state.set('ui.modal', null, { trackDirty: false });
    };

    document.getElementById('settings-close').addEventListener('click', close);
    document.getElementById('settings-cancel').addEventListener('click', close);

    document.getElementById('settings-save').addEventListener('click', () => {
      const name = document.getElementById('settings-name').value.trim();
      const newUser = { ...user, displayName: name, color: selectedColor };
      state.set('user', newUser, { trackDirty: false });
      localStorage.setItem('koali-user', JSON.stringify(newUser));

      const projName = document.getElementById('settings-project-name').value.trim();
      const projDesc = document.getElementById('settings-project-desc').value.trim();
      if (project) {
        state.set('project', {
          ...project,
          name: projName || project.name,
          description: projDesc,
          modified: new Date().toISOString()
        });
      }

      close();
    });

    document.getElementById('settings-save-all').addEventListener('click', () => {
      storage.saveAll();
    });

    document.getElementById('settings-backup').addEventListener('click', () => {
      storage.backupProject();
    });

    document.getElementById('settings-add-member').addEventListener('click', () => {
      const memberId = document.getElementById('settings-add-member-id').value.trim();
      const role = document.getElementById('settings-add-member-role').value;
      if (!memberId) return;
      const proj = state.get('project') || {};
      const members = proj.members || [];
      if (members.find(m => m.userId === memberId)) { alert('Already a member.'); return; }
      members.push({ userId: memberId, role });
      state.set('project', { ...proj, members });
      document.getElementById('settings-members').innerHTML = renderMembers(state.get('project'));
      document.getElementById('settings-add-member-id').value = '';
    });

    document.getElementById('settings-export-codebook').addEventListener('click', () => {
      const { codesToCSV } = window.__koali_codebook || {};
      // Use inline export
      const codes = state.get('codebook.codes') || [];
      const header = 'Code Name,Description,Color,Parent,Created';
      const rows = codes.filter(c => !c.deleted).map(c => {
        const parent = c.parentId ? (codes.find(p => p.id === c.parentId)?.name || '') : '';
        return [csvEscape(c.name), csvEscape(c.description), c.color, csvEscape(parent), c.created].join(',');
      });
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'codebook.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

function renderMembers(project) {
  const members = (project && project.members) || [];
  if (members.length === 0) return '<div style="color:var(--text-muted);font-size:13px;">No team members added. All users have full access.</div>';
  return members.map(m =>
    `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:13px;">
      <span>${escapeHtml(m.userId)}</span>
      <span style="color:var(--text-secondary);">(${m.role})</span>
    </div>`
  ).join('');
}

// ── js/components/theme-panel.js ──

function initThemePanel(state, storage) {
  const container = document.getElementById('themes-panel');
  if (!container) return;

  function render() {
    const themes = (state.get('themes.themes') || []).filter(t => !t.deleted);
    const codes = (state.get('codebook.codes') || []).filter(c => !c.deleted);
    const codings = state.get('codings') || {};

    container.innerHTML = `
      <div class="themes-toolbar">
        <button id="btn-new-theme" class="btn btn-small btn-primary">+ New Theme</button>
      </div>
      <div class="themes-list">
        ${themes.length === 0 ? '<div class="empty-state" style="height:80px;font-size:13px;">No themes yet. Create a theme to group codes into higher-order patterns.</div>' : ''}
        ${themes.map(theme => {
          const segments = getThemeSegments(theme, codings);
          const themeCodes = codes.filter(c => theme.codeIds.includes(c.id));
          return `
            <div class="theme-card" data-theme-id="${theme.id}">
              <div class="theme-card-header">
                <span class="theme-color-swatch" style="background:${theme.color}"></span>
                <span class="theme-name">${escapeHtml(theme.name)}</span>
                <span class="theme-stats">${themeCodes.length} codes &middot; ${segments.length} segments</span>
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
function getThemeBadgesForCode(themes, codeId) {
  return getThemesForCode(themes || [], codeId);
}

// ── js/components/project-home.js ──

function initProjectHome(state, storage) {
  const btnCreate = document.getElementById('btn-create-project');
  const btnOpen = document.getElementById('btn-open-project');
  const nameInput = document.getElementById('input-user-name');
  const recentEl = document.getElementById('recent-projects');
  const warningEl = document.getElementById('no-fs-warning');

  // Check File System Access API
  if (!storage.hasFileSystemAccess) {
    warningEl.classList.remove('hidden');
    btnCreate.disabled = true;
    btnOpen.disabled = true;
    return;
  }

  // Load user from localStorage
  const savedUser = localStorage.getItem('koali-user');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    state.set('user', user, { trackDirty: false });
    nameInput.value = user.displayName || '';
  } else {
    const user = { id: uuid(), displayName: '', color: '#2196F3' };
    state.set('user', user, { trackDirty: false });
  }

  nameInput.addEventListener('change', () => {
    const user = state.get('user');
    user.displayName = nameInput.value.trim();
    state.set('user', user, { trackDirty: false });
    localStorage.setItem('koali-user', JSON.stringify(user));
  });

  // Render recent projects
  renderRecent();

  btnCreate.addEventListener('click', async () => {
    try {
      ensureUser();
      await storage.pickFolder();
      const manifest = createProject('Untitled Project', '', state.get('user.id'));

      // Prompt for name
      const name = prompt('Project name:', 'My Research Project');
      if (name === null) return;
      manifest.name = name || 'Untitled Project';

      await storage.createProject(manifest);

      // Load into state
      state.set('project', manifest);
      state.set('codebook', { version: 1, modified: manifest.created, modifiedBy: state.get('user.id'), codes: [] });
      state.set('sources', { manifest: [], activeSourceId: null });
      state.set('codings', {});
      state.set('notes', { manifest: [], items: {} });
      state.set('queries', { saved: [] });
      state.set('ui.view', 'workspace', { trackDirty: false });

      addRecent(manifest.name);
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('Create project failed:', e);
        alert('Failed to create project: ' + e.message);
      }
    }
  });

  btnOpen.addEventListener('click', async () => {
    try {
      ensureUser();
      await storage.pickFolder();
      const data = await storage.openProject();

      state.set('project', data.project);
      state.set('codebook', data.codebook);
      state.set('sources', data.sources);
      state.set('codings', data.codings);
      state.set('notes', data.notes);
      state.set('queries', data.queries);
      state.set('conflicts', data.conflicts);
      state.set('ui.view', 'workspace', { trackDirty: false });

      addRecent(data.project.name);

      // If conflicts exist, notify
      if (data.conflicts.length > 0) {
        state.set('ui.modal', 'conflicts', { trackDirty: false });
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('Open project failed:', e);
        alert('Failed to open project: ' + e.message);
      }
    }
  });

  function ensureUser() {
    const user = state.get('user');
    if (!user.displayName) {
      const name = nameInput.value.trim() || prompt('Enter your name:');
      if (!name) throw new Error('Name required');
      user.displayName = name;
      nameInput.value = name;
      state.set('user', user, { trackDirty: false });
      localStorage.setItem('koali-user', JSON.stringify(user));
    }
  }

  function addRecent(name) {
    const recent = JSON.parse(localStorage.getItem('koali-recent') || '[]');
    const filtered = recent.filter(r => r.name !== name);
    filtered.unshift({ name, lastOpened: new Date().toISOString() });
    localStorage.setItem('koali-recent', JSON.stringify(filtered.slice(0, 10)));
    renderRecent();
  }

  function renderRecent() {
    const recent = JSON.parse(localStorage.getItem('koali-recent') || '[]');
    if (recent.length === 0) {
      recentEl.innerHTML = '';
      return;
    }
    recentEl.innerHTML = `<h3>Recent Projects</h3>` +
      recent.map(r => `<div class="recent-item">${escapeHtml(r.name)}</div>`).join('');
  }
}

// ── js/app.js ──

const state = new KoaliState();
const storage = new KoaliStorage(state);

// ── View Routing ──
state.subscribe('ui.view', (view) => {
  document.getElementById('home-view').classList.toggle('hidden', view !== 'home');
  document.getElementById('workspace-view').classList.toggle('hidden', view !== 'workspace');
  if (view === 'workspace') {
    initWorkspace();
  }
});

// ── Tab Switching ──
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const tabId = `tab-${btn.dataset.tab}`;
    document.getElementById(tabId).classList.add('active');
    state.set('ui.activeTab', btn.dataset.tab, { trackDirty: false });
  });
});

// ── Status Bar ──
state.subscribe('sources.manifest', (sources) => {
  document.getElementById('status-sources').textContent = `Sources: ${(sources || []).length}`;
});
state.subscribe('codebook.codes', (codes) => {
  document.getElementById('status-codes').textContent = `Codes: ${(codes || []).length}`;
});
state.subscribe('codings', (codings) => {
  let total = 0;
  for (const src of Object.values(codings || {})) {
    total += (src.segments || []).length;
  }
  document.getElementById('status-segments').textContent = `Segments: ${total}`;
});
state.subscribe('themes.themes', (themes) => {
  const count = (themes || []).filter(t => !t.deleted).length;
  document.getElementById('status-themes').textContent = `Themes: ${count}`;
});
state.subscribe('ui.status', (status) => {
  document.getElementById('status-save').textContent = status || 'Ready';
});

// ── Project Name ──
state.subscribe('project', (project) => {
  if (project) {
    document.getElementById('project-name').textContent = project.name;
    document.title = `${project.name} — Koali`;
  }
});

// ── User Display ──
state.subscribe('user', (user) => {
  document.getElementById('user-display').textContent = user?.displayName || '';
});

// ── Modal ──
state.subscribe('ui.modal', (modal) => {
  const overlay = document.getElementById('modal-overlay');
  if (modal) {
    overlay.classList.remove('hidden');
    if (modal === 'conflicts') {
      initConflictResolver(document.getElementById('modal-content'), state, storage);
    }
  } else {
    overlay.classList.add('hidden');
    document.getElementById('modal-content').innerHTML = '';
  }
});

document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    state.set('ui.modal', null, { trackDirty: false });
  }
});

// ── Context Menu ──
document.addEventListener('click', () => {
  document.getElementById('context-menu').classList.add('hidden');
});

// ── Init Home ──
initProjectHome(state, storage);

// ── Workspace Init ──
let workspaceInitialized = false;
function initWorkspace() {
  if (workspaceInitialized) return;
  workspaceInitialized = true;

  initSourcePanel(state, storage);
  initDocumentViewer(state, storage);
  initCodePanel(state, storage);
  initNoteEditor(state, storage);
  initQueryBuilder(state, storage);
  initVisualizations(state);
  initIRRDashboard(state);
  initThemePanel(state, storage);
  initSettings(state, storage);
  initResizers();
  initKeyboardShortcuts();
  storage.startAutosave();
}

// ── Resizers ──
function initResizers() {
  document.querySelectorAll('.resizer').forEach(resizer => {
    let startX, startWidth, panel;

    resizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const side = resizer.dataset.resize;
      panel = side === 'left' ? document.getElementById('panel-left') : document.getElementById('panel-right');
      startX = e.clientX;
      startWidth = panel.offsetWidth;
      resizer.classList.add('active');

      const onMouseMove = (e) => {
        const dx = e.clientX - startX;
        const newWidth = side === 'left' ? startWidth + dx : startWidth - dx;
        panel.style.width = Math.max(120, Math.min(600, newWidth)) + 'px';
      };

      const onMouseUp = () => {
        resizer.classList.remove('active');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });
}

// ── Keyboard Shortcuts ──
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const isMod = e.metaKey || e.ctrlKey;

    // Ctrl+S — save
    if (isMod && e.key === 's') {
      e.preventDefault();
      storage.saveAll();
    }

    // Number keys 1-9 — apply code when text selected
    if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const sel = state.get('ui.selectedText');
      if (sel) {
        const codes = state.get('codebook.codes') || [];
        const rootCodes = codes.filter(c => !c.parentId && !c.deleted);
        const idx = parseInt(e.key) - 1;
        if (rootCodes[idx]) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('koali-apply-code', { detail: { codeId: rootCodes[idx].id } }));
        }
      }
    }

    // / — quick code search
    if (e.key === '/' && state.get('ui.selectedText') && !isMod) {
      e.preventDefault();
      const input = document.getElementById('quick-code-search');
      if (input) input.focus();
    }

    // Ctrl+Shift+C — new code
    if (isMod && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('koali-new-code'));
    }

    // Ctrl+Shift+M — new note
    if (isMod && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('koali-new-note'));
    }

    // Ctrl+Z — undo
    if (isMod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      state.undo();
    }

    // Ctrl+Shift+Z — redo
    if (isMod && e.shiftKey && e.key === 'z') {
      e.preventDefault();
      state.redo();
    }
  });
}

// ── Settings Button ──
document.getElementById('btn-settings').addEventListener('click', () => {
  state.set('ui.modal', 'settings', { trackDirty: false });
});

// Expose for debugging
window.__koali = { state, storage };

})();

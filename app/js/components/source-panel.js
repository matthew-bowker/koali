import { detectSourceType, createSourceEntry, getSourceIcon, isTranscriptType } from '../models/source.js';
import { parseText } from '../parsers/text.js';
import { parseVTT } from '../parsers/vtt.js';
import { parseSRT } from '../parsers/srt.js';
import { parseZoomJSON } from '../parsers/zoom-json.js';
import { parseDOCX } from '../parsers/docx.js';
import { parsePDF } from '../parsers/pdf.js';

const parserMap = {
  'text': parseText,
  'transcript-vtt': parseVTT,
  'transcript-srt': parseSRT,
  'transcript-zoom-json': parseZoomJSON,
  'docx': parseDOCX,
  'pdf': parsePDF,
};

export function initSourcePanel(state, storage) {
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

import { createNote, NOTE_TYPES } from '../models/note.js';

export function initNoteEditor(state, storage) {
  // Listen for note events
  window.addEventListener('koali-new-note', (e) => openNoteModal(null, e.detail || null));
  window.addEventListener('koali-edit-note', (e) => openNoteModal(e.detail.noteId));

  function openNoteModal(noteId = null, segmentContext = null) {
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
              <option value="segment" ${existing?.linkedTo?.type === 'segment' || segmentContext?.segmentId ? 'selected' : ''}>Text Segment</option>
            </select>
          </div>
          <div class="form-group" style="flex:1" id="note-link-target-group">
            <label>Target</label>
            <select id="note-link-target">
              <option value="">None</option>
            </select>
          </div>
        </div>
        ${segmentContext?.segmentText ? `<div class="form-group"><label>Linked Text</label><div class="segment-excerpt">${escapeHtml(segmentContext.segmentText.slice(0, 200))}${segmentContext.segmentText.length > 200 ? '...' : ''}</div></div>` : ''}
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
      } else if (type === 'segment') {
        // Show segments from the active source
        const activeSourceId = segmentContext?.sourceId || existing?.linkedTo?.sourceId || state.get('sources.activeSourceId');
        const codings = activeSourceId ? state.get(`codings.${activeSourceId}`) : null;
        const segments = codings?.segments || [];
        const preselectedId = segmentContext?.segmentId || existing?.linkedTo?.id;
        linkTargetEl.innerHTML = '<option value="">Select segment...</option>' +
          segments.map(s => {
            const label = (s.text || '').slice(0, 60) + ((s.text || '').length > 60 ? '...' : '');
            return `<option value="${s.id}" data-source-id="${activeSourceId}" ${s.id === preselectedId ? 'selected' : ''}>${escapeHtml(label)}</option>`;
          }).join('');
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

      let linkedTo = null;
      if (linkType && linkTarget) {
        linkedTo = { type: linkType, id: linkTarget };
        if (linkType === 'segment') {
          // Also store sourceId for segment links
          const selectedOption = linkTargetEl.selectedOptions[0];
          linkedTo.sourceId = selectedOption?.dataset?.sourceId || segmentContext?.sourceId || state.get('sources.activeSourceId');
        }
      }
      const linkedNotes = Array.from(document.getElementById('note-linked-notes').selectedOptions).map(o => o.value);

      let savedNoteId;
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
        savedNoteId = noteId;
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
        savedNoteId = note.id;
      }

      // Link note back to segment
      if (linkedTo?.type === 'segment' && linkedTo.id && linkedTo.sourceId) {
        const coding = state.get(`codings.${linkedTo.sourceId}`);
        if (coding) {
          const seg = coding.segments.find(s => s.id === linkedTo.id);
          if (seg) {
            seg.noteId = savedNoteId;
            coding.modified = new Date().toISOString();
            state.set(`codings.${linkedTo.sourceId}`, { ...coding });
          }
        }
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function escapeAttr(text) {
  return (text || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

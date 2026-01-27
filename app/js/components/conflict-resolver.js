export function initConflictResolver(container, state, storage) {
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

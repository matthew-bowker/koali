export function initSettings(state, storage) {
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

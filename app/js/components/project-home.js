import { createProject } from '../models/project.js';
import { uuid } from '../utils/uuid.js';

export function initProjectHome(state, storage) {
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

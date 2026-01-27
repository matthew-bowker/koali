import { KoaliState } from './state.js';
import { KoaliStorage } from './storage.js';
import { initProjectHome } from './components/project-home.js';
import { initSourcePanel } from './components/source-panel.js';
import { initDocumentViewer } from './components/document-viewer.js';
import { initCodePanel } from './components/code-panel.js';
import { initNoteEditor } from './components/note-editor.js';
import { initQueryBuilder } from './components/query-builder.js';
import { initVisualizations } from './components/visualizations.js';
import { initIRRDashboard } from './components/irr-dashboard.js';
import { initSettings } from './components/settings.js';
import { initConflictResolver } from './components/conflict-resolver.js';
import { initThemePanel } from './components/theme-panel.js';

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

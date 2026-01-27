/**
 * KoaliState — path-based pub/sub state container.
 * Components subscribe to dot-separated paths (e.g. 'codebook.codes').
 * Mutations via set() notify all matching subscribers.
 */
export class KoaliState {
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

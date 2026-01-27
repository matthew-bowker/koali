/**
 * KoaliStorage — File System Access API + IndexedDB persistence.
 */
export class KoaliStorage {
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

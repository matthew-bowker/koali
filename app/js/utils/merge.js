/**
 * Collaboration merge logic.
 * Merges data from multiple users working on the same project folder.
 */

/**
 * Merge two codebooks (by code ID).
 * Returns { merged, conflicts }
 */
export function mergeCodebooks(local, remote) {
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
export function mergeCodings(local, remote) {
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
export function mergeNotes(localManifest, localItems, remoteManifest, remoteItems) {
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
export function mergeThemes(local, remote) {
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

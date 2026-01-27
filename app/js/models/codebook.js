import { uuid } from '../utils/uuid.js';

const DEFAULT_COLORS = [
  '#E63946', '#457B9D', '#2A9D8F', '#E9C46A', '#F4A261',
  '#264653', '#6A4C93', '#1982C4', '#8AC926', '#FF595E',
  '#FFCA3A', '#6A0572', '#AB83A1', '#F15BB5', '#00BBF9',
  '#00F5D4', '#9B5DE5', '#FEE440', '#F72585', '#4CC9F0'
];

let colorIndex = 0;

export function nextColor() {
  const color = DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length];
  colorIndex++;
  return color;
}

export function createCode(name, description, color, parentId, userId) {
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

export function addCodeToList(codes, newCode) {
  const updated = [...codes, newCode];
  if (newCode.parentId) {
    const parent = updated.find(c => c.id === newCode.parentId);
    if (parent && !parent.children.includes(newCode.id)) {
      parent.children = [...parent.children, newCode.id];
    }
  }
  return updated;
}

export function updateCode(codes, codeId, changes, userId) {
  return codes.map(c => {
    if (c.id === codeId) {
      return { ...c, ...changes, modified: new Date().toISOString(), modifiedBy: userId };
    }
    return c;
  });
}

export function deleteCode(codes, codeId) {
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

export function moveCode(codes, codeId, newParentId) {
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

export function mergeCodes(codes, sourceCodeId, targetCodeId) {
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

export function codesToTree(codes) {
  const active = codes.filter(c => !c.deleted);
  const roots = active.filter(c => !c.parentId);
  function buildNode(code) {
    const children = active.filter(c => c.parentId === code.id);
    return { ...code, childNodes: children.map(buildNode) };
  }
  return roots.map(buildNode);
}

export function codesToCSV(codes, segmentCounts = {}) {
  const header = 'Code ID,Code Name,Parent,Description,Color,Created,Created By,Segment Count';
  const rows = codes.filter(c => !c.deleted).map(c => {
    const parent = c.parentId ? (codes.find(p => p.id === c.parentId)?.name || '') : '';
    const count = segmentCounts[c.id] || 0;
    return [c.id, csvEscape(c.name), csvEscape(parent), csvEscape(c.description), c.color, c.created, c.createdBy, count].join(',');
  });
  return [header, ...rows].join('\n');
}

function csvEscape(str) {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

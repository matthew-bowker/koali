import { uuid } from '../utils/uuid.js';

const THEME_COLORS = [
  '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1',
  '#EF4444', '#10B981', '#3B82F6', '#F97316', '#84CC16'
];

let themeColorIndex = 0;

export function nextThemeColor() {
  const color = THEME_COLORS[themeColorIndex % THEME_COLORS.length];
  themeColorIndex++;
  return color;
}

export function createTheme(name, description, color, codeIds, userId) {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    name: name || 'New Theme',
    description: description || '',
    color: color || nextThemeColor(),
    codeIds: codeIds || [],
    created: now,
    createdBy: userId,
    modified: now,
    modifiedBy: userId,
    noteId: null,
    deleted: false
  };
}

export function updateTheme(themes, themeId, changes, userId) {
  return themes.map(t => {
    if (t.id === themeId) {
      return { ...t, ...changes, modified: new Date().toISOString(), modifiedBy: userId };
    }
    return t;
  });
}

export function deleteTheme(themes, themeId) {
  return themes.map(t => t.id === themeId ? { ...t, deleted: true } : t);
}

export function addCodesToTheme(themes, themeId, codeIds, userId) {
  return themes.map(t => {
    if (t.id === themeId) {
      const merged = [...new Set([...t.codeIds, ...codeIds])];
      return { ...t, codeIds: merged, modified: new Date().toISOString(), modifiedBy: userId };
    }
    return t;
  });
}

export function removeCodesFromTheme(themes, themeId, codeIds, userId) {
  return themes.map(t => {
    if (t.id === themeId) {
      return {
        ...t,
        codeIds: t.codeIds.filter(id => !codeIds.includes(id)),
        modified: new Date().toISOString(),
        modifiedBy: userId
      };
    }
    return t;
  });
}

/**
 * Get all coded segments that belong to any code in this theme.
 */
export function getThemeSegments(theme, codings, codes) {
  const codeIdSet = new Set(theme.codeIds);
  const segments = [];
  for (const [sourceId, coding] of Object.entries(codings)) {
    for (const seg of (coding.segments || [])) {
      if (codeIdSet.has(seg.codeId)) {
        segments.push({ ...seg, sourceId });
      }
    }
  }
  return segments;
}

/**
 * Get segment count per theme.
 */
export function countSegmentsByTheme(themes, codings) {
  const counts = {};
  for (const theme of themes) {
    if (theme.deleted) continue;
    counts[theme.id] = getThemeSegments(theme, codings).length;
  }
  return counts;
}

/**
 * Find which themes a code belongs to.
 */
export function getThemesForCode(themes, codeId) {
  return themes.filter(t => !t.deleted && t.codeIds.includes(codeId));
}

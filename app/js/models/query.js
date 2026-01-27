import { uuid } from '../utils/uuid.js';

/**
 * Execute a boolean code query across all codings.
 * query = { codes: [codeId,...], operator: 'AND'|'OR'|'NOT', documentFilter?: [sourceId,...] }
 *
 * OR:  segments with ANY of the specified codes
 * AND: segments in the same source where ALL codes are present (co-occurrence at source level)
 * NOT: segments with first code but NOT any of the others
 */
export function executeQuery(allCodings, codebook, query) {
  const { codes: codeIds, operator, documentFilter } = query;
  if (!codeIds || codeIds.length === 0) return [];

  const results = [];
  const codeMap = {};
  for (const c of (codebook.codes || [])) codeMap[c.id] = c;

  const sourcesToSearch = documentFilter && documentFilter.length > 0
    ? Object.entries(allCodings).filter(([id]) => documentFilter.includes(id))
    : Object.entries(allCodings);

  switch (operator) {
    case 'OR': {
      const codeSet = new Set(codeIds);
      for (const [sourceId, coding] of sourcesToSearch) {
        for (const seg of (coding.segments || [])) {
          if (codeSet.has(seg.codeId)) {
            results.push({ sourceId, segment: seg, code: codeMap[seg.codeId] });
          }
        }
      }
      break;
    }

    case 'AND': {
      // Find sources where ALL codes are present, return all matching segments
      for (const [sourceId, coding] of sourcesToSearch) {
        const segs = coding.segments || [];
        const presentCodes = new Set(segs.map(s => s.codeId));
        if (codeIds.every(id => presentCodes.has(id))) {
          for (const seg of segs) {
            if (codeIds.includes(seg.codeId)) {
              results.push({ sourceId, segment: seg, code: codeMap[seg.codeId] });
            }
          }
        }
      }
      break;
    }

    case 'COOCCUR': {
      // Segments where multiple selected codes overlap the same text range
      const codeSet = new Set(codeIds);
      for (const [sourceId, coding] of sourcesToSearch) {
        const segs = (coding.segments || []).filter(s => codeSet.has(s.codeId));
        for (let a = 0; a < segs.length; a++) {
          const sa = segs[a];
          const aStart = sa.start?.offset || 0;
          const aEnd = sa.end?.offset || 0;
          for (let b = a + 1; b < segs.length; b++) {
            const sb = segs[b];
            if (sa.codeId === sb.codeId) continue;
            const bStart = sb.start?.offset || 0;
            const bEnd = sb.end?.offset || 0;
            if (aStart < bEnd && aEnd > bStart) {
              results.push({ sourceId, segment: sa, code: codeMap[sa.codeId], overlaps: sb });
              break;
            }
          }
        }
      }
      break;
    }

    case 'PROXIMITY': {
      const distance = query.proximityDistance || 500;
      const codeSet = new Set(codeIds);
      for (const [sourceId, coding] of sourcesToSearch) {
        const segs = (coding.segments || []).filter(s => codeSet.has(s.codeId));
        for (let a = 0; a < segs.length; a++) {
          const sa = segs[a];
          const aEnd = sa.end?.offset || 0;
          for (let b = a + 1; b < segs.length; b++) {
            const sb = segs[b];
            if (sa.codeId === sb.codeId) continue;
            const bStart = sb.start?.offset || 0;
            const gap = Math.abs(bStart - aEnd);
            if (gap <= distance) {
              results.push({ sourceId, segment: sa, code: codeMap[sa.codeId], nearby: sb });
              break;
            }
          }
        }
      }
      break;
    }

    case 'NOT': {
      const primaryCode = codeIds[0];
      const excludeSet = new Set(codeIds.slice(1));
      for (const [sourceId, coding] of sourcesToSearch) {
        const segs = coding.segments || [];
        // Get all offsets covered by excluded codes
        const excludedRanges = segs
          .filter(s => excludeSet.has(s.codeId))
          .map(s => ({ start: s.start?.offset || 0, end: s.end?.offset || 0 }));

        for (const seg of segs) {
          if (seg.codeId === primaryCode) {
            const segStart = seg.start?.offset || 0;
            const segEnd = seg.end?.offset || 0;
            const overlaps = excludedRanges.some(r =>
              segStart < r.end && segEnd > r.start
            );
            if (!overlaps) {
              results.push({ sourceId, segment: seg, code: codeMap[seg.codeId] });
            }
          }
        }
      }
      break;
    }
  }

  return results;
}

export function createSavedQuery(name, query) {
  return {
    id: uuid(),
    name: name || 'Untitled Query',
    query,
    created: new Date().toISOString()
  };
}

import { uuid } from '../utils/uuid.js';

export function createSegment(codeId, start, end, text, userId, speaker = null) {
  return {
    id: uuid(),
    codeId,
    start,
    end,
    text,
    speaker,
    created: new Date().toISOString(),
    createdBy: userId,
    noteId: null
  };
}

export function removeSegment(segments, segmentId) {
  return segments.filter(s => s.id !== segmentId);
}

export function getSegmentsForCode(allCodings, codeId, includeChildren = false, codes = []) {
  const codeIds = new Set([codeId]);
  if (includeChildren) {
    // Collect all descendant code IDs
    let found = true;
    while (found) {
      found = false;
      for (const c of codes) {
        if (c.parentId && codeIds.has(c.parentId) && !codeIds.has(c.id) && !c.deleted) {
          codeIds.add(c.id);
          found = true;
        }
      }
    }
  }

  const results = [];
  for (const [sourceId, coding] of Object.entries(allCodings)) {
    for (const seg of (coding.segments || [])) {
      if (codeIds.has(seg.codeId)) {
        results.push({ sourceId, segment: seg });
      }
    }
  }
  return results;
}

export function remapCode(segments, oldCodeId, newCodeId) {
  return segments.map(s => {
    if (s.codeId === oldCodeId) return { ...s, codeId: newCodeId };
    return s;
  });
}

export function countSegmentsByCode(allCodings) {
  const counts = {};
  for (const coding of Object.values(allCodings)) {
    for (const seg of (coding.segments || [])) {
      counts[seg.codeId] = (counts[seg.codeId] || 0) + 1;
    }
  }
  return counts;
}

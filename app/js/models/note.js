import { uuid } from '../utils/uuid.js';

export function createNote(title, type, linkedTo, userId) {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    type: type || 'analytic',
    title: title || 'Untitled Note',
    content: '',
    linkedTo: linkedTo || null, // { type: 'code'|'source'|'segment'|null, id: string }
    created: now,
    createdBy: userId,
    modified: now,
    modifiedBy: userId,
    tags: [],
    linkedNotes: []
  };
}

export const NOTE_TYPES = [
  { value: 'analytic', label: 'Analytic' },
  { value: 'reflexive', label: 'Reflexive' },
  { value: 'procedural', label: 'Procedural' },
  { value: 'theoretical', label: 'Theoretical' },
  { value: 'other', label: 'Other' }
];

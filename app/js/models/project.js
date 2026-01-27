import { uuid } from '../utils/uuid.js';

export function createProject(name, description, userId) {
  const now = new Date().toISOString();
  return {
    koaliVersion: '1.0',
    projectId: uuid(),
    name: name || 'Untitled Project',
    description: description || '',
    created: now,
    modified: now,
    creators: [userId],
    settings: {
      defaultLanguage: 'en',
      timestampFormat: 'ISO8601'
    }
  };
}

export function validateProject(data) {
  const errors = [];
  if (!data) { errors.push('No data'); return { valid: false, errors }; }
  if (!data.koaliVersion) errors.push('Missing koaliVersion');
  if (!data.projectId) errors.push('Missing projectId');
  if (!data.name) errors.push('Missing name');
  return { valid: errors.length === 0, errors };
}

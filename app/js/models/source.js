import { uuid } from '../utils/uuid.js';

const TYPE_MAP = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.doc': 'doc',
  '.txt': 'text',
  '.vtt': 'transcript-vtt',
  '.srt': 'transcript-srt',
  '.json': 'transcript-zoom-json'
};

const ICON_MAP = {
  'pdf': '\u{1F4C4}',
  'docx': '\u{1F4C4}',
  'doc': '\u{1F4C4}',
  'text': '\u{1F4DD}',
  'transcript-vtt': '\u{1F399}',
  'transcript-srt': '\u{1F399}',
  'transcript-zoom-json': '\u{1F399}',
  'transcript-teams-docx': '\u{1F399}'
};

export function detectSourceType(filename) {
  const ext = '.' + filename.split('.').pop().toLowerCase();
  return TYPE_MAP[ext] || 'text';
}

export function getSourceIcon(type) {
  return ICON_MAP[type] || '\u{1F4C4}';
}

export function createSourceEntry(filename, originalName, type, userId, extra = {}) {
  return {
    id: uuid(),
    filename,
    originalName: originalName || filename,
    title: originalName || filename,
    type,
    imported: new Date().toISOString(),
    importedBy: userId,
    size: extra.size || 0,
    pageCount: extra.pageCount || null,
    duration: extra.duration || null,
    speakers: extra.speakers || [],
    attributes: extra.attributes || {}
  };
}

export function isTranscriptType(type) {
  return type.startsWith('transcript-');
}

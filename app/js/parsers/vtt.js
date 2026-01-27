/**
 * Parse WebVTT files (Zoom, Teams, generic).
 * Returns { type, cues[], speakers[] }
 */
export async function parseVTT(file) {
  const text = typeof file === 'string' ? file : await file.text();
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const cues = [];
  const speakerSet = new Set();

  let i = 0;
  // Skip WEBVTT header
  if (lines[i] && lines[i].startsWith('WEBVTT')) {
    i++;
    while (i < lines.length && lines[i].trim() !== '') i++;
    i++;
  }

  while (i < lines.length) {
    // Skip blank lines
    while (i < lines.length && lines[i].trim() === '') i++;
    if (i >= lines.length) break;

    // Optional cue identifier (number or text)
    let cueId = null;
    if (i + 1 < lines.length && lines[i + 1].includes('-->')) {
      cueId = lines[i].trim();
      i++;
    }

    // Timestamp line: 00:00:05.000 --> 00:00:08.500
    if (!lines[i] || !lines[i].includes('-->')) {
      i++;
      continue;
    }

    const tsMatch = lines[i].match(
      /(\d{1,2}:?\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{1,2}:?\d{2}:\d{2}[.,]\d{3})/
    );
    if (!tsMatch) { i++; continue; }

    const startTime = normalizeTimestamp(tsMatch[1]);
    const endTime = normalizeTimestamp(tsMatch[2]);
    i++;

    // Cue text (possibly multiple lines until blank line)
    const textLines = [];
    while (i < lines.length && lines[i].trim() !== '') {
      textLines.push(lines[i]);
      i++;
    }

    const rawText = textLines.join(' ');
    // Extract speaker from Teams <v> tags BEFORE stripping HTML
    const { speaker, text: cueText } = extractSpeaker(rawText);
    if (speaker) speakerSet.add(speaker);

    cues.push({
      index: cues.length,
      cueId,
      startTime,
      endTime,
      speaker: speaker || null,
      text: cueText
    });
  }

  return {
    type: 'transcript-vtt',
    cues,
    speakers: Array.from(speakerSet),
    text: cues.map(c => c.text).join('\n')
  };
}

function extractSpeaker(text) {
  // Teams format: <v Speaker Name>text</v>
  const vMatch = text.match(/^<v\s+([^>]+)>(.+?)(?:<\/v>)?$/s);
  if (vMatch) {
    return { speaker: vMatch[1].trim(), text: stripHtml(vMatch[2]).trim() };
  }
  // Standard format: "Speaker Name: text"
  const cleaned = stripHtml(text);
  const match = cleaned.match(/^([^:]{1,50}):\s*(.+)$/s);
  if (match) {
    return { speaker: match[1].trim(), text: match[2].trim() };
  }
  return { speaker: null, text: cleaned.trim() };
}

function stripHtml(text) {
  return text.replace(/<[^>]*>/g, '');
}

function normalizeTimestamp(ts) {
  // Ensure HH:MM:SS.mmm format
  const parts = ts.replace(',', '.').split(':');
  if (parts.length === 2) {
    return '00:' + parts.join(':');
  }
  return parts.join(':');
}

/**
 * Parse DOCX files using Mammoth.js.
 * Returns { type, html, text, messages }
 */
export async function parseDOCX(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const textResult = await mammoth.extractRawText({ arrayBuffer });

  // Detect Teams transcript format (lines with timestamps like "0:0:5.0 --> 0:0:8.5")
  const text = textResult.value;
  if (isTeamsTranscript(text)) {
    return parseTeamsTranscript(text);
  }

  return {
    type: 'docx',
    html: result.value,
    text,
    messages: result.messages,
    pages: [{ pageNum: 1, text }]
  };
}

/**
 * Detect if raw text from DOCX is a Teams transcript.
 * Teams transcripts have timestamp lines like "0:0:5.0 --> 0:0:8.5"
 * followed by a speaker name line and text.
 */
function isTeamsTranscript(text) {
  const lines = text.split('\n').slice(0, 30);
  const tsPattern = /^\d+:\d+:\d+\.\d+\s*-->\s*\d+:\d+:\d+\.\d+/;
  // If content contains a WEBVTT header, it's pasted VTT content, not a Teams transcript
  if (lines.some(l => l.trim() === 'WEBVTT')) return false;
  // Require at least 2 timestamp lines to confirm it's actually a transcript
  const matches = lines.filter(l => tsPattern.test(l.trim()));
  return matches.length >= 2;
}

/**
 * Parse Teams DOCX transcript into cue-based format.
 */
function parseTeamsTranscript(text) {
  const lines = text.split('\n');
  const cues = [];
  const speakerSet = new Set();
  const tsPattern = /^(\d+:\d+:\d+\.\d+)\s*-->\s*(\d+:\d+:\d+\.\d+)/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    const tsMatch = line.match(tsPattern);
    if (!tsMatch) { i++; continue; }

    const startTime = normalizeTeamsTimestamp(tsMatch[1]);
    const endTime = normalizeTeamsTimestamp(tsMatch[2]);
    i++;

    // Next non-empty line is speaker
    while (i < lines.length && !lines[i].trim()) i++;
    const speaker = (i < lines.length) ? lines[i].trim() : '';
    if (speaker) speakerSet.add(speaker);
    i++;

    // Collect text lines until next timestamp or blank
    const textLines = [];
    while (i < lines.length) {
      const nextLine = lines[i].trim();
      if (!nextLine || tsPattern.test(nextLine)) break;
      textLines.push(nextLine);
      i++;
    }

    cues.push({
      index: cues.length,
      startTime,
      endTime,
      speaker: speaker || null,
      text: textLines.join(' ')
    });
  }

  return {
    type: 'transcript-teams-docx',
    cues,
    speakers: Array.from(speakerSet),
    text: cues.map(c => c.text).join('\n')
  };
}

function normalizeTeamsTimestamp(ts) {
  // Convert "0:0:5.0" to "00:00:05.000"
  const parts = ts.split(':');
  while (parts.length < 3) parts.unshift('0');
  const [h, m, sAndMs] = parts;
  const [sec, ms] = sAndMs.split('.');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${sec.padStart(2, '0')}.${(ms || '0').padEnd(3, '0')}`;
}

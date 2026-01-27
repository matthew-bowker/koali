/**
 * Parse SRT subtitle files.
 * Returns { type, cues[], speakers[] }
 */
export async function parseSRT(file) {
  const text = typeof file === 'string' ? file : await file.text();
  const blocks = text.replace(/\r\n/g, '\n').trim().split(/\n\s*\n/);
  const cues = [];
  const speakerSet = new Set();

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    // Line 1: sequence number
    // Line 2: timestamp
    const tsMatch = lines[1].match(
      /(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/
    );
    if (!tsMatch) continue;

    const startTime = tsMatch[1].replace(',', '.');
    const endTime = tsMatch[2].replace(',', '.');
    const rawText = lines.slice(2).join(' ').replace(/<[^>]*>/g, '');

    const { speaker, text: cueText } = extractSpeaker(rawText);
    if (speaker) speakerSet.add(speaker);

    cues.push({
      index: cues.length,
      startTime,
      endTime,
      speaker: speaker || null,
      text: cueText
    });
  }

  return {
    type: 'transcript-srt',
    cues,
    speakers: Array.from(speakerSet),
    text: cues.map(c => c.text).join('\n')
  };
}

function extractSpeaker(text) {
  const match = text.match(/^([^:]{1,50}):\s*(.+)$/s);
  if (match) {
    return { speaker: match[1].trim(), text: match[2].trim() };
  }
  return { speaker: null, text: text.trim() };
}
